import { z } from 'zod';

/**
 * Guideline profile routes validation schemas
 */

/**
 * Guideline profile type query parameter
 */
export const guidelineProfileQuerySchema = z.object({
  type: z.enum(['brand', 'regulatory']).optional(),
});

/**
 * Guideline profile ID parameter
 */
export const guidelineProfileIdSchema = z.object({
  id: z.string().uuid('Invalid guideline profile ID format'),
});

/**
 * Auto-populate from URL request body
 */
export const autoPopulateUrlSchema = z.object({
  domainUrl: z.string().url('Please provide a valid website URL (e.g., https://example.com)'),
});

/**
 * Auto-populate from PDF request body
 */
export const autoPopulatePdfSchema = z.object({
  pdfBase64: z.string().min(1, 'PDF data is required'),
});

/**
 * Discover context pages request body
 */
export const discoverContextPagesSchema = z.object({
  homepageUrl: z.string().url('Homepage URL is required'),
});

/**
 * Find services by pattern request body
 */
export const findServicesByPatternSchema = z.object({
  exampleServiceUrl: z.string().url('Example service page URL is required'),
  homepageUrl: z.string().url('Homepage URL is required'),
});

/**
 * Extract blog posts request body
 */
export const extractBlogPostsSchema = z.object({
  blogHomeUrl: z.string().url('Blog home page URL is required'),
});

/**
 * Context URLs for extraction
 */
export const contextUrlsSchema = z.object({
  home_page: z.string().url().optional(),
  about_page: z.string().url().optional(),
  service_pages: z.array(z.string().url()).optional(),
  blog_articles: z.array(z.string().url()).optional(),
});

/**
 * Extract context request body
 */
export const extractContextSchema = z.object({
  contextUrls: contextUrlsSchema,
});
