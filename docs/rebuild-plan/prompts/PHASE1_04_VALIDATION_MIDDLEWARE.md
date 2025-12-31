# Phase 1.4: Request/Response Validation Middleware

## Execution Prompt

You are implementing Phase 1.4 of the AtomToolsAI rebuild. Your task is to implement request and response validation middleware using Zod schemas.

### Prerequisites
- Phase 1.1-1.3 completed
- Zod already installed in project

### Reference Documents
- `/docs/rebuild-plan/02-LOGGING_INFRASTRUCTURE.md` - Sections 3-4: Validation

### Tasks

#### Task 1.4.1: Create Request Validation Middleware

Create `/server/middleware/validate-request.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../logging/logger';

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

interface ValidationError {
  location: 'body' | 'query' | 'params';
  path: string;
  message: string;
  code: string;
  expected?: string;
  received?: string;
}

export function validateRequest(schemas: ValidationSchemas) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const correlationId = (req as any).correlationId;
    const errors: ValidationError[] = [];

    try {
      // Validate body
      if (schemas.body) {
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error, 'body'));
        } else {
          req.body = result.data;
        }
      }

      // Validate query
      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error, 'query'));
        } else {
          req.query = result.data;
        }
      }

      // Validate params
      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error, 'params'));
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

function formatZodErrors(error: ZodError, location: 'body' | 'query' | 'params'): ValidationError[] {
  return error.errors.map((e) => ({
    location,
    path: e.path.join('.'),
    message: e.message,
    code: e.code,
    expected: (e as any).expected,
    received: (e as any).received !== undefined ? String((e as any).received) : undefined,
  }));
}
```

#### Task 1.4.2: Create Response Validation Middleware

Create `/server/middleware/validate-response.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { logger } from '../logging/logger';

export function validateResponse<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req as any).correlationId;
    const originalJson = res.json.bind(res);

    res.json = (body: any): Response => {
      // Skip validation for error responses
      if (res.statusCode >= 400) {
        return originalJson(body);
      }

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
              message: 'Response validation failed (dev only)',
              details: result.error.errors.map(e => ({
                path: e.path.join('.'),
                message: e.message,
              })),
            },
            correlationId,
          });
        }

        // In production, log but return response
        // This prevents breaking clients
      }

      return originalJson(result.success ? result.data : body);
    };

    next();
  };
}
```

#### Task 1.4.3: Create Common API Schemas

Create `/shared/schemas/api.schema.ts`:

```typescript
import { z } from 'zod';

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

// ID parameter
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

// Search query
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  filters: z.record(z.string()).optional(),
});

// Date range
export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine(
  (data) => data.startDate <= data.endDate,
  { message: 'startDate must be before or equal to endDate' }
);

// Standard API success response
export function createSuccessSchema<T extends z.ZodTypeAny>(dataSchema: T) {
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

// Standard API error response
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  correlationId: z.string(),
});

// Combined response type
export function createResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.union([
    createSuccessSchema(dataSchema),
    errorResponseSchema,
  ]);
}
```

#### Task 1.4.4: Create Global Error Handler

Create `/server/middleware/error-handler.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import * as Sentry from '@sentry/node';
import { logger } from '../logging/logger';

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

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const correlationId = (req as any).correlationId;
  const errorResponse = buildErrorResponse(error);

  // Log error
  const logData = {
    correlationId,
    event: 'request_error',
    statusCode: errorResponse.statusCode,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    request: {
      method: req.method,
      path: req.path,
      userId: req.user?.id,
      apiKeyId: req.apiKey?.id,
    },
  };

  if (errorResponse.statusCode >= 500) {
    logger.error(logData);
    Sentry.captureException(error, {
      tags: { correlationId },
      user: req.user ? { id: req.user.id } : undefined,
    });
  } else {
    logger.warn(logData);
  }

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

function buildErrorResponse(error: Error): ErrorResponse {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

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

  // Supabase/PostgreSQL errors
  if ((error as any).code?.startsWith('PGRST') || (error as any).code?.startsWith('23')) {
    return {
      statusCode: 400,
      code: 'DATABASE_ERROR',
      message: 'Database operation failed',
    };
  }

  return {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development'
      ? error.message
      : 'An unexpected error occurred',
  };
}
```

#### Task 1.4.5: Update Server Entry Point

Update `/server/index.ts` to use error handler:

```typescript
import { errorHandler } from './middleware/error-handler';

// Register routes...

// Error handler MUST be last middleware
app.use(errorHandler);
```

#### Task 1.4.6: Example Route with Validation

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validate-request';
import { validateResponse } from '../middleware/validate-response';
import { createSuccessSchema } from '@shared/schemas/api.schema';

const router = Router();

// Define schemas
const createUserSchema = {
  body: z.object({
    email: z.string().email(),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
  }),
};

const userResponseSchema = createSuccessSchema(z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  createdAt: z.string().datetime(),
}));

// Route with both validations
router.post('/',
  validateRequest(createUserSchema),
  validateResponse(userResponseSchema),
  async (req, res, next) => {
    try {
      const user = await createUser(req.body);

      res.status(201).json({
        success: true,
        data: user,
        correlationId: (req as any).correlationId,
      });
    } catch (error) {
      next(error);
    }
  }
);
```

### Verification Checklist

- [ ] Request validation middleware rejects invalid input
- [ ] Response validation middleware logs invalid output
- [ ] Error messages include field paths
- [ ] Error messages include expected vs received
- [ ] Global error handler catches all errors
- [ ] Sentry receives 5xx errors
- [ ] Correlation ID in all error responses
- [ ] Common schemas work correctly

### Unit Tests

Create `/server/middleware/__tests__/validate-request.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import { validateRequest } from '../validate-request';
import { correlationIdMiddleware } from '../correlation-id';

const app = express();
app.use(express.json());
app.use(correlationIdMiddleware);

const testSchema = {
  body: z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  }),
};

app.post('/test',
  validateRequest(testSchema),
  (req, res) => res.json({ success: true, data: req.body })
);

describe('validateRequest', () => {
  it('should pass valid request', async () => {
    const res = await request(app)
      .post('/test')
      .send({ name: 'John', age: 30 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should reject invalid request with details', async () => {
    const res = await request(app)
      .post('/test')
      .send({ name: '', age: -5 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveLength(2);

    const nameError = res.body.error.details.find((e: any) => e.path === 'name');
    expect(nameError).toBeDefined();

    const ageError = res.body.error.details.find((e: any) => e.path === 'age');
    expect(ageError).toBeDefined();
  });

  it('should include correlation ID', async () => {
    const res = await request(app)
      .post('/test')
      .send({ name: '' });

    expect(res.body.correlationId).toBeDefined();
  });
});
```

### Success Criteria

1. All requests with schemas are validated
2. Invalid requests return 400 with detailed errors
3. Response validation logs issues
4. Error handler catches all unhandled errors
5. Correlation ID in all responses
6. Sentry integration working
7. All tests passing

### Next Step

After completing this task, Phase 1 is complete. Proceed to `PHASE2_01_AGENT_INTERFACE.md`
