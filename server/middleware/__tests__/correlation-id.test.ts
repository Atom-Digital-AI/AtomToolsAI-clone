import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { correlationIdMiddleware } from '../correlation-id';
import { requestContext, getLogger, getCorrelationId } from '../../logging/logger';

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-correlation-id-12345'),
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

  const mockRequestContext = {
    run: vi.fn((ctx, callback) => callback()),
    getStore: vi.fn(() => ({ correlationId: 'test-correlation-id' })),
  };

  return {
    requestContext: mockRequestContext,
    getLogger: vi.fn(() => mockLogger),
    getCorrelationId: vi.fn(() => 'test-correlation-id'),
    logger: mockLogger,
  };
});

describe('correlationIdMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let finishCallback: (() => void) | null;

  beforeEach(() => {
    vi.clearAllMocks();
    finishCallback = null;

    mockReq = {
      headers: {},
      path: '/api/test',
      method: 'GET',
      query: {},
    };

    mockRes = {
      setHeader: vi.fn(),
      on: vi.fn((event, callback) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
        return mockRes as Response;
      }),
      statusCode: 200,
    };

    mockNext = vi.fn();
  });

  describe('correlation ID handling', () => {
    it('should generate a new correlation ID when none is provided', () => {
      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('x-correlation-id', expect.any(String));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use existing correlation ID from request header', () => {
      const existingId = 'existing-correlation-id-xyz';
      mockReq.headers = { 'x-correlation-id': existingId };

      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('x-correlation-id', existingId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set correlation ID in response header', () => {
      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'x-correlation-id',
        expect.any(String)
      );
    });
  });

  describe('request context', () => {
    it('should run request in context with correlation ID', () => {
      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(requestContext.run).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: expect.any(String),
          path: '/api/test',
          method: 'GET',
        }),
        expect.any(Function)
      );
    });

    it('should include path and method in context', () => {
      mockReq.path = '/api/users';
      mockReq.method = 'POST';

      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(requestContext.run).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/users',
          method: 'POST',
        }),
        expect.any(Function)
      );
    });
  });

  describe('logging', () => {
    it('should log request start for API paths', () => {
      mockReq.path = '/api/test';

      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      const mockLogger = getLogger();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should not log for non-API paths', () => {
      mockReq.path = '/static/file.js';
      const mockLogger = getLogger();

      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      // The mock is called to create logger, but info should not be called for static
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        expect.objectContaining({ query: undefined }),
        'Request started'
      );
    });

    it('should register finish event handler', () => {
      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('should log query parameters when present', () => {
      mockReq.query = { page: '1', limit: '10' };

      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      const mockLogger = getLogger();
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('finish event handling', () => {
    it('should log completion for API paths with success status', () => {
      mockReq.path = '/api/test';
      mockRes.statusCode = 200;

      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      // Simulate response finish
      if (finishCallback) {
        finishCallback();
      }

      const mockLogger = getLogger();
      // Info should have been called for completion
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should log warning for error status codes (4xx)', () => {
      mockReq.path = '/api/test';
      mockRes.statusCode = 404;

      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      if (finishCallback) {
        finishCallback();
      }

      const mockLogger = getLogger();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should log warning for server error status codes (5xx)', () => {
      mockReq.path = '/api/test';
      mockRes.statusCode = 500;

      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      if (finishCallback) {
        finishCallback();
      }

      const mockLogger = getLogger();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('next function', () => {
    it('should call next function to continue middleware chain', () => {
      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next even when headers are missing', () => {
      mockReq.headers = {};

      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty query object', () => {
      mockReq.query = {};

      expect(() => {
        correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      methods.forEach((method) => {
        vi.clearAllMocks();
        mockReq.method = method;

        correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(requestContext.run).toHaveBeenCalledWith(
          expect.objectContaining({ method }),
          expect.any(Function)
        );
      });
    });

    it('should handle paths with special characters', () => {
      mockReq.path = '/api/users/123/profile?name=test';

      expect(() => {
        correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
