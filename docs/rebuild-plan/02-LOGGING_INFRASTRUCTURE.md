# Logging, Validation & Authentication Infrastructure Specification

## Document Purpose

This document provides the complete technical specification for:
1. Structured logging with Pino
2. Correlation ID tracking
3. Request/Response validation middleware
4. API key authentication system
5. Rate limiting per API key
6. Audit logging

---

## Table of Contents

1. [Structured Logging](#1-structured-logging)
2. [Correlation ID System](#2-correlation-id-system)
3. [Request Validation](#3-request-validation)
4. [Response Validation](#4-response-validation)
5. [API Key Authentication](#5-api-key-authentication)
6. [Rate Limiting](#6-rate-limiting)
7. [Audit Logging](#7-audit-logging)
8. [Error Handling](#8-error-handling)
9. [Integration with Sentry](#9-integration-with-sentry)
10. [Testing Requirements](#10-testing-requirements)

---

## 1. Structured Logging

### 1.1 Requirements

| ID | Requirement | Current | Target |
|----|-------------|---------|--------|
| LOG-01 | Structured JSON logging | 10% | 100% |
| LOG-02 | Correlation IDs | 0% | 100% |
| LOG-03 | Log levels (DEBUG, INFO, WARN, ERROR, FATAL) | 60% | 100% |
| LOG-04 | ISO 8601 timestamps | 90% | 100% |
| LOG-05 | Environment/service metadata | 50% | 100% |

### 1.2 Pino Configuration

```typescript
// File: /server/logging/logger.ts

import pino, { Logger, LoggerOptions } from 'pino';
import { env } from '../config';

/**
 * Base logger configuration.
 */
const baseConfig: LoggerOptions = {
  level: env.LOG_LEVEL ?? 'info',

  // ISO 8601 timestamps
  timestamp: pino.stdTimeFunctions.isoTime,

  // Base context included in every log
  base: {
    service: 'atomtools-api',
    version: env.APP_VERSION ?? '1.0.0',
    environment: env.NODE_ENV,
    instance: env.RAILWAY_REPLICA_ID ?? 'local',
  },

  // Custom serializers
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'x-correlation-id': req.headers['x-correlation-id'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: {
        'content-type': res.getHeader('content-type'),
        'x-correlation-id': res.getHeader('x-correlation-id'),
      },
    }),
    err: pino.stdSerializers.err,
  },

  // Redact sensitive fields
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.apiKey',
      'req.body.token',
      '*.password',
      '*.apiKey',
      '*.secretKey',
      '*.accessToken',
      '*.refreshToken',
    ],
    censor: '[REDACTED]',
  },
};

/**
 * Development configuration (pretty printing).
 */
const devConfig: LoggerOptions = {
  ...baseConfig,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
};

/**
 * Production configuration (JSON output).
 */
const prodConfig: LoggerOptions = {
  ...baseConfig,
  // No transport = raw JSON to stdout
};

/**
 * Create the logger based on environment.
 */
export const logger: Logger = pino(
  env.NODE_ENV === 'production' ? prodConfig : devConfig
);

/**
 * Create a child logger with additional context.
 */
export function createLogger(context: Record<string, unknown>): Logger {
  return logger.child(context);
}

/**
 * Log levels enum for type safety.
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}
```

### 1.3 HTTP Request Logging

```typescript
// File: /server/middleware/request-logger.ts

import pinoHttp from 'pino-http';
import { logger } from '../logging/logger';
import { getCorrelationId } from './correlation-id';

/**
 * HTTP request/response logging middleware.
 */
export const requestLogger = pinoHttp({
  logger,

  // Use correlation ID as request ID
  genReqId: (req) => getCorrelationId(req),

  // Custom log level based on status
  customLogLevel: (req, res, error) => {
    if (error || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },

  // Custom success message
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed`;
  },

  // Custom error message
  customErrorMessage: (req, res, error) => {
    return `${req.method} ${req.url} failed: ${error.message}`;
  },

  // Additional attributes for each log
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'duration_ms',
  },

  // Custom props added to every log
  customProps: (req) => ({
    correlationId: getCorrelationId(req),
    userId: req.user?.id,
    apiKeyId: req.apiKey?.id,
  }),

  // Auto-logging configuration
  autoLogging: {
    ignore: (req) => {
      // Don't log health checks
      return req.url?.startsWith('/health') ?? false;
    },
  },
});
```

### 1.4 Replace Console Calls

All 442 `console.log/error/warn` calls must be replaced:

```typescript
// BEFORE (bad)
console.log('Processing request:', requestId);
console.error('Error:', error);

// AFTER (good)
logger.info({ requestId }, 'Processing request');
logger.error({ err: error, requestId }, 'Request processing failed');
```

---

## 2. Correlation ID System

### 2.1 Correlation ID Middleware

```typescript
// File: /server/middleware/correlation-id.ts

import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Async local storage for correlation ID propagation.
 */
export const correlationStore = new AsyncLocalStorage<string>();

/**
 * Header name for correlation ID.
 */
export const CORRELATION_HEADER = 'x-correlation-id';

/**
 * Get correlation ID from request or generate new one.
 */
export function getCorrelationId(req: Request): string {
  // Check header first (for distributed tracing)
  const headerValue = req.headers[CORRELATION_HEADER];
  if (typeof headerValue === 'string' && headerValue.length > 0) {
    return headerValue;
  }

  // Check if already generated for this request
  if ((req as any).correlationId) {
    return (req as any).correlationId;
  }

  // Generate new ID
  return nanoid();
}

/**
 * Get correlation ID from async local storage.
 * Use this in nested function calls.
 */
export function getCurrentCorrelationId(): string | undefined {
  return correlationStore.getStore();
}

/**
 * Correlation ID middleware.
 * Sets correlation ID on request and response.
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const correlationId = getCorrelationId(req);

  // Store on request object
  (req as any).correlationId = correlationId;

  // Set response header
  res.setHeader(CORRELATION_HEADER, correlationId);

  // Run rest of request in async context with correlation ID
  correlationStore.run(correlationId, () => {
    next();
  });
}
```

### 2.2 Correlation ID Propagation

```typescript
// File: /server/logging/context.ts

import { getCurrentCorrelationId } from '../middleware/correlation-id';
import { logger } from './logger';
import { Logger } from 'pino';

/**
 * Get a logger with current correlation context.
 * Use this when you don't have direct access to the request.
 */
export function getContextLogger(extra?: Record<string, unknown>): Logger {
  const correlationId = getCurrentCorrelationId();

  return logger.child({
    correlationId,
    ...extra,
  });
}

/**
 * Decorator to add correlation ID to async function logs.
 */
export function withCorrelation<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  loggerKey = 'logger'
): T {
  return (async (...args: any[]) => {
    const correlationId = getCurrentCorrelationId();
    const contextLogger = logger.child({ correlationId });

    // Inject logger if function accepts options object
    if (args.length > 0 && typeof args[args.length - 1] === 'object') {
      args[args.length - 1][loggerKey] = contextLogger;
    }

    return fn(...args);
  }) as T;
}
```

---

## 3. Request Validation

### 3.1 Validation Middleware

```typescript
// File: /server/middleware/validate-request.ts

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../logging/logger';
import { ValidationError } from '../errors/validation.error';

/**
 * Schema configuration for request validation.
 */
interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Create validation middleware for a route.
 *
 * @example
 * app.post('/users',
 *   validateRequest({
 *     body: createUserSchema,
 *   }),
 *   createUserHandler
 * );
 */
export function validateRequest(schemas: ValidationSchemas) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const correlationId = (req as any).correlationId;
    const errors: ValidationError[] = [];

    try {
      // Validate body
      if (schemas.body) {
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          errors.push(
            ...formatZodErrors(result.error, 'body')
          );
        } else {
          req.body = result.data;
        }
      }

      // Validate query
      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          errors.push(
            ...formatZodErrors(result.error, 'query')
          );
        } else {
          req.query = result.data;
        }
      }

      // Validate params
      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          errors.push(
            ...formatZodErrors(result.error, 'params')
          );
        } else {
          req.params = result.data;
        }
      }

      if (errors.length > 0) {
        logger.warn({
          correlationId,
          event: 'request_validation_failed',
          errors,
          path: req.path,
          method: req.method,
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: errors,
          },
          correlationId,
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Format Zod errors into structured format.
 */
function formatZodErrors(
  error: ZodError,
  location: 'body' | 'query' | 'params'
): ValidationError[] {
  return error.errors.map((e) => ({
    location,
    path: e.path.join('.'),
    message: e.message,
    code: e.code,
    expected: getExpectedType(e),
    received: getReceivedValue(e),
  }));
}

interface ValidationError {
  location: 'body' | 'query' | 'params';
  path: string;
  message: string;
  code: string;
  expected?: string;
  received?: string;
}

function getExpectedType(error: any): string | undefined {
  if (error.expected) return error.expected;
  if (error.code === 'invalid_type') return error.expected;
  return undefined;
}

function getReceivedValue(error: any): string | undefined {
  if (error.received) return String(error.received);
  return undefined;
}
```

### 3.2 Common Request Schemas

```typescript
// File: /shared/schemas/api.schema.ts

import { z } from 'zod';

/**
 * Pagination query parameters.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * ID parameter schema.
 */
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

/**
 * Search query schema.
 */
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  filters: z.record(z.string()).optional(),
});

/**
 * Date range schema.
 */
export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine(
  (data) => data.startDate <= data.endDate,
  { message: 'startDate must be before endDate' }
);
```

---

## 4. Response Validation

### 4.1 Response Validation Middleware

```typescript
// File: /server/middleware/validate-response.ts

import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { logger } from '../logging/logger';

/**
 * Wrap response.json to validate output.
 *
 * @example
 * app.get('/users/:id',
 *   validateResponse(userResponseSchema),
 *   getUserHandler
 * );
 */
export function validateResponse<T>(schema: ZodSchema<T>) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const correlationId = (req as any).correlationId;
    const originalJson = res.json.bind(res);

    // Override res.json
    res.json = (body: any): Response => {
      // Skip validation for error responses
      if (res.statusCode >= 400) {
        return originalJson(body);
      }

      // Validate response body
      const result = schema.safeParse(body);

      if (!result.success) {
        logger.error({
          correlationId,
          event: 'response_validation_failed',
          errors: result.error.errors,
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
        });

        // In development, fail loudly
        if (process.env.NODE_ENV === 'development') {
          return originalJson({
            success: false,
            error: {
              code: 'RESPONSE_VALIDATION_ERROR',
              message: 'Response validation failed (development only)',
              details: result.error.errors,
            },
            correlationId,
          });
        }

        // In production, log but return response anyway
        // This prevents breaking clients while we fix the issue
        return originalJson(body);
      }

      // Return validated data
      return originalJson(result.data);
    };

    next();
  };
}

