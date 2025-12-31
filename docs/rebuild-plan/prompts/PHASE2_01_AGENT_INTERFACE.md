# Phase 2.1: Agent Interface Definition

## Execution Prompt

You are implementing Phase 2.1 of the AtomToolsAI rebuild. Your task is to create the core agent interface, types, and supporting infrastructure.

### Prerequisites
- Phase 1 fully completed
- All tests passing

### Reference Documents
- `/docs/rebuild-plan/03-AGENT_INTERFACE_SPEC.md` - Complete agent specification

### Tasks

#### Task 2.1.1: Create Core Agent Types

Create `/agents/core/types.ts`:

```typescript
import { z, ZodSchema } from 'zod';
import { Logger } from 'pino';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Base interface for all agents.
 */
export interface IAgent<TInput, TOutput> {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly description: string;
  readonly inputSchema: ZodSchema<TInput>;
  readonly outputSchema: ZodSchema<TOutput>;

  execute(
    input: TInput,
    context: AgentContext
  ): Promise<AgentResult<TOutput>>;
}

/**
 * Context passed to every agent execution.
 */
export interface AgentContext {
  readonly correlationId: string;
  readonly userId?: string;
  readonly apiKeyId?: string;
  readonly toolId?: string;
  readonly stepIndex?: number;
  readonly logger: Logger;
  readonly services: ServiceContainer;
  readonly config: AgentConfig;
}

/**
 * Service container for agent dependencies.
 */
export interface ServiceContainer {
  readonly supabase: SupabaseClient;
  readonly rag: IRagService;
  readonly embedding: IEmbeddingService;
  readonly brandAnalyzer: IBrandAnalyzerService;
  readonly llm: ILLMService;
}

/**
 * Configuration for agent execution.
 */
export interface AgentConfig {
  readonly timeoutMs: number;
  readonly debug: boolean;
  readonly model?: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
}

/**
 * Result of agent execution.
 */
export type AgentResult<T> = AgentSuccess<T> | AgentFailure;

export interface AgentSuccess<T> {
  readonly success: true;
  readonly data: T;
  readonly metadata: AgentMetadata;
}

export interface AgentFailure {
  readonly success: false;
  readonly error: AgentError;
  readonly metadata: AgentMetadata;
}

export interface AgentMetadata {
  readonly agentId: string;
  readonly agentVersion: string;
  readonly correlationId: string;
  readonly startedAt: Date;
  readonly completedAt: Date;
  readonly executionTimeMs: number;
  readonly tokensUsed?: TokenUsage;
  readonly model?: string;
}

export interface TokenUsage {
  readonly prompt: number;
  readonly completion: number;
  readonly total: number;
}

export interface AgentError {
  readonly code: AgentErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly cause?: Error;
  readonly stack?: string;
}

export enum AgentErrorCode {
  VALIDATION_INPUT = 'VALIDATION_INPUT',
  VALIDATION_OUTPUT = 'VALIDATION_OUTPUT',
  EXECUTION_TIMEOUT = 'EXECUTION_TIMEOUT',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  LLM_ERROR = 'LLM_ERROR',
  LLM_RATE_LIMIT = 'LLM_RATE_LIMIT',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// Type helpers
export type AgentInput<T> = T extends IAgent<infer I, unknown> ? I : never;
export type AgentOutput<T> = T extends IAgent<unknown, infer O> ? O : never;
```

#### Task 2.1.2: Create Result Helpers

Create `/agents/core/result.ts`:

```typescript
import { AgentResult, AgentSuccess, AgentFailure, AgentMetadata, AgentError } from './types';

export function success<T>(data: T, metadata: AgentMetadata): AgentSuccess<T> {
  return { success: true, data, metadata };
}

export function failure(error: AgentError, metadata: AgentMetadata): AgentFailure {
  return { success: false, error, metadata };
}

export function isSuccess<T>(result: AgentResult<T>): result is AgentSuccess<T> {
  return result.success === true;
}

export function isFailure<T>(result: AgentResult<T>): result is AgentFailure {
  return result.success === false;
}

export function unwrapOrThrow<T>(result: AgentResult<T>): T {
  if (isSuccess(result)) return result.data;
  throw new Error(`Agent failed: ${result.error.message}`);
}
```

#### Task 2.1.3: Create Validation Utilities

Create `/agents/core/validation.ts`:

```typescript
import { ZodSchema, ZodError } from 'zod';
import { AgentError, AgentErrorCode } from './types';

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

function formatZodError(error: ZodError): string {
  return error.errors
    .map(e => `${e.path.join('.')}: ${e.message}`)
    .join('; ');
}

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

#### Task 2.1.4: Create Service Interfaces

Create `/agents/core/services.ts`:

```typescript
/**
 * RAG service for semantic search.
 */
export interface IRagService {
  search(query: string, options: RagSearchOptions): Promise<RagSearchResult[]>;
}

export interface RagSearchOptions {
  userId: string;
  guidelineProfileId?: string;
  limit?: number;
  minScore?: number;
}

