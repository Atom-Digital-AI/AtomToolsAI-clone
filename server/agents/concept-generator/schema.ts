import { z } from 'zod';

/**
 * Input schema for the Concept Generator agent.
 * Based on the ContentWriterState fields used by generateConcepts.ts
 *
 * Note: Using optional() instead of default() to avoid TypeScript type inference issues
 * with Zod's input vs output types. Defaults are applied in the handler.
 */
export const conceptGeneratorInputSchema = z.object({
  // Required fields
  topic: z.string().min(1, 'Topic is required'),
  userId: z.string().min(1, 'User ID is required'),

  // Optional fields
  guidelineProfileId: z.string().optional(),
  styleMatchingMethod: z.enum(['continuous', 'end-rewrite']).optional(),
  matchStyle: z.boolean().optional(),

  // Brand context (optional)
  brandContext: z.object({
    toneOfVoice: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
});

/**
 * Schema for a single article concept.
 * Note: id is optional in the original ArticleConcept type.
 */
export const articleConceptSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  summary: z.string().min(1),
  rankOrder: z.number().int().min(1),
  userAction: z.string().optional(),
  feedbackId: z.string().optional(),
});

/**
 * Output schema for the Concept Generator agent.
 * Returns generated concepts and metadata.
 */
export const conceptGeneratorOutputSchema = z.object({
  // Generated concepts
  concepts: z.array(articleConceptSchema),

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

export type ConceptGeneratorInput = z.infer<typeof conceptGeneratorInputSchema>;
export type ConceptGeneratorOutput = z.infer<typeof conceptGeneratorOutputSchema>;
export type ArticleConcept = z.infer<typeof articleConceptSchema>;