/**
 * Standard API response wrapper.
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
  correlationId: string;
}

/**
 * Standard error response.
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  correlationId: string;
}

/**
 * Create success response schema.
 */
export function createResponseSchema<T>(dataSchema: ZodSchema<T>) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: z.object({
      page: z.number().optional(),
      limit: z.number().optional(),
      total: z.number().optional(),
      hasMore: z.boolean().optional(),
    }).optional(),
    correlationId: z.string(),
  });
}
```

---

## 5. API Key Authentication

### 5.1 Database Schema

```sql
-- File: /supabase/migrations/001_api_keys.sql

-- API Keys table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Key identification
  name VARCHAR(255) NOT NULL,
  prefix VARCHAR(8) NOT NULL,  -- First 8 chars for identification
  hash VARCHAR(255) NOT NULL,  -- bcrypt hash of full key

  -- Scoping
  scopes TEXT[] DEFAULT '{}',  -- Array of allowed scopes
  tool_ids TEXT[] DEFAULT '{}', -- Array of allowed tool IDs (empty = all)

  -- Rate limiting
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_day INTEGER DEFAULT 10000,

  -- Usage tracking
  last_used_at TIMESTAMP WITH TIME ZONE,
  total_requests INTEGER DEFAULT 0,

  -- Lifecycle
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_prefix UNIQUE (prefix)
);

