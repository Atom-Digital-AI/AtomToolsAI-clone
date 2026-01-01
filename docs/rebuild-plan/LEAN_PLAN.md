# AtomToolsAI Lean Refactoring Plan

**Timeline**: 2-3 weeks | **Approach**: Incremental refactor, not rebuild

## Executive Summary

This plan addresses actual gaps without over-engineering. We KEEP what works (LangGraph, existing agents) and ADD what's missing (logging, validation, API keys, modularization).

---

## What We KEEP (Do NOT Replace)

| Component | Reason |
|-----------|--------|
| LangGraph orchestration | Already works, well-tested, has checkpointing |
| Existing agent implementations | Business logic is solid, just needs validation wrappers |
| React frontend | Works fine, minimal changes needed |
| Express.js backend | Works fine, just needs middleware additions |
| Neon + Drizzle | Fresh Neon database (EU Frankfurt), existing Drizzle schema |

---

## What We ADD (Actual Gaps)

| Gap | Solution | Priority |
|-----|----------|----------|
| No structured logging | Pino + correlation IDs | High |
| 14% input validation | Zod schemas + middleware | High |
| 0% output validation | Zod schemas + middleware | High |
| No API key auth | Simple key table + middleware | High |
| Monolithic routes.ts (5,588 lines) | Split into modules | Medium |
| Monolithic storage.ts (2,957 lines) | Split into repositories | Medium |
| CI/CD missing tests | Add `npm test` to pipeline | High |
| Coverage reporting | Add to CI/CD | Medium |

---

## Database: Neon (Fresh Start)

**Region**: EU (Frankfurt) - `aws-eu-central-1`

### Setup

1. Create account at [neon.tech](https://neon.tech)
2. Create project → Select EU (Frankfurt)
3. Copy connection string

### Configuration

```bash
# .env / Railway environment
DATABASE_URL=postgres://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

### Database Client

```typescript
// server/db.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

### Fresh Schema Push

```bash
# Push existing Drizzle schema to new Neon database
npx drizzle-kit push
```

No migration needed - starting fresh with existing schema definitions.

---

## Phase 1: Foundation (Week 1)

### 1.1 Structured Logging with Pino

**File**: `server/logging/logger.ts`

```typescript
import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

// Context storage for correlation IDs
export const requestContext = new AsyncLocalStorage<{ correlationId: string }>();

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: ['password', 'token', 'apiKey', 'authorization'],
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

export function getLogger(context?: Record<string, unknown>) {
  const store = requestContext.getStore();
  return logger.child({
    correlationId: store?.correlationId,
    ...context,
  });
}
```

**Middleware**: `server/middleware/correlation-id.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { requestContext, getLogger } from '../logging/logger';

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = req.headers['x-correlation-id'] as string || nanoid();
  res.setHeader('x-correlation-id', correlationId);

  requestContext.run({ correlationId }, () => {
    const log = getLogger({ path: req.path, method: req.method });
    log.info('Request started');

    res.on('finish', () => {
      log.info({ status: res.statusCode }, 'Request completed');
    });

    next();
  });
}
```

**Verification**:
```bash
# Should see JSON logs with correlationId
curl -v http://localhost:5000/api/health | jq
# Check server output for structured logs
```

---

### 1.2 Request/Response Validation Middleware

**File**: `server/middleware/validate.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { getLogger } from '../logging/logger';

export interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    const log = getLogger({ middleware: 'validate' });
    const errors: Array<{ path: string; message: string }> = [];

    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        log.warn({ errors: formatted }, 'Validation failed');
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', details: formatted },
        });
      } else {
        next(error);
      }
    }
  };
}
```

**Usage Example**:
```typescript
import { z } from 'zod';
import { validate } from '../middleware/validate';

const createContentSchema = {
  body: z.object({
    topic: z.string().min(1),
    targetAudience: z.string().optional(),
    guidelineProfileId: z.string().uuid().optional(),
  }),
};

router.post('/content', validate(createContentSchema), async (req, res) => {
  // req.body is now typed and validated
});
```

---

### 1.3 API Key Authentication

**Database Table** (add to existing schema):
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(10) NOT NULL, -- First 8 chars for identification
  scopes TEXT[] DEFAULT '{}',
  rate_limit INTEGER DEFAULT 100, -- requests per minute
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
```

**Middleware**: `server/middleware/api-key.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { db } from '../storage';
import { getLogger } from '../logging/logger';

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const log = getLogger({ middleware: 'apiKeyAuth' });
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return next(); // Fall through to session auth
  }

  const keyHash = hashKey(apiKey);
  const result = await db.query.apiKeys.findFirst({
    where: (keys, { eq, isNull }) =>
      eq(keys.keyHash, keyHash) && isNull(keys.revokedAt),
  });

  if (!result || (result.expiresAt && result.expiresAt < new Date())) {
    log.warn('Invalid or expired API key');
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_API_KEY', message: 'Invalid or expired API key' },
    });
  }

  // Attach to request
  req.apiKey = result;
  req.user = { id: result.userId };

  // Update last used
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, result.id));

  log.info({ keyId: result.id }, 'API key authenticated');
  next();
}
```

---

### 1.4 Global Error Handler

**File**: `server/middleware/error-handler.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { getLogger } from '../logging/logger';
import * as Sentry from '@sentry/node';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const log = getLogger({ middleware: 'errorHandler' });

  // Log with full context
  log.error({
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    request: {
      method: req.method,
      path: req.path,
      body: req.body,
      query: req.query,
    },
  }, 'Unhandled error');

  // Report to Sentry
  Sentry.captureException(err);

  // Respond
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
  });
}
```

---

## Phase 2: Agent Validation Wrappers (Week 1-2)

### Keep LangGraph, Add Validation

Instead of replacing LangGraph with custom orchestration, we ADD validation wrappers around existing agents.

**File**: `server/agents/validation-wrapper.ts`

```typescript
import { z, ZodSchema } from 'zod';
import { getLogger } from '../logging/logger';

