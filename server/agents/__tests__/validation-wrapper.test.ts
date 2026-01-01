import { describe, it } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';

// Test the validation logic directly without mocking
// by creating inline versions of the wrapper functions

class TestAgentValidationError extends Error {
  constructor(
    message: string,
    public code: 'INPUT_VALIDATION_ERROR' | 'OUTPUT_VALIDATION_ERROR',
    public details: Array<{ path: string; message: string }>
  ) {
    super(message);
    this.name = 'AgentValidationError';
  }
}

function testWrapAgent<TInput, TOutput>(
  name: string,
  inputSchema: z.ZodSchema<TInput>,
  outputSchema: z.ZodSchema<TOutput>,
  handler: (input: TInput) => Promise<TOutput>
) {
  return {
    name,
    inputSchema,
    outputSchema,
    async execute(input: TInput): Promise<TOutput> {
      // Validate input
      let validatedInput: TInput;
      try {
        validatedInput = inputSchema.parse(input);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const details = error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          }));
          throw new TestAgentValidationError(
            `Input validation failed for agent ${name}`,
            'INPUT_VALIDATION_ERROR',
            details
          );
        }
        throw error;
      }

      const result = await handler(validatedInput);

      // Validate output
      try {
        return outputSchema.parse(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const details = error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          }));
          throw new TestAgentValidationError(
            `Output validation failed for agent ${name}`,
            'OUTPUT_VALIDATION_ERROR',
            details
          );
        }
        throw error;
      }
    },
  };
}