-- Index for fast lookup
CREATE INDEX idx_api_keys_prefix ON api_keys(prefix) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_user ON api_keys(user_id);

-- API Key audit log
CREATE TABLE api_key_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id),

  -- Request info
  correlation_id VARCHAR(50) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,

  -- Timing
  duration_ms INTEGER,

  -- Metadata
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying
CREATE INDEX idx_api_key_audit_key ON api_key_audit_logs(api_key_id);
CREATE INDEX idx_api_key_audit_time ON api_key_audit_logs(created_at);
```

### 5.2 API Key Service

```typescript
// File: /server/services/api-key.service.ts

import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../logging/logger';

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  scopes: string[];
  toolIds: string[];
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface CreateApiKeyInput {
  userId: string;
  name: string;
  scopes?: string[];
  toolIds?: string[];
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  expiresAt?: Date;
}

export interface ApiKeyWithSecret extends ApiKey {
  /**
   * The full API key (only returned once on creation).
   * Format: atk_<prefix>_<secret>
   */
  key: string;
}

export class ApiKeyService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new API key.
   * Returns the full key only once - it cannot be retrieved later.
   */
  async create(input: CreateApiKeyInput): Promise<ApiKeyWithSecret> {
    // Generate key components
    const prefix = this.generatePrefix();
    const secret = this.generateSecret();
    const fullKey = `atk_${prefix}_${secret}`;
    const hash = await bcrypt.hash(fullKey, 12);

    // Insert into database
    const { data, error } = await this.supabase
      .from('api_keys')
      .insert({
        user_id: input.userId,
        name: input.name,
        prefix,
        hash,
        scopes: input.scopes ?? [],
        tool_ids: input.toolIds ?? [],
        rate_limit_per_minute: input.rateLimitPerMinute ?? 60,
        rate_limit_per_day: input.rateLimitPerDay ?? 10000,
        expires_at: input.expiresAt?.toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error({ error, input }, 'Failed to create API key');
      throw new Error('Failed to create API key');
    }

    return {
      ...this.mapToApiKey(data),
      key: fullKey,
    };
  }

  /**
   * Validate an API key and return its details.
   * Returns null if key is invalid, expired, or revoked.
   */
  async validate(key: string): Promise<ApiKey | null> {
    // Extract prefix from key
    const parts = key.split('_');
    if (parts.length !== 3 || parts[0] !== 'atk') {
      return null;
    }

    const prefix = parts[1];

    // Look up by prefix
    const { data, error } = await this.supabase
      .from('api_keys')
      .select('*')
      .eq('prefix', prefix)
      .is('revoked_at', null)
      .single();

    if (error || !data) {
      return null;
    }

    // Verify hash
    const isValid = await bcrypt.compare(key, data.hash);
    if (!isValid) {
      return null;
    }

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null;
    }

    // Update last used
    await this.supabase
      .from('api_keys')
      .update({
        last_used_at: new Date().toISOString(),
        total_requests: data.total_requests + 1,
      })
      .eq('id', data.id);

    return this.mapToApiKey(data);
  }

  /**
   * Revoke an API key.
   */
  async revoke(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error('Failed to revoke API key');
    }
  }

  /**
   * List all API keys for a user.
   */
  async listForUser(userId: string): Promise<ApiKey[]> {
    const { data, error } = await this.supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to list API keys');
    }

    return data.map(this.mapToApiKey);
  }

  /**
   * Check if API key has required scope.
   */
  hasScope(apiKey: ApiKey, scope: string): boolean {
    // Empty scopes = all scopes allowed
    if (apiKey.scopes.length === 0) return true;
    return apiKey.scopes.includes(scope) || apiKey.scopes.includes('*');
  }

  /**
   * Check if API key can access tool.
   */
  canAccessTool(apiKey: ApiKey, toolId: string): boolean {
    // Empty toolIds = all tools allowed
    if (apiKey.toolIds.length === 0) return true;
    return apiKey.toolIds.includes(toolId);
  }

  private generatePrefix(): string {
    return randomBytes(4).toString('hex');
  }

  private generateSecret(): string {
    return randomBytes(24).toString('base64url');
  }

  private mapToApiKey(data: any): ApiKey {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      prefix: data.prefix,
      scopes: data.scopes,
      toolIds: data.tool_ids,
      rateLimitPerMinute: data.rate_limit_per_minute,
      rateLimitPerDay: data.rate_limit_per_day,
      lastUsedAt: data.last_used_at ? new Date(data.last_used_at) : null,
      expiresAt: data.expires_at ? new Date(data.expires_at) : null,
      createdAt: new Date(data.created_at),
    };
  }
}
```

### 5.3 API Key Authentication Middleware

```typescript
// File: /server/middleware/api-key.ts

