import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import {
  errorHandler,
  notFoundHandler,
  AppError,
  Errors,
} from '../error-handler';

// Mock Sentry
vi.mock('@sentry/node', () => ({
  default: {
    captureException: vi.fn(),
  },
  captureException: vi.fn(),
}));

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
    getCorrelationId: vi.fn(() => 'test-correlation-id'),
    logger: mockLogger,
  };
});

// Mock errorLogger
vi.mock('../../errorLogger', () => ({
  logToolError: vi.fn().mockResolvedValue(undefined),
  getErrorTypeFromError: vi.fn(() => 'INTERNAL_ERROR'),
}));

// Mock config
vi.mock('../../config', () => ({
  env: {
    NODE_ENV: 'development',
    SENTRY_DSN: 'test-dsn',
  },
}));

import * as Sentry from '@sentry/node';
import { getLogger, getCorrelationId } from '../../logging/logger';
import { logToolError } from '../../errorLogger';
import { env } from '../../config';

describe('errorHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      method: 'GET',
      path: '/api/test',
      query: {},
      body: {},
      params: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('AppError handling', () => {
    it('should handle AppError with correct status code', () => {
      const error = new AppError(400, 'BAD_REQUEST', 'Invalid input');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'BAD_REQUEST',
            message: 'Invalid input',
          }),
        })
      );
    });

    it('should include details from AppError', () => {
      const error = new AppError(400, 'VALIDATION_ERROR', 'Invalid', {
        field: 'email',
        reason: 'invalid format',
      });

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: { field: 'email', reason: 'invalid format' },
          }),
        })
      );
    });

    it('should include correlation ID in response', () => {
      const error = new AppError(500, 'SERVER_ERROR', 'Something went wrong');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            correlationId: 'test-correlation-id',
          }),
        })
      );
    });
  });

  describe('ZodError handling', () => {
    it('should format ZodError as validation error', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      let zodError: ZodError;
      try {
        schema.parse({ email: 'invalid', age: 10 });
      } catch (e) {
        zodError = e as ZodError;
      }

      errorHandler(zodError!, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
          }),
        })
      );
    });

    it('should include Zod error details', () => {
      const schema = z.object({ name: z.string().min(1) });

      let zodError: ZodError;
      try {
        schema.parse({ name: '' });
      } catch (e) {
        zodError = e as ZodError;
      }

      errorHandler(zodError!, mockReq as Request, mockRes as Response, mockNext);

      const jsonCall = (mockRes.json as any).mock.calls[0][0];
      expect(jsonCall.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: expect.any(String),
            message: expect.any(String),
          }),
        ])
      );
    });
  });

  describe('generic Error handling', () => {
    it('should handle standard Error', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
          }),
        })
      );
    });

    it('should handle errors with status property', () => {
      const error: any = new Error('Not Found');
      error.status = 404;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should handle errors with statusCode property', () => {
      const error: any = new Error('Bad Gateway');
      error.statusCode = 502;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(502);
    });
  });

  describe('logging behavior', () => {
    it('should log 5xx errors as error level', () => {
      const error = new AppError(500, 'INTERNAL_ERROR', 'Server error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const mockLogger = getLogger();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should log 4xx errors as warn level', () => {
      const error = new AppError(400, 'BAD_REQUEST', 'Bad request');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const mockLogger = getLogger();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should include request context in log', () => {
      const error = new Error('Test error');
      mockReq.method = 'POST';
      mockReq.path = '/api/users';
      mockReq.query = { page: '1' };
      mockReq.body = { name: 'test' };

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const mockLogger = getLogger();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            method: 'POST',
            path: '/api/users',
          }),
        }),
        expect.any(String)
      );
    });
  });

  describe('Sentry reporting', () => {
    it('should report 5xx errors to Sentry', () => {
      const error = new AppError(500, 'INTERNAL_ERROR', 'Server error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            statusCode: '500',
          }),
        })
      );
    });

    it('should not report 4xx errors to Sentry', () => {
      const error = new AppError(400, 'BAD_REQUEST', 'Bad request');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('should include user info in Sentry report', () => {
      const error = new AppError(500, 'ERROR', 'Error');
      (mockReq as any).user = { id: 123, email: 'test@example.com' };

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          user: { id: 123, email: 'test@example.com' },
        })
      );
    });
  });

  describe('database logging', () => {
    it('should log errors to database', () => {
      const error = new Error('Test error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logToolError).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: 'system',
          errorMessage: expect.any(String),
        })
      );
    });
  });
});

describe('notFoundHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      method: 'GET',
      path: '/api/nonexistent',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  it('should return 404 status', () => {
    notFoundHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  it('should include path and method in message', () => {
    mockReq.method = 'POST';
    mockReq.path = '/api/users';

    notFoundHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Cannot POST /api/users',
        correlationId: 'test-correlation-id',
      },
    });
  });

  it('should log warning for not found routes', () => {
    notFoundHandler(mockReq as Request, mockRes as Response);

    const mockLogger = getLogger();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/nonexistent',
        method: 'GET',
      }),
      'Route not found'
    );
  });
});

describe('AppError class', () => {
  it('should create error with all properties', () => {
    const error = new AppError(400, 'TEST_ERROR', 'Test message', {
      field: 'test',
    });

    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test message');
    expect(error.details).toEqual({ field: 'test' });
    expect(error.name).toBe('AppError');
  });

  it('should capture stack trace', () => {
    const error = new AppError(500, 'ERROR', 'Error');

    expect(error.stack).toBeDefined();
  });

  it('should be instanceof Error', () => {
    const error = new AppError(500, 'ERROR', 'Error');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof AppError).toBe(true);
  });
});

describe('Errors factory', () => {
  it('should create badRequest error', () => {
    const error = Errors.badRequest('Invalid email');

    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.message).toBe('Invalid email');
  });

  it('should create badRequest error with details', () => {
    const error = Errors.badRequest('Invalid', { field: 'email' });

    expect(error.details).toEqual({ field: 'email' });
  });

  it('should create unauthorized error', () => {
    const error = Errors.unauthorized();

    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.message).toBe('Authentication required');
  });

  it('should create unauthorized error with custom message', () => {
    const error = Errors.unauthorized('Token expired');

    expect(error.message).toBe('Token expired');
  });

  it('should create forbidden error', () => {
    const error = Errors.forbidden();

    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });

  it('should create notFound error', () => {
    const error = Errors.notFound('User');

    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('User not found');
  });

  it('should create conflict error', () => {
    const error = Errors.conflict('Email already exists');

    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
    expect(error.message).toBe('Email already exists');
  });

  it('should create tooManyRequests error', () => {
    const error = Errors.tooManyRequests();

    expect(error.statusCode).toBe(429);
    expect(error.code).toBe('TOO_MANY_REQUESTS');
  });

  it('should create internal error', () => {
    const error = Errors.internal();

    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
  });

  it('should create serviceUnavailable error', () => {
    const error = Errors.serviceUnavailable();

    expect(error.statusCode).toBe(503);
    expect(error.code).toBe('SERVICE_UNAVAILABLE');
  });
});
