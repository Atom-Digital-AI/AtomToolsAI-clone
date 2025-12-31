# Phase 3: Orchestration Engine Overview

## Execution Prompt

You are implementing Phase 3 of the AtomToolsAI rebuild. This phase creates the deterministic tool orchestration system that calls agents sequentially with strict validation between steps.

### Prerequisites
- Phase 1 fully completed (Foundation)
- Phase 2 fully completed (Agent Interface)
- All agents wrapped and registered

### Reference Documents
- `/docs/rebuild-plan/00-MASTER_PLAN.md` - Section 8: Phase 3
- `/docs/rebuild-plan/03-AGENT_INTERFACE_SPEC.md` - Agent interfaces

---

## Phase 3 Tasks

### 3.1 Orchestration Types

Create `/orchestration/engine/types.ts`:

```typescript
import { z, ZodSchema } from 'zod';

/**
 * Tool definition loaded from YAML.
 */
export interface ToolDefinition {
  id: string;
  version: string;
  name: string;
  description: string;
  steps: OrchestrationStep[];
}

/**
 * Single step in orchestration.
 */
export interface OrchestrationStep {
  id: string;
  agentId: string;
  agentVersion?: string;
  inputMapping: InputMapping;
  outputMapping: OutputMapping;
  validation?: {
    inputSchema?: ZodSchema;
    outputSchema?: ZodSchema;
  };
  onError?: 'halt' | 'skip' | 'retry';
  retryConfig?: {
    maxRetries: number;
    delayMs: number;
  };
}

/**
 * Maps tool input/previous step output to agent input.
 */
export interface InputMapping {
  [agentInputField: string]: string | MappingExpression;
}

/**
 * Maps agent output to state for next step.
 */
export interface OutputMapping {
  [stateField: string]: string | MappingExpression;
}

export interface MappingExpression {
  source: 'input' | 'state' | 'context';
  path: string;
  transform?: string;
  default?: unknown;
}

/**
 * State maintained during orchestration.
 */
export interface OrchestrationState {
  toolId: string;
  correlationId: string;
  userId?: string;
  currentStepIndex: number;
  status: 'running' | 'paused' | 'completed' | 'failed';
  input: Record<string, unknown>;
  stepResults: StepResult[];
  error?: {
    stepId: string;
    error: unknown;
  };
  startedAt: Date;
  updatedAt: Date;
}

export interface StepResult {
  stepId: string;
  agentId: string;
  success: boolean;
  output?: Record<string, unknown>;
  error?: unknown;
  executionTimeMs: number;
  completedAt: Date;
}
```

### 3.2 Orchestration Engine

Create `/orchestration/engine/executor.ts`:

```typescript
import { ToolDefinition, OrchestrationState, StepResult } from './types';
import { agentExecutor } from '@agents/core/executor';
import { supabase } from '@server/config/supabase';
import { logger } from '@server/logging/logger';

export class OrchestrationEngine {
  /**
   * Execute a tool from start to finish.
   */
  async execute(
    tool: ToolDefinition,
    input: Record<string, unknown>,
    params: ExecuteParams
  ): Promise<OrchestrationState> {
    const state = this.initializeState(tool, input, params);

    await this.saveCheckpoint(state);

    for (let i = 0; i < tool.steps.length; i++) {
      state.currentStepIndex = i;
      const step = tool.steps[i];

      try {
        const result = await this.executeStep(step, state, params);
        state.stepResults.push(result);
        state.updatedAt = new Date();

        await this.saveCheckpoint(state);

        if (!result.success && step.onError === 'halt') {
          state.status = 'failed';
          state.error = { stepId: step.id, error: result.error };
          break;
        }
      } catch (error) {
        state.status = 'failed';
        state.error = { stepId: step.id, error };
        break;
      }
    }

    if (state.status === 'running') {
      state.status = 'completed';
    }

    await this.saveCheckpoint(state);
    return state;
  }

  /**
   * Resume a paused orchestration.
   */
  async resume(threadId: string, params: ExecuteParams): Promise<OrchestrationState> {
    const state = await this.loadCheckpoint(threadId);
    if (!state) throw new Error('Thread not found');
    if (state.status !== 'paused') throw new Error('Thread not paused');

    state.status = 'running';
    // Continue from currentStepIndex...
    // Implementation similar to execute()

    return state;
  }

  private async executeStep(
    step: OrchestrationStep,
    state: OrchestrationState,
    params: ExecuteParams
  ): Promise<StepResult> {
    const startedAt = Date.now();

    // Map input from state
    const agentInput = this.mapInput(step.inputMapping, state);

    // Validate input if schema provided
    if (step.validation?.inputSchema) {
      const result = step.validation.inputSchema.safeParse(agentInput);
      if (!result.success) {
        return {
          stepId: step.id,
          agentId: step.agentId,
          success: false,
          error: { code: 'VALIDATION_ERROR', errors: result.error.errors },
          executionTimeMs: Date.now() - startedAt,
          completedAt: new Date(),
        };
      }
    }

    // Execute agent
    const result = await agentExecutor.execute(step.agentId, agentInput, {
      correlationId: state.correlationId,
      userId: state.userId,
      toolId: state.toolId,
      stepIndex: state.currentStepIndex,
    });

    // Map output to state
    if (result.success) {
      this.mapOutput(step.outputMapping, result.data, state);
    }

    return {
      stepId: step.id,
      agentId: step.agentId,
      success: result.success,
      output: result.success ? result.data : undefined,
      error: result.success ? undefined : result.error,
      executionTimeMs: Date.now() - startedAt,
      completedAt: new Date(),
    };
  }

  private mapInput(mapping: InputMapping, state: OrchestrationState): Record<string, unknown> {
    // Implementation: resolve mappings from state
  }

  private mapOutput(mapping: OutputMapping, output: unknown, state: OrchestrationState): void {
    // Implementation: apply output to state
  }

  private async saveCheckpoint(state: OrchestrationState): Promise<void> {
    await supabase.from('langgraph_checkpoints').insert({
      thread_id: state.correlationId,
      checkpoint_data: state,
      created_at: new Date().toISOString(),
    });
  }

  private async loadCheckpoint(threadId: string): Promise<OrchestrationState | null> {
    const { data } = await supabase
      .from('langgraph_checkpoints')
      .select('checkpoint_data')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return data?.checkpoint_data ?? null;
  }
}
```