import { Request, Response, NextFunction } from 'express';
import { ApiKeyService, ApiKey } from '../services/api-key.service';
import { logger } from '../logging/logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKey;
    }
  }
}

/**
 * API key authentication middleware.
 * Supports both header and query parameter.
 */
export function apiKeyAuth(apiKeyService: ApiKeyService) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const correlationId = (req as any).correlationId;

    // Extract API key from header or query
    const key = extractApiKey(req);

    if (!key) {
      // No API key - continue to session auth
      return next();
    }

    try {
      // Validate key
      const apiKey = await apiKeyService.validate(key);

      if (!apiKey) {
        logger.warn({
          correlationId,
          event: 'api_key_invalid',
          keyPrefix: key.substring(0, 12) + '...',
        });

        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid or expired API key',
          },
          correlationId,
        });
        return;
      }

      // Attach to request
      req.apiKey = apiKey;
      req.user = { id: apiKey.userId } as any; // Compatibility with session auth

      logger.debug({
        correlationId,
        event: 'api_key_authenticated',
        keyId: apiKey.id,
        userId: apiKey.userId,
      });

      next();
    } catch (error) {
      logger.error({
        correlationId,
        event: 'api_key_validation_error',
        error,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication error',
        },
        correlationId,
      });
    }
  };
}

