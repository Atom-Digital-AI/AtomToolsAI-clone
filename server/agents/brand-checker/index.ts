import { wrapAgent, wrapAgentWithResult } from '../validation-wrapper';
import {
  brandCheckerInputSchema,
  brandCheckerOutputSchema,
  type BrandCheckerInput,
  type BrandCheckerOutput,
} from './schema';
import { checkBrandMatch as originalCheckBrandMatch } from '../../langgraph/nodes/checkBrandMatch';
import { ContentWriterState } from '../../langgraph/types';

/**
 * Adapter function that bridges the validation schema to the existing LangGraph node.
 *
 * The original checkBrandMatch expects a full ContentWriterState and returns
 * a partial state update. This adapter:
 * 1. Takes validated input matching our schema
 * 2. Builds a minimal ContentWriterState for the original function
 * 3. Returns the output formatted to match our output schema
 */
async function brandCheckerHandler(input: BrandCheckerInput): Promise<BrandCheckerOutput> {
  // Build minimal state for the original LangGraph node
  // Apply defaults for optional fields here
  const state: ContentWriterState = {
    topic: '', // Not needed for brand checking
    userId: input.userId,
    guidelineProfileId: input.guidelineProfileId,
    articleDraft: input.articleDraft,
    // Required defaults for ContentWriterState
    concepts: [],
    subtopics: [],
    selectedSubtopicIds: [],
    errors: input.errors ?? [],
    metadata: input.metadata ?? {},
  };

  // Call the original LangGraph node
  const result = await originalCheckBrandMatch(state);

  // Return formatted output
  return {
    brandScore: result.brandScore ?? 100,
    metadata: {
      ...(result.metadata || {}),
      brandIssues: result.metadata?.brandIssues || [],
    },
    errors: result.errors,
  };
}

/**
 * Wrapped Brand Checker with input/output validation, logging, and timing.
 *
 * Use this for direct invocation with exception handling:
 * ```typescript
 * const result = await brandChecker.execute({
 *   userId: 'user-123',
 *   guidelineProfileId: 'profile-abc',
 *   articleDraft: {
 *     finalArticle: 'The article content...',
 *   },
 * });
 * console.log(`Brand score: ${result.brandScore}`);
 * ```
 */
export const brandChecker = wrapAgent(
  'brand-checker',
  brandCheckerInputSchema,
  brandCheckerOutputSchema,
  brandCheckerHandler
);

/**
 * Wrapped Brand Checker that returns a result object instead of throwing.
 *
 * Use this for orchestration logic where you need timing and error details:
 * ```typescript
 * const result = await executeBrandChecker({
 *   userId: 'user-123',
 *   guidelineProfileId: 'profile-abc',
 *   articleDraft: {
 *     finalArticle: 'The article content...',
 *   },
 * });
 * if (result.success) {
 *   console.log(`Brand score: ${result.data.brandScore}`);
 *   if (result.data.metadata.brandIssues.length > 0) {
 *     console.log('Issues:', result.data.metadata.brandIssues);
 *   }
 * }
 * ```
 */
export const executeBrandChecker = wrapAgentWithResult(
  'brand-checker',
  brandCheckerInputSchema,
  brandCheckerOutputSchema,
  brandCheckerHandler
);

// Re-export types and schemas for convenience
export { brandCheckerInputSchema, brandCheckerOutputSchema };
export type { BrandCheckerInput, BrandCheckerOutput };