### 3.3 Tool Definition Loader

Create `/orchestration/tools/loader.ts`:

```typescript
import { readFileSync, readdirSync } from 'fs';
import { parse } from 'yaml';
import { join } from 'path';
import { ToolDefinition } from '../engine/types';
import { agentRegistry } from '@agents/core/registry';

export function loadToolDefinitions(directory: string): Map<string, ToolDefinition> {
  const tools = new Map<string, ToolDefinition>();
  const files = readdirSync(directory).filter(f => f.endsWith('.yaml'));

  for (const file of files) {
    const content = readFileSync(join(directory, file), 'utf-8');
    const tool = parse(content) as ToolDefinition;

    // Validate all agents exist
    for (const step of tool.steps) {
      if (!agentRegistry.has(step.agentId)) {
        throw new Error(`Agent ${step.agentId} not found for tool ${tool.id}`);
      }
    }

    tools.set(tool.id, tool);
    console.log(`Loaded tool: ${tool.id}@${tool.version}`);
  }

  return tools;
}
```

### 3.4 Example Tool Definition

Create `/orchestration/tools/content-writer.yaml`:

```yaml
id: content-writer
version: "1.0.0"
name: Content Writer
description: Generates high-quality content with brand alignment and fact checking

steps:
  - id: generate-concepts
    agentId: concept-generator
    inputMapping:
      topic: { source: input, path: topic }
      targetAudience: { source: input, path: targetAudience }
      count: { source: input, path: conceptCount, default: 5 }
      brandContext:
        source: context
        path: brandContext
    outputMapping:
      concepts: concepts
      topicAnalysis: topicAnalysis
    onError: halt

  - id: generate-article
    agentId: article-generator
    inputMapping:
      concept: { source: state, path: selectedConcept }
      outline: { source: state, path: outline }
      brandContext: { source: context, path: brandContext }
    outputMapping:
      article: articleDraft
    onError: halt

  - id: check-facts
    agentId: fact-checker
    inputMapping:
      content: { source: state, path: articleDraft }
    outputMapping:
      factCheckResult: factCheckResult
      verifiedClaims: verifiedClaims
    onError: halt

  - id: check-brand
    agentId: brand-guardian
    inputMapping:
      content: { source: state, path: articleDraft }
      guidelineProfileId: { source: context, path: guidelineProfileId }
    outputMapping:
      brandMatchResult: brandMatchResult
    onError: halt

  - id: proofread
    agentId: proofreader
    inputMapping:
      content: { source: state, path: articleDraft }
      language: { source: input, path: language, default: en }
    outputMapping:
      proofreadResult: proofreadResult
      finalContent: finalContent
```

---

## Verification Checklist

- [ ] OrchestrationState type defined
- [ ] OrchestrationEngine executes steps sequentially
- [ ] Input mapping works correctly
- [ ] Output mapping updates state
- [ ] Checkpoints save to database
- [ ] Resume from checkpoint works
- [ ] Error handling halts/skips as configured
- [ ] Tool definitions load from YAML
- [ ] All tool agents validated at load time
- [ ] Tool API routes working

## Success Criteria

1. Tools can be defined declaratively in YAML
2. Orchestration executes agents in order
3. State flows correctly between steps
4. Checkpointing enables resume
5. Validation occurs between steps
6. Errors are handled as configured
7. All tests passing

---

*See individual task prompts for detailed implementation steps*
