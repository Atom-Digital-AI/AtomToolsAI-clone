import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { requireAuth, requireAdmin } from "../auth";
import { aiUsageLogs, langgraphThreads } from "@shared/schema";
import { validate } from "../middleware/validate";
import { getLogger } from "../logging/logger";
import {
  aiUsageLogsQuerySchema,
  aiUsageSummaryQuerySchema,
  langgraphMetricsQuerySchema,
  adminLanggraphThreadsQuerySchema,
  threadIdParamsSchema,
} from "../schemas";

const router = Router();
const log = getLogger({ module: 'admin.routes' });

/**
 * AI Usage Logs API - Admin only
 */
router.get(
  "/ai-usage-logs",
  requireAuth,
  validate({ query: aiUsageLogsQuerySchema }),
  async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Check if user is admin
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { limit = 100, offset = 0, provider, endpoint } = req.query;

      // Build conditions first
      const conditions = [];
      if (provider) {
        conditions.push(eq(aiUsageLogs.provider, provider as string));
      }
      if (endpoint) {
        conditions.push(eq(aiUsageLogs.endpoint, endpoint as string));
      }

      // Build query with conditions - apply where before orderBy/limit/offset
      let query = db.select().from(aiUsageLogs);

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      query = query
        .orderBy(sql`${aiUsageLogs.createdAt} DESC`)
        .limit(Number(limit))
        .offset(Number(offset)) as typeof query;

      const logs = await (query as any);
      const totalQuery = await db
        .select({ count: sql<number>`count(*)` })
        .from(aiUsageLogs);
      const total = totalQuery[0]?.count || 0;

      res.json({
        logs,
        total,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
        },
      });
    } catch (error) {
      log.error({ error }, "Error fetching AI usage logs");
      res.status(500).json({ message: "Failed to fetch AI usage logs" });
    }
  }
);

/**
 * AI Usage Summary API - Admin only
 */
router.get(
  "/ai-usage-summary",
  requireAuth,
  validate({ query: aiUsageSummaryQuerySchema }),
  async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Check if user is admin
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { startDate, endDate } = req.query;

      // Build date filter
      const conditions = [];
      if (startDate) {
        conditions.push(
          sql`${aiUsageLogs.createdAt} >= ${new Date(startDate as string)}`
        );
      }
      if (endDate) {
        conditions.push(
          sql`${aiUsageLogs.createdAt} <= ${new Date(endDate as string)}`
        );
      }

      const whereClause =
        conditions.length > 0
          ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
          : sql``;

      // Get summary by provider
      const summaryByProvider = await db.execute(sql`
        SELECT
          provider,
          COUNT(*) as call_count,
          SUM(total_tokens) as total_tokens,
          SUM(prompt_tokens) as total_prompt_tokens,
          SUM(completion_tokens) as total_completion_tokens,
          SUM(CAST(estimated_cost AS DECIMAL)) as total_cost,
          AVG(duration_ms) as avg_duration_ms
        FROM ai_usage_logs
        ${whereClause}
        GROUP BY provider
      `);

      // Get summary by endpoint
      const summaryByEndpoint = await db.execute(sql`
        SELECT
          endpoint,
          provider,
          COUNT(*) as call_count,
          SUM(total_tokens) as total_tokens,
          SUM(CAST(estimated_cost AS DECIMAL)) as total_cost
        FROM ai_usage_logs
        ${whereClause}
        GROUP BY endpoint, provider
        ORDER BY total_cost DESC
        LIMIT 20
      `);

      // Get overall totals
      const overallTotal = await db.execute(sql`
        SELECT
          COUNT(*) as total_calls,
          SUM(total_tokens) as total_tokens,
          SUM(CAST(estimated_cost AS DECIMAL)) as total_cost
        FROM ai_usage_logs
        ${whereClause}
      `);

      res.json({
        overall: overallTotal.rows[0] || {
          total_calls: 0,
          total_tokens: 0,
          total_cost: 0,
        },
        byProvider: summaryByProvider.rows || [],
        byEndpoint: summaryByEndpoint.rows || [],
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      });
    } catch (error) {
      log.error({ error }, "Error fetching AI usage summary");
      res.status(500).json({ message: "Failed to fetch AI usage summary" });
    }
  }
);

/**
 * LangGraph Metrics API - Admin only
 */
