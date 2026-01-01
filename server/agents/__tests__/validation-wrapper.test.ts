import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  wrapAgent,
  wrapAgentWithResult,
  AgentValidationError,
  AgentWrapper,
} from '../validation-wrapper';

// Mock the logger module
vi.mock('../../logging/logger', () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => mockLogger),
  };

  return {
    getLogger: vi.fn(() => mockLogger),
    logger: mockLogger,
  };
});

describe('wrapAgent', () => {
  const inputSchema = z.object({
    name: z.string().min(1),
    count: z.number().int().positive(),
  });

  const outputSchema = z.object({
    result: z.string(),
    items: z.array(z.string()),
  });

  type Input = z.infer<typeof inputSchema>;
  type Output = z.infer<typeof outputSchema>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful execution', () => {
    it('should pass through valid input and output', async () => {
      const handler = async (input: Input): Promise<Output> => ({
        result: `Hello ${input.name}`,
        items: Array(input.count).fill(input.name),
      });

      const wrapped = wrapAgent('test-agent', inputSchema, outputSchema, handler);
      const result = await wrapped.execute({ name: 'World', count: 3 });

      expect(result.result).toBe('Hello World');
      expect(result.items).toEqual(['World', 'World', 'World']);
    });

    it('should validate and transform input', async () => {
      const transformingInput = z.object({
        value: z.string().transform((s) => s.trim()),
      });

      const simpleOutput = z.object({
        processed: z.string(),
      });

      const handler = async (input: { value: string }) => ({
        processed: input.value.toUpperCase(),
      });

      const wrapped = wrapAgent('trim-agent', transformingInput, simpleOutput, handler);
      const result = await wrapped.execute({ value: '  hello  ' });

      expect(result.processed).toBe('HELLO');
    });

    it('should validate and transform output', async () => {
      const simpleInput = z.object({ value: z.string() });
      const transformingOutput = z.object({
        result: z.string().transform((s) => s.toUpperCase()),
      });

      const handler = async () => ({ result: 'hello' });

      const wrapped = wrapAgent('transform-agent', simpleInput, transformingOutput, handler);
      const result = await wrapped.execute({ value: 'test' });

      expect(result.result).toBe('HELLO');
    });
  });

  describe('input validation errors', () => {
    it('should throw validation error on invalid input', async () => {
      const handler = async (): Promise<Output> => ({ result: 'test', items: [] });
      const wrapped = wrapAgent('test-agent', inputSchema, outputSchema, handler);

      await expect(wrapped.execute({ name: '', count: 1 })).rejects.toThrow(
        AgentValidationError
      );
    });

    it('should include error code INPUT_VALIDATION_ERROR', async () => {
      const handler = async (): Promise<Output> => ({ result: 'test', items: [] });
      const wrapped = wrapAgent('test-agent', inputSchema, outputSchema, handler);

      try {
        await wrapped.execute({ name: '', count: 1 });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AgentValidationError);
        expect((error as AgentValidationError).code).toBe('INPUT_VALIDATION_ERROR');
      }
    });

    it('should include validation error details', async () => {
      const handler = async (): Promise<Output> => ({ result: 'test', items: [] });
      const wrapped = wrapAgent('test-agent', inputSchema, outputSchema, handler);

      try {
        await wrapped.execute({ name: '', count: -1 });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AgentValidationError);
        const validationError = error as AgentValidationError;
        expect(validationError.details.length).toBeGreaterThan(0);
        expect(validationError.details[0]).toHaveProperty('path');
        expect(validationError.details[0]).toHaveProperty('message');
      }
    });

    it('should throw on missing required fields', async () => {
      const handler = async (): Promise<Output> => ({ result: 'test', items: [] });
      const wrapped = wrapAgent('test-agent', inputSchema, outputSchema, handler);

      // @ts-expect-error - Testing missing field
      await expect(wrapped.execute({ name: 'test' })).rejects.toThrow(
        AgentValidationError
      );
    });

    it('should throw on wrong field types', async () => {
      const handler = async (): Promise<Output> => ({ result: 'test', items: [] });
      const wrapped = wrapAgent('test-agent', inputSchema, outputSchema, handler);

      // @ts-expect-error - Testing wrong type
      await expect(wrapped.execute({ name: 123, count: 1 })).rejects.toThrow(
        AgentValidationError
      );
    });
  });

  describe('output validation errors', () => {
    it('should throw validation error on invalid output', async () => {
      const handler = async (): Promise<any> => ({
        result: 123, // Should be string
        items: [],
      });

      const wrapped = wrapAgent('test-agent', inputSchema, outputSchema, handler);

      await expect(wrapped.execute({ name: 'Test', count: 1 })).rejects.toThrow(
        AgentValidationError
      );
    });

    it('should include error code OUTPUT_VALIDATION_ERROR', async () => {
      const handler = async (): Promise<any> => ({
        result: 123,
        items: [],
      });

      const wrapped = wrapAgent('test-agent', inputSchema, outputSchema, handler);

      try {
        await wrapped.execute({ name: 'Test', count: 1 });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AgentValidationError);
        expect((error as AgentValidationError).code).toBe('OUTPUT_VALIDATION_ERROR');
      }
    });

    it('should throw on missing output fields', async () => {
      const handler = async (): Promise<any> => ({
        result: 'test',
        // Missing 'items' field
      });

      const wrapped = wrapAgent('test-agent', inputSchema, outputSchema, handler);

      await expect(wrapped.execute({ name: 'Test', count: 1 })).rejects.toThrow(
        AgentValidationError
      );
    });
  });

  describe('handler errors', () => {
    it('should preserve handler errors', async () => {
      const handler = async (): Promise<Output> => {
        throw new Error('Handler failed');
      };

      const wrapped = wrapAgent('test-agent', inputSchema, outputSchema, handler);

      await expect(wrapped.execute({ name: 'Test', count: 1 })).rejects.toThrow(
        'Handler failed'
      );
    });

    it('should not wrap handler errors as AgentValidationError', async () => {
      const handler = async (): Promise<Output> => {
        throw new Error('Handler failed');
      };

      const wrapped = wrapAgent('test-agent', inputSchema, outputSchema, handler);

      try {
        await wrapped.execute({ name: 'Test', count: 1 });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).not.toBeInstanceOf(AgentValidationError);
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should preserve custom error types', async () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const handler = async (): Promise<Output> => {
        throw new CustomError('Custom failure');
      };

      const wrapped = wrapAgent('test-agent', inputSchema, outputSchema, handler);

      await expect(wrapped.execute({ name: 'Test', count: 1 })).rejects.toThrow(
        CustomError
      );
    });
  });

  describe('wrapper properties', () => {
    it('should expose name on the wrapper', () => {
      const handler = async (): Promise<Output> => ({ result: 'test', items: [] });
      const wrapped = wrapAgent('my-agent', inputSchema, outputSchema, handler);

      expect(wrapped.name).toBe('my-agent');
    });

    it('should expose inputSchema on the wrapper', () => {
      const handler = async (): Promise<Output> => ({ result: 'test', items: [] });
      const wrapped = wrapAgent('test-agent', inputSchema, outputSchema, handler);

      expect(wrapped.inputSchema).toBe(inputSchema);
    });

    it('should expose outputSchema on the wrapper', () => {
      const handler = async (): Promise<Output> => ({ result: 'test', items: [] });
      const wrapped = wrapAgent('test-agent', inputSchema, outputSchema, handler);

      expect(wrapped.outputSchema).toBe(outputSchema);
    });
  });
});

