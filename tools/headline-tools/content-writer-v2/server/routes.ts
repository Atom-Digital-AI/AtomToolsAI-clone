import type { Express, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../../../../server/auth";
import { db } from "../../../../server/db";
import { langgraphThreads, PRODUCT_IDS } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { executeContentWriterGraph, resumeContentWriterGraph, getGraphState } from "./langgraph/content-writer-graph";
import { storage } from "../../../../server/storage";
import { logToolError, getErrorTypeFromError } from "../../../../server/errorLogger";

// Validation schemas
const langgraphStartSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  guidelineProfileId: z.string().optional(),
  objective: z.string().optional(),
  targetLength: z.number().optional(),
  toneOfVoice: z.string().optional(),
  language: z.string().optional(),
  internalLinks: z.array(z.string()).optional(),
  useBrandGuidelines: z.boolean().optional(),
  selectedTargetAudiences: z.union([
    z.literal("all"),
    z.literal("none"),
    z.array(z.number()),
    z.null(),
  ]).optional(),
  styleMatchingMethod: z.enum(['continuous', 'end-rewrite']).optional(),
  matchStyle: z.boolean().optional(),
});

const langgraphResumeSchema = z.object({
  selectedConceptId: z.string().optional(),
  selectedSubtopicIds: z.array(z.string()).optional(),
});

export function registerContentWriterRoutes(app: Express): void {
  // Create new session
  app.post("/api/content-writer/sessions", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const productId = PRODUCT_IDS.CONTENT_WRITER_V2;
      
      // Check access
      const accessInfo = await storage.getUserProductAccess(userId, productId);
      if (!accessInfo.hasAccess) {
        return res.status(403).json({
          message: "Access denied. This feature requires an active subscription."
        });
      }

      const validated = langgraphStartSchema.parse(req.body);
      
      const result = await executeContentWriterGraph(validated, {
        userId,
      });
      
      const threadId = result.threadId;

      res.json({ threadId });
    } catch (error) {
      console.error("Content Writer session creation error:", error);
      
      await logToolError({
        userId: req.user?.id,
        userEmail: req.user?.email,
        toolName: 'Content Writer v2',
        errorType: getErrorTypeFromError(error),
        errorMessage: (error as any)?.message || 'Unknown error occurred',
        errorStack: (error as any)?.stack,
        requestData: req.body,
        httpStatus: (error as any)?.status || 500,
        endpoint: '/api/content-writer/sessions',
        req,
        responseHeaders: (error as any)?.headers ? Object.fromEntries((error as any).headers.entries()) : null
      });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get session state
  app.get("/api/content-writer/sessions/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const threadId = req.params.id;

      const state = await getGraphState(threadId, {
        userId,
      });
      
      if (!state) {
        return res.status(404).json({ message: "Session not found" });
      }

      res.json(state);
    } catch (error) {
      console.error("Content Writer get session error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Resume session (user selections)
  app.post("/api/content-writer/sessions/:id/resume", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const threadId = req.params.id;

      const validated = langgraphResumeSchema.parse(req.body);
      
      await resumeContentWriterGraph(threadId, userId, validated);

      res.json({ success: true });
    } catch (error) {
      console.error("Content Writer resume error:", error);
      
      await logToolError({
        userId: req.user?.id,
        userEmail: req.user?.email,
        toolName: 'Content Writer v2',
        errorType: getErrorTypeFromError(error),
        errorMessage: (error as any)?.message || 'Unknown error occurred',
        errorStack: (error as any)?.stack,
        requestData: req.body,
        httpStatus: (error as any)?.status || 500,
        endpoint: '/api/content-writer/sessions/:id/resume',
        req,
        responseHeaders: (error as any)?.headers ? Object.fromEntries((error as any).headers.entries()) : null
      });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
}

