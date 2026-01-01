import { z } from 'zod';

/**
 * Schema for article concept (input reference)
 */
const articleConceptInputSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  rankOrder: z.number(),
  userAction: z.string().optional(),
  feedbackId: z.string().optional(),
});

/**
 * Schema for article subtopic (input reference)
 */
const articleSubtopicInputSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  summary: z.string(),
  rankOrder: z.number(),
  isSelected: z.boolean(),
  userAction: z.string().optional(),
  feedbackId: z.string().optional(),
});

/**
 * Input schema for the Article Generator agent.
 * Based on the ContentWriterState fields used by generateArticle.ts
 *
 * Note: Using optional() instead of default() to avoid TypeScript type inference issues.
 * Defaults are applied in the handler function.
 */
export const articleGeneratorInputSchema = z.object({
  // Required fields
  userId: z.string().min(1, 'User ID is required'),
  selectedConceptId: z.string().min(1, 'Selected concept ID is required'),
  concepts: z.array(articleConceptInputSchema).min(1, 'At least one concept is required'),
  subtopics: z.array(articleSubtopicInputSchema).min(1, 'At least one subtopic is required'),
  selectedSubtopicIds: z.array(z.string()).min(1, 'At least one subtopic must be selected'),

  // Optional fields - defaults applied in handler
  guidelineProfileId: z.string().optional(),
  objective: z.string().optional(),
  targetLength: z.number().int().min(100).max(10000).optional(),
  toneOfVoice: z.string().optional(),
  language: z.string().optional(),
  useBrandGuidelines: z.boolean().optional(),
  selectedTargetAudiences: z.union([
    z.literal('all'),
    z.literal('none'),
    z.array(z.number()),
    z.null(),
  ]).optional(),
  styleMatchingMethod: z.enum(['continuous', 'end-rewrite']).optional(),
  matchStyle: z.boolean().optional(),
});

/**
 * Schema for subtopic brief in output
 */
const subtopicBriefSchema = z.object({
  subtopicId: z.string(),
  brief: z.string(),
});

/**
 * Schema for subtopic content in output
 */
const subtopicContentSchema = z.object({
  subtopicId: z.string(),
  content: z.string(),
});

/**
 * Schema for article draft output
 */
const articleDraftSchema = z.object({
  mainBrief: z.string().optional(),
  subtopicBriefs: z.array(subtopicBriefSchema).optional(),
  subtopicContents: z.array(subtopicContentSchema).optional(),
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
 * Output schema for the Article Generator agent.
 * Returns the generated article draft and metadata.
 */
export const articleGeneratorOutputSchema = z.object({
  // Generated article draft
  articleDraft: articleDraftSchema.optional(),

  // Metadata about the generation - flexible to accommodate all possible steps
  metadata: z.record(z.any()).optional(),

  // Status
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),

  // Errors (empty array on success)
  errors: z.array(z.object({
    step: z.string(),
    message: z.string(),
    timestamp: z.string(),
  })).optional(),
});

export type ArticleGeneratorInput = z.infer<typeof articleGeneratorInputSchema>;
export type ArticleGeneratorOutput = z.infer<typeof articleGeneratorOutputSchema>;
export type ArticleDraft = z.infer<typeof articleDraftSchema>;
