# Phase 4: Modularization Overview

## Execution Prompt

You are implementing Phase 4 of the AtomToolsAI rebuild. This phase splits monolithic files into modular components, implements dependency injection, and adds OpenAPI documentation.

### Prerequisites
- Phase 1-3 fully completed
- All tests passing

### Reference Documents
- `/docs/rebuild-plan/00-MASTER_PLAN.md` - Section 9: Phase 4
- Current `routes.ts` (5,588 lines) and `storage.ts` (2,957 lines)

---

## Phase 4 Tasks

### 4.1 Route Splitting

Split `/server/routes.ts` (5,588 lines) into modular files:

**Target Structure:**
```
/server/routes/
├── index.ts           # Aggregator (<100 lines)
├── auth.routes.ts     # Authentication endpoints
├── user.routes.ts     # User management
├── product.routes.ts  # Products & subscriptions
├── guideline.routes.ts # Brand guidelines
├── tool.routes.ts     # Tool orchestration
├── agent.routes.ts    # Direct agent API
├── content.routes.ts  # Generated content
├── cms.routes.ts      # CMS pages
├── admin.routes.ts    # Admin operations
└── health.routes.ts   # Health checks
```

**Example: `/server/routes/index.ts`**
```typescript
import { Express } from 'express';
import { createAuthRoutes } from './auth.routes';
import { createUserRoutes } from './user.routes';
import { createProductRoutes } from './product.routes';
import { createGuidelineRoutes } from './guideline.routes';
import { createToolRoutes } from './tool.routes';
import { createAgentRoutes } from './agent.routes';
import { createContentRoutes } from './content.routes';
import { createCmsRoutes } from './cms.routes';
import { createAdminRoutes } from './admin.routes';
import { createHealthRoutes } from './health.routes';

export function registerRoutes(app: Express): void {
  // Health checks (no auth)
  app.use('/health', createHealthRoutes());

  // Public routes
  app.use('/api/auth', createAuthRoutes());

  // Protected routes
  app.use('/api/users', createUserRoutes());
  app.use('/api/products', createProductRoutes());
  app.use('/api/guidelines', createGuidelineRoutes());
  app.use('/api/tools', createToolRoutes());
  app.use('/api/agents', createAgentRoutes());
  app.use('/api/content', createContentRoutes());
  app.use('/api/cms', createCmsRoutes());
  app.use('/api/admin', createAdminRoutes());
}
```

**Splitting Strategy:**
1. Identify route groups by prefix (e.g., `/api/auth/*`)
2. Extract routes to separate files
3. Convert inline handlers to async functions
4. Add request/response validation schemas
5. Inject dependencies via factory function
6. Test each route module independently

### 4.2 Repository Extraction

Split `/server/storage.ts` (2,957 lines) into domain repositories:

**Target Structure:**
```
/server/repositories/
├── base.repository.ts       # Base class
├── user.repository.ts       # Users & auth
├── product.repository.ts    # Products & tiers
├── subscription.repository.ts # Subscriptions
├── guideline.repository.ts  # Guidelines & embeddings
├── content.repository.ts    # Generated content
├── workflow.repository.ts   # Threads & checkpoints
├── api-key.repository.ts    # API keys
├── audit.repository.ts      # Audit logs
└── cms.repository.ts        # CMS pages
```

**Example: `/server/repositories/user.repository.ts`**
```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@shared/types/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];
type UserUpdate = Database['public']['Tables']['users']['Update'];

export interface IUserRepository {
  findById(id: string): Promise<UserRow | null>;
  findByEmail(email: string): Promise<UserRow | null>;
  create(user: UserInsert): Promise<UserRow>;
  update(id: string, updates: UserUpdate): Promise<UserRow>;
  delete(id: string): Promise<void>;
}

export class UserRepository implements IUserRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<UserRow | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }

  // ... other methods
}
```

### 4.3 Dependency Injection

Configure Awilix DI container:

