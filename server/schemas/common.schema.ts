import { z } from 'zod';

/**
 * Common validation schemas shared across multiple routes
 */

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Pagination query parameters
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Date range query parameters
 */
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * ID parameter schema
 */
export const idParamsSchema = z.object({
  id: uuidSchema,
});

/**
 * Tool type enum values
 */
export const toolTypeSchema = z.enum([
  'content-writer',
  'seo-meta-generator',
  'google-ads-copy',
  'social-content',
]);

/**
 * Base API response schema
 */
export const successResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.object({
      path: z.string(),
      message: z.string(),
    })).optional(),
  }),
});
