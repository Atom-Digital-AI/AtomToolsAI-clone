import { ZodSchema, ZodError } from 'zod';
import { getLogger } from '../logging/logger';

export interface AgentWrapper<TInput, TOutput> {
  name: string;
  inputSchema: ZodSchema<TInput>;
  outputSchema: ZodSchema<TOutput>;
  execute: (input: TInput) => Promise<TOutput>;
}

export interface AgentExecutionResult<TOutput> {
  success: boolean;
  data?: TOutput;
  error?: {
    code: string;
    message: string;
    details?: Array<{ path: string; message: string }>;
  };
  timing: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
  };
}

export class AgentValidationError extends Error {
  constructor(
    message: string,
    public code: 'INPUT_VALIDATION_ERROR' | 'OUTPUT_VALIDATION_ERROR',
    public details: Array<{ path: string; message: string }>
  ) {
    super(message);
    this.name = 'AgentValidationError';
  }
}

/**
 * Wraps an existing agent handler with input/output validation, logging, and timing.
 *
 * This wrapper does NOT replace the agent logic - it adds a validation layer on top
 * of existing LangGraph agents per the lean refactoring plan.
 *
 * @example
 * ```typescript
 * const wrappedConceptGenerator = wrapAgent(
 *   'concept-generator',
 *   conceptGeneratorInputSchema,
 *   conceptGeneratorOutputSchema,
 *   existingConceptGeneratorLogic
 * );
 * ```
 */
export function wrapAgent<TInput, TOutput>(
  name: string,
  inputSchema: ZodSchema<TInput>,
  outputSchema: ZodSchema<TOutput>,
  handler: (input: TInput) => Promise<TOutput>
): AgentWrapper<TInput, TOutput> {
  return {
    name,
    inputSchema,
    outputSchema,
    async execute(input: TInput): Promise<TOutput> {
      const log = getLogger({ agent: name });
      const startTime = Date.now();
      const startedAt = new Date().toISOString();

      // Validate input
      let validatedInput: TInput;
      try {
        validatedInput = inputSchema.parse(input);
        log.info({ inputKeys: Object.keys(input as object) }, 'Agent started with validated input');
      } catch (error) {
        if (error instanceof ZodError) {
          const details = error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          }));
          log.error({ errors: details }, 'Agent input validation failed');
          throw new AgentValidationError(
            `Input validation failed for agent ${name}`,
            'INPUT_VALIDATION_ERROR',
            details
          );
        }
        throw error;
      }

      try {
        const result = await handler(validatedInput);

        // Validate output
        let validatedOutput: TOutput;
        try {
          validatedOutput = outputSchema.parse(result);
        } catch (error) {
          if (error instanceof ZodError) {
            const details = error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message,
            }));
            log.error({ errors: details }, 'Agent output validation failed');
            throw new AgentValidationError(
              `Output validation failed for agent ${name}`,
              'OUTPUT_VALIDATION_ERROR',
              details
            );
          }
          throw error;
        }

        const durationMs = Date.now() - startTime;
        log.info({ durationMs }, 'Agent completed successfully');

        return validatedOutput;
      } catch (error) {
        const durationMs = Date.now() - startTime;

        if (error instanceof AgentValidationError) {
          throw error;
        }

        log.error({
          error: error instanceof Error ? error.message : String(error),
          durationMs
        }, 'Agent execution failed');
        throw error;
      }
    },
  };
}

/**
 * Wraps an agent and returns a result object with timing and error details
 * instead of throwing exceptions. Useful for orchestration logic.
 */
export function wrapAgentWithResult<TInput, TOutput>(
  name: string,
  inputSchema: ZodSchema<TInput>,
  outputSchema: ZodSchema<TOutput>,
  handler: (input: TInput) => Promise<TOutput>
): (input: TInput) => Promise<AgentExecutionResult<TOutput>> {
  const wrapper = wrapAgent(name, inputSchema, outputSchema, handler);

  return async (input: TInput): Promise<AgentExecutionResult<TOutput>> => {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    try {
      const data = await wrapper.execute(input);
      const completedAt = new Date().toISOString();
      return {
        success: true,
        data,
        timing: {
          startedAt,
          completedAt,
          durationMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      const completedAt = new Date().toISOString();

      if (error instanceof AgentValidationError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
          timing: {
            startedAt,
            completedAt,
            durationMs: Date.now() - startTime,
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
        timing: {
          startedAt,
          completedAt,
          durationMs: Date.now() - startTime,
        },
      };
    }
  };
}