export interface RagSearchResult {
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

/**
 * Embedding service for vector generation.
 */
export interface IEmbeddingService {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

/**
 * Brand analyzer service.
 */
export interface IBrandAnalyzerService {
  analyze(content: string, guidelineProfileId: string): Promise<BrandAnalysisResult>;
}

export interface BrandAnalysisResult {
  score: number;
  matches: string[];
  violations: string[];
  suggestions: string[];
}

/**
 * LLM service for AI completions.
 */
export interface ILLMService {
  complete(request: LLMRequest): Promise<LLMResponse>;
}

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    prompt: number;
    completion: number;
    total: number;
  };
  finishReason: string;
}
```

#### Task 2.1.5: Create Base Agent Class

Create `/agents/core/base-agent.ts`:

```typescript
import { IAgent, AgentContext, AgentResult, AgentMetadata, AgentErrorCode } from './types';
import { success, failure } from './result';
import { validateInput, validateOutput, AgentValidationError } from './validation';
import { ZodSchema } from 'zod';

/**
 * Base class for agents with common functionality.
 */
export abstract class BaseAgent<TInput, TOutput> implements IAgent<TInput, TOutput> {
  abstract readonly id: string;
  abstract readonly version: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputSchema: ZodSchema<TInput>;
  abstract readonly outputSchema: ZodSchema<TOutput>;

  /**
   * Implement this method with your agent logic.
   * Input and output validation is handled automatically.
   */
  protected abstract process(
    input: TInput,
    context: AgentContext
  ): Promise<TOutput>;

  /**
   * Execute the agent with full validation and instrumentation.
   */
  async execute(
    input: TInput,
    context: AgentContext
  ): Promise<AgentResult<TOutput>> {
    const startedAt = new Date();

    context.logger.info({ event: 'agent_execution_started' });

    try {
      // Validate input
      const validatedInput = validateInput(this.inputSchema, input, this.id);

      // Execute with timeout
      const rawOutput = await this.executeWithTimeout(
        () => this.process(validatedInput, context),
        context.config.timeoutMs
      );

      // Validate output
      const validatedOutput = validateOutput(this.outputSchema, rawOutput, this.id);

      const completedAt = new Date();
      const metadata = this.createMetadata(startedAt, completedAt, context);

      context.logger.info({
        event: 'agent_execution_completed',
        executionTimeMs: metadata.executionTimeMs,
      });

      return success(validatedOutput, metadata);

    } catch (error) {
      const completedAt = new Date();
      const metadata = this.createMetadata(startedAt, completedAt, context);
      const agentError = this.toAgentError(error, context);

      context.logger.error({
        event: 'agent_execution_failed',
        error: agentError,
      });

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

  private createMetadata(
    startedAt: Date,
    completedAt: Date,
    context: AgentContext
  ): AgentMetadata {
    return {
      agentId: this.id,
      agentVersion: this.version,
      correlationId: context.correlationId,
      startedAt,
      completedAt,
      executionTimeMs: completedAt.getTime() - startedAt.getTime(),
      model: context.config.model,
    };
  }

  private toAgentError(error: unknown, context: AgentContext): import('./types').AgentError {
    if (error instanceof AgentValidationError) {
      return error.toAgentError();
    }

    if (error instanceof Error) {
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
}
```

#### Task 2.1.6: Create Agent Exports

Create `/agents/core/index.ts`:

```typescript
// Types
export * from './types';

// Result helpers
export * from './result';

// Validation
export * from './validation';

// Service interfaces
export * from './services';

// Base class
export { BaseAgent } from './base-agent';
```

### Verification Checklist

- [ ] All core types defined
- [ ] Result helpers working
- [ ] Validation utilities working
- [ ] Service interfaces defined
- [ ] Base agent class implemented
- [ ] Exports configured

### Unit Tests

Create `/agents/core/__tests__/base-agent.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { BaseAgent } from '../base-agent';
import { AgentContext, AgentErrorCode } from '../types';

// Test agent implementation
class TestAgent extends BaseAgent<{ value: number }, { result: number }> {
  readonly id = 'test-agent';
  readonly version = '1.0.0';
  readonly name = 'Test Agent';
  readonly description = 'A test agent';
  readonly inputSchema = z.object({ value: z.number() });
  readonly outputSchema = z.object({ result: z.number() });

  protected async process(input: { value: number }): Promise<{ result: number }> {
    return { result: input.value * 2 };
  }
}

const createMockContext = (): AgentContext => ({
  correlationId: 'test-123',
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  } as any,
  services: {} as any,
  config: {
    timeoutMs: 5000,
    debug: true,
  },
});

describe('BaseAgent', () => {
  const agent = new TestAgent();

  it('should execute successfully with valid input', async () => {
    const context = createMockContext();
    const result = await agent.execute({ value: 5 }, context);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.result).toBe(10);
    }
  });

  it('should fail on invalid input', async () => {
    const context = createMockContext();
    const result = await agent.execute({ value: 'not a number' } as any, context);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(AgentErrorCode.VALIDATION_INPUT);
    }
  });

  it('should include metadata', async () => {
    const context = createMockContext();
    const result = await agent.execute({ value: 5 }, context);

    expect(result.metadata.agentId).toBe('test-agent');
    expect(result.metadata.correlationId).toBe('test-123');
    expect(result.metadata.executionTimeMs).toBeGreaterThan(0);
  });
});
```

### Success Criteria

1. All types compile without errors
2. Base agent handles validation
3. Base agent handles timeouts
4. Base agent handles errors
5. Metadata is correctly populated
6. All tests passing

### Next Step

After completing this task, proceed to `PHASE2_02_AGENT_REGISTRY.md`
