# AtomToolsAI Lean Refactoring Plan

This directory contains the planning documentation for refactoring AtomToolsAI.

## Active Documents

| Document | Purpose |
|----------|---------|
| **[LEAN_PLAN.md](./LEAN_PLAN.md)** | Main refactoring plan (2-3 weeks) |
| **[TEST_STRATEGY.md](./TEST_STRATEGY.md)** | Testing approach and existing test catalog |
| **[KILL_LIST.md](./KILL_LIST.md)** | Files to delete (redundant/outdated) |

## Quick Start

1. Read `LEAN_PLAN.md` for the complete approach
2. Execute the deletion script in `KILL_LIST.md` to clean up cruft
3. Follow phases in order (Foundation → Agent Wrappers → Modularization)

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript |
| Backend | Express.js + TypeScript |
| Database | **Neon** (EU Frankfurt) + Drizzle |
| AI | LangChain + LangGraph + LangSmith |
| Monitoring | Sentry + Pino logging |
| Deployment | Railway |

## Timeline

| Week | Focus |
|------|-------|
| 1 | Pino logging, validation middleware, API key auth |
| 2 | Agent validation wrappers, split routes.ts |
| 3 | Split storage.ts, final testing |

## Key Principles

- **Keep what works**: LangGraph, existing agents, Drizzle schema
- **Add what's missing**: Logging, validation, API keys, modularization
- **No over-engineering**: Factory functions, not DI frameworks
- **Lean**: 2-3 weeks, not 8 weeks

## Deprecated Documents

The following files are superseded by the lean plan and listed for deletion:

- `00-MASTER_PLAN.md` - Replaced by LEAN_PLAN.md
- `01-SUPABASE_MIGRATION.md` - Using Neon instead
- `02-LOGGING_INFRASTRUCTURE.md` - Covered in LEAN_PLAN.md
- `03-AGENT_INTERFACE_SPEC.md` - Over-engineered
- `VALIDATION_CHECKLIST.md` - Over-detailed
- `prompts/` directory - Covered in lean plan

---

*Last Updated: December 2025*
