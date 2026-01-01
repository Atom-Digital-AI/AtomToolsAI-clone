import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, validateAsync, ValidationSchemas } from '../validate';

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

describe('validate middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      body: {},
      query: {},
      params: {},
      path: '/test',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('body validation', () => {
    it('should pass valid request body', () => {
      const schemas: ValidationSchemas = {
        body: z.object({
          name: z.string(),
          age: z.number(),
        }),
      };

      mockReq.body = { name: 'John', age: 25 };

      validate(schemas)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject invalid request body', () => {
      const schemas: ValidationSchemas = {
        body: z.object({
          name: z.string(),
          age: z.number(),
        }),
      };

      mockReq.body = { name: 'John', age: 'not-a-number' };

      validate(schemas)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            details: expect.arrayContaining([
              expect.objectContaining({
                path: 'body.age',
              }),
            ]),
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing required fields', () => {
      const schemas: ValidationSchemas = {
        body: z.object({
          email: z.string().email(),
          password: z.string().min(8),
        }),
      };

      mockReq.body = { email: 'test@example.com' };

      validate(schemas)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    it('should transform and update validated body', () => {
      const schemas: ValidationSchemas = {
        body: z.object({
          name: z.string().transform((s) => s.trim()),
          count: z.string().transform((s) => parseInt(s, 10)),
        }),
      };

      mockReq.body = { name: '  John  ', count: '42' };

      validate(schemas)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body).toEqual({ name: 'John', count: 42 });
    });
  });

  describe('query validation', () => {
    it('should pass valid query parameters', () => {
      const schemas: ValidationSchemas = {
        query: z.object({
          page: z.string().optional(),
          limit: z.string().optional(),
        }),
      };

      mockReq.query = { page: '1', limit: '10' };

      validate(schemas)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid query parameters', () => {
      const schemas: ValidationSchemas = {
        query: z.object({
          page: z.string().regex(/^\d+$/),
        }),
      };

      mockReq.query = { page: 'invalid' };

      validate(schemas)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.arrayContaining([
              expect.objectContaining({
                path: 'query.page',
              }),
            ]),
          }),
        })
      );
    });

    it('should update query with validated data', () => {
      const schemas: ValidationSchemas = {
        query: z.object({
          page: z.coerce.number().default(1),
        }),
      };

      mockReq.query = {};

      validate(schemas)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.query).toEqual({ page: 1 });
    });
  });

  describe('params validation', () => {
    it('should pass valid route parameters', () => {
      const schemas: ValidationSchemas = {
        params: z.object({
          id: z.string().uuid(),
        }),
      };

      mockReq.params = { id: '550e8400-e29b-41d4-a716-446655440000' };

      validate(schemas)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid route parameters', () => {
      const schemas: ValidationSchemas = {
        params: z.object({
          id: z.string().uuid(),
        }),
      };

      mockReq.params = { id: 'not-a-uuid' };

      validate(schemas)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.arrayContaining([
              expect.objectContaining({
                path: 'params.id',
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('combined validation', () => {
    it('should validate body, query, and params together', () => {
      const schemas: ValidationSchemas = {
        body: z.object({ name: z.string() }),
        query: z.object({ sort: z.string().optional() }),
        params: z.object({ id: z.string() }),
      };

      mockReq.body = { name: 'Test' };
      mockReq.query = { sort: 'asc' };
      mockReq.params = { id: '123' };

      validate(schemas)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should collect errors from multiple sources', () => {
      const schemas: ValidationSchemas = {
        body: z.object({ name: z.string().min(1) }),
        query: z.object({ page: z.string().regex(/^\d+$/) }),
      };

      mockReq.body = { name: '' };
      mockReq.query = { page: 'invalid' };

      validate(schemas)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const jsonCall = (mockRes.json as any).mock.calls[0][0];
      expect(jsonCall.error.details.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty schemas object', () => {
      const schemas: ValidationSchemas = {};

      validate(schemas)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle nested object validation', () => {
      const schemas: ValidationSchemas = {
        body: z.object({
          user: z.object({
            profile: z.object({
              name: z.string(),
            }),
          }),
        }),
      };

      mockReq.body = { user: { profile: { name: 123 } } };

      validate(schemas)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle array validation', () => {
      const schemas: ValidationSchemas = {
        body: z.object({
          tags: z.array(z.string()).min(1),
        }),
      };

      mockReq.body = { tags: [] };

      validate(schemas)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle unexpected errors and call next', () => {
      const badSchema = {
        safeParse: () => {
          throw new Error('Unexpected error');
        },
      };

      const schemas: ValidationSchemas = {
        body: badSchema as any,
      };

      validate(schemas)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('error response format', () => {
    it('should return proper error structure', () => {
      const schemas: ValidationSchemas = {
        body: z.object({
          email: z.string().email(),
        }),
      };

      mockReq.body = { email: 'invalid-email' };

      validate(schemas)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              path: expect.any(String),
              message: expect.any(String),
            }),
          ]),
        },
      });
    });
  });
});

describe('validateAsync middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      body: {},
      query: {},
      params: {},
      path: '/test',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  it('should handle async validation for body', async () => {
    const schemas: ValidationSchemas = {
      body: z.object({
        name: z.string(),
      }),
    };

    mockReq.body = { name: 'Test' };

    await validateAsync(schemas)(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should reject invalid async validation', async () => {
    const schemas: ValidationSchemas = {
      body: z.object({
        email: z.string().email(),
      }),
    };

    mockReq.body = { email: 'not-an-email' };

    await validateAsync(schemas)(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
        }),
      })
    );
  });

  it('should handle async refinements', async () => {
    const schemas: ValidationSchemas = {
      body: z.object({
        code: z.string().refine(async (val) => val.length > 0, {
          message: 'Code must not be empty',
        }),
      }),
    };

    mockReq.body = { code: '' };

    await validateAsync(schemas)(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('should validate query async', async () => {
    const schemas: ValidationSchemas = {
      query: z.object({
        token: z.string().min(10),
      }),
    };

    mockReq.query = { token: 'short' };

    await validateAsync(schemas)(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('should validate params async', async () => {
    const schemas: ValidationSchemas = {
      params: z.object({
        slug: z.string().regex(/^[a-z-]+$/),
      }),
    };

    mockReq.params = { slug: 'valid-slug' };

    await validateAsync(schemas)(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle errors in async validation', async () => {
    const badSchema = {
      safeParseAsync: async () => {
        throw new Error('Async error');
      },
    };

    const schemas: ValidationSchemas = {
      body: badSchema as any,
    };

    await validateAsync(schemas)(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });
});
