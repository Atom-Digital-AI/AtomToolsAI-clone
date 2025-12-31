# Phase 2.2: Agent Registry & Context Factory

## Execution Prompt

You are implementing Phase 2.2 of the AtomToolsAI rebuild. Your task is to create the agent registry and context factory for dependency injection.

### Prerequisites
- Phase 2.1 completed (Agent interface defined)

### Reference Documents
- `/docs/rebuild-plan/03-AGENT_INTERFACE_SPEC.md` - Sections 6-7

### Tasks

#### Task 2.2.1: Create Agent Registry

Create `/agents/core/registry.ts`:

```typescript
import { IAgent, AgentMetadata } from './types';

export interface IAgentRegistry {
  register<TInput, TOutput>(agent: IAgent<TInput, TOutput>): void;
  get<TInput, TOutput>(id: string): IAgent<TInput, TOutput>;
  getVersion<TInput, TOutput>(id: string, version: string): IAgent<TInput, TOutput>;
  has(id: string): boolean;
  list(): AgentRegistryEntry[];
  listVersions(id: string): string[];
}

export interface AgentRegistryEntry {
  id: string;
  version: string;
  name: string;
  description: string;
}

export class AgentRegistry implements IAgentRegistry {
  private agents: Map<string, Map<string, IAgent<unknown, unknown>>> = new Map();

  register<TInput, TOutput>(agent: IAgent<TInput, TOutput>): void {
    if (!this.agents.has(agent.id)) {
      this.agents.set(agent.id, new Map());
    }

    const versions = this.agents.get(agent.id)!;

    if (versions.has(agent.version)) {
      throw new Error(`Agent ${agent.id}@${agent.version} already registered`);
    }

    versions.set(agent.version, agent as IAgent<unknown, unknown>);
    console.log(`Registered agent: ${agent.id}@${agent.version}`);
  }

  get<TInput, TOutput>(id: string): IAgent<TInput, TOutput> {
    const versions = this.agents.get(id);
    if (!versions || versions.size === 0) {
      throw new AgentNotFoundError(id);
    }

    // Get latest version (semver sorted)
    const sortedVersions = Array.from(versions.keys()).sort(
      (a, b) => this.compareVersions(b, a)
    );

    return versions.get(sortedVersions[0])! as IAgent<TInput, TOutput>;
  }

  getVersion<TInput, TOutput>(id: string, version: string): IAgent<TInput, TOutput> {
    const versions = this.agents.get(id);
    if (!versions) throw new AgentNotFoundError(id);

    const agent = versions.get(version);
    if (!agent) throw new AgentNotFoundError(id, version);

    return agent as IAgent<TInput, TOutput>;
  }

  has(id: string): boolean {
    return this.agents.has(id);
  }

  list(): AgentRegistryEntry[] {
    const result: AgentRegistryEntry[] = [];

    for (const [id, versions] of this.agents) {
      for (const [version, agent] of versions) {
        result.push({
          id,
          version,
          name: agent.name,
          description: agent.description,
        });
      }
    }

    return result;
  }

  listVersions(id: string): string[] {
    const versions = this.agents.get(id);
    return versions ? Array.from(versions.keys()) : [];
  }

  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const diff = (partsA[i] || 0) - (partsB[i] || 0);
      if (diff !== 0) return diff;
    }

    return 0;
  }
}

export class AgentNotFoundError extends Error {
  constructor(id: string, version?: string) {
    super(version ? `Agent ${id}@${version} not found` : `Agent ${id} not found`);
    this.name = 'AgentNotFoundError';
  }
}

// Global registry instance
export const agentRegistry = new AgentRegistry();
```

#### Task 2.2.2: Create Context Factory

Create `/agents/core/context-factory.ts`:

