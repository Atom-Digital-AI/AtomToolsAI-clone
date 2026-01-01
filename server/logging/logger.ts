import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';
import { env } from '../config';

// Context storage for request-scoped data like correlation IDs
interface RequestContext {
  correlationId: string;
  userId?: number;
  path?: string;
  method?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

// Create the base Pino logger
export const logger = pino({
  level: process.env.LOG_LEVEL?.toLowerCase() || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  // Redact sensitive fields from logs
  redact: {
    paths: [
      'password',
      'token',
      'apiKey',
      'api_key',
      'authorization',
      'Authorization',
      'sessionSecret',
      'DATABASE_URL',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
  // Use pino-pretty in development for readable logs
  transport: env.NODE_ENV !== 'production'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

/**
 * Get a child logger with request context (correlation ID, user, etc.)
 * Use this in route handlers and services to maintain request tracing
 */
export function getLogger(additionalContext?: Record<string, unknown>) {
  const store = requestContext.getStore();

  return logger.child({
    correlationId: store?.correlationId,
    userId: store?.userId,
    ...additionalContext,
  });
}

/**
 * Get the current correlation ID from the request context
 */
export function getCorrelationId(): string | undefined {
  return requestContext.getStore()?.correlationId;
}

/**
 * Set user ID in the current request context
 */
export function setContextUserId(userId: number): void {
  const store = requestContext.getStore();
  if (store) {
    store.userId = userId;
  }
}

// Export types for external use
export type Logger = typeof logger;
export type { RequestContext };
