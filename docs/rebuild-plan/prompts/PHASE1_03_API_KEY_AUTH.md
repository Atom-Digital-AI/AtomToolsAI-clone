# Phase 1.3: API Key Authentication System

## Execution Prompt

You are implementing Phase 1.3 of the AtomToolsAI rebuild. Your task is to implement API key authentication for programmatic access to agents.

### Prerequisites
- Phase 1.1 completed (Supabase setup with api_keys table)
- Phase 1.2 completed (Structured logging)

### Reference Documents
- `/docs/rebuild-plan/02-LOGGING_INFRASTRUCTURE.md` - Section 5: API Key Authentication

### Tasks

#### Task 1.3.1: Create API Key Service

Create `/server/services/api-key.service.ts`:

```typescript
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@shared/types/database.types';
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
  key: string; // Full key - only returned once
}

export class ApiKeyService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async create(input: CreateApiKeyInput): Promise<ApiKeyWithSecret> {
    const prefix = randomBytes(4).toString('hex');
    const secret = randomBytes(24).toString('base64url');
    const fullKey = `atk_${prefix}_${secret}`;
    const hash = await bcrypt.hash(fullKey, 12);

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
      logger.error({ error, input: { ...input, name: input.name } }, 'Failed to create API key');
      throw new Error('Failed to create API key');
    }

    return {
      ...this.mapToApiKey(data),
      key: fullKey,
    };
  }

  async validate(key: string): Promise<ApiKey | null> {
    const parts = key.split('_');
    if (parts.length !== 3 || parts[0] !== 'atk') {
      return null;
    }

    const prefix = parts[1];

    const { data, error } = await this.supabase
      .from('api_keys')
      .select('*')
      .eq('prefix', prefix)
      .is('revoked_at', null)
      .single();

    if (error || !data) return null;

    const isValid = await bcrypt.compare(key, data.hash);
    if (!isValid) return null;

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null;
    }

    // Update last used
    await this.supabase
      .from('api_keys')
      .update({
        last_used_at: new Date().toISOString(),
        total_requests: (data.total_requests ?? 0) + 1,
      })
      .eq('id', data.id);

    return this.mapToApiKey(data);
  }

  async revoke(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error('Failed to revoke API key');
  }

  async listForUser(userId: string): Promise<ApiKey[]> {
    const { data, error } = await this.supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) throw new Error('Failed to list API keys');
    return (data ?? []).map(this.mapToApiKey);
  }

  hasScope(apiKey: ApiKey, scope: string): boolean {
    if (apiKey.scopes.length === 0) return true;
    return apiKey.scopes.includes(scope) || apiKey.scopes.includes('*');
  }

  canAccessTool(apiKey: ApiKey, toolId: string): boolean {
    if (apiKey.toolIds.length === 0) return true;
    return apiKey.toolIds.includes(toolId);
  }

  private mapToApiKey(data: any): ApiKey {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      prefix: data.prefix,
      scopes: data.scopes ?? [],
      toolIds: data.tool_ids ?? [],
      rateLimitPerMinute: data.rate_limit_per_minute,
      rateLimitPerDay: data.rate_limit_per_day,
      lastUsedAt: data.last_used_at ? new Date(data.last_used_at) : null,
      expiresAt: data.expires_at ? new Date(data.expires_at) : null,
      createdAt: new Date(data.created_at),
    };
  }
}
```

#### Task 1.3.2: Create API Key Middleware

Create `/server/middleware/api-key.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { ApiKeyService, ApiKey } from '../services/api-key.service';
import { logger } from '../logging/logger';

declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKey;
    }
  }
}

export function apiKeyAuth(apiKeyService: ApiKeyService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const correlationId = (req as any).correlationId;
    const key = extractApiKey(req);

    if (!key) return next();

    try {
      const apiKey = await apiKeyService.validate(key);

      if (!apiKey) {
        logger.warn({ correlationId, event: 'api_key_invalid' });
        res.status(401).json({
          success: false,
          error: { code: 'INVALID_API_KEY', message: 'Invalid or expired API key' },
          correlationId,
        });
        return;
      }

      req.apiKey = apiKey;
      req.user = { id: apiKey.userId } as any;

      logger.debug({ correlationId, event: 'api_key_authenticated', keyId: apiKey.id });
      next();
    } catch (error) {
      logger.error({ correlationId, error }, 'API key validation error');
      res.status(500).json({
        success: false,
        error: { code: 'AUTH_ERROR', message: 'Authentication error' },
        correlationId,
      });
    }
  };
}

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  if (!req.apiKey) {
    res.status(401).json({
      success: false,
      error: { code: 'API_KEY_REQUIRED', message: 'API key required' },
      correlationId: (req as any).correlationId,
    });
    return;
  }
  next();
}

export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.apiKey) return next();

    const apiKeyService = req.app.get('apiKeyService') as ApiKeyService;
    if (!apiKeyService.hasScope(req.apiKey, scope)) {
      res.status(403).json({
        success: false,
        error: { code: 'INSUFFICIENT_SCOPE', message: `Missing scope: ${scope}` },
        correlationId: (req as any).correlationId,
      });
      return;
    }
    next();
  };
}

function extractApiKey(req: Request): string | null {
  // Authorization: Bearer atk_...
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token.startsWith('atk_')) return token;
  }

  // X-API-Key: atk_...
  const apiKeyHeader = req.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string' && apiKeyHeader.startsWith('atk_')) {
    return apiKeyHeader;
  }

  // Query param: ?api_key=atk_...
  const queryKey = req.query.api_key;
  if (typeof queryKey === 'string' && queryKey.startsWith('atk_')) {
    return queryKey;
  }

  return null;
}
```

#### Task 1.3.3: Create API Key Routes