```typescript
import { createContainer, asClass, asValue, InjectionMode, AwilixContainer } from 'awilix';
import { nanoid } from 'nanoid';
import { Logger } from 'pino';
import { SupabaseClient } from '@supabase/supabase-js';
import { AgentContext, AgentConfig, ServiceContainer } from './types';
import { createLogger } from '@server/logging/logger';

// Service implementations (to be created)
import { RagService } from '@server/services/rag.service';
import { EmbeddingService } from '@server/services/embedding.service';
import { BrandAnalyzerService } from '@server/services/brand-analyzer.service';
import { LLMService } from '@server/services/llm.service';

export interface ContextFactoryConfig {
  supabase: SupabaseClient;
}

export interface CreateContextParams {
  agentId: string;
  correlationId?: string;
  userId?: string;
  apiKeyId?: string;
  toolId?: string;
  stepIndex?: number;
  timeoutMs?: number;
  debug?: boolean;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class AgentContextFactory {
  private container: AwilixContainer;

  constructor(config: ContextFactoryConfig) {
    this.container = createContainer({
      injectionMode: InjectionMode.CLASSIC,
    });

    // Register services
    this.container.register({
      supabase: asValue(config.supabase),
      rag: asClass(RagService).singleton(),
      embedding: asClass(EmbeddingService).singleton(),
      brandAnalyzer: asClass(BrandAnalyzerService).singleton(),
      llm: asClass(LLMService).singleton(),
    });
  }

  createContext(params: CreateContextParams): AgentContext {
    const correlationId = params.correlationId ?? nanoid();

    const logger = createLogger({
      correlationId,
      agentId: params.agentId,
      userId: params.userId,
      toolId: params.toolId,
    });

    const config: AgentConfig = {
      timeoutMs: params.timeoutMs ?? 30000,
      debug: params.debug ?? process.env.NODE_ENV !== 'production',
      model: params.model,
      maxTokens: params.maxTokens,
      temperature: params.temperature,
    };

    const services: ServiceContainer = {
      supabase: this.container.resolve('supabase'),
      rag: this.container.resolve('rag'),
      embedding: this.container.resolve('embedding'),
      brandAnalyzer: this.container.resolve('brandAnalyzer'),
      llm: this.container.resolve('llm'),
    };

    return {
      correlationId,
      userId: params.userId,
      apiKeyId: params.apiKeyId,
      toolId: params.toolId,
      stepIndex: params.stepIndex,
      logger,
      services,
      config,
    };
  }
}
```

#### Task 2.2.3: Create Agent Executor

Create `/agents/core/executor.ts`:

```typescript
import { IAgent, AgentResult, AgentMetadata } from './types';
import { AgentContextFactory, CreateContextParams } from './context-factory';
import { agentRegistry } from './registry';
import { supabase } from '@server/config/supabase';

export class AgentExecutor {
  private contextFactory: AgentContextFactory;

  constructor() {
    this.contextFactory = new AgentContextFactory({
      supabase,
    });
  }

  /**
   * Execute an agent by ID with the given input.
   */
  async execute<TInput, TOutput>(
    agentId: string,
    input: TInput,
    params: Omit<CreateContextParams, 'agentId'>
  ): Promise<AgentResult<TOutput>> {
    const agent = agentRegistry.get<TInput, TOutput>(agentId);
    const context = this.contextFactory.createContext({
      ...params,
      agentId,
    });

    const result = await agent.execute(input, context);

    // Log to audit table
    await this.logAudit(result.metadata, result.success, result);

    return result;
  }

  /**
   * Execute a specific version of an agent.
   */
  async executeVersion<TInput, TOutput>(
    agentId: string,
    version: string,
    input: TInput,
    params: Omit<CreateContextParams, 'agentId'>
  ): Promise<AgentResult<TOutput>> {
    const agent = agentRegistry.getVersion<TInput, TOutput>(agentId, version);
    const context = this.contextFactory.createContext({
      ...params,
      agentId,
    });

    const result = await agent.execute(input, context);
    await this.logAudit(result.metadata, result.success, result);

    return result;
  }

  private async logAudit(
    metadata: AgentMetadata,
    success: boolean,
    result: AgentResult<unknown>
  ): Promise<void> {
    try {
      await supabase.from('agent_audit_logs').insert({
        correlation_id: metadata.correlationId,
        agent_id: metadata.agentId,
        agent_version: metadata.agentVersion,
        status: success ? 'success' : 'failure',
        execution_time_ms: metadata.executionTimeMs,
        tokens_used: metadata.tokensUsed,
        model: metadata.model,
        error_code: !success ? (result as any).error?.code : null,
        error_message: !success ? (result as any).error?.message : null,
        started_at: metadata.startedAt.toISOString(),
        completed_at: metadata.completedAt.toISOString(),
      });
    } catch (error) {
      console.error('Failed to log audit:', error);
    }
  }
}

// Global executor instance
export const agentExecutor = new AgentExecutor();
```