/**
 * Require API key for route.
 * Use after apiKeyAuth middleware.
 */
export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.apiKey) {
    res.status(401).json({
      success: false,
      error: {
        code: 'API_KEY_REQUIRED',
        message: 'API key required for this endpoint',
      },
      correlationId: (req as any).correlationId,
    });
    return;
  }

  next();
}

/**
 * Require specific scope on API key.
 */
export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.apiKey) {
      return next(); // Let requireApiKey handle
    }

    const apiKeyService = req.app.get('apiKeyService') as ApiKeyService;

    if (!apiKeyService.hasScope(req.apiKey, scope)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_SCOPE',
          message: `API key missing required scope: ${scope}`,
        },
        correlationId: (req as any).correlationId,
      });
      return;
    }

    next();
  };
}

/**
 * Extract API key from request.
 */
function extractApiKey(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token.startsWith('atk_')) {
      return token;
    }
  }

  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string' && apiKeyHeader.startsWith('atk_')) {
    return apiKeyHeader;
  }

  // Check query parameter (for webhooks)
  const queryKey = req.query.api_key;
  if (typeof queryKey === 'string' && queryKey.startsWith('atk_')) {
    return queryKey;
  }

  return null;
}
```

---

## 6. Rate Limiting

### 6.1 Per-Key Rate Limiting

```typescript
// File: /server/middleware/rate-limit.ts

import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { logger } from '../logging/logger';

// In-memory fallback if Redis is unavailable
const memoryLimiter = new RateLimiterMemory({
  points: 60,
  duration: 60,
});

interface RateLimitConfig {
  redis?: any; // Redis client
  keyPrefix?: string;
}

/**
 * Create rate limiter middleware.
 * Uses API key limits if authenticated, falls back to IP.
 */
