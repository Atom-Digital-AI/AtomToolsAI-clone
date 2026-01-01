import { wrapAgent, wrapAgentWithResult } from '../validation-wrapper';
import {
  articleGeneratorInputSchema,
  articleGeneratorOutputSchema,
  type ArticleGeneratorInput,
  type ArticleGeneratorOutput,
} from './schema';
import { generateArticle as originalGenerateArticle } from '../../langgraph/nodes/generateArticle';
import { ContentWriterState } from '../../langgraph/types';

/**
 * Adapter function that bridges the validation schema to the existing LangGraph node.
 *
 * The original generateArticle expects a full ContentWriterState and returns
 * a partial state update. This adapter:
 * 1. Takes validated input matching our schema
 * 2. Builds a minimal ContentWriterState for the original function
 * 3. Returns the output formatted to match our output schema
 */
async function articleGeneratorHandler(input: ArticleGeneratorInput): Promise<ArticleGeneratorOutput> {
  // Build minimal state for the original LangGraph node
  // Apply defaults for optional fields here
  const state: ContentWriterState = {
    topic: '', // Not needed for article generation - concept already selected
    userId: input.userId,
    guidelineProfileId: input.guidelineProfileId,
    selectedConceptId: input.selectedConceptId,
    concepts: input.concepts,
    subtopics: input.subtopics,
    selectedSubtopicIds: input.selectedSubtopicIds,
    objective: input.objective,
    targetLength: input.targetLength ?? 1000,
    toneOfVoice: input.toneOfVoice,
    language: input.language ?? 'en-US',
    useBrandGuidelines: input.useBrandGuidelines ?? false,
    selectedTargetAudiences: input.selectedTargetAudiences,
    styleMatchingMethod: input.styleMatchingMethod ?? 'continuous',
    matchStyle: input.matchStyle ?? false,
    // Required defaults for ContentWriterState
    errors: [],
    metadata: {},
  };

  // Call the original LangGraph node
  const result = await originalGenerateArticle(state);

  // Return formatted output
  return {
    articleDraft: result.articleDraft,
    metadata: result.metadata || {},
    status: result.status,
    errors: result.errors,
  };
}

/**
 * Wrapped Article Generator with input/output validation, logging, and timing.
 *
 * Use this for direct invocation with exception handling:
 * ```typescript
 * const result = await articleGenerator.execute({
 *   userId: 'user-123',
 *   selectedConceptId: 'concept-abc',
 *   concepts: [...],
 *   subtopics: [...],
 *   selectedSubtopicIds: ['sub-1', 'sub-2'],
 * });
 * ```
 */
export const articleGenerator = wrapAgent(
  'article-generator',
  articleGeneratorInputSchema,
  articleGeneratorOutputSchema,
  articleGeneratorHandler
);

/**
 * Wrapped Article Generator that returns a result object instead of throwing.
 *
 * Use this for orchestration logic where you need timing and error details:
 * ```typescript
 * const result = await executeArticleGenerator({
 *   userId: 'user-123',
 *   selectedConceptId: 'concept-abc',
 *   concepts: [...],
 *   subtopics: [...],
 *   selectedSubtopicIds: ['sub-1', 'sub-2'],
 * });
 * if (result.success) {
 *   console.log(result.data.articleDraft.finalArticle);
 * }
 * ```
 */
export const executeArticleGenerator = wrapAgentWithResult(
  'article-generator',
  articleGeneratorInputSchema,
  articleGeneratorOutputSchema,
  articleGeneratorHandler
);

// Re-export types and schemas for convenience
export { articleGeneratorInputSchema, articleGeneratorOutputSchema };
export type { ArticleGeneratorInput, ArticleGeneratorOutput };
