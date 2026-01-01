import { wrapAgent, wrapAgentWithResult } from '../validation-wrapper';
import {
  conceptGeneratorInputSchema,
  conceptGeneratorOutputSchema,
  type ConceptGeneratorInput,
  type ConceptGeneratorOutput,
} from './schema';
import { generateConcepts as originalGenerateConcepts } from '../../langgraph/nodes/generateConcepts';
import { ContentWriterState } from '../../langgraph/types';

/**
 * Adapter function that bridges the validation schema to the existing LangGraph node.
 *
 * The original generateConcepts expects a full ContentWriterState and returns
 * a partial state update. This adapter:
 * 1. Takes validated input matching our schema
 * 2. Builds a minimal ContentWriterState for the original function
 * 3. Returns the output formatted to match our output schema
 */
async function conceptGeneratorHandler(input: ConceptGeneratorInput): Promise<ConceptGeneratorOutput> {
  // Build minimal state for the original LangGraph node
  // Apply defaults for optional fields here
  const state: ContentWriterState = {
    topic: input.topic,
    userId: input.userId,
    guidelineProfileId: input.guidelineProfileId,
    styleMatchingMethod: input.styleMatchingMethod ?? 'continuous',
    matchStyle: input.matchStyle ?? false,
    // Required defaults for ContentWriterState
    concepts: [],
    subtopics: [],
    selectedSubtopicIds: [],
    errors: [],
    metadata: {},
  };

  // Call the original LangGraph node
  const result = await originalGenerateConcepts(state);

  // Return formatted output
  return {
    concepts: result.concepts || [],
    metadata: {
      ...(result.metadata || {}),
      generatedAt: new Date().toISOString(),
    },
    status: result.status,
    errors: result.errors,
  };
}

/**
 * Wrapped Concept Generator with input/output validation, logging, and timing.
 *
 * Use this for direct invocation with exception handling:
 * ```typescript
 * const result = await conceptGenerator.execute({
 *   topic: 'AI in Healthcare',
 *   userId: 'user-123',
 * });
 * ```
 */
export const conceptGenerator = wrapAgent(
  'concept-generator',
  conceptGeneratorInputSchema,
  conceptGeneratorOutputSchema,
  conceptGeneratorHandler
);

/**
 * Wrapped Concept Generator that returns a result object instead of throwing.
 *
 * Use this for orchestration logic where you need timing and error details:
 * ```typescript
 * const result = await executeConceptGenerator({
 *   topic: 'AI in Healthcare',
 *   userId: 'user-123',
 * });
 * if (result.success) {
 *   console.log(result.data.concepts);
 * } else {
 *   console.log(result.error);
 * }
 * ```
 */
export const executeConceptGenerator = wrapAgentWithResult(
  'concept-generator',
  conceptGeneratorInputSchema,
  conceptGeneratorOutputSchema,
  conceptGeneratorHandler
);

// Re-export types and schemas for convenience
export { conceptGeneratorInputSchema, conceptGeneratorOutputSchema };
export type { ConceptGeneratorInput, ConceptGeneratorOutput };
