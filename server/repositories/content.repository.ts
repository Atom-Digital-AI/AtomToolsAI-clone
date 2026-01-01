import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "../db";
import {
  generatedContent,
  contentFeedback,
  contentWriterSessions,
  contentWriterConcepts,
  contentWriterSubtopics,
  contentWriterDrafts,
  langgraphThreads,
  type ContentFeedback,
  type InsertContentFeedback,
  type ContentWriterSession,
  type InsertContentWriterSession,
  type ContentWriterConcept,
  type InsertContentWriterConcept,
  type ContentWriterSubtopic,
  type InsertContentWriterSubtopic,
  type ContentWriterDraft,
  type InsertContentWriterDraft,
  type LanggraphThread,
  type InsertLanggraphThread,
} from "@shared/schema";

/**
 * Content Repository
 * Handles all content generation and content writer related database operations
 */
export const contentRepository = {
  // ============================================================================
  // Content Feedback Methods
  // ============================================================================

  /**
   * Get user's feedback entries
   */
  async getUserFeedback(
    userId: string,
    toolType?: string,
    guidelineProfileId?: string,
    limit?: number
  ): Promise<ContentFeedback[]> {
    // Build conditions array
    const conditions = [eq(contentFeedback.userId, userId)];

    if (toolType) {
      conditions.push(eq(contentFeedback.toolType, toolType as any));
    }

    if (guidelineProfileId) {
      conditions.push(eq(contentFeedback.guidelineProfileId, guidelineProfileId));
    }

    const result = await db
      .select()
      .from(contentFeedback)
      .where(and(...conditions))
      .orderBy(desc(contentFeedback.createdAt))
      .limit(limit || 100);
    return result;
  },

  /**
   * Create or increment feedback
   */
  async createOrIncrementFeedback(
    feedback: InsertContentFeedback & { userId: string }
  ): Promise<ContentFeedback> {
    const [newFeedback] = await db
      .insert(contentFeedback)
      .values(feedback)
      .returning();
    return newFeedback;
  },

  // ============================================================================
  // Content Writer Session Methods
  // ============================================================================

  /**
   * Create a content writer session
   */
  async createContentWriterSession(
    session: InsertContentWriterSession & { userId: string }
  ): Promise<ContentWriterSession> {
    const [newSession] = await db
      .insert(contentWriterSessions)
      .values(session)
      .returning();
    return newSession;
  },

  /**
   * Get a content writer session by ID
   */
  async getContentWriterSession(
    id: string,
    userId: string
  ): Promise<ContentWriterSession | undefined> {
    const [session] = await db
      .select()
      .from(contentWriterSessions)
      .where(
        and(
          eq(contentWriterSessions.id, id),
          eq(contentWriterSessions.userId, userId)
        )
      );
    return session || undefined;
  },

  /**
   * Get user's content writer sessions
   */
  async getUserContentWriterSessions(userId: string): Promise<ContentWriterSession[]> {
    return await db
      .select()
      .from(contentWriterSessions)
      .where(eq(contentWriterSessions.userId, userId))
      .orderBy(desc(contentWriterSessions.createdAt));
  },

  /**
   * Update a content writer session
   */
  async updateContentWriterSession(
    id: string,
    userId: string,
    updates: Partial<InsertContentWriterSession>
  ): Promise<ContentWriterSession | undefined> {
    const [updated] = await db
      .update(contentWriterSessions)
      .set(updates)
      .where(
        and(
          eq(contentWriterSessions.id, id),
          eq(contentWriterSessions.userId, userId)
        )
      )
      .returning();
    return updated || undefined;
  },

  /**
   * Delete a content writer session
   */
  async deleteContentWriterSession(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(contentWriterSessions)
      .where(
        and(
          eq(contentWriterSessions.id, id),
          eq(contentWriterSessions.userId, userId)
        )
      );
    return (result.rowCount ?? 0) > 0;
  },

  // ============================================================================
  // Content Writer Concepts Methods
  // ============================================================================

  /**
   * Create content writer concepts
   */
  async createContentWriterConcepts(
    concepts: (InsertContentWriterConcept & { sessionId: string })[],
    userId: string
  ): Promise<ContentWriterConcept[]> {
    if (concepts.length === 0) return [];
    return await db.insert(contentWriterConcepts).values(concepts).returning();
  },

  /**
   * Get session concepts
   */
  async getSessionConcepts(
    sessionId: string,
    userId: string
  ): Promise<ContentWriterConcept[]> {
    // Verify session belongs to user first
    const session = await this.getContentWriterSession(sessionId, userId);
    if (!session) return [];

    return await db
      .select()
      .from(contentWriterConcepts)
      .where(eq(contentWriterConcepts.sessionId, sessionId));
  },

  // ============================================================================
  // Content Writer Subtopics Methods
  // ============================================================================

  /**
   * Create content writer subtopics
   */
  async createContentWriterSubtopics(
    subtopics: (InsertContentWriterSubtopic & { sessionId: string })[],
    userId: string
  ): Promise<ContentWriterSubtopic[]> {
    if (subtopics.length === 0) return [];
    return await db.insert(contentWriterSubtopics).values(subtopics).returning();
  },

  /**
   * Get session subtopics
   */
  async getSessionSubtopics(
    sessionId: string,
    userId: string
  ): Promise<ContentWriterSubtopic[]> {
    // Verify session belongs to user first
    const session = await this.getContentWriterSession(sessionId, userId);
    if (!session) return [];

    return await db
      .select()
      .from(contentWriterSubtopics)
      .where(eq(contentWriterSubtopics.sessionId, sessionId));
  },

  // ============================================================================
  // Content Writer Drafts Methods
  // ============================================================================

  /**
   * Create a content writer draft
   */
  async createContentWriterDraft(
    draft: InsertContentWriterDraft & { sessionId: string },
    userId: string
  ): Promise<ContentWriterDraft> {
    const [newDraft] = await db
      .insert(contentWriterDrafts)
      .values(draft)
      .returning();
    return newDraft;
  },

  /**
   * Get session draft
   */
  async getSessionDraft(
    sessionId: string,
    userId: string
  ): Promise<ContentWriterDraft | undefined> {
    // Verify session belongs to user first
    const session = await this.getContentWriterSession(sessionId, userId);
    if (!session) return undefined;

    const [draft] = await db
      .select()
      .from(contentWriterDrafts)
      .where(eq(contentWriterDrafts.sessionId, sessionId));
    return draft || undefined;
  },

  /**
   * Get user's content writer drafts with session info
   */
  async getUserContentWriterDrafts(
    userId: string
  ): Promise<Array<ContentWriterDraft & { session: ContentWriterSession }>> {
    const drafts = await db
      .select({
        draft: contentWriterDrafts,
        session: contentWriterSessions,
      })
      .from(contentWriterDrafts)
      .innerJoin(
        contentWriterSessions,
        eq(contentWriterDrafts.sessionId, contentWriterSessions.id)
      )
      .where(eq(contentWriterSessions.userId, userId))
      .orderBy(desc(contentWriterDrafts.createdAt));

    return drafts.map((d: any) => ({ ...d.draft, session: d.session }));
  },

  /**
   * Update a content writer draft
   */
  async updateContentWriterDraft(
    id: string,
    userId: string,
    updates: Partial<InsertContentWriterDraft>
  ): Promise<ContentWriterDraft | undefined> {
    // Verify ownership through session
    const [draft] = await db
      .select({ draft: contentWriterDrafts, session: contentWriterSessions })
      .from(contentWriterDrafts)
      .innerJoin(
        contentWriterSessions,
        eq(contentWriterDrafts.sessionId, contentWriterSessions.id)
      )
      .where(
        and(
          eq(contentWriterDrafts.id, id),
          eq(contentWriterSessions.userId, userId)
        )
      );

    if (!draft) return undefined;

    const [updated] = await db
      .update(contentWriterDrafts)
      .set(updates)
      .where(eq(contentWriterDrafts.id, id))
      .returning();
    return updated || undefined;
  },

  /**
   * Delete a content writer draft
   */
  async deleteContentWriterDraft(id: string, userId: string): Promise<boolean> {
    // Verify ownership through session
    const [draft] = await db
      .select({ draft: contentWriterDrafts, session: contentWriterSessions })
      .from(contentWriterDrafts)
      .innerJoin(
        contentWriterSessions,
        eq(contentWriterDrafts.sessionId, contentWriterSessions.id)
      )
      .where(
        and(
          eq(contentWriterDrafts.id, id),
          eq(contentWriterSessions.userId, userId)
        )
      );

    if (!draft) return false;

    const result = await db
      .delete(contentWriterDrafts)
      .where(eq(contentWriterDrafts.id, id));
    return (result.rowCount ?? 0) > 0;
  },

  // ============================================================================
  // LangGraph Thread Methods
  // ============================================================================

  /**
   * Create a LangGraph thread
   */
  async createLanggraphThread(
    thread: InsertLanggraphThread & { userId: string; id?: string }
  ): Promise<LanggraphThread> {
    const [newThread] = await db
      .insert(langgraphThreads)
      .values(thread)
      .returning();
    return newThread;
  },

  /**
   * Get a LangGraph thread by ID
   */
  async getLanggraphThread(
    id: string,
    userId: string
  ): Promise<LanggraphThread | undefined> {
    const [thread] = await db
      .select()
      .from(langgraphThreads)
      .where(
        and(eq(langgraphThreads.id, id), eq(langgraphThreads.userId, userId))
      );
    return thread || undefined;
  },

  /**
   * Get user's LangGraph threads
   */
  async getUserLanggraphThreads(
    userId: string,
    sessionId?: string
  ): Promise<Array<LanggraphThread & { session?: ContentWriterSession }>> {
    if (sessionId) {
      const threads = await db
        .select({ thread: langgraphThreads, session: contentWriterSessions })
        .from(langgraphThreads)
        .leftJoin(
          contentWriterSessions,
          eq(langgraphThreads.sessionId, contentWriterSessions.id)
        )
        .where(
          and(
            eq(langgraphThreads.userId, userId),
            eq(langgraphThreads.sessionId, sessionId)
          )
        )
        .orderBy(desc(langgraphThreads.createdAt));

      return threads.map((t: any) => ({ ...t.thread, session: t.session }));
    }

    const threads = await db
      .select({ thread: langgraphThreads, session: contentWriterSessions })
      .from(langgraphThreads)
      .leftJoin(
        contentWriterSessions,
        eq(langgraphThreads.sessionId, contentWriterSessions.id)
      )
      .where(eq(langgraphThreads.userId, userId))
      .orderBy(desc(langgraphThreads.createdAt));

    return threads.map((t: any) => ({ ...t.thread, session: t.session }));
  },

  /**
   * Update a LangGraph thread
   */
  async updateLanggraphThread(
    id: string,
    userId: string,
    updates: Partial<InsertLanggraphThread>
  ): Promise<LanggraphThread | undefined> {
    const [updated] = await db
      .update(langgraphThreads)
      .set(updates)
      .where(
        and(eq(langgraphThreads.id, id), eq(langgraphThreads.userId, userId))
      )
      .returning();
    return updated || undefined;
  },

  /**
   * Delete a LangGraph thread
   */
  async deleteLanggraphThread(id: string): Promise<boolean> {
    const result = await db
      .delete(langgraphThreads)
      .where(eq(langgraphThreads.id, id));
    return (result.rowCount ?? 0) > 0;
  },
};