export interface AgentWrapper<TInput, TOutput> {
  inputSchema: ZodSchema<TInput>;
  outputSchema: ZodSchema<TOutput>;
  execute: (input: TInput) => Promise<TOutput>;
}

export function wrapAgent<TInput, TOutput>(
  name: string,
  inputSchema: ZodSchema<TInput>,
  outputSchema: ZodSchema<TOutput>,
  handler: (input: TInput) => Promise<TOutput>
): AgentWrapper<TInput, TOutput> {
  return {
    inputSchema,
    outputSchema,
    async execute(input: TInput): Promise<TOutput> {
      const log = getLogger({ agent: name });
      const startTime = Date.now();

      // Validate input
      const validatedInput = inputSchema.parse(input);
      log.info({ input: validatedInput }, 'Agent started');

      try {
        const result = await handler(validatedInput);

        // Validate output
        const validatedOutput = outputSchema.parse(result);

        log.info({
          durationMs: Date.now() - startTime,
        }, 'Agent completed');

        return validatedOutput;
      } catch (error) {
        log.error({ error, durationMs: Date.now() - startTime }, 'Agent failed');
        throw error;
      }
    },
  };
}
```

**Example: Wrap Concept Generator**

```typescript
// server/agents/concept-generator/schema.ts
import { z } from 'zod';