export function createRateLimiter(config: RateLimitConfig = {}) {
  const limiter = config.redis
    ? new RateLimiterRedis({
        storeClient: config.redis,
        keyPrefix: config.keyPrefix ?? 'rl',
        points: 60, // Default points
        duration: 60, // Per minute
      })
    : memoryLimiter;

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const correlationId = (req as any).correlationId;

    try {
      // Determine rate limit key and points
      let key: string;
      let points: number;

      if (req.apiKey) {
        key = `api:${req.apiKey.id}`;
        points = req.apiKey.rateLimitPerMinute;
      } else if (req.user?.id) {
        key = `user:${req.user.id}`;
        points = 60; // Default for logged-in users
      } else {
        key = `ip:${req.ip}`;
        points = 30; // Lower limit for anonymous
      }

      // Consume point
      const result = await limiter.consume(key, 1);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', points);
      res.setHeader('X-RateLimit-Remaining', result.remainingPoints);
      res.setHeader(
        'X-RateLimit-Reset',
        new Date(Date.now() + result.msBeforeNext).toISOString()
      );

      next();
    } catch (rejRes: any) {
      // Rate limit exceeded
      logger.warn({
        correlationId,
        event: 'rate_limit_exceeded',
        apiKeyId: req.apiKey?.id,
        userId: req.user?.id,
        ip: req.ip,
      });

      res.setHeader('Retry-After', Math.ceil(rejRes.msBeforeNext / 1000));
      res.setHeader('X-RateLimit-Remaining', 0);

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(rejRes.msBeforeNext / 1000),
        },
        correlationId,
      });
    }
  };
}

/**
 * Stricter rate limiter for sensitive endpoints.
 */
export function strictRateLimiter() {
  const limiter = new RateLimiterMemory({
    points: 5,
    duration: 60,
  });

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const key = req.ip ?? 'unknown';

    try {
      await limiter.consume(key);
      next();
    } catch {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please wait before trying again.',
        },
        correlationId: (req as any).correlationId,
      });
    }
  };
}
```

---

## 7. Audit Logging

### 7.1 Audit Logger

```typescript
// File: /server/logging/audit.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

export interface AuditEvent {
  correlationId: string;
  userId?: string;
  apiKeyId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export enum AuditAction {
  // Auth actions
  LOGIN = 'auth.login',
  LOGOUT = 'auth.logout',
  API_KEY_CREATED = 'auth.api_key_created',
  API_KEY_REVOKED = 'auth.api_key_revoked',

  // Agent actions
  AGENT_INVOKED = 'agent.invoked',
  AGENT_COMPLETED = 'agent.completed',
  AGENT_FAILED = 'agent.failed',

  // Tool actions
  TOOL_STARTED = 'tool.started',
  TOOL_COMPLETED = 'tool.completed',
  TOOL_FAILED = 'tool.failed',

  // Content actions
  CONTENT_CREATED = 'content.created',
  CONTENT_UPDATED = 'content.updated',
  CONTENT_DELETED = 'content.deleted',

  // Admin actions
  USER_CREATED = 'admin.user_created',
  USER_UPDATED = 'admin.user_updated',
  SUBSCRIPTION_CHANGED = 'admin.subscription_changed',
}

export class AuditLogger {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Log an audit event.
   */
  async log(event: AuditEvent): Promise<void> {
    try {
      await this.supabase.from('audit_logs').insert({
        correlation_id: event.correlationId,
        user_id: event.userId,
        api_key_id: event.apiKeyId,
        action: event.action,
        resource: event.resource,
        resource_id: event.resourceId,
        details: event.details,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        created_at: new Date().toISOString(),
      });

      logger.debug({
        correlationId: event.correlationId,
        event: 'audit_logged',
        action: event.action,
        resource: event.resource,
      });
    } catch (error) {
      // Don't fail the request if audit logging fails
      logger.error({
        correlationId: event.correlationId,
        event: 'audit_log_failed',
        error,
        originalEvent: event,
      });
    }
  }

