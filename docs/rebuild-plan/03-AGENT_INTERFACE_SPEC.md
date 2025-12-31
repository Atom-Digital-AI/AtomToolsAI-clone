# Agent Interface Technical Specification

## Document Purpose

This document provides the complete technical specification for the tool-agnostic agent system. It defines interfaces, types, schemas, and implementation patterns that all agents must follow.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Core Interfaces](#2-core-interfaces)
3. [Agent Context](#3-agent-context)
4. [Agent Result](#4-agent-result)
5. [Schema Requirements](#5-schema-requirements)
6. [Agent Registry](#6-agent-registry)
7. [Agent Executor](#7-agent-executor)
8. [Error Handling](#8-error-handling)
9. [Testing Requirements](#9-testing-requirements)
10. [Migration Guide](#10-migration-guide)
11. [Reference Implementation](#11-reference-implementation)

---

## 1. Design Principles

### 1.1 Tool-Agnostic

Agents MUST NOT:
- Import or reference specific tool types (e.g., `ContentWriterState`)
- Know which tool is calling them
- Access global state or singletons
- Make assumptions about the orchestration flow

Agents MUST:
- Accept generic, validated inputs
- Return generic, validated outputs
- Receive all dependencies via context injection
- Be usable by any tool that provides correct inputs

### 1.2 Strict Validation

Every agent MUST:
- Define a Zod schema for inputs
- Define a Zod schema for outputs
- Validate inputs before execution
- Validate outputs before returning
- Include validation in execution time metrics

### 1.3 Stateless Execution

Agents MUST:
- Not maintain state between executions
- Receive all required data in the input
- Return all produced data in the output
- Not rely on execution order (unless explicitly documented)

### 1.4 Observable

Agents MUST:
- Log execution start/end with correlation ID
- Report execution time
- Report token usage (for LLM agents)
- Report model used (for LLM agents)
- Emit structured errors with full context

---

## 2. Core Interfaces

### 2.1 IAgent Interface

```typescript
// File: /agents/core/types.ts

import { z, ZodSchema } from 'zod';

/**
 * Base interface for all agents.
 *
 * @typeParam TInput - The validated input type
 * @typeParam TOutput - The validated output type
 */
export interface IAgent<TInput, TOutput> {
  /**
   * Unique identifier for this agent.
   * Format: kebab-case (e.g., 'concept-generator')
   */
  readonly id: string;

  /**
   * Semantic version of this agent.
   * Format: semver (e.g., '1.0.0')
   */
  readonly version: string;

  /**
   * Human-readable name for display.
   */
  readonly name: string;

  /**
   * Description of what this agent does.
   */
  readonly description: string;

  /**
   * Zod schema for validating inputs.
   * Execution will fail if input doesn't match.
   */
  readonly inputSchema: ZodSchema<TInput>;

  /**
   * Zod schema for validating outputs.
   * Execution will fail if output doesn't match.
   */
  readonly outputSchema: ZodSchema<TOutput>;

  /**
   * Execute the agent with validated input.
   *
   * @param input - Validated input matching inputSchema
   * @param context - Execution context with services and metadata
   * @returns Promise resolving to AgentResult with validated output
   * @throws AgentExecutionError if execution fails
   */
  execute(
    input: TInput,
    context: AgentContext
  ): Promise<AgentResult<TOutput>>;
}
```

### 2.2 Type Exports

```typescript
// File: /agents/core/types.ts (continued)

/**
 * Extract input type from agent
 */
export type AgentInput<T> = T extends IAgent<infer I, unknown> ? I : never;

/**
 * Extract output type from agent
 */
export type AgentOutput<T> = T extends IAgent<unknown, infer O> ? O : never;

/**
 * Agent metadata for registry
 */
export interface AgentMetadata {
  id: string;
  version: string;
  name: string;
  description: string;
  inputSchema: ZodSchema<unknown>;
  outputSchema: ZodSchema<unknown>;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 3. Agent Context

### 3.1 Context Interface

```typescript
// File: /agents/core/context.ts

import { Logger } from 'pino';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Context passed to every agent execution.
 * Contains all dependencies and metadata needed for execution.
 */
export interface AgentContext {
  /**
   * Unique ID for tracing this request across services.
   * Format: nanoid (e.g., 'abc123def456')
   */
  readonly correlationId: string;

  /**
   * User ID making this request (if authenticated).
   * May be undefined for system-initiated executions.
   */
  readonly userId?: string;

  /**
   * API key ID used for this request (if API key auth).
   * Used for rate limiting and audit logging.
   */
  readonly apiKeyId?: string;

  /**
   * Tool ID that initiated this execution.
   * Used for metrics and audit logging.
   */
  readonly toolId?: string;

  /**
   * Step index within orchestration (if applicable).
   */
  readonly stepIndex?: number;

  /**
   * Pre-configured logger with context.
   * Already includes correlationId, agentId, userId.
   */
  readonly logger: Logger;

  /**
   * Service container for accessing dependencies.
   */
  readonly services: ServiceContainer;

  /**
   * Configuration for this execution.
   */
  readonly config: AgentConfig;
}

/**
 * Service container providing access to all dependencies.
 * Services are lazily resolved from DI container.
 */
export interface ServiceContainer {
  /**
   * Supabase client for database operations.
   */
  readonly supabase: SupabaseClient;

  /**
   * RAG service for semantic search.
   */
  readonly rag: IRagService;

  /**
   * Embedding service for vector generation.
   */
  readonly embedding: IEmbeddingService;

  /**
   * Brand analyzer for brand matching.
   */
  readonly brandAnalyzer: IBrandAnalyzerService;

  /**
   * LLM client for AI completions.
   */
  readonly llm: ILLMService;
}

/**
 * Configuration options for agent execution.
 */
export interface AgentConfig {
  /**
   * Maximum execution time in milliseconds.
   * Default: 30000 (30 seconds)
   */
  readonly timeoutMs: number;

  /**
   * Whether to enable detailed logging.
   * Default: false in production
   */
  readonly debug: boolean;

  /**
   * LLM model to use (if applicable).
   * Default: 'claude-3-5-sonnet-20241022'
   */
  readonly model?: string;

  /**
   * Maximum tokens for LLM response.
   */
  readonly maxTokens?: number;

  /**
   * Temperature for LLM response.
   */
  readonly temperature?: number;
}
```

### 3.2 Context Factory

```typescript
// File: /agents/core/context-factory.ts

import { createContainer, asClass, asValue, InjectionMode } from 'awilix';
import { nanoid } from 'nanoid';
import pino from 'pino';

/**
 * Factory for creating agent execution contexts.
 */
export class AgentContextFactory {
  private container;

  constructor(config: ContextFactoryConfig) {
    this.container = createContainer({
      injectionMode: InjectionMode.CLASSIC,
    });

    // Register services
    this.container.register({
      supabase: asValue(config.supabase),
      rag: asClass(RagService).singleton(),
      embedding: asClass(EmbeddingService).singleton(),
      brandAnalyzer: asClass(BrandAnalyzerService).singleton(),
      llm: asClass(LLMService).singleton(),
    });
  }

  /**
   * Create a new context for agent execution.
   */
  createContext(params: CreateContextParams): AgentContext {
    const correlationId = params.correlationId ?? nanoid();

    const logger = pino({
      level: params.debug ? 'debug' : 'info',
    }).child({
      correlationId,
      agentId: params.agentId,
      userId: params.userId,
      toolId: params.toolId,
    });

    return {
      correlationId,
      userId: params.userId,
      apiKeyId: params.apiKeyId,
      toolId: params.toolId,
      stepIndex: params.stepIndex,
      logger,
      services: {
        supabase: this.container.resolve('supabase'),
        rag: this.container.resolve('rag'),
        embedding: this.container.resolve('embedding'),
        brandAnalyzer: this.container.resolve('brandAnalyzer'),
        llm: this.container.resolve('llm'),
      },
      config: {
        timeoutMs: params.timeoutMs ?? 30000,
        debug: params.debug ?? false,
        model: params.model,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
      },
    };
  }
}

interface CreateContextParams {
  agentId: string;
  correlationId?: string;
  userId?: string;
  apiKeyId?: string;
  toolId?: string;
  stepIndex?: number;
  timeoutMs?: number;
  debug?: boolean;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}
```

---

## 4. Agent Result

### 4.1 Result Types

```typescript
// File: /agents/core/result.ts

/**
 * Result of agent execution.
 * Always includes metadata regardless of success/failure.
 */
export type AgentResult<T> = AgentSuccess<T> | AgentFailure;

/**
 * Successful agent execution result.
 */
export interface AgentSuccess<T> {
  readonly success: true;

  /**
   * The validated output data.
   */
  readonly data: T;

  /**
   * Execution metadata.
   */
  readonly metadata: AgentMetadata;
}

/**
 * Failed agent execution result.
 */
export interface AgentFailure {
  readonly success: false;

  /**
   * Error details.
   */
  readonly error: AgentError;

  /**
   * Execution metadata (partial - up to failure point).
   */
  readonly metadata: AgentMetadata;
}

/**
 * Metadata about agent execution.
 */
export interface AgentMetadata {
  /**
   * Agent that was executed.
   */
  readonly agentId: string;

  /**
   * Agent version.
   */
  readonly agentVersion: string;

  /**
   * Correlation ID for tracing.
   */
  readonly correlationId: string;

  /**
   * Execution start time.
   */
  readonly startedAt: Date;

  /**
   * Execution end time.
   */
  readonly completedAt: Date;

  /**
   * Total execution time in milliseconds.
   */
  readonly executionTimeMs: number;

  /**
   * LLM tokens used (if applicable).
   */
  readonly tokensUsed?: TokenUsage;

  /**
   * LLM model used (if applicable).
   */
  readonly model?: string;
}

/**
 * Token usage breakdown.
 */
export interface TokenUsage {
  readonly prompt: number;
  readonly completion: number;
  readonly total: number;
}

/**
 * Structured error from agent execution.
 */
export interface AgentError {
  /**
   * Error code for programmatic handling.
   */
  readonly code: AgentErrorCode;

  /**
   * Human-readable error message.
   */
  readonly message: string;

  /**
   * Detailed error information.
   */
  readonly details?: Record<string, unknown>;

  /**
   * Original error (for debugging).
   */
  readonly cause?: Error;

  /**
   * Stack trace (in debug mode).
   */
  readonly stack?: string;
}

/**
 * Standard error codes for agents.
 */
export enum AgentErrorCode {
  // Validation errors (4xx equivalent)
  VALIDATION_INPUT = 'VALIDATION_INPUT',
  VALIDATION_OUTPUT = 'VALIDATION_OUTPUT',

  // Execution errors (5xx equivalent)
  EXECUTION_TIMEOUT = 'EXECUTION_TIMEOUT',
  EXECUTION_FAILED = 'EXECUTION_FAILED',

  // External service errors
  LLM_ERROR = 'LLM_ERROR',
  LLM_RATE_LIMIT = 'LLM_RATE_LIMIT',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
}
```

### 4.2 Result Helpers

```typescript
// File: /agents/core/result.ts (continued)

/**
 * Create a successful result.
 */
export function success<T>(
  data: T,
  metadata: AgentMetadata
): AgentSuccess<T> {
  return {
    success: true,
    data,
    metadata,
  };
}

/**
 * Create a failure result.
 */
export function failure(
  error: AgentError,
  metadata: AgentMetadata
): AgentFailure {
  return {
    success: false,
    error,
    metadata,
  };
}

/**
 * Check if result is successful.
 */
export function isSuccess<T>(
  result: AgentResult<T>
): result is AgentSuccess<T> {
  return result.success === true;
}

/**
 * Check if result is failure.
 */
export function isFailure<T>(
  result: AgentResult<T>
): result is AgentFailure {
  return result.success === false;
}
```

---

## 5. Schema Requirements

### 5.1 Schema Guidelines

Every agent MUST define:

1. **Input Schema** (`schema.ts`)
   - All required fields with proper types
   - Optional fields with defaults where appropriate
   - Meaningful error messages
   - Examples in descriptions

2. **Output Schema** (`schema.ts`)
   - All returned fields with proper types
   - Partial results for failure cases
   - Consistent structure across agents

### 5.2 Example Schema

```typescript
// File: /agents/concept-generator/schema.ts

import { z } from 'zod';

/**
 * Input schema for concept generator agent.
 */
export const conceptGeneratorInputSchema = z.object({
  /**
   * The topic to generate concepts for.
   */
  topic: z.string()
    .min(3, 'Topic must be at least 3 characters')
    .max(500, 'Topic must be at most 500 characters')
    .describe('The main topic to generate concepts for'),

  /**
   * Target audience for the content.
   */
  targetAudience: z.string()
    .min(3)
    .max(200)
    .optional()
    .describe('Target audience for the generated concepts'),

  /**
   * Number of concepts to generate.
   */
  count: z.number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe('Number of concepts to generate'),

  /**
   * Brand context for alignment.
   */
  brandContext: z.object({
    voice: z.string().optional(),
    values: z.array(z.string()).optional(),
    restrictions: z.array(z.string()).optional(),
  }).optional()
    .describe('Brand guidelines for concept alignment'),

  /**
   * Language for generation.
   */
  language: z.enum([
    'en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ar'
  ])
    .default('en')
    .describe('Language for generated concepts'),
});

/**
 * Type extracted from input schema.
 */
export type ConceptGeneratorInput = z.infer<typeof conceptGeneratorInputSchema>;

/**
 * Single concept in output.
 */
export const conceptSchema = z.object({
  id: z.string().describe('Unique ID for this concept'),
  title: z.string().describe('Concept title'),
  description: z.string().describe('Detailed concept description'),
  angle: z.string().describe('Unique angle or hook'),
  keywords: z.array(z.string()).describe('Related keywords'),
  targetEmotion: z.string().optional().describe('Target emotional response'),
  confidence: z.number().min(0).max(1).describe('Confidence score'),
});

/**
 * Output schema for concept generator agent.
 */
export const conceptGeneratorOutputSchema = z.object({
  /**
   * Generated concepts.
   */
  concepts: z.array(conceptSchema)
    .min(1)
    .describe('List of generated concepts'),

  /**
   * Analysis of the topic.
   */
  topicAnalysis: z.object({
    mainThemes: z.array(z.string()),
    suggestedAngles: z.array(z.string()),
    competitiveInsights: z.string().optional(),
  }).optional()
    .describe('Optional analysis of the topic'),

  /**
   * Warnings or suggestions.
   */
  warnings: z.array(z.string())
    .optional()
    .describe('Any warnings about the generated content'),
});

/**
 * Type extracted from output schema.
 */
export type ConceptGeneratorOutput = z.infer<typeof conceptGeneratorOutputSchema>;
```

### 5.3 Schema Validation Helpers

```typescript
// File: /agents/core/validation.ts

import { ZodSchema, ZodError } from 'zod';
import { AgentError, AgentErrorCode } from './result';

/**
 * Validate input against schema.
 * @throws AgentValidationError if validation fails
 */
export function validateInput<T>(
  schema: ZodSchema<T>,
  input: unknown,
  agentId: string
): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new AgentValidationError(
      AgentErrorCode.VALIDATION_INPUT,
      formatZodError(result.error),
      agentId,
      'input',
      result.error
    );
  }

  return result.data;
}

/**
 * Validate output against schema.
 * @throws AgentValidationError if validation fails
 */
export function validateOutput<T>(
  schema: ZodSchema<T>,
  output: unknown,
  agentId: string
): T {
  const result = schema.safeParse(output);

  if (!result.success) {
    throw new AgentValidationError(
      AgentErrorCode.VALIDATION_OUTPUT,
      formatZodError(result.error),
      agentId,
      'output',
      result.error
    );
  }

  return result.data;
}

/**
 * Format Zod error into readable message.
 */
function formatZodError(error: ZodError): string {
  return error.errors
    .map(e => `${e.path.join('.')}: ${e.message}`)
    .join('; ');
}

/**
 * Custom error for validation failures.
 */
export class AgentValidationError extends Error {
  constructor(
    public readonly code: AgentErrorCode,
    message: string,
    public readonly agentId: string,
    public readonly phase: 'input' | 'output',
    public readonly zodError: ZodError
  ) {
    super(message);
    this.name = 'AgentValidationError';
  }

  toAgentError(): AgentError {
    return {
      code: this.code,
      message: this.message,
      details: {
        agentId: this.agentId,
        phase: this.phase,
        errors: this.zodError.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
          code: e.code,
        })),
      },
      cause: this,
    };
  }
}
```

---

## 6. Agent Registry

### 6.1 Registry Interface

```typescript
// File: /agents/core/registry.ts

import { IAgent } from './types';

/**
 * Registry for discovering and retrieving agents.
 */
export interface IAgentRegistry {
  /**
   * Register an agent with the registry.
   */
  register<TInput, TOutput>(agent: IAgent<TInput, TOutput>): void;

  /**
   * Get an agent by ID.
   * @throws AgentNotFoundError if agent doesn't exist
   */
  get<TInput, TOutput>(id: string): IAgent<TInput, TOutput>;

  /**
   * Get an agent by ID and version.
   * @throws AgentNotFoundError if agent/version doesn't exist
   */
  getVersion<TInput, TOutput>(
    id: string,
    version: string
  ): IAgent<TInput, TOutput>;

  /**
   * Check if an agent exists.
   */
  has(id: string): boolean;

  /**
   * List all registered agents.
   */
  list(): AgentMetadata[];

  /**
   * List all versions of an agent.
   */
  listVersions(id: string): string[];
}
```

### 6.2 Registry Implementation

```typescript
// File: /agents/core/registry.ts (continued)

/**
 * In-memory agent registry.
 * Agents are registered at application startup.
 */
export class AgentRegistry implements IAgentRegistry {
  private agents: Map<string, Map<string, IAgent<unknown, unknown>>> = new Map();

  register<TInput, TOutput>(agent: IAgent<TInput, TOutput>): void {
    if (!this.agents.has(agent.id)) {
      this.agents.set(agent.id, new Map());
    }

    const versions = this.agents.get(agent.id)!;

    if (versions.has(agent.version)) {
      throw new Error(
        `Agent ${agent.id}@${agent.version} is already registered`
      );
    }

    versions.set(agent.version, agent as IAgent<unknown, unknown>);

    console.log(`Registered agent: ${agent.id}@${agent.version}`);
  }

  get<TInput, TOutput>(id: string): IAgent<TInput, TOutput> {
    const versions = this.agents.get(id);

    if (!versions || versions.size === 0) {
      throw new AgentNotFoundError(id);
    }

    // Get latest version
    const sortedVersions = Array.from(versions.keys()).sort(
      (a, b) => this.compareVersions(b, a) // Descending
    );

    return versions.get(sortedVersions[0])! as IAgent<TInput, TOutput>;
  }

  getVersion<TInput, TOutput>(
    id: string,
    version: string
  ): IAgent<TInput, TOutput> {
    const versions = this.agents.get(id);

    if (!versions) {
      throw new AgentNotFoundError(id);
    }

    const agent = versions.get(version);

    if (!agent) {
      throw new AgentNotFoundError(id, version);
    }

    return agent as IAgent<TInput, TOutput>;
  }

  has(id: string): boolean {
    return this.agents.has(id);
  }

  list(): AgentMetadata[] {
    const result: AgentMetadata[] = [];

    for (const [id, versions] of this.agents) {
      for (const [version, agent] of versions) {
        result.push({
          id,
          version,
          name: agent.name,
          description: agent.description,
          inputSchema: agent.inputSchema,
          outputSchema: agent.outputSchema,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return result;
  }

  listVersions(id: string): string[] {
    const versions = this.agents.get(id);
    return versions ? Array.from(versions.keys()) : [];
  }

  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (partsA[i] > partsB[i]) return 1;
      if (partsA[i] < partsB[i]) return -1;
    }

    return 0;
  }
}

/**
 * Error thrown when agent is not found.
 */
export class AgentNotFoundError extends Error {
  constructor(id: string, version?: string) {
    super(
      version
        ? `Agent ${id}@${version} not found`
        : `Agent ${id} not found`
    );
    this.name = 'AgentNotFoundError';
  }
}

/**
 * Global registry instance.
 * Populated at application startup.
 */
export const agentRegistry = new AgentRegistry();
```

---

## 7. Agent Executor

### 7.1 Executor Implementation

```typescript
// File: /agents/core/executor.ts

import { IAgent, AgentContext, AgentResult, AgentMetadata } from './types';
import { success, failure, AgentErrorCode } from './result';
import { validateInput, validateOutput, AgentValidationError } from './validation';

/**
 * Wraps agent execution with validation, timing, and error handling.
 */
export class AgentExecutor {
  constructor(
    private readonly contextFactory: AgentContextFactory
  ) {}

  /**
   * Execute an agent with full validation and instrumentation.
   */
  async execute<TInput, TOutput>(
    agent: IAgent<TInput, TOutput>,
    rawInput: unknown,
    params: ExecuteParams
  ): Promise<AgentResult<TOutput>> {
    const startedAt = new Date();

    // Create context
    const context = this.contextFactory.createContext({
      agentId: agent.id,
      correlationId: params.correlationId,
      userId: params.userId,
      apiKeyId: params.apiKeyId,
      toolId: params.toolId,
      stepIndex: params.stepIndex,
      debug: params.debug,
      model: params.model,
      maxTokens: params.maxTokens,
      temperature: params.temperature,
    });

    context.logger.info({
      event: 'agent_execution_started',
      input: params.debug ? rawInput : undefined,
    });

    try {
      // Validate input
      const validatedInput = validateInput(
        agent.inputSchema,
        rawInput,
        agent.id
      );

      // Execute with timeout
      const rawOutput = await this.executeWithTimeout(
        () => agent.execute(validatedInput, context),
        context.config.timeoutMs
      );

      // Extract output data (handle nested result case)
      const outputData = this.extractOutputData(rawOutput);

      // Validate output
      const validatedOutput = validateOutput(
        agent.outputSchema,
        outputData,
        agent.id
      );

      const completedAt = new Date();
      const executionTimeMs = completedAt.getTime() - startedAt.getTime();

      const metadata: AgentMetadata = {
        agentId: agent.id,
        agentVersion: agent.version,
        correlationId: context.correlationId,
        startedAt,
        completedAt,
        executionTimeMs,
        tokensUsed: this.extractTokenUsage(rawOutput),
        model: this.extractModel(rawOutput, context),
      };

      context.logger.info({
        event: 'agent_execution_completed',
        executionTimeMs,
        tokensUsed: metadata.tokensUsed,
      });

      // Log to audit table
      await this.logAudit(context, metadata, 'success');

      return success(validatedOutput, metadata);

    } catch (error) {
      const completedAt = new Date();
      const executionTimeMs = completedAt.getTime() - startedAt.getTime();

      const metadata: AgentMetadata = {
        agentId: agent.id,
        agentVersion: agent.version,
        correlationId: context.correlationId,
        startedAt,
        completedAt,
        executionTimeMs,
      };

      const agentError = this.toAgentError(error, context);

      context.logger.error({
        event: 'agent_execution_failed',
        error: agentError,
        executionTimeMs,
      });

      // Log to audit table
      await this.logAudit(context, metadata, 'failure', agentError);

      return failure(agentError, metadata);
    }
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private extractOutputData(result: unknown): unknown {
    // Handle case where agent returns AgentResult directly
    if (
      typeof result === 'object' &&
      result !== null &&
      'success' in result &&
      'data' in result
    ) {
      return (result as { data: unknown }).data;
    }
    return result;
  }

  private extractTokenUsage(result: unknown): TokenUsage | undefined {
    if (
      typeof result === 'object' &&
      result !== null &&
      'metadata' in result
    ) {
      const metadata = (result as { metadata: unknown }).metadata;
      if (
        typeof metadata === 'object' &&
        metadata !== null &&
        'tokensUsed' in metadata
      ) {
        return (metadata as { tokensUsed: TokenUsage }).tokensUsed;
      }
    }
    return undefined;
  }

  private extractModel(result: unknown, context: AgentContext): string | undefined {
    if (
      typeof result === 'object' &&
      result !== null &&
      'metadata' in result
    ) {
      const metadata = (result as { metadata: unknown }).metadata;
      if (
        typeof metadata === 'object' &&
        metadata !== null &&
        'model' in metadata
      ) {
        return (metadata as { model: string }).model;
      }
    }
    return context.config.model;
  }

  private toAgentError(error: unknown, context: AgentContext): AgentError {
    if (error instanceof AgentValidationError) {
      return error.toAgentError();
    }

    if (error instanceof Error) {
      // Check for known error types
      if (error.message.includes('timed out')) {
        return {
          code: AgentErrorCode.EXECUTION_TIMEOUT,
          message: error.message,
          cause: error,
          stack: context.config.debug ? error.stack : undefined,
        };
      }

      if (error.message.includes('rate limit')) {
        return {
          code: AgentErrorCode.LLM_RATE_LIMIT,
          message: error.message,
          cause: error,
          stack: context.config.debug ? error.stack : undefined,
        };
      }

      return {
        code: AgentErrorCode.EXECUTION_FAILED,
        message: error.message,
        cause: error,
        stack: context.config.debug ? error.stack : undefined,
      };
    }

    return {
      code: AgentErrorCode.INTERNAL_ERROR,
      message: String(error),
    };
  }

  private async logAudit(
    context: AgentContext,
    metadata: AgentMetadata,
    status: 'success' | 'failure',
    error?: AgentError
  ): Promise<void> {
    try {
      await context.services.supabase
        .from('agent_audit_logs')
        .insert({
          correlation_id: context.correlationId,
          agent_id: metadata.agentId,
          agent_version: metadata.agentVersion,
          user_id: context.userId,
          api_key_id: context.apiKeyId,
          tool_id: context.toolId,
          step_index: context.stepIndex,
          status,
          execution_time_ms: metadata.executionTimeMs,
          tokens_used: metadata.tokensUsed,
          model: metadata.model,
          error_code: error?.code,
          error_message: error?.message,
          started_at: metadata.startedAt.toISOString(),
          completed_at: metadata.completedAt.toISOString(),
        });
    } catch (auditError) {
      context.logger.error({
        event: 'audit_log_failed',
        error: auditError,
      });
    }
  }
}

interface ExecuteParams {
  correlationId?: string;
  userId?: string;
  apiKeyId?: string;
  toolId?: string;
  stepIndex?: number;
  debug?: boolean;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}
```

---

## 8. Error Handling

### 8.1 Error Hierarchy

```typescript
// File: /agents/core/errors.ts

/**
 * Base error for all agent-related errors.
 */
export class AgentError extends Error {
  constructor(
    public readonly code: AgentErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

/**
 * Error when agent validation fails.
 */
export class ValidationError extends AgentError {
  constructor(
    phase: 'input' | 'output',
    message: string,
    public readonly zodError: ZodError
  ) {
    super(
      phase === 'input'
        ? AgentErrorCode.VALIDATION_INPUT
        : AgentErrorCode.VALIDATION_OUTPUT,
      message,
      { zodErrors: zodError.errors }
    );
    this.name = 'ValidationError';
  }
}

/**
 * Error when agent execution times out.
 */
export class TimeoutError extends AgentError {
  constructor(timeoutMs: number) {
    super(
      AgentErrorCode.EXECUTION_TIMEOUT,
      `Agent execution timed out after ${timeoutMs}ms`,
      { timeoutMs }
    );
    this.name = 'TimeoutError';
  }
}

/**
 * Error when LLM call fails.
 */
export class LLMError extends AgentError {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number
  ) {
    super(AgentErrorCode.LLM_ERROR, message, { provider, statusCode });
    this.name = 'LLMError';
  }
}

/**
 * Error when database operation fails.
 */
export class DatabaseError extends AgentError {
  constructor(message: string, public readonly operation: string) {
    super(AgentErrorCode.DATABASE_ERROR, message, { operation });
    this.name = 'DatabaseError';
  }
}
```

---

## 9. Testing Requirements

### 9.1 Unit Test Template

Every agent MUST have unit tests covering:

```typescript
// File: /agents/concept-generator/concept-generator.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConceptGeneratorAgent } from './index';
import { createMockContext } from '../core/testing';

describe('ConceptGeneratorAgent', () => {
  let agent: ConceptGeneratorAgent;
  let mockContext: AgentContext;

  beforeEach(() => {
    agent = new ConceptGeneratorAgent();
    mockContext = createMockContext({
      llm: {
        complete: vi.fn().mockResolvedValue({
          content: JSON.stringify({
            concepts: [
              {
                id: 'concept-1',
                title: 'Test Concept',
                description: 'Test description',
                angle: 'Test angle',
                keywords: ['test'],
                confidence: 0.9,
              },
            ],
          }),
          usage: { prompt: 100, completion: 50, total: 150 },
        }),
      },
    });
  });

  describe('Input Validation', () => {
    it('should accept valid input', async () => {
      const input = {
        topic: 'Climate Change',
        count: 3,
        language: 'en',
      };

      const result = await agent.execute(input, mockContext);
      expect(result.success).toBe(true);
    });

    it('should reject input with missing required fields', async () => {
      const input = {
        count: 3,
      };

      const result = await agent.execute(input as any, mockContext);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_INPUT');
    });

    it('should reject input with invalid topic length', async () => {
      const input = {
        topic: 'ab', // Too short
        count: 3,
      };

      const result = await agent.execute(input, mockContext);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('at least 3 characters');
    });
  });

  describe('Output Validation', () => {
    it('should return valid output structure', async () => {
      const input = { topic: 'AI in Healthcare', count: 2 };
      const result = await agent.execute(input, mockContext);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.concepts).toBeDefined();
        expect(result.data.concepts.length).toBeGreaterThan(0);
        expect(result.data.concepts[0]).toHaveProperty('id');
        expect(result.data.concepts[0]).toHaveProperty('title');
      }
    });
  });

  describe('Metadata', () => {
    it('should include execution metadata', async () => {
      const input = { topic: 'Test Topic', count: 1 };
      const result = await agent.execute(input, mockContext);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.agentId).toBe('concept-generator');
      expect(result.metadata.executionTimeMs).toBeGreaterThan(0);
      expect(result.metadata.correlationId).toBeDefined();
    });

    it('should include token usage when available', async () => {
      const input = { topic: 'Test Topic', count: 1 };
      const result = await agent.execute(input, mockContext);

      if (result.success) {
        expect(result.metadata.tokensUsed).toBeDefined();
        expect(result.metadata.tokensUsed?.total).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle LLM errors gracefully', async () => {
      mockContext.services.llm.complete = vi.fn().mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      const input = { topic: 'Test Topic', count: 1 };
      const result = await agent.execute(input, mockContext);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('LLM_RATE_LIMIT');
    });

    it('should handle timeout gracefully', async () => {
      mockContext.config.timeoutMs = 10;
      mockContext.services.llm.complete = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const input = { topic: 'Test Topic', count: 1 };
      const result = await agent.execute(input, mockContext);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EXECUTION_TIMEOUT');
    });
  });

  describe('Context Usage', () => {
    it('should use logger from context', async () => {
      const input = { topic: 'Test Topic', count: 1 };
      await agent.execute(input, mockContext);

      expect(mockContext.logger.info).toHaveBeenCalled();
    });

    it('should use LLM service from context', async () => {
      const input = { topic: 'Test Topic', count: 1 };
      await agent.execute(input, mockContext);

      expect(mockContext.services.llm.complete).toHaveBeenCalled();
    });
  });
});
```

### 9.2 Test Coverage Requirements

| Category | Minimum Coverage |
|----------|------------------|
| Input validation | 100% of schema fields |
| Output validation | 100% of schema fields |
| Error handling | All error codes |
| Happy path | At least 3 scenarios |
| Edge cases | At least 2 scenarios |

---

## 10. Migration Guide

### 10.1 Steps to Migrate Existing Agent

1. **Create schema file** (`schema.ts`)
   - Define input schema from current state fields used
   - Define output schema from current return fields
   - Add proper descriptions and validation

2. **Create agent file** (`index.ts`)
   - Implement IAgent interface
   - Copy business logic from current implementation
   - Replace direct imports with context services
   - Remove state type dependencies

3. **Create test file** (`agent.test.ts`)
   - Write tests per template above
   - Ensure all validation scenarios covered

4. **Register agent**
   - Add to registry in startup

5. **Update orchestration**
   - Update tool definition to use new agent
   - Create input/output mappings

### 10.2 Migration Checklist Per Agent

- [ ] Input schema created and tested
- [ ] Output schema created and tested
- [ ] IAgent interface implemented
- [ ] Business logic extracted
- [ ] Direct imports removed
- [ ] Context services used
- [ ] Unit tests written (90%+ coverage)
- [ ] Agent registered
- [ ] Old implementation deprecated
- [ ] Documentation updated

---

## 11. Reference Implementation

### 11.1 Complete Agent Example

```typescript
// File: /agents/concept-generator/index.ts

import { IAgent, AgentContext, AgentResult } from '../core/types';
import { success, failure } from '../core/result';
import {
  conceptGeneratorInputSchema,
  conceptGeneratorOutputSchema,
  ConceptGeneratorInput,
  ConceptGeneratorOutput,
} from './schema';
import { nanoid } from 'nanoid';

/**
 * Agent that generates content concepts from a topic.
 *
 * This agent:
 * 1. Analyzes the given topic
 * 2. Generates multiple concept angles
 * 3. Provides keywords and confidence scores
 *
 * @example
 * const result = await agent.execute({
 *   topic: 'Sustainable Fashion',
 *   count: 5,
 *   language: 'en',
 * }, context);
 */
export class ConceptGeneratorAgent
  implements IAgent<ConceptGeneratorInput, ConceptGeneratorOutput>
{
  readonly id = 'concept-generator';
  readonly version = '1.0.0';
  readonly name = 'Concept Generator';
  readonly description = 'Generates content concepts from a topic';
  readonly inputSchema = conceptGeneratorInputSchema;
  readonly outputSchema = conceptGeneratorOutputSchema;

  async execute(
    input: ConceptGeneratorInput,
    context: AgentContext
  ): Promise<AgentResult<ConceptGeneratorOutput>> {
    const { logger, services, config } = context;

    logger.debug({ event: 'generating_concepts', input });

    try {
      // Build prompt
      const prompt = this.buildPrompt(input);

      // Call LLM
      const response = await services.llm.complete({
        model: config.model ?? 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(input.language),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        maxTokens: config.maxTokens ?? 2000,
        temperature: config.temperature ?? 0.7,
      });

      // Parse response
      const concepts = this.parseResponse(response.content, input.count);

      logger.debug({
        event: 'concepts_generated',
        count: concepts.length,
      });

      return {
        success: true,
        data: {
          concepts,
        },
        metadata: {
          agentId: this.id,
          agentVersion: this.version,
          correlationId: context.correlationId,
          startedAt: new Date(),
          completedAt: new Date(),
          executionTimeMs: 0, // Calculated by executor
          tokensUsed: response.usage,
          model: response.model,
        },
      };

    } catch (error) {
      logger.error({
        event: 'concept_generation_failed',
        error,
      });

      throw error; // Let executor handle
    }
  }

  private buildPrompt(input: ConceptGeneratorInput): string {
    let prompt = `Generate ${input.count} unique content concepts for the topic: "${input.topic}"`;

    if (input.targetAudience) {
      prompt += `\n\nTarget audience: ${input.targetAudience}`;
    }

    if (input.brandContext) {
      prompt += '\n\nBrand guidelines:';
      if (input.brandContext.voice) {
        prompt += `\n- Voice: ${input.brandContext.voice}`;
      }
      if (input.brandContext.values?.length) {
        prompt += `\n- Values: ${input.brandContext.values.join(', ')}`;
      }
      if (input.brandContext.restrictions?.length) {
        prompt += `\n- Avoid: ${input.brandContext.restrictions.join(', ')}`;
      }
    }

    prompt += `

For each concept, provide:
1. A compelling title
2. A detailed description (2-3 sentences)
3. A unique angle or hook
4. Related keywords (3-5)
5. Target emotional response
6. Confidence score (0-1)

Return as JSON array.`;

    return prompt;
  }

  private getSystemPrompt(language: string): string {
    return `You are an expert content strategist who generates compelling content concepts.
Always respond in ${language}.
Return valid JSON only, no markdown.`;
  }

  private parseResponse(
    content: string,
    expectedCount: number
  ): ConceptGeneratorOutput['concepts'] {
    // Clean response
    const cleaned = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    const concepts = Array.isArray(parsed) ? parsed : parsed.concepts;

    return concepts.slice(0, expectedCount).map((c: any, index: number) => ({
      id: c.id ?? nanoid(),
      title: c.title,
      description: c.description,
      angle: c.angle ?? c.hook ?? c.unique_angle,
      keywords: c.keywords ?? [],
      targetEmotion: c.targetEmotion ?? c.target_emotion ?? c.emotion,
      confidence: c.confidence ?? 0.8,
    }));
  }
}

// Export singleton for registration
export const conceptGeneratorAgent = new ConceptGeneratorAgent();
```

---

## Appendix A: Agent Inventory

| Agent ID | Current Location | Priority |
|----------|-----------------|----------|
| concept-generator | tools/component-tools/concept-generator | P1 |
| subtopic-generator | tools/component-tools/subtopic-generator | P1 |
| article-generator | tools/component-tools/article-generator | P1 |
| outline-builder | tools/component-tools/outline-builder | P2 |
| fact-checker | tools/component-tools/fact-checker | P1 |
| brand-guardian | tools/component-tools/brand-guardian | P1 |
| regulatory-guardian | tools/component-tools/regulatory-guardian | P2 |
| proofreader | tools/component-tools/proofreader | P1 |
| wireframe-generator | tools/component-tools/wireframe-generator | P3 |
| seo-meta-generator | tools/headline-tools/seo-meta-generator | P2 |
| google-ads-generator | tools/headline-tools/google-ads-copy-generator | P2 |
| social-content-generator | tools/headline-tools/social-content-generator | P2 |

---

*Document Version: 1.0*
*Created: 2024*
*Last Updated: 2024*