Create `/server/routes/api-keys.routes.ts`:

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { ApiKeyService } from '../services/api-key.service';
import { validateRequest } from '../middleware/validate-request';
import { requireAuth } from '../middleware/auth';

const createApiKeySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    scopes: z.array(z.string()).optional(),
    toolIds: z.array(z.string()).optional(),
    rateLimitPerMinute: z.number().int().min(1).max(1000).optional(),
    rateLimitPerDay: z.number().int().min(1).max(100000).optional(),
    expiresInDays: z.number().int().min(1).max(365).optional(),
  }),
});

export function createApiKeyRoutes(apiKeyService: ApiKeyService): Router {
  const router = Router();

  // List user's API keys
  router.get('/', requireAuth, async (req, res, next) => {
    try {
      const keys = await apiKeyService.listForUser(req.user!.id);
      res.json({
        success: true,
        data: keys.map(k => ({
          ...k,
          // Never expose hash or full key
          prefix: `atk_${k.prefix}_****`,
        })),
        correlationId: (req as any).correlationId,
      });
    } catch (error) {
      next(error);
    }
  });

  // Create new API key
  router.post('/', requireAuth, validateRequest(createApiKeySchema), async (req, res, next) => {
    try {
      const { name, scopes, toolIds, rateLimitPerMinute, rateLimitPerDay, expiresInDays } = req.body;

      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;

      const apiKey = await apiKeyService.create({
        userId: req.user!.id,
        name,
        scopes,
        toolIds,
        rateLimitPerMinute,
        rateLimitPerDay,
        expiresAt,
      });

      res.status(201).json({
        success: true,
        data: {
          ...apiKey,
          // This is the only time the full key is returned
          key: apiKey.key,
        },
        message: 'Save this key securely. It will not be shown again.',
        correlationId: (req as any).correlationId,
      });
    } catch (error) {
      next(error);
    }
  });

  // Revoke API key
  router.delete('/:id', requireAuth, async (req, res, next) => {
    try {
      await apiKeyService.revoke(req.params.id, req.user!.id);
      res.json({
        success: true,
        message: 'API key revoked',
        correlationId: (req as any).correlationId,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
```

#### Task 1.3.4: Register Middleware and Routes

Update `/server/index.ts`:

```typescript
import { ApiKeyService } from './services/api-key.service';
import { apiKeyAuth } from './middleware/api-key';
import { createApiKeyRoutes } from './routes/api-keys.routes';

// After Supabase client setup
const apiKeyService = new ApiKeyService(supabase);
app.set('apiKeyService', apiKeyService);

// Add to middleware chain (after auth middleware)
app.use(apiKeyAuth(apiKeyService));

// Register routes
app.use('/api/api-keys', createApiKeyRoutes(apiKeyService));
```

### Verification Checklist

- [ ] API key service creates keys with proper format
- [ ] API key validation works correctly
- [ ] Revoked keys are rejected
- [ ] Expired keys are rejected
- [ ] Scope checking works
- [ ] Tool access restriction works
- [ ] Routes protected appropriately
- [ ] Full key only shown once on creation

### Unit Tests

Create `/server/services/__tests__/api-key.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
      order: vi.fn().mockReturnThis(),
    };
    service = new ApiKeyService(mockSupabase);
  });

  describe('create', () => {
    it('should create key with atk_ prefix', async () => {
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
      });

      const result = await service.create({
        userId: 'user-1',
        name: 'Test Key',
      });

      expect(result.key).toMatch(/^atk_[a-f0-9]{8}_/);
    });
  });

  describe('hasScope', () => {
    it('should allow all scopes when empty', () => {
      const apiKey = { scopes: [] } as any;
      expect(service.hasScope(apiKey, 'any:scope')).toBe(true);
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

  describe('canAccessTool', () => {
    it('should allow all tools when empty', () => {
      const apiKey = { toolIds: [] } as any;
      expect(service.canAccessTool(apiKey, 'any-tool')).toBe(true);
    });

    it('should restrict to specified tools', () => {
      const apiKey = { toolIds: ['content-writer', 'seo-meta'] } as any;
      expect(service.canAccessTool(apiKey, 'content-writer')).toBe(true);
      expect(service.canAccessTool(apiKey, 'google-ads')).toBe(false);
    });
  });
});
```

### Integration Tests

Create `/tests/integration/api-keys.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server';

describe('API Keys Integration', () => {
  let authToken: string;
  let createdKeyId: string;
  let createdKey: string;

  beforeAll(async () => {
    // Login to get auth token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    authToken = loginRes.body.data.accessToken;
  });

  it('should create API key', async () => {
    const res = await request(app)
      .post('/api/api-keys')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Key' });

    expect(res.status).toBe(201);
    expect(res.body.data.key).toMatch(/^atk_/);

    createdKeyId = res.body.data.id;
    createdKey = res.body.data.key;
  });

  it('should authenticate with API key', async () => {
    const res = await request(app)
      .get('/api/user/profile')
      .set('X-API-Key', createdKey);

    expect(res.status).toBe(200);
  });

  it('should revoke API key', async () => {
    const res = await request(app)
      .delete(`/api/api-keys/${createdKeyId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
  });

  it('should reject revoked API key', async () => {
    const res = await request(app)
      .get('/api/user/profile')
      .set('X-API-Key', createdKey);

    expect(res.status).toBe(401);
  });
});
```

### Success Criteria

1. API keys can be created, listed, and revoked
2. Keys are securely hashed (bcrypt)
3. Full key only shown once on creation
4. Validation rejects invalid/expired/revoked keys
5. Scope and tool restrictions work
6. All tests passing

### Next Step

After completing this task, proceed to `PHASE1_04_VALIDATION_MIDDLEWARE.md`