  /**
   * Create audit event from request context.
   */
  fromRequest(
    req: any,
    action: AuditAction,
    resource: string,
    resourceId?: string,
    details?: Record<string, unknown>
  ): AuditEvent {
    return {
      correlationId: req.correlationId,
      userId: req.user?.id,
      apiKeyId: req.apiKey?.id,
      action,
      resource,
      resourceId,
      details,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
  }
}
```

---

## 8. Error Handling

### 8.1 Global Error Handler

```typescript
// File: /server/middleware/error-handler.ts

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import * as Sentry from '@sentry/node';
import { logger } from '../logging/logger';

/**
 * Base application error.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Global error handler middleware.
 * Must be registered last.
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const correlationId = (req as any).correlationId;

  // Build error response
  const errorResponse = buildErrorResponse(error, correlationId);

  // Log error
  logError(error, req, correlationId, errorResponse.statusCode);

  // Report to Sentry (5xx only)
  if (errorResponse.statusCode >= 500) {
    Sentry.withScope((scope) => {
      scope.setTag('correlationId', correlationId);
      scope.setUser({ id: req.user?.id });
      scope.setContext('request', {
        method: req.method,
        path: req.path,
        query: req.query,
        body: redactSensitiveFields(req.body),
      });
      Sentry.captureException(error);
    });
  }

  // Send response
  res.status(errorResponse.statusCode).json({
    success: false,
    error: {
      code: errorResponse.code,
      message: errorResponse.message,
      details: errorResponse.details,
    },
    correlationId,
  });
}

interface ErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

function buildErrorResponse(
  error: Error,
  correlationId: string
): ErrorResponse {
  // Known application errors
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    };
  }

  // Supabase errors
  if ((error as any).code?.startsWith('PGRST')) {
    return {
      statusCode: 400,
      code: 'DATABASE_ERROR',
      message: 'Database operation failed',
    };
  }

  // Default: Internal server error
  return {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message:
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'An unexpected error occurred',
  };
}

function logError(
  error: Error,
  req: Request,
  correlationId: string,
  statusCode: number
): void {
  const logData = {
    correlationId,
    event: 'request_error',
    statusCode,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      userId: req.user?.id,
      apiKeyId: req.apiKey?.id,
    },
  };

  if (statusCode >= 500) {
    logger.error(logData);
  } else if (statusCode >= 400) {
    logger.warn(logData);
  } else {
    logger.info(logData);
  }
}

function redactSensitiveFields(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const sensitive = ['password', 'token', 'apiKey', 'secret'];
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj ?? {})) {
    if (sensitive.some((s) => key.toLowerCase().includes(s))) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = value;
    }
  }

  return result;
}
```

---

## 9. Integration with Sentry

### 9.1 Enhanced Sentry Configuration

```typescript
// File: /server/config/sentry.ts

import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { Express } from 'express';
import { env } from './index';

/**
 * Initialize Sentry with full configuration.
 */
export function initSentry(app: Express): void {
  if (!env.SENTRY_DSN) {
    console.warn('SENTRY_DSN not set, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: env.APP_VERSION,

    // Enable performance monitoring
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Enable profiling
    profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,

    integrations: [
      // Express integration
      new Sentry.Integrations.Express({ app }),

      // Profiling
      new ProfilingIntegration(),

      // PostgreSQL tracing
      new Sentry.Integrations.Postgres(),
    ],

    // Filter sensitive data
    beforeSend(event, hint) {
      // Redact sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
        delete event.request.headers['x-api-key'];
      }

      // Redact sensitive body fields
      if (event.request?.data) {
        const sensitiveFields = ['password', 'token', 'apiKey'];
        for (const field of sensitiveFields) {
          if (event.request.data[field]) {
            event.request.data[field] = '[REDACTED]';
          }
        }
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      'ECONNRESET',
      'EPIPE',
      'ResizeObserver loop',
    ],
  });
}

/**
 * Sentry request handler middleware.
 */
export const sentryRequestHandler = Sentry.Handlers.requestHandler({
  user: ['id', 'email'],
  ip: true,
});

/**
 * Sentry tracing middleware.
 */
export const sentryTracingHandler = Sentry.Handlers.tracingHandler();

/**
 * Sentry error handler middleware.
 */
export const sentryErrorHandler = Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    // Only report 5xx errors to Sentry
    return (error as any).statusCode >= 500;
  },
});
```

---

## 10. Testing Requirements

### 10.1 Logging Tests

```typescript
// File: /server/logging/__tests__/logger.test.ts

import { describe, it, expect, vi } from 'vitest';
import { logger, createLogger } from '../logger';

