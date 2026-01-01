import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { ZodError } from 'zod';
import { getLogger, getCorrelationId } from '../logging/logger';
import { logToolError, getErrorTypeFromError } from '../errorLogger';
import { env } from '../config';

/**
 * Standard error response format
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    correlationId?: string;
    details?: unknown;
  };
}

/**
 * Custom application error with status code
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error factory functions
 */
export const Errors = {
  badRequest: (message: string, details?: unknown) =>
    new AppError(400, 'BAD_REQUEST', message, details),

  unauthorized: (message = 'Authentication required') =>
    new AppError(401, 'UNAUTHORIZED', message),

  forbidden: (message = 'Access denied') =>
    new AppError(403, 'FORBIDDEN', message),

  notFound: (resource = 'Resource') =>
    new AppError(404, 'NOT_FOUND', `${resource} not found`),

  conflict: (message: string) =>
    new AppError(409, 'CONFLICT', message),

  tooManyRequests: (message = 'Too many requests') =>
    new AppError(429, 'TOO_MANY_REQUESTS', message),

  internal: (message = 'An unexpected error occurred') =>
    new AppError(500, 'INTERNAL_ERROR', message),

  serviceUnavailable: (message = 'Service temporarily unavailable') =>
    new AppError(503, 'SERVICE_UNAVAILABLE', message),
};

/**
 * Global Error Handler Middleware
 *
 * Handles all errors thrown in the application:
 * - Logs errors with full context
 * - Reports to Sentry (in production)
 * - Stores errors in database for admin review
 * - Returns consistent error response format
 *
 * Must be registered AFTER all routes.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const log = getLogger({ middleware: 'errorHandler' });
  const correlationId = getCorrelationId();

  // Determine status code and error details
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: unknown = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  } else if ((err as any).status || (err as any).statusCode) {
    statusCode = (err as any).status || (err as any).statusCode;
    message = err.message || message;
  }

  // Log the error with full context
  const errorContext = {
    error: {
      name: err.name,
      message: err.message,
      code: errorCode,
      stack: err.stack,
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      // Don't log full body to avoid logging sensitive data
      bodyKeys: req.body ? Object.keys(req.body) : undefined,
    },
    statusCode,
  };

  if (statusCode >= 500) {
    log.error(errorContext, 'Unhandled server error');
  } else if (statusCode >= 400) {
    log.warn(errorContext, 'Client error');
  }

  // Report to Sentry for 5xx errors
  if (statusCode >= 500 && env.SENTRY_DSN) {
    Sentry.captureException(err, {
      tags: {
        endpoint: `${req.method} ${req.path}`,
        statusCode: statusCode.toString(),
        errorCode,
      },
      user: {
        id: (req as any).user?.id,
        email: (req as any).user?.email,
      },
      extra: {
        correlationId,
        body: req.body,
        query: req.query,
        params: req.params,
      },
    });
  }

  // Log to database for admin review (fire and forget)
  const user = (req as any).user;
  logToolError({
    userId: user?.id,
    userEmail: user?.email,
    toolName: 'system',
    errorType: getErrorTypeFromError(err),
    errorMessage: message,
    errorStack: err.stack,
    requestData: {
      body: req.body,
      query: req.query,
      params: req.params,
    },
    httpStatus: statusCode,
    endpoint: `${req.method} ${req.path}`,
    req,
    status: 'to_do',
  }).catch((logErr) => {
    log.error({ error: logErr }, 'Failed to log error to database');
  });

  // Build response
  const response: ErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: env.NODE_ENV === 'production' && statusCode >= 500
        ? 'An unexpected error occurred'
        : message,
      correlationId,
    },
  };

  // Include details for non-production or client errors
  if (details && (env.NODE_ENV !== 'production' || statusCode < 500)) {
    response.error.details = details;
  }

  res.status(statusCode).json(response);
}

/**
 * Not Found Handler
 *
 * Catches requests to undefined routes.
 * Register BEFORE the error handler but AFTER all routes.
 */
export function notFoundHandler(req: Request, res: Response) {
  const log = getLogger({ middleware: 'notFoundHandler' });

  log.warn({ path: req.path, method: req.method }, 'Route not found');

  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
      correlationId: getCorrelationId(),
    },
  };

  res.status(404).json(response);
}
