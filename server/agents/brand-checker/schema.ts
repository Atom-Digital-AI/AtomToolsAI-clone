import { z } from 'zod';

/**
 * Schema for article draft in input
 */
const articleDraftInputSchema = z.object({
  mainBrief: z.string().optional(),
  subtopicBriefs: z.array(z.object({
    subtopicId: z.string(),
    brief: z.string(),
  })).optional(),
  subtopicContents: z.array(z.object({
    subtopicId: z.string(),
    content: z.string(),
  })).optional(),
  topAndTail: z.string().optional(),
  finalArticle: z.string().optional(),
  metadata: z.object({
    wordCount: z.number().optional(),
    generatedAt: z.string().optional(),
    brandScore: z.number().optional(),
    factScore: z.number().optional(),
  }).optional(),
});

/**
 * Input schema for the Brand Checker agent.
 * Based on the ContentWriterState fields used by checkBrandMatch.ts
 *
 * Note: Using optional() instead of default() to avoid TypeScript type inference issues.
 * Defaults are applied in the handler function.
 */
export const brandCheckerInputSchema = z.object({
  // Required fields
  userId: z.string().min(1, 'User ID is required'),

  // Article to check
  articleDraft: articleDraftInputSchema.optional(),

  // Brand guidelines reference
  guidelineProfileId: z.string().optional(),

  // Existing metadata to preserve
  metadata: z.record(z.any()).optional(),

  // Existing errors to preserve - optional, defaults applied in handler
  errors: z.array(z.object({
    step: z.string(),
    message: z.string(),
    timestamp: z.string(),
  })).optional(),
});

/**
 * Output schema for the Brand Checker agent.
 * Returns brand match score and issues.
 */
export const brandCheckerOutputSchema = z.object({
  // Brand match score (0-100)
  brandScore: z.number().min(0).max(100),

  // Metadata with brand issues - flexible to accommodate all possible fields
  metadata: z.record(z.any()).optional(),

  // Errors (only populated on failure)
  errors: z.array(z.object({
    step: z.string(),
    message: z.string(),
    timestamp: z.string(),
  })).optional(),
});

export type BrandCheckerInput = z.infer<typeof brandCheckerInputSchema>;
export type BrandCheckerOutput = z.infer<typeof brandCheckerOutputSchema>;
