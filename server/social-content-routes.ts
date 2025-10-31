import type { Express, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "./auth";
import { db } from "./db";
import {
  socialContentSessions,
  socialContentWireframes,
  adSpecs,
  generatedContent,
  PRODUCT_IDS,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { socialContentGraph } from "./langgraph/social-content-graph";
import type { SocialContentState, Platform } from "./langgraph/social-content-types";
import { calculateTotalFormats } from "./langgraph/social-content-types";
import { nanoid } from "nanoid";
import { logToolError } from "./errorLogger";

// Validation schemas
const startSessionSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  objective: z.string().optional(),
  urls: z.array(z.string().url()).optional(),
  selectedPlatforms: z.array(z.enum(['Facebook', 'Instagram', 'TikTok', 'X (Twitter)', 'YouTube'])),
  selectedFormats: z.record(z.array(z.string())),
  guidelineProfileId: z.string().optional(),
  useBrandGuidelines: z.boolean().default(false),
  selectedTargetAudiences: z.union([
    z.literal("all"),
    z.literal("none"),
    z.array(z.number()),
  ]).optional(),
});

const approveWireframesSchema = z.object({
  approvedWireframeIds: z.array(z.string()).min(1, "At least one wireframe must be approved"),
  rejectedWireframeIds: z.array(z.string()).optional(),
  feedback: z.string().optional(),
});