function testWrapAgentWithResult<TInput, TOutput>(
  name: string,
  inputSchema: z.ZodSchema<TInput>,
  outputSchema: z.ZodSchema<TOutput>,
  handler: (input: TInput) => Promise<TOutput>
) {
  const wrapper = testWrapAgent(name, inputSchema, outputSchema, handler);

  return async (input: TInput) => {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    try {
      const data = await wrapper.execute(input);
      return {
        success: true as const,
        data,
        timing: {
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      if (error instanceof TestAgentValidationError) {
        return {
          success: false as const,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
          timing: {
            startedAt,
            completedAt: new Date().toISOString(),
            durationMs: Date.now() - startTime,
          },
        };
      }

      return {
        success: false as const,
        error: {
          code: 'EXECUTION_ERROR' as const,
          message: error instanceof Error ? error.message : String(error),
        },
        timing: {
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        },
      };
    }
  };
}

describe('wrapAgent validation logic', () => {
  const inputSchema = z.object({
    name: z.string().min(1),
    count: z.number().int().positive(),
  });

  const outputSchema = z.object({
    result: z.string(),
    items: z.array(z.string()),
  });

  it('should pass through valid input and output', async () => {
    const handler = async (input: { name: string; count: number }) => ({
      result: `Hello ${input.name}`,
      items: Array(input.count).fill(input.name),
    });

    const wrapped = testWrapAgent('test-agent', inputSchema, outputSchema, handler);
    const result = await wrapped.execute({ name: 'World', count: 3 });

    assert.strictEqual(result.result, 'Hello World');
    assert.deepStrictEqual(result.items, ['World', 'World', 'World']);
  });

  it('should throw validation error on invalid input', async () => {
    const handler = async () => ({ result: 'test', items: [] });
    const wrapped = testWrapAgent('test-agent', inputSchema, outputSchema, handler);

    await assert.rejects(
      async () => wrapped.execute({ name: '', count: 1 }),
      (error: Error) => {
        assert(error instanceof TestAgentValidationError);
        assert.strictEqual(error.code, 'INPUT_VALIDATION_ERROR');
        assert(error.details.length > 0);
        return true;
      }
    );
  });

  it('should throw validation error on invalid output', async () => {
    const handler = async () => ({
      result: 123,
      items: [],
    });

    const wrapped = testWrapAgent('test-agent', inputSchema, outputSchema, handler as any);

    await assert.rejects(
      async () => wrapped.execute({ name: 'Test', count: 1 }),
      (error: Error) => {
        assert(error instanceof TestAgentValidationError);
        assert.strictEqual(error.code, 'OUTPUT_VALIDATION_ERROR');
        return true;
      }
    );
  });

  it('should preserve handler errors', async () => {
    const handler = async () => {
      throw new Error('Handler failed');
    };

    const wrapped = testWrapAgent('test-agent', inputSchema, outputSchema, handler);

    await assert.rejects(
      async () => wrapped.execute({ name: 'Test', count: 1 }),
      (error: Error) => {
        assert.strictEqual(error.message, 'Handler failed');
        assert(!(error instanceof TestAgentValidationError));
        return true;
      }
    );
  });

  it('should expose schemas on the wrapper', () => {
    const handler = async () => ({ result: 'test', items: [] });
    const wrapped = testWrapAgent('test-agent', inputSchema, outputSchema, handler);

    assert.strictEqual(wrapped.name, 'test-agent');
    assert.strictEqual(wrapped.inputSchema, inputSchema);
    assert.strictEqual(wrapped.outputSchema, outputSchema);
  });
});

describe('wrapAgentWithResult', () => {
  const inputSchema = z.object({
    value: z.string().min(1),
  });

  const outputSchema = z.object({
    processed: z.string(),
  });

  it('should return success result with data and timing', async () => {
    const handler = async (input: { value: string }) => ({
      processed: input.value.toUpperCase(),
    });

    const execute = testWrapAgentWithResult('test-agent', inputSchema, outputSchema, handler);
    const result = await execute({ value: 'hello' });

    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.deepStrictEqual(result.data, { processed: 'HELLO' });
    }
    assert(result.timing.startedAt);
    assert(result.timing.completedAt);
    assert(typeof result.timing.durationMs === 'number');
    assert(result.timing.durationMs >= 0);
  });

  it('should return error result on input validation failure', async () => {
    const handler = async () => ({ processed: 'test' });
    const execute = testWrapAgentWithResult('test-agent', inputSchema, outputSchema, handler);
    const result = await execute({ value: '' });

    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.strictEqual(result.error?.code, 'INPUT_VALIDATION_ERROR');
    }
    assert(result.timing.durationMs >= 0);
  });

  it('should return error result on handler failure', async () => {
    const handler = async (): Promise<{ processed: string }> => {
      throw new Error('Something went wrong');
    };

    const execute = testWrapAgentWithResult('test-agent', inputSchema, outputSchema, handler);
    const result = await execute({ value: 'test' });

    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.strictEqual(result.error?.code, 'EXECUTION_ERROR');
      assert.strictEqual(result.error?.message, 'Something went wrong');
    }
    assert(result.timing.durationMs >= 0);
  });

  it('should return error result on output validation failure', async () => {
    const handler = async () => ({
      processed: 123,
    });

    const execute = testWrapAgentWithResult('test-agent', inputSchema, outputSchema, handler as any);
    const result = await execute({ value: 'test' });

    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.strictEqual(result.error?.code, 'OUTPUT_VALIDATION_ERROR');
    }
    assert(result.timing.durationMs >= 0);
  });
});

describe('AgentValidationError class', () => {
  it('should have correct properties', () => {
    const details = [{ path: 'field', message: 'Invalid value' }];
    const error = new TestAgentValidationError(
      'Validation failed',
      'INPUT_VALIDATION_ERROR',
      details
    );

    assert.strictEqual(error.name, 'AgentValidationError');
    assert.strictEqual(error.message, 'Validation failed');
    assert.strictEqual(error.code, 'INPUT_VALIDATION_ERROR');
    assert.deepStrictEqual(error.details, details);
  });

  it('should be instanceof Error', () => {
    const error = new TestAgentValidationError('Test', 'INPUT_VALIDATION_ERROR', []);
    assert(error instanceof Error);
    assert(error instanceof TestAgentValidationError);
  });
});
