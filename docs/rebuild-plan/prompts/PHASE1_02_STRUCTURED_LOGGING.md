# Phase 1.2: Structured Logging Infrastructure

## Execution Prompt

You are implementing Phase 1.2 of the AtomToolsAI rebuild. Your task is to implement structured logging with Pino, correlation IDs, and Sentry integration.

### Prerequisites
- Phase 1.1 completed (Supabase setup)
- Current codebase available at `/home/user/AtomToolsAI-clone`

### Reference Documents
- `/docs/rebuild-plan/00-MASTER_PLAN.md` - Overall architecture
- `/docs/rebuild-plan/02-LOGGING_INFRASTRUCTURE.md` - Detailed logging specification

### Tasks

#### Task 1.2.1: Install Dependencies

```bash
npm install pino pino-http nanoid
npm install -D pino-pretty @types/pino
```

#### Task 1.2.2: Create Logger Module

Create `/server/logging/logger.ts`:

```typescript
import pino, { Logger, LoggerOptions } from 'pino';

const baseConfig: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'atomtools-api',
    version: process.env.APP_VERSION ?? '1.0.0',
    environment: process.env.NODE_ENV,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.apiKey',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
};

const devConfig: LoggerOptions = {
  ...baseConfig,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
};

export const logger: Logger = pino(
  process.env.NODE_ENV === 'production' ? baseConfig : devConfig
);

export function createLogger(context: Record<string, unknown>): Logger {
  return logger.child(context);
}
```

#### Task 1.2.3: Create Correlation ID Middleware

Create `/server/middleware/correlation-id.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { AsyncLocalStorage } from 'async_hooks';

export const correlationStore = new AsyncLocalStorage<string>();
export const CORRELATION_HEADER = 'x-correlation-id';

export function getCorrelationId(req: Request): string {
  const headerValue = req.headers[CORRELATION_HEADER];
  if (typeof headerValue === 'string') return headerValue;
  if ((req as any).correlationId) return (req as any).correlationId;
  return nanoid();
}

export function getCurrentCorrelationId(): string | undefined {
  return correlationStore.getStore();
}

export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const correlationId = getCorrelationId(req);
  (req as any).correlationId = correlationId;
  res.setHeader(CORRELATION_HEADER, correlationId);

  correlationStore.run(correlationId, () => next());
}
```

#### Task 1.2.4: Create Request Logger Middleware

Create `/server/middleware/request-logger.ts`:

```typescript
import pinoHttp from 'pino-http';
import { logger } from '../logging/logger';
import { getCorrelationId } from './correlation-id';

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => getCorrelationId(req as any),
  customLogLevel: (req, res, error) => {
    if (error || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} completed`,
  customProps: (req) => ({
    correlationId: getCorrelationId(req as any),
    userId: (req as any).user?.id,
  }),
  autoLogging: {
    ignore: (req) => req.url?.startsWith('/health') ?? false,
  },
});
```

#### Task 1.2.5: Create Context Logger Helper

Create `/server/logging/context.ts`:

```typescript
import { getCurrentCorrelationId } from '../middleware/correlation-id';
import { logger } from './logger';
import { Logger } from 'pino';

export function getContextLogger(extra?: Record<string, unknown>): Logger {
  const correlationId = getCurrentCorrelationId();
  return logger.child({ correlationId, ...extra });
}
```

#### Task 1.2.6: Update Server Entry Point

Update `/server/index.ts` to use new middleware:

```typescript
import { correlationIdMiddleware } from './middleware/correlation-id';
import { requestLogger } from './middleware/request-logger';

// Add early in middleware chain (before routes)
app.use(correlationIdMiddleware);
app.use(requestLogger);
```

#### Task 1.2.7: Replace Console Calls

Search and replace all console.log/error/warn calls:

```bash
# Find all console calls
grep -r "console\." server/ --include="*.ts" | wc -l
```

Replace pattern:
```typescript
// BEFORE
console.log('Processing:', data);
console.error('Error:', error);

// AFTER
import { logger } from './logging/logger';
// or
import { getContextLogger } from './logging/context';

logger.info({ data }, 'Processing');
logger.error({ err: error }, 'Error occurred');
```

### Verification Checklist

- [ ] Pino logger configured with all options
- [ ] Correlation ID middleware working
- [ ] Request logger capturing all requests
- [ ] Context logger available for nested functions
- [ ] All console.* calls replaced (target: 0 remaining)
- [ ] Logs include correlation IDs
- [ ] Sensitive data redacted
- [ ] Timestamps in ISO 8601 format

### Unit Tests

Create `/server/logging/__tests__/logger.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger, createLogger } from '../logger';

describe('Logger', () => {
  it('should create child logger with context', () => {
    const child = createLogger({ requestId: '123' });
    expect(child).toBeDefined();
  });

  it('should redact sensitive fields', () => {
    const spy = vi.spyOn(process.stdout, 'write');
    logger.info({ password: 'secret123' }, 'test');

    const output = spy.mock.calls[0]?.[0] as string;
    expect(output).not.toContain('secret123');
    expect(output).toContain('[REDACTED]');
  });
});
```

Create `/server/middleware/__tests__/correlation-id.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { correlationIdMiddleware, CORRELATION_HEADER } from '../correlation-id';

describe('Correlation ID Middleware', () => {
  const app = express();
  app.use(correlationIdMiddleware);
  app.get('/test', (req, res) => {
    res.json({ id: (req as any).correlationId });
  });

  it('should generate correlation ID if not provided', async () => {
    const res = await request(app).get('/test');

    expect(res.headers[CORRELATION_HEADER]).toBeDefined();
    expect(res.body.id).toBe(res.headers[CORRELATION_HEADER]);
  });

  it('should use provided correlation ID', async () => {
    const providedId = 'test-correlation-id';
    const res = await request(app)
      .get('/test')
      .set(CORRELATION_HEADER, providedId);

    expect(res.headers[CORRELATION_HEADER]).toBe(providedId);
    expect(res.body.id).toBe(providedId);
  });
});
```

### Success Criteria

1. All logs are JSON formatted in production
2. Every log includes correlation ID
3. Timestamps in ISO 8601 format
4. Sensitive data is redacted
5. Request/response logging working
6. Zero console.* calls remaining
7. All tests passing

### Next Step

After completing this task, proceed to `PHASE1_03_API_KEY_AUTH.md`