router.get(
  "/langgraph-metrics",
  requireAuth,
  validate({ query: langgraphMetricsQuerySchema }),
  async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Check if user is admin
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { startDate, endDate } = req.query;

      // Build date filter for threads
      const threadConditions = [];
      if (startDate) {
        threadConditions.push(
          sql`${langgraphThreads.createdAt} >= ${new Date(startDate as string)}`
        );
      }
      if (endDate) {
        threadConditions.push(
          sql`${langgraphThreads.createdAt} <= ${new Date(endDate as string)}`
        );
      }

      const threadWhereClause =
        threadConditions.length > 0
          ? sql`WHERE ${sql.join(threadConditions, sql` AND `)}`
          : sql``;

      // Build date filter for AI usage logs
      const logConditions = [];
      if (startDate) {
        logConditions.push(
          sql`${aiUsageLogs.createdAt} >= ${new Date(startDate as string)}`
        );
      }
      if (endDate) {
        logConditions.push(
          sql`${aiUsageLogs.createdAt} <= ${new Date(endDate as string)}`
        );
      }

      const logWhereClause =
        logConditions.length > 0
          ? sql`WHERE ${sql.join(logConditions, sql` AND `)}`
          : sql``;

      // Get overall thread metrics
      const overallThreadMetrics = await db.execute(sql`
        SELECT
          COUNT(*) as total_threads,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_threads,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_threads,
          COUNT(*) FILTER (WHERE status = 'paused') as paused_threads,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000) FILTER (WHERE status = 'completed') as avg_execution_time_ms
        FROM langgraph_threads
        ${threadWhereClause}
      `);

      // Get quality metrics from thread metadata
      const qualityMetrics = await db.execute(sql`
        SELECT
          AVG(CAST(metadata->>'brandScore' AS FLOAT)) FILTER (WHERE metadata->>'brandScore' IS NOT NULL) as avg_brand_score,
          AVG(CAST(metadata->>'factScore' AS FLOAT)) FILTER (WHERE metadata->>'factScore' IS NOT NULL) as avg_fact_score,
          AVG(CAST(metadata->>'regenerationCount' AS INTEGER)) FILTER (WHERE metadata->>'regenerationCount' IS NOT NULL) as avg_regeneration_count,
          COUNT(*) FILTER (WHERE CAST(COALESCE(metadata->>'regenerationCount', '0') AS INTEGER) > 0) as threads_regenerated,
          COUNT(*) FILTER (WHERE status = 'paused') as threads_requiring_review,
          COUNT(*) as total_counted_threads
        FROM langgraph_threads
        ${threadWhereClause}
      `);

      // Get per-node performance metrics from AI usage logs
      // Filter for content-writer related endpoints
      const nodePerformance = await db.execute(sql`
        SELECT
          endpoint,
          COUNT(*) as call_count,
          SUM(total_tokens) as total_tokens,
          SUM(CAST(estimated_cost AS DECIMAL)) as total_cost,
          AVG(duration_ms) as avg_duration_ms,
          COUNT(*) FILTER (WHERE success = true) as success_count,
          COUNT(*) as total_count
        FROM ai_usage_logs
        ${logWhereClause}
        ${logConditions.length > 0 ? sql`AND` : sql`WHERE`} (
          endpoint LIKE '%generateConcepts%' OR
          endpoint LIKE '%generateSubtopics%' OR
          endpoint LIKE '%generateArticle%' OR
          endpoint LIKE '%checkBrandMatch%' OR
          endpoint LIKE '%verifyFacts%'
        )
        GROUP BY endpoint
        ORDER BY total_cost DESC
      `);

      const overall = overallThreadMetrics.rows[0] || {
        total_threads: 0,
        completed_threads: 0,
        failed_threads: 0,
        paused_threads: 0,
        avg_execution_time_ms: null,
      };

      const quality = qualityMetrics.rows[0] || {
        avg_brand_score: null,
        avg_fact_score: null,
        avg_regeneration_count: null,
        threads_regenerated: 0,
        threads_requiring_review: 0,
        total_counted_threads: 0,
      };

      // Calculate percentages
      const totalThreads = parseInt(quality.total_counted_threads as string) || 0;
      const percentageRegenerated =
        totalThreads > 0
          ? ((parseInt(quality.threads_regenerated as string) || 0) / totalThreads) * 100
          : 0;
      const percentageRequiringReview =
        totalThreads > 0
          ? ((parseInt(quality.threads_requiring_review as string) || 0) / totalThreads) * 100
          : 0;

      res.json({
        overall: {
          total_threads: parseInt(overall.total_threads as string) || 0,
          completed_threads: parseInt(overall.completed_threads as string) || 0,
          failed_threads: parseInt(overall.failed_threads as string) || 0,
          paused_threads: parseInt(overall.paused_threads as string) || 0,
          avg_execution_time_ms: overall.avg_execution_time_ms
            ? parseFloat(overall.avg_execution_time_ms as string)
            : null,
        },
        quality: {
          avg_brand_score: quality.avg_brand_score
            ? parseFloat(quality.avg_brand_score as string)
            : null,
          avg_fact_score: quality.avg_fact_score
            ? parseFloat(quality.avg_fact_score as string)
            : null,
          avg_regeneration_count: quality.avg_regeneration_count
            ? parseFloat(quality.avg_regeneration_count as string)
            : null,
          percentage_regenerated: percentageRegenerated,
          percentage_requiring_review: percentageRequiringReview,
        },
        perNode: nodePerformance.rows.map((row: any) => ({
          endpoint: row.endpoint,
          call_count: parseInt(row.call_count as string) || 0,
          total_tokens: parseInt(row.total_tokens as string) || 0,
          total_cost: parseFloat(row.total_cost as string) || 0,
          avg_duration_ms: row.avg_duration_ms
            ? parseFloat(row.avg_duration_ms as string)
            : 0,
          success_rate:
            row.total_count > 0
              ? ((parseInt(row.success_count as string) || 0) /
                  (parseInt(row.total_count as string) || 1)) *
                100
              : 0,
        })),
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      });
    } catch (error) {
      log.error({ error }, "Error fetching LangGraph metrics");
      res.status(500).json({ message: "Failed to fetch LangGraph metrics" });
    }
  }
);