describe('wrapAgentWithResult', () => {
  const inputSchema = z.object({
    value: z.string().min(1),
  });

  const outputSchema = z.object({
    processed: z.string(),
  });

  type Input = z.infer<typeof inputSchema>;
  type Output = z.infer<typeof outputSchema>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful execution', () => {
    it('should return success result with data', async () => {
      const handler = async (input: Input): Promise<Output> => ({
        processed: input.value.toUpperCase(),
      });

      const execute = wrapAgentWithResult('test-agent', inputSchema, outputSchema, handler);
      const result = await execute({ value: 'hello' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ processed: 'HELLO' });
    });

    it('should include timing information', async () => {
      const handler = async (input: Input): Promise<Output> => ({
        processed: input.value.toUpperCase(),
      });

      const execute = wrapAgentWithResult('test-agent', inputSchema, outputSchema, handler);
      const result = await execute({ value: 'hello' });

      expect(result.timing).toBeDefined();
      expect(result.timing.startedAt).toBeDefined();
      expect(result.timing.completedAt).toBeDefined();
      expect(typeof result.timing.durationMs).toBe('number');
      expect(result.timing.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should have valid ISO date strings in timing', async () => {
      const handler = async (input: Input): Promise<Output> => ({
        processed: input.value,
      });

      const execute = wrapAgentWithResult('test-agent', inputSchema, outputSchema, handler);
      const result = await execute({ value: 'test' });

      // Validate ISO date format
      expect(new Date(result.timing.startedAt).toISOString()).toBe(
        result.timing.startedAt
      );
      expect(new Date(result.timing.completedAt).toISOString()).toBe(
        result.timing.completedAt
      );
    });
  });

  describe('input validation failure', () => {
    it('should return error result on input validation failure', async () => {
      const handler = async (): Promise<Output> => ({ processed: 'test' });
      const execute = wrapAgentWithResult('test-agent', inputSchema, outputSchema, handler);
      const result = await execute({ value: '' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INPUT_VALIDATION_ERROR');
    });

    it('should include error details', async () => {
      const handler = async (): Promise<Output> => ({ processed: 'test' });
      const execute = wrapAgentWithResult('test-agent', inputSchema, outputSchema, handler);
      const result = await execute({ value: '' });

      expect(result.success).toBe(false);
      expect(result.error?.details).toBeDefined();
      expect(result.error?.details?.length).toBeGreaterThan(0);
    });

    it('should include timing even on failure', async () => {
      const handler = async (): Promise<Output> => ({ processed: 'test' });
      const execute = wrapAgentWithResult('test-agent', inputSchema, outputSchema, handler);
      const result = await execute({ value: '' });

      expect(result.timing.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('output validation failure', () => {
    it('should return error result on output validation failure', async () => {
      const handler = async (): Promise<any> => ({
        processed: 123, // Wrong type
      });

      const execute = wrapAgentWithResult('test-agent', inputSchema, outputSchema, handler);
      const result = await execute({ value: 'test' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('OUTPUT_VALIDATION_ERROR');
    });
  });

  describe('handler failure', () => {
    it('should return error result on handler failure', async () => {
      const handler = async (): Promise<Output> => {
        throw new Error('Something went wrong');
      };

      const execute = wrapAgentWithResult('test-agent', inputSchema, outputSchema, handler);
      const result = await execute({ value: 'test' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EXECUTION_ERROR');
      expect(result.error?.message).toBe('Something went wrong');
    });

    it('should include timing on handler failure', async () => {
      const handler = async (): Promise<Output> => {
        throw new Error('Failed');
      };

      const execute = wrapAgentWithResult('test-agent', inputSchema, outputSchema, handler);
      const result = await execute({ value: 'test' });

      expect(result.timing.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle non-Error throws', async () => {
      const handler = async (): Promise<Output> => {
        throw 'string error';
      };

      const execute = wrapAgentWithResult('test-agent', inputSchema, outputSchema, handler);
      const result = await execute({ value: 'test' });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('string error');
    });
  });
});

describe('AgentValidationError class', () => {
  it('should have correct properties', () => {
    const details = [{ path: 'field', message: 'Invalid value' }];
    const error = new AgentValidationError(
      'Validation failed',
      'INPUT_VALIDATION_ERROR',
      details
    );

    expect(error.name).toBe('AgentValidationError');
    expect(error.message).toBe('Validation failed');
    expect(error.code).toBe('INPUT_VALIDATION_ERROR');
    expect(error.details).toEqual(details);
  });

  it('should accept OUTPUT_VALIDATION_ERROR code', () => {
    const error = new AgentValidationError(
      'Output invalid',
      'OUTPUT_VALIDATION_ERROR',
      []
    );

    expect(error.code).toBe('OUTPUT_VALIDATION_ERROR');
  });

  it('should be instanceof Error', () => {
    const error = new AgentValidationError('Test', 'INPUT_VALIDATION_ERROR', []);

    expect(error instanceof Error).toBe(true);
    expect(error instanceof AgentValidationError).toBe(true);
  });

  it('should preserve stack trace', () => {
    const error = new AgentValidationError('Test', 'INPUT_VALIDATION_ERROR', []);

    expect(error.stack).toBeDefined();
  });
});
