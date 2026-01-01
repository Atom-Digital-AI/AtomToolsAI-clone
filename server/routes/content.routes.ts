import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { generatedContent } from "@shared/schema";
import { ragService } from "../utils/rag-service";
import { loggedOpenAICall } from "../utils/ai-logger";
import {
  executeContentWriterGraph,
  resumeContentWriterGraph,
  getGraphState,
  updateGraphState,
} from "../langgraph/content-writer-graph";

const router = Router();

// LangGraph Content Writer API Validation Schemas
const langgraphStartSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  guidelineProfileId: z.string().optional(),
  objective: z.string().optional(),
  targetLength: z.number().optional(),
  toneOfVoice: z.string().optional(),
  language: z.string().optional(),
  internalLinks: z.array(z.string()).optional(),
  useBrandGuidelines: z.boolean().optional(),
  selectedTargetAudiences: z
    .union([z.literal("all"), z.literal("none"), z.array(z.number()), z.null()])
    .optional(),
  styleMatchingMethod: z.enum(["continuous", "end-rewrite"]).optional(),
  matchStyle: z.boolean().optional(),
});

const langgraphResumeSchema = z.object({
  selectedConceptId: z.string().optional(),
  selectedSubtopicIds: z.array(z.string()).optional(),
});

/**
 * Get generated content for the authenticated user
 */
router.get("/generated-content", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const toolType = req.query.toolType as string | undefined;

    // Build conditions
    const conditions = [eq(generatedContent.userId, userId)];
    if (toolType) {
      conditions.push(eq(generatedContent.toolType, toolType));
    }

    const query = db
      .select()
      .from(generatedContent)
      .where(and(...conditions));

    const contents = await query.orderBy(
      sql`${generatedContent.createdAt} DESC`
    );
    res.json(contents);
  } catch (error) {
    console.error("Error fetching generated content:", error);
    res.status(500).json({ message: "Failed to fetch generated content" });
  }
});

/**
 * Get single generated content by ID
 */
router.get("/generated-content/:id", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [content] = await db
      .select()
      .from(generatedContent)
      .where(
        eq(generatedContent.id, id) && eq(generatedContent.userId, userId)
      );

    if (!content) {
      return res.status(404).json({ message: "Generated content not found" });
    }

    res.json(content);
  } catch (error) {
    console.error("Error fetching generated content:", error);
    res.status(500).json({ message: "Failed to fetch generated content" });
  }
});

/**
 * Save generated content
 */
router.post("/generated-content", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { toolType, title, inputData, outputData } = req.body;

    if (!toolType || !title || !inputData || !outputData) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const [savedContent] = await db
      .insert(generatedContent)
      .values({
        userId,
        toolType,
        title,
        inputData,
        outputData,
      })
      .returning();

    res.json(savedContent);
  } catch (error) {
    console.error("Error saving generated content:", error);
    res.status(500).json({ message: "Failed to save generated content" });
  }
});

/**
 * Delete generated content
 */
router.delete(
  "/generated-content/:id",
  requireAuth,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const [deletedContent] = await db
        .delete(generatedContent)
        .where(
          and(
            eq(generatedContent.id, id),
            eq(generatedContent.userId, userId)
          )
        )
        .returning();

      if (!deletedContent) {
        return res
          .status(404)
          .json({ message: "Generated content not found" });
      }

      res.json({ success: true, message: "Content deleted successfully" });
    } catch (error) {
      console.error("Error deleting generated content:", error);
      res.status(500).json({ message: "Failed to delete generated content" });
    }
  }
);

/**
 * Save content feedback for AI learning
 */
router.post("/content-feedback", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const {
      toolType,
      rating,
      feedbackText,
      inputData,
      outputData,
      guidelineProfileId,
    } = req.body;

    if (!toolType || !rating || !inputData || !outputData) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Use createOrIncrementFeedback to handle deduplication at brand level
    const feedback = await storage.createOrIncrementFeedback({
      userId,
      toolType,
      rating,
      feedbackText: feedbackText || null,
      inputData,
      outputData,
      guidelineProfileId: guidelineProfileId || null,
    });

    res.json(feedback);
  } catch (error) {
    console.error("Error saving content feedback:", error);
    res.status(500).json({ message: "Failed to save feedback" });
  }
});

/**
 * Get all user's content writer drafts
 */
router.get("/content-writer/drafts", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const drafts = await storage.getUserContentWriterDrafts(userId);
    res.json(drafts);
  } catch (error) {
    console.error("Error fetching user drafts:", error);
    res.status(500).json({ message: "Failed to fetch drafts" });
  }
});

/**
 * Delete a content writer draft
 */
router.delete(
  "/content-writer/drafts/:id",
  requireAuth,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const success = await storage.deleteContentWriterDraft(id, userId);

      if (!success) {
        return res.status(404).json({ message: "Draft not found" });
      }

      res.json({ success: true, message: "Draft deleted successfully" });
    } catch (error) {
      console.error("Error deleting content writer draft:", error);
      res.status(500).json({ message: "Failed to delete draft" });
    }
  }
);

