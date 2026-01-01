import { z } from 'zod';

/**
 * Content routes validation schemas
 */

/**
 * Generated content query parameters
 */
export const generatedContentQuerySchema = z.object({
  toolType: z.string().optional(),
});

/**
 * Generated content ID parameter
 */
export const generatedContentIdSchema = z.object({
  id: z.string().uuid('Invalid content ID format'),
});

/**
 * Create generated content request body
 */
export const createGeneratedContentSchema = z.object({
  toolType: z.string().min(1, 'Tool type is required'),
  title: z.string().min(1, 'Title is required'),
  inputData: z.record(z.unknown()).refine(val => Object.keys(val).length > 0, {
    message: 'Input data cannot be empty',
  }),
  outputData: z.record(z.unknown()).refine(val => Object.keys(val).length > 0, {
    message: 'Output data cannot be empty',
  }),
});

/**
 * Content feedback request body
 */
export const contentFeedbackSchema = z.object({
  toolType: z.string().min(1, 'Tool type is required'),
  rating: z.number().int().min(1).max(5),
  feedbackText: z.string().optional(),
  inputData: z.record(z.unknown()),
  outputData: z.record(z.unknown()),
  guidelineProfileId: z.string().uuid().optional().nullable(),
});

/**
 * LangGraph content writer start request
 */
export const langgraphStartSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  guidelineProfileId: z.string().uuid().optional(),
  objective: z.string().optional(),
  targetLength: z.number().int().positive().optional(),
  toneOfVoice: z.string().optional(),
  language: z.string().optional(),
  internalLinks: z.array(z.string()).optional(),
  useBrandGuidelines: z.boolean().optional(),
  selectedTargetAudiences: z
    .union([z.literal('all'), z.literal('none'), z.array(z.number()), z.null()])
    .optional(),
  styleMatchingMethod: z.enum(['continuous', 'end-rewrite']).optional(),
  matchStyle: z.boolean().optional(),
});

/**
 * LangGraph resume request
 */
export const langgraphResumeSchema = z.object({
  selectedConceptId: z.string().optional(),
  selectedSubtopicIds: z.array(z.string()).optional(),
});

/**
 * LangGraph thread ID parameter
 */
export const threadIdParamsSchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required'),
});

/**
 * LangGraph threads query
 */
export const langgraphThreadsQuerySchema = z.object({
  sessionId: z.string().uuid().optional(),
});

/**
 * Content writer draft ID parameter
 */
export const draftIdParamsSchema = z.object({
  id: z.string().uuid('Invalid draft ID format'),
});