export const conceptGeneratorInputSchema = z.object({
  topic: z.string().min(1),
  targetAudience: z.string().optional(),
  count: z.number().int().min(1).max(10).default(5),
  brandContext: z.object({
    toneOfVoice: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
});

export const conceptGeneratorOutputSchema = z.object({
  concepts: z.array(z.object({
    title: z.string(),
    summary: z.string(),
    angle: z.string(),
    targetKeywords: z.array(z.string()),
  })),
  topicAnalysis: z.object({
    mainThemes: z.array(z.string()),
    suggestedAngles: z.array(z.string()),
  }),
});

export type ConceptGeneratorInput = z.infer<typeof conceptGeneratorInputSchema>;
export type ConceptGeneratorOutput = z.infer<typeof conceptGeneratorOutputSchema>;
```

```typescript
// server/agents/concept-generator/index.ts
import { wrapAgent } from '../validation-wrapper';
import { conceptGeneratorInputSchema, conceptGeneratorOutputSchema } from './schema';
import { existingConceptGeneratorLogic } from '../../tools/content-writer/nodes/concept-generator';

export const conceptGenerator = wrapAgent(
  'concept-generator',
  conceptGeneratorInputSchema,
  conceptGeneratorOutputSchema,
  existingConceptGeneratorLogic // Re-use existing business logic
);
```

---

## Phase 3: Modularization (Week 2-3)

### 3.1 Split Routes

**Target**: `routes.ts` (5,588 lines) -> 10 files (~500 lines each)

```
server/routes/
├── index.ts          # Router aggregator (~50 lines)
├── auth.routes.ts    # Auth endpoints
├── user.routes.ts    # User CRUD
├── product.routes.ts # Products & tiers
├── guideline.routes.ts # Brand guidelines
├── tool.routes.ts    # Tool execution (Content Writer, etc.)
├── content.routes.ts # Generated content
├── cms.routes.ts     # CMS pages
├── admin.routes.ts   # Admin operations
└── health.routes.ts  # Health checks
```

**Approach**: Extract routes by prefix, one file at a time. Test after each extraction.

### 3.2 Split Storage

**Target**: `storage.ts` (2,957 lines) -> domain repositories

```
server/repositories/
├── user.repository.ts
├── product.repository.ts
├── subscription.repository.ts
├── guideline.repository.ts
├── content.repository.ts
└── api-key.repository.ts
```

**Pattern**: Simple factory functions, no DI framework needed.

```typescript
// server/repositories/user.repository.ts
import { db } from '../db';
import { users } from '../schema';
import { eq } from 'drizzle-orm';

export const userRepository = {
  async findById(id: number) {
    return db.query.users.findFirst({ where: eq(users.id, id) });
  },
  async findByEmail(email: string) {
    return db.query.users.findFirst({ where: eq(users.email, email) });
  },
  async create(data: typeof users.$inferInsert) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  },
  // ... other methods
};
```

---

## Phase 4: CI/CD & Testing (Parallel with Phases 1-3)

### 4.1 Updated CI/CD Pipeline

**File**: `.github/workflows/ci-cd.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, staging, develop]
  pull_request:
    branches: [main, staging]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run TypeScript type check
        run: npm run check

      - name: Run linting
        run: npm run lint

      - name: Run unit tests
        run: npm test -- --coverage

      - name: Upload coverage report
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false

      - name: Run security audit
        run: npm audit --audit-level=high
        continue-on-error: true

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build application
        run: npm run build

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          severity: 'CRITICAL,HIGH'
          format: 'table'
```

### 4.2 Vitest Configuration (Full Coverage)

**File**: `vitest.config.ts` (root level)

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'server/**/*.test.ts',
      'tools/**/*.test.ts',
      'client/**/*.test.ts',
      'client/**/*.test.tsx',
    ],
    exclude: ['node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['server/**/*.ts', 'tools/**/*.ts'],
      exclude: ['**/*.test.ts', '**/__tests__/**', '**/node_modules/**'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@server': path.resolve(__dirname, './server'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
```

### 4.3 Test Strategy

**Existing Tests (35 files)** - Keep and enhance:
- `server/__tests__/api/auth.test.ts`
- `server/__tests__/api/guideline-profiles.test.ts`
- `server/utils/__tests__/sanitize.test.ts`
- `server/utils/__tests__/rag-regression.test.ts`
- `tools/*/tests/regression/*.test.ts`

**New Tests to Add**:

