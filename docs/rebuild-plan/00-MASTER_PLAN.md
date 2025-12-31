# AtomToolsAI Rebuild Master Plan

## Executive Summary

This document outlines the complete rebuild plan for AtomToolsAI, transforming it from a 52% requirements-compliant system to a fully modular, well-documented platform with tool-agnostic agents, strict validation, and robust error logging.

**Current State**: Working but monolithic, tightly-coupled agents, session-only auth, minimal validation
**Target State**: Modular, tool-agnostic agents via API, strict schema validation, structured logging

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Phase Summary](#3-phase-summary)
4. [Dependency Graph](#4-dependency-graph)
5. [Directory Structure](#5-directory-structure)
6. [Phase 1: Foundation](#6-phase-1-foundation)
7. [Phase 2: Agent Interface](#7-phase-2-agent-interface)
8. [Phase 3: Orchestration Engine](#8-phase-3-orchestration-engine)
9. [Phase 4: Modularization](#9-phase-4-modularization)
10. [Testing Strategy](#10-testing-strategy)
11. [Migration Checklist](#11-migration-checklist)
12. [Risk Register](#12-risk-register)

---

## 1. Architecture Overview

### Current Architecture (Problems)

```
┌─────────────────────────────────────────────────────────────────┐
│                     CURRENT STATE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 routes.ts (5,588 lines)                   │   │
│  │  - All 102 endpoints in one file                         │   │
│  │  - Business logic mixed with routing                     │   │
│  │  - 14% input validation coverage                         │   │
│  │  - 0% output validation                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                storage.ts (2,957 lines)                   │   │
│  │  - God class with all data access                        │   │
│  │  - No repository separation                              │   │
│  │  - Singleton pattern (hard to test)                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Agents (Tightly Coupled)                     │   │
│  │  - Each agent imports ContentWriterState directly        │   │
│  │  - No standard interface                                 │   │
│  │  - No input/output validation                            │   │
│  │  - Cannot be reused across tools                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Problems:                                                       │
│  ✗ 414 `any` type assertions                                    │
│  ✗ 442 console.log calls (no structured logging)                │
│  ✗ 0 correlation IDs                                            │
│  ✗ Session-only auth (no API keys)                              │
│  ✗ PostgreSQL + Drizzle (not Supabase)                          │
└─────────────────────────────────────────────────────────────────┘
```

### Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  API Key    │  │    Rate     │  │   Correlation ID        │  │
│  │  Validator  │  │   Limiter   │  │   Middleware            │  │
│  │             │  │  (per-key)  │  │                         │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         └────────────────┴──────────────────────┘                │
│                          │                                       │
│                          ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              REQUEST VALIDATION LAYER                     │   │
│  │  - Zod schema validation for ALL inputs                  │   │
│  │  - Field-level error messages                            │   │
│  │  - Request context enrichment                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       TOOL LAYER                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │   SEO Meta    │  │  Google Ads   │  │Content Writer │  ...   │
│  │    Tool       │  │    Tool       │  │    Tool       │        │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘        │
│          │                  │                  │                 │
│          └──────────────────┴──────────────────┘                 │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              ORCHESTRATION ENGINE                         │   │
│  │                                                           │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │  Tool Definition (YAML)                             │ │   │
│  │  │  ─────────────────────                              │ │   │
│  │  │  tool_id: content-writer                            │ │   │
│  │  │  steps:                                             │ │   │
│  │  │    - agent: concept-generator                       │ │   │
│  │  │      input_mapping: { ... }                         │ │   │
│  │  │      output_mapping: { ... }                        │ │   │
│  │  │    - agent: article-generator                       │ │   │
│  │  │      depends_on: concept-generator                  │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                                                           │   │
│  │  Features:                                                │   │
│  │  ✓ Declarative step definitions                          │   │
│  │  ✓ Inter-step validation                                 │   │
│  │  ✓ State checkpointing (resumable)                       │   │
│  │  ✓ Audit logging per step                                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 AGENT LAYER (Tool-Agnostic)                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Agent Interface                         │   │
│  │  ─────────────────────────────────                       │   │
│  │  interface IAgent<TInput, TOutput> {                     │   │
│  │    readonly id: string;                                  │   │
│  │    readonly version: string;                             │   │
│  │    readonly inputSchema: ZodSchema<TInput>;              │   │
│  │    readonly outputSchema: ZodSchema<TOutput>;            │   │
│  │                                                          │   │
│  │    execute(                                              │   │
│  │      input: TInput,                                      │   │
│  │      context: AgentContext                               │   │
│  │    ): Promise<AgentResult<TOutput>>;                     │   │
│  │  }                                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│  │  Concept   │ │  Article   │ │   Fact     │ │   Brand    │    │
│  │ Generator  │ │  Writer    │ │  Checker   │ │  Guardian  │    │
│  │            │ │            │ │            │ │            │    │
│  │ v1.0.0     │ │ v1.0.0     │ │ v1.0.0     │ │ v1.0.0     │    │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘    │
│                                                                  │
│  Each Agent:                                                     │
│  ✓ Has Zod input schema (validated before execution)            │
│  ✓ Has Zod output schema (validated after execution)            │
│  ✓ Receives dependencies via context (DI)                       │
│  ✓ Returns structured Result<T> with metadata                   │
│  ✓ Is completely unaware of calling tool                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│  │    RAG     │ │ Embedding  │ │   Brand    │ │  Storage   │    │
│  │  Service   │ │  Service   │ │  Analyzer  │ │  Service   │    │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘    │
│                                                                  │
│  ✓ Injected into agents via context                             │
│  ✓ Each service has interface + implementation                  │
│  ✓ Easily mockable for testing                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   REPOSITORY LAYER                               │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│  │   User     │ │  Product   │ │  Content   │ │ Guideline  │    │
│  │   Repo     │ │   Repo     │ │   Repo     │ │   Repo     │    │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘    │
│                                                                  │
│  ✓ Single responsibility (one entity per repo)                  │
│  ✓ Supabase client injected                                     │
│  ✓ Type-safe queries                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE                                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│  │  Supabase  │ │ LangSmith  │ │   Sentry   │ │   Pino     │    │
│  │  (DB+Auth) │ │ (Tracing)  │ │  (Errors)  │ │  (Logs)    │    │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘    │
│                                                                  │
│  ✓ All infrastructure behind interfaces                         │
│  ✓ Configuration validated at startup                           │
│  ✓ Health checks for each service                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### Required Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend** | React | 18.x | UI Framework |
| **Frontend** | TypeScript | 5.x | Type Safety |
| **Frontend** | Vite | 5.x | Build Tool |
| **Frontend** | TailwindCSS | 3.x | Styling |
| **Frontend** | React Query | 5.x | Server State |
| **Backend** | Express.js | 4.x | HTTP Server |
| **Backend** | TypeScript | 5.x | Type Safety |
| **Database** | Supabase | Latest | DB + Auth + Storage |
| **AI** | LangChain | 1.x | AI Orchestration |
| **AI** | LangGraph | 1.x | Workflow Graphs |
| **Observability** | LangSmith | Latest | AI Tracing |
| **Observability** | Sentry | 10.x | Error Tracking |
| **Logging** | Pino | 8.x | Structured Logging |
| **Validation** | Zod | 3.x | Schema Validation |
| **Deployment** | Railway | - | Hosting |

### New Dependencies to Add

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "pino": "^8.x",
    "pino-http": "^9.x",
    "nanoid": "^5.x",
    "awilix": "^10.x"
  },
  "devDependencies": {
    "pino-pretty": "^10.x",
    "@types/pino": "^7.x"
  }
}
```

### Dependencies to Remove

```json
{
  "remove": {
    "drizzle-orm": "Replaced by Supabase",
    "drizzle-kit": "Replaced by Supabase",
    "pg": "Replaced by Supabase client",
    "connect-pg-simple": "Replaced by Supabase auth"
  }
}
```

---

## 3. Phase Summary

| Phase | Name | Duration | Dependencies | Deliverables |
|-------|------|----------|--------------|--------------|
| **1** | Foundation | 2 weeks | None | Supabase, Logging, Auth, Validation middleware |
| **2** | Agent Interface | 2 weeks | Phase 1 | IAgent interface, Agent registry, All agents wrapped |
| **3** | Orchestration | 2 weeks | Phase 2 | Orchestration engine, Tool definitions, Inter-step validation |
| **4** | Modularization | 2 weeks | Phase 3 | Split routes/storage, DI container, OpenAPI docs |

```
Week:  1    2    3    4    5    6    7    8
       ├────┴────┼────┴────┼────┴────┼────┴────┤
Phase: │ PHASE 1 │ PHASE 2 │ PHASE 3 │ PHASE 4 │
       │Foundation│ Agents  │  Orch   │ Modular │
       └─────────┴─────────┴─────────┴─────────┘
```

---

## 4. Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE DEPENDENCIES                            │
└─────────────────────────────────────────────────────────────────┘

PHASE 1: FOUNDATION
├── 1.1 Supabase Setup ──────────────────────────────────┐
│   └── Schema migration                                 │
│   └── Auth configuration                               │
├── 1.2 Structured Logging ──────────────────────────────┤
│   └── Pino setup                                       │
│   └── Correlation ID middleware                        │
├── 1.3 API Key Authentication ──────────────────────────┤
│   └── Key generation                                   │
│   └── Key validation middleware                        │
├── 1.4 Validation Infrastructure ───────────────────────┤
│   └── Request validation middleware                    │
│   └── Response validation middleware                   │
│                                                        │
│   ALL PHASE 1 ITEMS ARE INDEPENDENT                    │
│   CAN BE DEVELOPED IN PARALLEL                         │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
PHASE 2: AGENT INTERFACE
├── 2.1 IAgent Interface ────────────────────────────────┐
│   └── Depends on: 1.4 (validation types)              │
├── 2.2 Agent Context & DI ──────────────────────────────┤
│   └── Depends on: 1.1 (Supabase), 1.2 (logging)       │
├── 2.3 Agent Registry ──────────────────────────────────┤
│   └── Depends on: 2.1 (interface)                     │
├── 2.4 Wrap Existing Agents ────────────────────────────┤
│   └── Depends on: 2.1, 2.2, 2.3                       │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
PHASE 3: ORCHESTRATION ENGINE
├── 3.1 Orchestration Types ─────────────────────────────┐
│   └── Depends on: 2.1 (agent interface)               │
├── 3.2 Orchestration Engine ────────────────────────────┤
│   └── Depends on: 3.1, 2.3 (registry)                 │
├── 3.3 Tool Definitions ────────────────────────────────┤
│   └── Depends on: 3.1 (types)                         │
├── 3.4 Inter-step Validation ───────────────────────────┤
│   └── Depends on: 3.2 (engine)                        │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
PHASE 4: MODULARIZATION
├── 4.1 Route Splitting ─────────────────────────────────┐
│   └── Depends on: 1.3, 1.4 (auth, validation)         │
├── 4.2 Repository Extraction ───────────────────────────┤
│   └── Depends on: 1.1 (Supabase)                      │
├── 4.3 DI Container ────────────────────────────────────┤
│   └── Depends on: 4.2 (repositories)                  │
├── 4.4 OpenAPI Documentation ───────────────────────────┤
│   └── Depends on: 4.1 (routes)                        │
└────────────────────────────────────────────────────────┘
```

---

## 5. Directory Structure

### Target Directory Structure

```
/home/user/AtomToolsAI-clone/
├── client/                          # React Frontend (minimal changes)
│   └── src/
│       ├── api/                     # API client (updated for new endpoints)
│       ├── components/
│       ├── contexts/
│       ├── hooks/
│       ├── pages/
│       └── utils/
│
├── server/                          # Express Backend (major refactor)
│   ├── index.ts                     # Entry point (streamlined)
│   ├── config/
│   │   ├── index.ts                 # Environment validation
│   │   ├── supabase.ts              # Supabase client config
│   │   └── container.ts             # DI container setup
│   │
│   ├── middleware/
│   │   ├── auth.ts                  # Session + API key auth
│   │   ├── api-key.ts               # API key validation
│   │   ├── correlation-id.ts        # Request tracing
│   │   ├── request-logger.ts        # Pino HTTP logging
│   │   ├── validate-request.ts      # Zod input validation
│   │   ├── validate-response.ts     # Zod output validation
│   │   ├── rate-limit.ts            # Rate limiting (per key)
│   │   └── error-handler.ts         # Global error handler
│   │
│   ├── routes/                      # Modular route handlers
│   │   ├── index.ts                 # Route aggregator
│   │   ├── auth.routes.ts           # Auth endpoints
│   │   ├── user.routes.ts           # User management
│   │   ├── product.routes.ts        # Products & subscriptions
│   │   ├── guideline.routes.ts      # Brand guidelines
│   │   ├── tool.routes.ts           # Tool orchestration endpoints
│   │   ├── agent.routes.ts          # Direct agent API (for external tools)
│   │   ├── cms.routes.ts            # CMS endpoints
│   │   └── admin.routes.ts          # Admin endpoints
│   │
│   ├── repositories/                # Data access layer
│   │   ├── base.repository.ts       # Base repository class
│   │   ├── user.repository.ts
│   │   ├── product.repository.ts
│   │   ├── subscription.repository.ts
│   │   ├── guideline.repository.ts
│   │   ├── content.repository.ts
│   │   ├── api-key.repository.ts
│   │   └── audit-log.repository.ts
│   │
│   ├── services/                    # Business logic layer
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── subscription.service.ts
│   │   ├── rag.service.ts
│   │   ├── embedding.service.ts
│   │   ├── brand-analyzer.service.ts
│   │   └── api-key.service.ts
│   │
│   ├── logging/                     # Structured logging
│   │   ├── logger.ts                # Pino logger setup
│   │   ├── context.ts               # Async local storage for context
│   │   └── formatters.ts            # Log formatters
│   │
│   └── errors/                      # Error definitions
│       ├── base.error.ts
│       ├── validation.error.ts
│       ├── auth.error.ts
│       ├── agent.error.ts
│       └── orchestration.error.ts
│
├── agents/                          # Tool-Agnostic Agents (NEW)
│   ├── core/
│   │   ├── types.ts                 # IAgent, AgentContext, AgentResult
│   │   ├── registry.ts              # Agent registry
│   │   ├── executor.ts              # Agent execution wrapper
│   │   └── schemas.ts               # Shared schema types
│   │
│   ├── concept-generator/
│   │   ├── index.ts                 # Agent implementation
│   │   ├── schema.ts                # Input/output Zod schemas
│   │   └── concept-generator.test.ts
│   │
│   ├── article-generator/
│   │   ├── index.ts
│   │   ├── schema.ts
│   │   └── article-generator.test.ts
│   │
│   ├── fact-checker/
│   │   ├── index.ts
│   │   ├── schema.ts
│   │   └── fact-checker.test.ts
│   │
│   ├── brand-guardian/
│   │   ├── index.ts
│   │   ├── schema.ts
│   │   └── brand-guardian.test.ts
│   │
│   ├── regulatory-guardian/
│   │   ├── index.ts
│   │   ├── schema.ts
│   │   └── regulatory-guardian.test.ts
│   │
│   ├── proofreader/
│   │   ├── index.ts
│   │   ├── schema.ts
│   │   └── proofreader.test.ts
│   │
│   └── ... (other agents)
│
├── orchestration/                   # Orchestration Engine (NEW)
│   ├── engine/
│   │   ├── types.ts                 # Orchestration types
│   │   ├── executor.ts              # Step executor
│   │   ├── state-manager.ts         # State management
│   │   └── validator.ts             # Inter-step validation
│   │
│   ├── tools/                       # Tool definitions
│   │   ├── content-writer.yaml
│   │   ├── seo-meta.yaml
│   │   ├── google-ads.yaml
│   │   ├── social-content.yaml
│   │   └── ... (other tools)
│   │
│   └── checkpointer/
│       ├── types.ts
│       └── supabase-checkpointer.ts
│
├── shared/                          # Shared code
│   ├── schemas/                     # Zod schemas (replaces schema.ts)
│   │   ├── user.schema.ts
│   │   ├── product.schema.ts
│   │   ├── guideline.schema.ts
│   │   ├── content.schema.ts
│   │   └── api.schema.ts            # API request/response schemas
│   │
│   ├── types/                       # TypeScript types
│   │   ├── database.types.ts        # Supabase generated types
│   │   └── api.types.ts
│   │
│   └── constants/
│       ├── error-codes.ts
│       ├── agent-ids.ts
│       └── tool-ids.ts
│
├── docs/
│   ├── rebuild-plan/                # This documentation
│   ├── api/                         # OpenAPI specs
│   │   └── openapi.yaml
│   ├── adr/                         # Architecture Decision Records
│   └── agents/                      # Agent documentation
│
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## 6. Phase 1: Foundation

### Overview

Phase 1 establishes the core infrastructure required by all subsequent phases.

### 1.1 Supabase Setup

**Reference**: `docs/rebuild-plan/01-SUPABASE_MIGRATION.md`

**Tasks**:
1. Create Supabase project
2. Migrate schema from Drizzle to Supabase
3. Set up Row Level Security (RLS)
4. Configure authentication
5. Generate TypeScript types
6. Create migration scripts

**Deliverables**:
- [ ] Supabase project created
- [ ] All tables migrated
- [ ] RLS policies defined
- [ ] Type generation configured
- [ ] Connection pooling set up

### 1.2 Structured Logging

**Reference**: `docs/rebuild-plan/02-LOGGING_INFRASTRUCTURE.md`

**Tasks**:
1. Install and configure Pino
2. Create correlation ID middleware
3. Define log formats
4. Integrate with Sentry
5. Replace all console.log calls

**Deliverables**:
- [ ] Pino configured
- [ ] Correlation IDs in all logs
- [ ] Log levels working
- [ ] Sentry integration
- [ ] 0 console.log calls remaining

### 1.3 API Key Authentication

**Reference**: `docs/rebuild-plan/02-LOGGING_INFRASTRUCTURE.md` (includes auth)

**Tasks**:
1. Create API keys table in Supabase
2. Build key generation service
3. Create validation middleware
4. Implement per-key rate limiting
5. Add audit logging

**Deliverables**:
- [ ] API keys table
- [ ] Key generation endpoint
- [ ] Validation middleware
- [ ] Rate limiting per key
- [ ] Audit logs

### 1.4 Validation Infrastructure

**Reference**: `docs/rebuild-plan/02-LOGGING_INFRASTRUCTURE.md` (includes validation)

**Tasks**:
1. Create request validation middleware
2. Create response validation middleware
3. Define error response format
4. Add validation logging

**Deliverables**:
- [ ] Request validation middleware
- [ ] Response validation middleware
- [ ] Standardized error format
- [ ] Validation error logging

---

## 7. Phase 2: Agent Interface

### Overview

Phase 2 creates the tool-agnostic agent system.

**Reference**: `docs/rebuild-plan/03-AGENT_INTERFACE_SPEC.md`

### 2.1 IAgent Interface

**Tasks**:
1. Define IAgent<TInput, TOutput> interface
2. Define AgentContext type
3. Define AgentResult type
4. Create base agent class

### 2.2 Agent Context & DI

**Tasks**:
1. Set up Awilix container
2. Define service interfaces
3. Create context factory
4. Inject services into agents

### 2.3 Agent Registry

**Tasks**:
1. Create agent registry
2. Implement registration API
3. Add version management
4. Create discovery endpoint

### 2.4 Wrap Existing Agents

**Tasks** (for each agent):
1. Create input Zod schema
2. Create output Zod schema
3. Implement IAgent interface
4. Extract business logic from current implementation
5. Write unit tests
6. Register with registry

**Agents to Wrap**:
- [ ] concept-generator
- [ ] subtopic-generator
- [ ] outline-builder
- [ ] article-generator
- [ ] fact-checker
- [ ] brand-guardian
- [ ] regulatory-guardian
- [ ] proofreader
- [ ] wireframe-generator

---

## 8. Phase 3: Orchestration Engine

### Overview

Phase 3 builds the deterministic tool orchestration system.

**Reference**: `docs/rebuild-plan/prompts/PHASE3_*.md`

### 3.1 Orchestration Types

**Tasks**:
1. Define ToolDefinition type
2. Define OrchestrationStep type
3. Define StepResult type
4. Define OrchestrationState type

### 3.2 Orchestration Engine

**Tasks**:
1. Create OrchestrationEngine class
2. Implement step execution
3. Add state management
4. Integrate checkpointing
5. Add resume capability

### 3.3 Tool Definitions

**Tasks**:
1. Define YAML schema for tools
2. Create content-writer.yaml
3. Create seo-meta.yaml
4. Create google-ads.yaml
5. Create social-content.yaml
6. Validate definitions at startup

### 3.4 Inter-step Validation

**Tasks**:
1. Create step input validator
2. Create step output validator
3. Add mapping validation
4. Implement error handling

---

## 9. Phase 4: Modularization

### Overview

Phase 4 splits the monolithic files and adds documentation.

**Reference**: `docs/rebuild-plan/prompts/PHASE4_*.md`

### 4.1 Route Splitting

**Tasks**:
1. Extract auth routes
2. Extract user routes
3. Extract product routes
4. Extract guideline routes
5. Extract tool routes
6. Extract cms routes
7. Extract admin routes
8. Create route aggregator

### 4.2 Repository Extraction

**Tasks**:
1. Create base repository
2. Extract user repository
3. Extract product repository
4. Extract subscription repository
5. Extract guideline repository
6. Extract content repository
7. Add Supabase integration

### 4.3 DI Container

**Tasks**:
1. Configure Awilix
2. Register all repositories
3. Register all services
4. Create request-scoped containers
5. Update route handlers

### 4.4 OpenAPI Documentation

**Tasks**:
1. Install swagger-jsdoc
2. Add JSDoc to all routes
3. Generate OpenAPI spec
4. Add Swagger UI endpoint
5. Validate spec completeness

---

## 10. Testing Strategy

### Unit Tests

| Component | Framework | Coverage Target |
|-----------|-----------|-----------------|
| Agents | Vitest | 90% |
| Services | Vitest | 85% |
| Repositories | Vitest | 80% |
| Middleware | Vitest | 90% |
| Orchestration | Vitest | 85% |

### Integration Tests

| Component | Framework | Coverage Target |
|-----------|-----------|-----------------|
| API Routes | Supertest | 80% |
| Agent Execution | Supertest | 85% |
| Orchestration | Supertest | 80% |

### E2E Tests

| Flow | Framework | Coverage |
|------|-----------|----------|
| Auth Flow | Playwright | Critical paths |
| Content Generation | Playwright | Happy path |
| Tool Execution | Playwright | Happy path |

### Test Commands

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests with coverage
npm run test:coverage
```

---

## 11. Migration Checklist

### Pre-Migration

- [ ] Backup current database
- [ ] Document current API endpoints
- [ ] List all environment variables
- [ ] Identify active users/sessions

### Phase 1 Completion

- [ ] Supabase project running
- [ ] All tables migrated
- [ ] Logging infrastructure working
- [ ] API key auth working
- [ ] Validation middleware working
- [ ] All Phase 1 tests passing

### Phase 2 Completion

- [ ] IAgent interface defined
- [ ] All agents wrapped
- [ ] Agent registry working
- [ ] Agent API endpoint working
- [ ] All Phase 2 tests passing

### Phase 3 Completion

- [ ] Orchestration engine working
- [ ] All tools defined
- [ ] Inter-step validation working
- [ ] Checkpointing working
- [ ] All Phase 3 tests passing

### Phase 4 Completion

- [ ] Routes split into modules
- [ ] Repositories extracted
- [ ] DI container configured
- [ ] OpenAPI docs generated
- [ ] All Phase 4 tests passing

### Post-Migration

- [ ] All tests passing (unit, integration, e2e)
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Documentation complete
- [ ] Deployment successful

---

## 12. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Supabase migration breaks existing data | Medium | High | Comprehensive backup, staged migration |
| Agent wrapping changes behavior | Medium | High | Extensive testing, side-by-side comparison |
| Performance regression | Low | Medium | Benchmark before/after, optimize hot paths |
| Authentication changes break clients | Medium | High | Deprecation period, backward compatibility |
| Orchestration engine bugs | Medium | High | Thorough testing, feature flags |
| Scope creep | High | Medium | Strict phase gates, change control |

---

## Document References

| Document | Purpose |
|----------|---------|
| `01-SUPABASE_MIGRATION.md` | Detailed Supabase migration plan |
| `02-LOGGING_INFRASTRUCTURE.md` | Logging, validation, and auth specs |
| `03-AGENT_INTERFACE_SPEC.md` | Agent interface technical specification |
| `prompts/PHASE1_*.md` | Phase 1 execution prompts |
| `prompts/PHASE2_*.md` | Phase 2 execution prompts |
| `prompts/PHASE3_*.md` | Phase 3 execution prompts |
| `prompts/PHASE4_*.md` | Phase 4 execution prompts |
| `VALIDATION_CHECKLIST.md` | Complete validation checklist |

---

## Next Steps

1. Review and approve this master plan
2. Begin Phase 1.1 (Supabase Setup)
3. Execute prompts sequentially
4. Validate after each phase

---

*Document Version: 1.0*
*Created: 2024*
*Last Updated: 2024*