describe('Logger', () => {
  it('should create logger with base context', () => {
    expect(logger).toBeDefined();
    expect(logger.level).toBe('info');
  });

  it('should create child logger with additional context', () => {
    const child = createLogger({ requestId: '123' });
    expect(child).toBeDefined();
  });

  it('should include timestamp in logs', () => {
    const spy = vi.spyOn(process.stdout, 'write');
    logger.info('test message');

    // Check that output includes ISO timestamp
    const output = spy.mock.calls[0]?.[0];
    expect(output).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
```

### 10.2 Validation Middleware Tests

```typescript
// File: /server/middleware/__tests__/validate-request.test.ts

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import { validateRequest } from '../validate-request';
import { correlationIdMiddleware } from '../correlation-id';

const app = express();
app.use(express.json());
app.use(correlationIdMiddleware);

const testSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive(),
});

app.post(
  '/test',
  validateRequest({ body: testSchema }),
  (req, res) => {
    res.json({ success: true, data: req.body });
  }
);

describe('validateRequest', () => {
  it('should pass valid request', async () => {
    const response = await request(app)
      .post('/test')
      .send({ name: 'John', age: 30 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should reject invalid request', async () => {
    const response = await request(app)
      .post('/test')
      .send({ name: '', age: -5 });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toHaveLength(2);
  });

  it('should include field path in error', async () => {
    const response = await request(app)
      .post('/test')
      .send({ name: 'John', age: 'not a number' });

    const ageError = response.body.error.details.find(
      (e: any) => e.path === 'age'
    );
    expect(ageError).toBeDefined();
    expect(ageError.message).toContain('number');
  });

  it('should include correlation ID in error response', async () => {
    const response = await request(app)
      .post('/test')
      .send({ name: '' });

    expect(response.body.correlationId).toBeDefined();
    expect(response.headers['x-correlation-id']).toBeDefined();
  });
});
```

### 10.3 API Key Tests

```typescript
// File: /server/services/__tests__/api-key.service.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiKeyService } from '../api-key.service';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };
    service = new ApiKeyService(mockSupabase);
  });

  describe('create', () => {
    it('should create API key with prefix', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'key-1',
          user_id: 'user-1',
          name: 'Test Key',
          prefix: 'abc12345',
          scopes: [],
          tool_ids: [],
          rate_limit_per_minute: 60,
          rate_limit_per_day: 10000,
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      const result = await service.create({
        userId: 'user-1',
        name: 'Test Key',
      });

      expect(result.key).toMatch(/^atk_[a-f0-9]{8}_/);
      expect(result.name).toBe('Test Key');
    });
  });

  describe('validate', () => {
    it('should return null for invalid format', async () => {
      const result = await service.validate('invalid-key');
      expect(result).toBeNull();
    });

    it('should return null for non-existent key', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await service.validate('atk_abc12345_secret');
      expect(result).toBeNull();
    });
  });

  describe('hasScope', () => {
    it('should allow all scopes if empty', () => {
      const apiKey = { scopes: [] } as any;
      expect(service.hasScope(apiKey, 'agent:execute')).toBe(true);
    });

    it('should check specific scope', () => {
      const apiKey = { scopes: ['agent:execute'] } as any;
      expect(service.hasScope(apiKey, 'agent:execute')).toBe(true);
      expect(service.hasScope(apiKey, 'admin:write')).toBe(false);
    });

    it('should allow wildcard scope', () => {
      const apiKey = { scopes: ['*'] } as any;
      expect(service.hasScope(apiKey, 'anything')).toBe(true);
    });
  });
});
```

---

## Summary

This specification covers:

1. **Structured Logging** - Pino with JSON output, log levels, redaction
2. **Correlation IDs** - Request tracing across all logs
3. **Request Validation** - Zod schemas for all inputs
4. **Response Validation** - Zod schemas for all outputs
5. **API Key Auth** - Full key lifecycle management
6. **Rate Limiting** - Per-key and per-IP limits
7. **Audit Logging** - Complete action tracking
8. **Error Handling** - Consistent error responses
9. **Sentry Integration** - Enhanced error tracking
10. **Testing** - Comprehensive test coverage

---

*Document Version: 1.0*
*Created: 2024*
*Last Updated: 2024*