export function registerSocialContentRoutes(app: Express): void {
  // Get all ad specs (for UI to show available platforms/formats)
  app.get("/api/social-content/ad-specs", requireAuth, async (req: Request, res: Response) => {
    try {
      const specs = await db
        .select()
        .from(adSpecs)
        .where(eq(adSpecs.isActive, true))
        .orderBy(adSpecs.platform, adSpecs.format);
      
      // Group by platform
      const grouped = specs.reduce((acc: Record<string, any[]>, spec) => {
        if (!acc[spec.platform]) {
          acc[spec.platform] = [];
        }
        acc[spec.platform].push({
          format: spec.format,
          id: spec.id,
          spec: spec.specJson,
        });
        return acc;
      }, {});
      
      res.json(grouped);
    } catch (error) {
      console.error("[social-content] Error fetching ad specs:", error);
      await logToolError({
        userId: req.user?.id,
        toolName: 'social-content',
        errorType: 'api_error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        endpoint: '/api/social-content/ad-specs',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });
      res.status(500).json({ error: "Failed to fetch ad specs" });
    }
  });
  
  // Start a new social content session
  app.post("/api/social-content/start", requireAuth, async (req: Request, res: Response) => {
    try {
      const validatedData = startSessionSchema.parse(req.body);
      const userId = req.user!.id;
      
      // Check product access
      const productId = PRODUCT_IDS.SOCIAL_CONTENT_GENERATOR;
      const hasAccess = await db.query.userSubscriptions.findFirst({
        where: (subscriptions, { eq, and }) =>
          and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.productId, productId),
            eq(subscriptions.isActive, true)
          ),
      });
      
      if (!hasAccess) {
        return res.status(403).json({ error: "You don't have access to this tool" });
      }
      
      // Create session in database
      const sessionId = nanoid();
      const threadId = nanoid();
      
      const [session] = await db.insert(socialContentSessions).values({
        id: sessionId,
        userId,
        guidelineProfileId: validatedData.guidelineProfileId,
        subject: validatedData.subject,
        objective: validatedData.objective,
        selectedPlatforms: validatedData.selectedPlatforms,
        selectedFormats: validatedData.selectedFormats,
        useBrandGuidelines: validatedData.useBrandGuidelines,
        selectedTargetAudiences: validatedData.selectedTargetAudiences,
        status: 'wireframes',
      }).returning();
      
      // Build initial state
      const initialState: SocialContentState = {
        sessionId,
        userId,
        threadId,
        subject: validatedData.subject,
        objective: validatedData.objective,
        urls: validatedData.urls,
        selectedPlatforms: validatedData.selectedPlatforms as Platform[],
        selectedFormats: validatedData.selectedFormats as Record<Platform, string[]>,
        guidelineProfileId: validatedData.guidelineProfileId,
        useBrandGuidelines: validatedData.useBrandGuidelines,
        selectedTargetAudiences: validatedData.selectedTargetAudiences,
        wireframes: [],
        approvedWireframeIds: [],
        metadata: {
          currentStep: 'intake',
          totalFormats: calculateTotalFormats(validatedData.selectedFormats),
          startedAt: new Date().toISOString(),
        },
        errors: [],
        status: 'processing',
      };
      
      // Start LangGraph execution
      console.log(`[social-content] Starting session ${sessionId}`);
      
      const config = {
        configurable: {
          thread_id: threadId,
        },
      };
      
      // Execute graph (will pause at awaitApproval)
      await socialContentGraph.invoke(initialState, config);
      
      // Get current state
      const currentState = await socialContentGraph.getState(config);
      
      res.json({
        sessionId,
        threadId,
        status: session.status,
        state: currentState.values,
      });
    } catch (error) {
      console.error("[social-content] Error starting session:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      
      await logToolError({
        userId: req.user?.id,
        toolName: 'social-content',
        errorType: error instanceof Error ? error.name : 'unknown_error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        endpoint: '/api/social-content/start',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });
      
      res.status(500).json({ error: "Failed to start session" });
    }
  });
  
  // Get session state
  app.get("/api/social-content/sessions/:sessionId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user!.id;
      
      // Get session from database
      const session = await db.query.socialContentSessions.findFirst({
        where: (sessions, { eq, and }) =>
          and(
            eq(sessions.id, sessionId),
            eq(sessions.userId, userId)
          ),
      });
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Get wireframes
      const wireframes = await db
        .select()
        .from(socialContentWireframes)
        .where(eq(socialContentWireframes.sessionId, sessionId));
      
      // Get LangGraph state if available
      let graphState = null;
      try {
        const config = {
          configurable: {
            thread_id: sessionId, // Use sessionId as threadId for now
          },
        };
        const state = await socialContentGraph.getState(config);
        graphState = state.values;
      } catch (error) {
        console.error("[social-content] Error fetching graph state:", error);
      }
      
      res.json({
        session,
        wireframes,
        graphState,
      });
    } catch (error) {
      console.error("[social-content] Error fetching session:", error);
      await logToolError({
        userId: req.user?.id,
        toolName: 'social-content',
        errorType: 'api_error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        endpoint: `/api/social-content/sessions/${req.params.sessionId}`,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });
  
  // Approve wireframes
  app.post("/api/social-content/sessions/:sessionId/approve", requireAuth, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user!.id;
      const validatedData = approveWireframesSchema.parse(req.body);
      
      // Verify session ownership
      const session = await db.query.socialContentSessions.findFirst({
        where: (sessions, { eq, and }) =>
          and(
            eq(sessions.id, sessionId),
            eq(sessions.userId, userId)
          ),
      });
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Update wireframes in database
      for (const wireframeId of validatedData.approvedWireframeIds) {
        await db
          .update(socialContentWireframes)
          .set({ isApproved: true })
          .where(
            and(
              eq(socialContentWireframes.id, wireframeId),
              eq(socialContentWireframes.sessionId, sessionId)
            )
          );
      }
      
      if (validatedData.rejectedWireframeIds) {
        for (const wireframeId of validatedData.rejectedWireframeIds) {
          await db
            .update(socialContentWireframes)
            .set({ 
              isApproved: false,
              userFeedback: validatedData.feedback 
            })
            .where(
              and(
                eq(socialContentWireframes.id, wireframeId),
                eq(socialContentWireframes.sessionId, sessionId)
              )
            );
        }
      }
      
      // Resume LangGraph with approvals
      const config = {
        configurable: {
          thread_id: sessionId,
        },
      };
      
      // Update state with approvals
      await socialContentGraph.updateState(config, {
        approvedWireframeIds: validatedData.approvedWireframeIds,
      });
      
      // Resume execution
      await socialContentGraph.invoke(null, config);
      
      // Get final state
      const finalState = await socialContentGraph.getState(config);
      
      // Update session status
      await db
        .update(socialContentSessions)
        .set({ status: 'approved' })
        .where(eq(socialContentSessions.id, sessionId));
      
      // Save to generated content
      const inputData = {
        subject: session.subject,
        objective: session.objective,
        platforms: session.selectedPlatforms,
        formats: session.selectedFormats,
        brandId: session.guidelineProfileId,
      };
      
      const outputData = {
        approvedWireframes: validatedData.approvedWireframeIds.length,
        wireframes: finalState.values.wireframes?.filter((w: any) =>
          validatedData.approvedWireframeIds.includes(w.id)
        ),
      };
      
      await db.insert(generatedContent).values({
        userId,
        toolType: 'social-content',
        title: session.subject,
        inputData,
        outputData,
      });
      
      res.json({
        success: true,
        state: finalState.values,
      });
    } catch (error) {
      console.error("[social-content] Error approving wireframes:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      
      await logToolError({
        userId: req.user?.id,
        toolName: 'social-content',
        errorType: 'api_error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        endpoint: `/api/social-content/sessions/${req.params.sessionId}/approve`,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });
      
      res.status(500).json({ error: "Failed to approve wireframes" });
    }
  });
  
  // List user's sessions
  app.get("/api/social-content/sessions", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      const sessions = await db
        .select()
        .from(socialContentSessions)
        .where(eq(socialContentSessions.userId, userId))
        .orderBy(desc(socialContentSessions.createdAt))
        .limit(50);
      
      res.json(sessions);
    } catch (error) {
      console.error("[social-content] Error listing sessions:", error);
      await logToolError({
        userId: req.user?.id,
        toolName: 'social-content',
        errorType: 'api_error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        endpoint: '/api/social-content/sessions',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });
      res.status(500).json({ error: "Failed to list sessions" });
    }
  });
}