**Create `/server/config/container.ts`**
```typescript
import { createContainer, asClass, asValue, InjectionMode } from 'awilix';
import { supabase } from './supabase';

// Repositories
import { UserRepository } from '../repositories/user.repository';
import { ProductRepository } from '../repositories/product.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { GuidelineRepository } from '../repositories/guideline.repository';
import { ContentRepository } from '../repositories/content.repository';
import { ApiKeyRepository } from '../repositories/api-key.repository';

// Services
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { SubscriptionService } from '../services/subscription.service';
import { RagService } from '../services/rag.service';
import { EmbeddingService } from '../services/embedding.service';
import { ApiKeyService } from '../services/api-key.service';

export function createAppContainer() {
  const container = createContainer({
    injectionMode: InjectionMode.CLASSIC,
  });

  container.register({
    // Infrastructure
    supabase: asValue(supabase),

    // Repositories
    userRepository: asClass(UserRepository).singleton(),
    productRepository: asClass(ProductRepository).singleton(),
    subscriptionRepository: asClass(SubscriptionRepository).singleton(),
    guidelineRepository: asClass(GuidelineRepository).singleton(),
    contentRepository: asClass(ContentRepository).singleton(),
    apiKeyRepository: asClass(ApiKeyRepository).singleton(),

    // Services
    authService: asClass(AuthService).singleton(),
    userService: asClass(UserService).singleton(),
    subscriptionService: asClass(SubscriptionService).singleton(),
    ragService: asClass(RagService).singleton(),
    embeddingService: asClass(EmbeddingService).singleton(),
    apiKeyService: asClass(ApiKeyService).singleton(),
  });

  return container;
}

export type AppContainer = ReturnType<typeof createAppContainer>;
```

**Use in routes:**
```typescript
export function createUserRoutes(container: AppContainer): Router {
  const router = Router();
  const userService = container.resolve<UserService>('userService');

  router.get('/me', requireAuth, async (req, res, next) => {
    try {
      const user = await userService.getUser(req.user!.id);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
```

### 4.4 OpenAPI Documentation

**Install dependencies:**
```bash
npm install swagger-jsdoc swagger-ui-express
npm install -D @types/swagger-jsdoc @types/swagger-ui-express
```

**Create `/server/docs/openapi.ts`**
```typescript
import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AtomToolsAI API',
      version,
      description: 'API for AtomToolsAI content generation platform',
    },
    servers: [
      { url: '/api', description: 'API server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    },
  },
  apis: ['./server/routes/*.ts'],
};

export const openapiSpec = swaggerJsdoc(options);
```

**Add JSDoc to routes:**
```typescript
/**
 * @openapi
 * /users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get('/me', requireAuth, getUserHandler);
```

**Serve Swagger UI:**
```typescript
import swaggerUi from 'swagger-ui-express';
import { openapiSpec } from './docs/openapi';

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
```

---

## Verification Checklist

### 4.1 Route Splitting
- [ ] routes.ts removed or < 100 lines
- [ ] All route modules created
- [ ] All endpoints functional
- [ ] All route tests passing
- [ ] No duplicate registrations

### 4.2 Repository Extraction
- [ ] storage.ts removed
- [ ] All repositories created
- [ ] All queries functional
- [ ] Repository tests passing
- [ ] Type safety maintained

### 4.3 Dependency Injection
- [ ] Container configured
- [ ] All services registered
- [ ] Routes use injected dependencies
- [ ] Mocking works in tests
- [ ] No global singletons

### 4.4 OpenAPI Documentation
- [ ] Spec generated
- [ ] Spec validates
- [ ] All endpoints documented
- [ ] Swagger UI accessible
- [ ] Examples provided

---

## Success Criteria

1. No file exceeds 300 lines
2. Clear separation of concerns
3. All dependencies injectable
4. Complete API documentation
5. All tests passing
6. Coverage > 80%

---

*This completes the rebuild. The codebase now follows best practices with modular architecture, strict validation, and comprehensive documentation.*
