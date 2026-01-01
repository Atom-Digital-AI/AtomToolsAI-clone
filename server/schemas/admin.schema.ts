import { z } from 'zod';
import { paginationSchema, dateRangeSchema } from './common.schema';

/**
 * Admin routes validation schemas
 */

/**
 * AI usage logs query parameters
 */
export const aiUsageLogsQuerySchema = paginationSchema.extend({
  provider: z.string().optional(),
  endpoint: z.string().optional(),
});

/**
 * AI usage summary query parameters
 */
export const aiUsageSummaryQuerySchema = dateRangeSchema;

/**
 * LangGraph metrics query parameters
 */
export const langgraphMetricsQuerySchema = dateRangeSchema;

/**
 * LangGraph threads query parameters (admin)
 */
export const adminLanggraphThreadsQuerySchema = z.object({
  status: z.enum(['pending', 'running', 'completed', 'failed', 'paused', 'cancelled']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});

// Note: threadIdParamsSchema is re-exported from content.schema