| Component | Test File | Coverage Target |
|-----------|-----------|-----------------|
| Logging middleware | `server/middleware/__tests__/correlation-id.test.ts` | 90% |
| Validation middleware | `server/middleware/__tests__/validate.test.ts` | 90% |
| API key auth | `server/middleware/__tests__/api-key.test.ts` | 85% |
| Error handler | `server/middleware/__tests__/error-handler.test.ts` | 90% |
| Agent wrappers | `server/agents/__tests__/validation-wrapper.test.ts` | 85% |

**Example Test**:

```typescript
// server/middleware/__tests__/validate.test.ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validate } from '../validate';
import { Request, Response } from 'express';

describe('validate middleware', () => {
  it('passes valid request body', async () => {
    const schema = { body: z.object({ name: z.string() }) };
    const req = { body: { name: 'test' } } as Request;
    const res = {} as Response;
    const next = vi.fn();

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: 'test' });
  });

  it('rejects invalid request body', async () => {
    const schema = { body: z.object({ name: z.string() }) };
    const req = { body: { name: 123 } } as Request;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
    const next = vi.fn();

    validate(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    }));
  });
});
```

### 4.4 Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "lint": "eslint . --ext .ts,.tsx",
    "check": "tsc --noEmit"
  }
}
```

---

## Implementation Order

| Week | Day | Task | Verification |
|------|-----|------|--------------|
| 1 | 1 | Add Pino logging + correlation ID middleware | Logs show correlation IDs |
| 1 | 2 | Add validation middleware | Invalid requests return 400 |
| 1 | 3 | Add API key table + auth middleware | API keys work for auth |
| 1 | 4 | Add global error handler | Errors logged with full context |
| 1 | 5 | Update CI/CD with test execution | Tests run in pipeline |
| 2 | 1-2 | Add validation schemas to 3 agents | Agents validate I/O |
| 2 | 3-4 | Split routes.ts (auth, user, product) | Routes still work |
| 2 | 5 | Add tests for new middleware | Coverage increases |
| 3 | 1-2 | Split remaining routes | All routes modular |
| 3 | 3-4 | Extract repositories from storage.ts | Queries still work |
| 3 | 5 | Final testing + documentation | All tests pass |

---

## Success Criteria

- [x] All logs include correlation IDs (Phase 1 - Pino logging with AsyncLocalStorage)
- [x] Zero `console.log` calls in production routes (Phase 5 - replaced with getLogger())
- [x] Key API endpoints have input validation (Phase 5 - Zod schemas in server/schemas/)
- [x] API key authentication works (Phase 1 - middleware/api-key.ts)
- [x] CI/CD runs tests on every PR (Phase 4 - ci-cd.yml)
- [x] CI/CD fails on lint errors (Phase 5 - removed continue-on-error)
- [ ] Code coverage > 70% (Currently ~10%, target: 30%+)
- [x] `routes.ts` split into modules (Phase 3 - 8 route files < 500 lines each)
- [x] `storage.ts` refactored to repositories pattern (Phase 3)
- [x] All existing tests still pass (146 tests passing)
- [x] No breaking changes to frontend
- [x] ESLint errors fixed (Phase 5 - 0 errors remaining)

### Phase 5 Completed (January 2026)
- Created shared validation schemas in `server/schemas/`
- Applied Zod validation middleware to all key API endpoints
- Replaced console.log with structured logging in server/routes/
- Fixed 31 ESLint errors across the codebase
- Updated CI/CD to fail on lint errors

---

## What We're NOT Doing (Avoiding Over-Engineering)

| Anti-Pattern | Why We Avoid It |
|--------------|-----------------|
| Custom orchestration engine | LangGraph already works |
| Awilix DI container | Simple factory functions suffice |
| YAML tool definitions | TypeScript LangGraph graphs work |
| 14 separate prompt documents | Single consolidated plan |
| Supabase | Using Neon instead (simpler, just Postgres) |
| 8-week timeline | 2-3 weeks is realistic |

---

*Document Version: 2.0 (Lean)*
*Created: December 2025*
