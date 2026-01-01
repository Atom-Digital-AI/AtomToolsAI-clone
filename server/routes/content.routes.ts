import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { generatedContent } from "@shared/schema";
import {
  executeContentWriterGraph,
  resumeContentWriterGraph,
  getGraphState,
} from "../langgraph/content-writer-graph";
import { validate } from "../middleware/validate";
import { getLogger } from "../logging/logger";
import {
  generatedContentQuerySchema,
  generatedContentIdSchema,
  createGeneratedContentSchema,
  contentFeedbackSchema,
  langgraphStartSchema,
  langgraphResumeSchema,
  threadIdParamsSchema,
  langgraphThreadsQuerySchema,
  draftIdParamsSchema,
} from "../schemas";

const router = Router();
const log = getLogger({ module: 'content.routes' });

/**
 * Get generated content for the authenticated user
 */
router.get(
  "/generated-content",
  requireAuth,
  validate({ query: generatedContentQuerySchema }),
  async (req: any, res) => {
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
      log.error({ error }, "Error fetching generated content");
      res.status(500).json({ message: "Failed to fetch generated content" });
    }
  }
);

/**
 * Get single generated content by ID
 */
router.get(
  "/generated-content/:id",
  requireAuth,
  validate({ params: generatedContentIdSchema }),
  async (req: any, res) => {
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
      log.error({ error }, "Error fetching generated content by ID");
      res.status(500).json({ message: "Failed to fetch generated content" });
    }
  }
);

/**
 * Save generated content
 */
router.post(
  "/generated-content",
  requireAuth,
  validate({ body: createGeneratedContentSchema }),
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { toolType, title, inputData, outputData } = req.body;

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
      log.error({ error }, "Error saving generated content");
      res.status(500).json({ message: "Failed to save generated content" });
    }
  }
);

/**
 * Delete generated content
 */
router.delete(
  "/generated-content/:id",
  requireAuth,
  validate({ params: generatedContentIdSchema }),
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
      log.error({ error }, "Error deleting generated content");
      res.status(500).json({ message: "Failed to delete generated content" });
    }
  }
);

/**
 * Save content feedback for AI learning
 */
router.post(
  "/content-feedback",
  requireAuth,
  validate({ body: contentFeedbackSchema }),
  async (req: any, res) => {
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
      log.error({ error }, "Error saving content feedback");
      res.status(500).json({ message: "Failed to save feedback" });
    }
  }
);

/**
 * Get all user's content writer drafts
 */
router.get("/content-writer/drafts", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const drafts = await storage.getUserContentWriterDrafts(userId);
    res.json(drafts);
  } catch (error) {
    log.error({ error }, "Error fetching user drafts");
    res.status(500).json({ message: "Failed to fetch drafts" });
  }
});

/**
 * Delete a content writer draft
 */
router.delete(
  "/content-writer/drafts/:id",
  requireAuth,
  validate({ params: draftIdParamsSchema }),
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
      log.error({ error }, "Error deleting content writer draft");
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
  validate({ body: langgraphStartSchema }),
  async (req: any, res) => {
    const startTime = Date.now();
    log.info("Starting LangGraph content-writer workflow");

    try {
      const userId = req.user.id;
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
      } = req.body;

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
      log.info({ duration, threadId: result.threadId }, "LangGraph workflow completed");

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
      log.error({ error, duration }, "LangGraph workflow failed");
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
  validate({ params: threadIdParamsSchema, body: langgraphResumeSchema }),
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { threadId } = req.params;
      const { selectedConceptId, selectedSubtopicIds } = req.body;

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
      log.error({ error }, "Error resuming LangGraph workflow");
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
  validate({ params: threadIdParamsSchema }),
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
      log.error({ error }, "Error getting LangGraph state");
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
router.get(
  "/langgraph/threads",
  requireAuth,
  validate({ query: langgraphThreadsQuerySchema }),
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { sessionId } = req.query;

      const threads = await storage.getUserLanggraphThreads(
        userId,
        sessionId as string | undefined
      );
      res.json(threads);
    } catch (error) {
      log.error({ error }, "Error fetching LangGraph threads");
      res.status(500).json({ message: "Failed to fetch threads" });
    }
  }
);

/**
 * Delete a LangGraph thread
 */
router.delete(
  "/langgraph/threads/:threadId",
  requireAuth,
  validate({ params: threadIdParamsSchema }),
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
      log.error({ error }, "Error deleting LangGraph thread");
      res.status(500).json({ message: "Failed to delete thread" });
    }
  }
);

export default router;
