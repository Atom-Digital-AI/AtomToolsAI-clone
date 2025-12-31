# AtomToolsAI Rebuild Plan

This directory contains the complete planning documentation for rebuilding AtomToolsAI with modular architecture, tool-agnostic agents, strict validation, and robust error logging.

## Quick Start

1. Read `00-MASTER_PLAN.md` for the overall architecture and timeline
2. Review the technical specifications in documents 01-03
3. Execute phases using the prompts in the `/prompts` directory
4. Validate progress using `VALIDATION_CHECKLIST.md`

## Document Index

### Master Plan
- **[00-MASTER_PLAN.md](./00-MASTER_PLAN.md)** - Complete rebuild overview with architecture, phases, and dependencies

### Technical Specifications
- **[01-SUPABASE_MIGRATION.md](./01-SUPABASE_MIGRATION.md)** - Database migration from Drizzle/PostgreSQL to Supabase
- **[02-LOGGING_INFRASTRUCTURE.md](./02-LOGGING_INFRASTRUCTURE.md)** - Structured logging, validation middleware, API key auth
- **[03-AGENT_INTERFACE_SPEC.md](./03-AGENT_INTERFACE_SPEC.md)** - Tool-agnostic agent interface and implementation

### Validation
- **[VALIDATION_CHECKLIST.md](./VALIDATION_CHECKLIST.md)** - Comprehensive checklists and test requirements

### Execution Prompts
Detailed prompts for executing each phase step-by-step:

#### Phase 1: Foundation
- `prompts/PHASE1_01_SUPABASE_SETUP.md` - Supabase project and schema
- `prompts/PHASE1_02_STRUCTURED_LOGGING.md` - Pino logging and correlation IDs
- `prompts/PHASE1_03_API_KEY_AUTH.md` - API key authentication system
- `prompts/PHASE1_04_VALIDATION_MIDDLEWARE.md` - Request/response validation

#### Phase 2: Agent Interface
- `prompts/PHASE2_01_AGENT_INTERFACE.md` - Core agent types and base class
- `prompts/PHASE2_02_AGENT_REGISTRY.md` - Registry and context factory

#### Phase 3: Orchestration
- `prompts/PHASE3_ORCHESTRATION_OVERVIEW.md` - Orchestration engine overview

#### Phase 4: Modularization
- `prompts/PHASE4_MODULARIZATION_OVERVIEW.md` - Route/repository splitting

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY                               │
│  API Key Auth → Rate Limiting → Correlation ID → Validation     │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      TOOL LAYER                                  │
│  Tools define agent execution order declaratively (YAML)        │
│  Each step validates input/output against schemas               │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                 AGENT LAYER (Tool-Agnostic)                      │
│  IAgent<TInput, TOutput> interface                              │
│  Zod input/output schemas                                       │
│  Context-injected dependencies                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE                                │
│  Supabase │ LangSmith │ Sentry │ Pino Logging                   │
└─────────────────────────────────────────────────────────────────┘
```

## Timeline

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1 | 2 weeks | Foundation: Supabase, Logging, Auth, Validation |
| Phase 2 | 2 weeks | Agent Interface: Types, Registry, Wrapping |
| Phase 3 | 2 weeks | Orchestration: Engine, Tools, Validation |
| Phase 4 | 2 weeks | Modularization: Routes, Repos, DI, Docs |

## Key Requirements

### Stack
- React + TypeScript (frontend)
- Express.js + TypeScript (backend)
- Supabase (database + auth)
- Railway (deployment)
- LangChain + LangSmith (AI)
- Sentry (error tracking)

### Agent Architecture
- Tool-agnostic agents via API
- Strict input/output validation (Zod)
- Deterministic sequential orchestration
- State checkpointing and resume

### Error Logging
- Structured JSON logging (Pino)
- Correlation IDs across requests
- Comprehensive error context
- Sentry integration

## Usage

Each prompt in `/prompts` is designed to be executed as a complete task:

1. Read the prompt carefully
2. Complete all tasks in order
3. Run the verification checklist
4. Ensure all tests pass before proceeding

## Contributing

When adding to this plan:
1. Follow the existing document structure
2. Include verification checklists
3. Add test requirements
4. Update this README

---

*Last Updated: 2024*