/**
 * Get all LangGraph threads with filtering (admin only)
 */
router.get(
  "/langgraph-threads",
  requireAuth,
  requireAdmin,
  validate({ query: adminLanggraphThreadsQuerySchema }),
  async (req: any, res) => {
    try {
      const { status, startDate, endDate, search } = req.query;

      const filters: any = {};
      if (status) filters.status = status as string;
      if (startDate) filters.startDate = startDate as string;
      if (endDate) filters.endDate = endDate as string;
      if (search) filters.search = search as string;

      const threads = await storage.getAllLanggraphThreads(filters);
      res.json(threads);
    } catch (error) {
      log.error({ error }, "Error fetching LangGraph threads");
      res.status(500).json({ message: "Failed to fetch threads" });
    }
  }
);

/**
 * Get full thread details (admin only)
 */
router.get(
  "/langgraph-threads/:threadId",
  requireAuth,
  requireAdmin,
  validate({ params: threadIdParamsSchema }),
  async (req: any, res) => {
    try {
      const { threadId } = req.params;

      const details = await storage.getLanggraphThreadDetails(threadId);
      if (!details) {
        return res.status(404).json({ message: "Thread not found" });
      }

      res.json(details);
    } catch (error) {
      log.error({ error }, "Error fetching thread details");
      res.status(500).json({ message: "Failed to fetch thread details" });
    }
  }
);

/**
 * Cancel a thread (admin only)
 */
router.patch(
  "/langgraph-threads/:threadId/cancel",
  requireAuth,
  requireAdmin,
  validate({ params: threadIdParamsSchema }),
  async (req: any, res) => {
    try {
      const { threadId } = req.params;
      const adminUserId = req.user.id;

      const updated = await storage.cancelLanggraphThread(threadId, adminUserId);
      if (!updated) {
        return res.status(404).json({ message: "Thread not found" });
      }

      res.json({ message: "Thread cancelled successfully", thread: updated });
    } catch (error) {
      log.error({ error }, "Error cancelling thread");
      res.status(500).json({ message: "Failed to cancel thread" });
    }
  }
);

/**
 * Delete a thread and its checkpoints (admin only)
 */
router.delete(
  "/langgraph-threads/:threadId",
  requireAuth,
  requireAdmin,
  validate({ params: threadIdParamsSchema }),
  async (req: any, res) => {
    try {
      const { threadId } = req.params;

      const success = await storage.deleteLanggraphThread(threadId);
      if (!success) {
        return res.status(404).json({ message: "Thread not found" });
      }

      res.json({ message: "Thread deleted successfully" });
    } catch (error) {
      log.error({ error }, "Error deleting thread");
      res.status(500).json({ message: "Failed to delete thread" });
    }
  }
);

export default router;
