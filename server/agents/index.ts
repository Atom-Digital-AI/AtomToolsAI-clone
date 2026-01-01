/**
 * Agent Validation Wrappers
 *
 * This module provides validated wrappers around existing LangGraph agents.
 * The wrappers add:
 * - Input validation via Zod schemas
 * - Output validation via Zod schemas
 * - Structured logging with correlation IDs
 * - Timing metrics
 *
 * The wrappers do NOT replace the existing LangGraph orchestration.
 * They add a validation layer on top for direct agent invocation.
 */

// Validation wrapper utilities
export {
  wrapAgent,
  wrapAgentWithResult,
  AgentValidationError,
  type AgentWrapper,
  type AgentExecutionResult,
} from './validation-wrapper';

// Concept Generator
export {
  conceptGenerator,
  executeConceptGenerator,
  conceptGeneratorInputSchema,
  conceptGeneratorOutputSchema,
  type ConceptGeneratorInput,
  type ConceptGeneratorOutput,
} from './concept-generator';

// Article Generator
export {
  articleGenerator,
  executeArticleGenerator,
  articleGeneratorInputSchema,
  articleGeneratorOutputSchema,
  type ArticleGeneratorInput,
  type ArticleGeneratorOutput,
} from './article-generator';

// Brand Checker
export {
  brandChecker,
  executeBrandChecker,
  brandCheckerInputSchema,
  brandCheckerOutputSchema,
  type BrandCheckerInput,
  type BrandCheckerOutput,
} from './brand-checker';