#### Task 2.2.4: Create Agent API Routes

Create `/server/routes/agent.routes.ts`:

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { agentRegistry } from '@agents/core/registry';
import { agentExecutor } from '@agents/core/executor';
import { validateRequest } from '../middleware/validate-request';
import { requireApiKey, requireScope } from '../middleware/api-key';

const executeAgentSchema = {
  params: z.object({
    agentId: z.string().min(1),
  }),
  body: z.object({
    input: z.record(z.unknown()),
    config: z.object({
      model: z.string().optional(),
      maxTokens: z.number().int().positive().optional(),
      temperature: z.number().min(0).max(2).optional(),
      timeoutMs: z.number().int().positive().max(120000).optional(),
    }).optional(),
  }),
};

export function createAgentRoutes(): Router {
  const router = Router();

  // List all agents
  router.get('/', (req, res) => {
    const agents = agentRegistry.list();
    res.json({
      success: true,
      data: agents,
      correlationId: (req as any).correlationId,
    });
  });

  // Get agent details
  router.get('/:agentId', (req, res) => {
    try {
      const agent = agentRegistry.get(req.params.agentId);
      res.json({
        success: true,
        data: {
          id: agent.id,
          version: agent.version,
          name: agent.name,
          description: agent.description,
          inputSchema: agent.inputSchema,
          outputSchema: agent.outputSchema,
        },
        correlationId: (req as any).correlationId,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: { code: 'AGENT_NOT_FOUND', message: (error as Error).message },
        correlationId: (req as any).correlationId,
      });
    }
  });

  // Execute agent (requires API key)
  router.post('/:agentId/execute',
    requireApiKey,
    requireScope('agent:execute'),
    validateRequest(executeAgentSchema),
    async (req, res, next) => {
      try {
        const { agentId } = req.params;
        const { input, config } = req.body;

        const result = await agentExecutor.execute(agentId, input, {
          correlationId: (req as any).correlationId,
          userId: req.user?.id,
          apiKeyId: req.apiKey?.id,
          ...config,
        });

        if (result.success) {
          res.json({
            success: true,
            data: result.data,
            metadata: result.metadata,
            correlationId: (req as any).correlationId,
          });
        } else {
          res.status(400).json({
            success: false,
            error: result.error,
            metadata: result.metadata,
            correlationId: (req as any).correlationId,
          });
        }
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
```

### Verification Checklist

- [ ] Registry registers agents correctly
- [ ] Registry retrieves latest version
- [ ] Registry handles version lookup
- [ ] Context factory injects all services
- [ ] Executor runs agents correctly
- [ ] Executor logs audit entries
- [ ] API routes work correctly

### Unit Tests

Create `/agents/core/__tests__/registry.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistry, AgentNotFoundError } from '../registry';

const mockAgent = {
  id: 'test-agent',
  version: '1.0.0',
  name: 'Test Agent',
  description: 'A test agent',
  inputSchema: {} as any,
  outputSchema: {} as any,
  execute: async () => ({ success: true, data: {}, metadata: {} as any }),
};

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  it('should register agent', () => {
    registry.register(mockAgent);
    expect(registry.has('test-agent')).toBe(true);
  });

  it('should get registered agent', () => {
    registry.register(mockAgent);
    const agent = registry.get('test-agent');
    expect(agent.id).toBe('test-agent');
  });

  it('should throw for unregistered agent', () => {
    expect(() => registry.get('unknown')).toThrow(AgentNotFoundError);
  });

  it('should get latest version', () => {
    registry.register({ ...mockAgent, version: '1.0.0' });
    registry.register({ ...mockAgent, version: '1.1.0' });
    registry.register({ ...mockAgent, version: '1.0.5' });

    const agent = registry.get('test-agent');
    expect(agent.version).toBe('1.1.0');
  });

  it('should list all agents', () => {
    registry.register(mockAgent);
    const list = registry.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('test-agent');
  });
});
```

### Success Criteria

1. Agents can be registered and retrieved
2. Version management works correctly
3. Context factory creates valid contexts
4. Executor runs agents with full pipeline
5. API routes expose agent functionality
6. All tests passing

### Next Step

After completing this task, proceed to `PHASE2_03_WRAP_AGENTS.md`