/**
 * Start new LangGraph workflow
 */
router.post(
  "/langgraph/content-writer/start",
  requireAuth,
  async (req: any, res) => {
    const startTime = Date.now();
    console.error("[LangGraph Start] ========== STARTING WORKFLOW ==========");
    console.error("[LangGraph Start] Request received at:", new Date().toISOString());

    try {
      const userId = req.user.id;

      // Validate request body with Zod
      const validationResult = langgraphStartSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: validationResult.error.errors,
        });
      }

      const {
        topic,
        guidelineProfileId,
        objective,
        targetLength,
        toneOfVoice,
        language,
        internalLinks,
        useBrandGuidelines,
        selectedTargetAudiences,
        styleMatchingMethod,
        matchStyle,
      } = validationResult.data;

      // Create content_writer_session for backward compatibility
      const session = await storage.createContentWriterSession({
        userId,
        topic,
        guidelineProfileId: guidelineProfileId || null,
        styleMatchingMethod: styleMatchingMethod || "continuous",
        status: "concepts",
        objective,
        targetLength,
        toneOfVoice,
        language,
        internalLinks,
        selectedTargetAudiences,
      });

      if (!session || !session.id) {
        throw new Error("Failed to create content writer session");
      }

      // Verify session exists in database before proceeding
      const verifiedSession = await storage.getContentWriterSession(session.id, userId);
      if (!verifiedSession) {
        throw new Error(`Session created but not found in database: ${session.id}`);
      }

      // Create initial state for LangGraph
      const initialState = {
        topic,
        guidelineProfileId,
        userId,
        sessionId: session.id,
        concepts: [],
        subtopics: [],
        selectedSubtopicIds: [],
        errors: [],
        metadata: {
          currentStep: "concepts" as const,
          startedAt: new Date().toISOString(),
        },
        objective,
        targetLength,
        toneOfVoice,
        language,
        internalLinks,
        useBrandGuidelines,
        selectedTargetAudiences,
        styleMatchingMethod: styleMatchingMethod || "continuous",
        matchStyle,
        status: "pending" as const,
      };

      // Execute LangGraph workflow
      const result = await executeContentWriterGraph(initialState, {
        userId,
        sessionId: session.id,
      });

      const duration = Date.now() - startTime;
      console.error("[LangGraph Start] Completed in", duration, "ms");

      // Return result
      res.json({
        threadId: result.threadId,
        sessionId: session.id,
        state: result.state,
        concepts: result.state.concepts,
        status: result.state.status,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("[LangGraph Start] Error after", duration, "ms:", error);
      res.status(500).json({
        message: "Failed to start content writer workflow",
        error: (error as Error).message,
      });
    }
  }
);

/**
 * Resume LangGraph workflow after user input
 */
router.post(
  "/langgraph/content-writer/:threadId/resume",
  requireAuth,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { threadId } = req.params;

      // Validate request body
      const validationResult = langgraphResumeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: validationResult.error.errors,
        });
      }

      const { selectedConceptId, selectedSubtopicIds } = validationResult.data;

      // Resume workflow with user's selections
      const result = await resumeContentWriterGraph(
        threadId,
        { userId },
        {
          selectedConceptId,
          selectedSubtopicIds,
        }
      );

      res.json({
        threadId: result.threadId,
        state: result.state,
        status: result.state.status,
      });
    } catch (error) {
      console.error("Error resuming LangGraph workflow:", error);
      res.status(500).json({
        message: "Failed to resume content writer workflow",
        error: (error as Error).message,
      });
    }
  }
);

/**
 * Get LangGraph state for a thread
 */
router.get(
  "/langgraph/content-writer/:threadId/state",
  requireAuth,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { threadId } = req.params;

      const state = await getGraphState(threadId, { userId });

      if (!state) {
        return res.status(404).json({ message: "Thread not found" });
      }

      res.json({ state });
    } catch (error) {
      console.error("Error getting LangGraph state:", error);
      res.status(500).json({
        message: "Failed to get thread state",
        error: (error as Error).message,
      });
    }
  }
);

/**
 * Get user's LangGraph threads
 */
router.get("/langgraph/threads", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.query;

    const threads = await storage.getUserLanggraphThreads(
      userId,
      sessionId as string | undefined
    );
    res.json(threads);
  } catch (error) {
    console.error("Error fetching LangGraph threads:", error);
    res.status(500).json({ message: "Failed to fetch threads" });
  }
});

/**
 * Delete a LangGraph thread
 */
router.delete(
  "/langgraph/threads/:threadId",
  requireAuth,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { threadId } = req.params;

      // Verify the thread belongs to the user
      const thread = await storage.getLanggraphThread(threadId, userId);
      if (!thread) {
        return res.status(404).json({ message: "Thread not found" });
      }

      const success = await storage.deleteLanggraphThread(threadId);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete thread" });
      }

      res.json({ success: true, message: "Thread deleted successfully" });
    } catch (error) {
      console.error("Error deleting LangGraph thread:", error);
      res.status(500).json({ message: "Failed to delete thread" });
    }
  }
);

export default router;
