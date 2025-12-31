# Validation Checklist & Test Requirements

## Document Purpose

This document provides comprehensive validation checklists for each phase, test coverage requirements, and acceptance criteria for the rebuild.

---

## Phase 1: Foundation Validation

### 1.1 Supabase Setup

| Check | Command/Method | Expected Result |
|-------|----------------|-----------------|
| Database connection | `npm run test:db` | Connection successful |
| All tables created | Check Supabase dashboard | 15+ tables visible |
| RLS enabled | `SELECT * FROM pg_policies` | Policies on all tables |
| Vector extension | `SELECT * FROM pg_extension WHERE extname = 'vector'` | Extension present |
| Type generation | `npm run generate:types` | No errors, types file created |
| Connection pooling | Check pool metrics | Pool size = configured |

**Test File**: `/tests/integration/supabase-setup.test.ts`

```typescript
describe('Supabase Setup', () => {
  it('connects to database');
  it('has all required tables');
  it('has RLS enabled on all tables');
  it('has vector extension installed');
  it('generated types are valid');
});
```

### 1.2 Structured Logging

| Check | Command/Method | Expected Result |
|-------|----------------|-----------------|
| Pino configured | Start server | No startup errors |
| JSON output (prod) | `NODE_ENV=production npm start` | JSON logs to stdout |
| Pretty output (dev) | `npm run dev` | Colored, readable logs |
| Correlation IDs | Make request, check logs | ID in every log line |
| Sensitive data redacted | Log with password field | Shows [REDACTED] |
| Request/response logged | Make HTTP request | Entry/exit logs present |
| Console.log count | `grep -r "console\." server/` | 0 occurrences |

**Test File**: `/server/logging/__tests__/logger.test.ts`

```typescript
describe('Structured Logging', () => {
  it('creates logger with base context');
  it('redacts sensitive fields');
  it('includes ISO timestamps');
  it('propagates correlation IDs');
});
```

### 1.3 API Key Authentication

| Check | Command/Method | Expected Result |
|-------|----------------|-----------------|
| Create key | POST /api/api-keys | Returns key with atk_ prefix |
| Key only shown once | GET /api/api-keys | Key field not present |
| Validate key | Use X-API-Key header | Request authenticated |
| Reject invalid key | Use wrong key | 401 response |
| Reject expired key | Use expired key | 401 response |
| Revoke key | DELETE /api/api-keys/:id | 200 response |
| Revoked key rejected | Use revoked key | 401 response |
| Scope checking | Use key without scope | 403 response |
| Rate limiting | Exceed rate limit | 429 response |

**Test File**: `/tests/integration/api-keys.test.ts`

```typescript
describe('API Key Authentication', () => {
  it('creates API key with correct format');
  it('validates authentic keys');
  it('rejects invalid keys');
  it('rejects expired keys');
  it('rejects revoked keys');
  it('enforces scopes');
  it('rate limits per key');
});
```

### 1.4 Validation Middleware

| Check | Command/Method | Expected Result |
|-------|----------------|-----------------|
| Valid request passes | Send valid JSON | 200 response |
| Invalid request rejected | Send invalid JSON | 400 with details |
| Field path in error | Missing nested field | Path like "user.email" |
| Expected type in error | Wrong type | Shows expected type |
| Query validation | Invalid query param | 400 with query error |
| Params validation | Invalid UUID param | 400 with params error |
| Response validation (dev) | Invalid response shape | Error logged |

**Test File**: `/server/middleware/__tests__/validation.test.ts`

```typescript
describe('Validation Middleware', () => {
  it('passes valid requests');
  it('rejects invalid body');
  it('rejects invalid query');
  it('rejects invalid params');
  it('includes field paths');
  it('includes expected types');
  it('validates responses');
});
```

---

## Phase 2: Agent Interface Validation

### 2.1 Agent Interface

| Check | Command/Method | Expected Result |
|-------|----------------|-----------------|
| IAgent compiles | `npm run typecheck` | No type errors |
| BaseAgent works | Create test agent | Execution works |
| Input validation | Pass invalid input | VALIDATION_INPUT error |
| Output validation | Return invalid output | VALIDATION_OUTPUT error |
| Timeout handling | Long-running agent | EXECUTION_TIMEOUT error |
| Metadata populated | Execute agent | All metadata fields present |

**Test File**: `/agents/core/__tests__/base-agent.test.ts`

### 2.2 Agent Registry

| Check | Command/Method | Expected Result |
|-------|----------------|-----------------|
| Register agent | `registry.register(agent)` | No errors |
| Duplicate rejected | Register same version twice | Error thrown |
| Get agent | `registry.get('agent-id')` | Agent returned |
| Get version | `registry.getVersion('id', '1.0.0')` | Specific version |
| Latest version | Multiple versions registered | Highest version returned |
| List agents | `registry.list()` | All agents listed |
| Not found | Get unregistered | AgentNotFoundError |

**Test File**: `/agents/core/__tests__/registry.test.ts`

### 2.3 Wrapped Agents

For EACH agent being wrapped:

| Check | Command/Method | Expected Result |
|-------|----------------|-----------------|
| Input schema defined | Check schema.ts | Valid Zod schema |
| Output schema defined | Check schema.ts | Valid Zod schema |
| IAgent implemented | Extends BaseAgent | Compiles correctly |
| Business logic works | Execute with valid input | Expected output |
| Context services used | Mock services | Services called |
| No direct imports | Grep for old imports | 0 occurrences |
| Unit tests pass | `npm test agents/<name>` | All tests pass |
| Coverage > 90% | Check coverage report | >= 90% |

**Test Files**: `/agents/<agent-name>/__tests__/*.test.ts`

---

## Phase 3: Orchestration Validation

### 3.1 Orchestration Engine

| Check | Command/Method | Expected Result |
|-------|----------------|-----------------|
| Tool definition loads | Load YAML file | No parse errors |
| Steps execute in order | Execute tool | Correct sequence |
| State threading works | Check step outputs | Data flows correctly |
| Inter-step validation | Invalid step output | Validation error |
| Checkpoint saves | Execute multi-step | Checkpoints in DB |
| Resume works | Resume from checkpoint | Continues correctly |
| Failed step halts | Throw in step | Orchestration stops |
| Error captured | Check result | Error details present |

**Test File**: `/orchestration/__tests__/engine.test.ts`

### 3.2 Tool Definitions

For EACH tool:

| Check | Command/Method | Expected Result |
|-------|----------------|-----------------|
| YAML valid | Load and parse | No errors |
| All agents exist | Check registry | All agents found |
| Input mappings valid | Validate mappings | Types match |
| Output mappings valid | Validate mappings | Types match |
| End-to-end works | Execute full tool | Completes successfully |

**Test Files**: `/orchestration/tools/__tests__/*.test.ts`

---

## Phase 4: Modularization Validation

### 4.1 Route Splitting

| Check | Command/Method | Expected Result |
|-------|----------------|-----------------|
| routes.ts < 100 lines | `wc -l server/routes/index.ts` | < 100 lines |
| Feature routes exist | Check files | auth, user, product, etc. |
| All endpoints work | Integration tests | All pass |
| No duplicate routes | Check registrations | No conflicts |

**Test File**: `/tests/integration/routes.test.ts`

### 4.2 Repository Extraction

| Check | Command/Method | Expected Result |
|-------|----------------|-----------------|
| storage.ts removed | Check file | Does not exist |
| Repositories exist | Check files | user, product, etc. |
| All queries work | Unit tests | All pass |
| Type safety | TypeScript check | No errors |

**Test Files**: `/server/repositories/__tests__/*.test.ts`

### 4.3 Dependency Injection

| Check | Command/Method | Expected Result |
|-------|----------------|-----------------|
| Container configured | Check container.ts | All services registered |
| Request scope works | Make parallel requests | No cross-contamination |
| Mocking works | Unit tests | Services mockable |

**Test File**: `/tests/integration/di.test.ts`

### 4.4 OpenAPI Documentation

| Check | Command/Method | Expected Result |
|-------|----------------|-----------------|
| Spec generated | `npm run generate:openapi` | File created |
| Spec valid | OpenAPI validator | No errors |
| All endpoints documented | Compare to routes | 100% coverage |
| Swagger UI works | Visit /api/docs | UI renders |

---

## Test Coverage Requirements

### Minimum Coverage by Component

| Component | Line Coverage | Branch Coverage | Function Coverage |
|-----------|--------------|-----------------|-------------------|
| Agents (core) | 90% | 85% | 90% |
| Agents (implementations) | 85% | 80% | 85% |
| Middleware | 90% | 85% | 90% |
| Services | 85% | 80% | 85% |
| Repositories | 80% | 75% | 80% |
| Routes | 75% | 70% | 75% |
| Orchestration | 85% | 80% | 85% |

### Test Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific suite
npm test -- --grep "AgentRegistry"

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e
```

### Coverage Report

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

---

## Acceptance Criteria

### Phase 1 Complete When:

- [ ] Supabase project running and accessible
- [ ] All 15+ tables created with RLS
- [ ] TypeScript types generated
- [ ] Pino logging configured
- [ ] 0 console.log calls remaining
- [ ] Correlation IDs in all logs
- [ ] API key CRUD working
- [ ] API key auth middleware working
- [ ] Request validation middleware working
- [ ] Response validation middleware working
- [ ] Global error handler configured
- [ ] All Phase 1 tests passing
- [ ] Test coverage > 85%

### Phase 2 Complete When:

- [ ] IAgent interface defined
- [ ] BaseAgent class working
- [ ] AgentRegistry implemented
- [ ] AgentContextFactory working
- [ ] AgentExecutor working
- [ ] All agents wrapped with new interface
- [ ] Old agent implementations deprecated
- [ ] Agent API routes working
- [ ] Audit logging working
- [ ] All Phase 2 tests passing
- [ ] Test coverage > 85%

### Phase 3 Complete When:

- [ ] Orchestration types defined
- [ ] OrchestrationEngine working
- [ ] All tool definitions created (YAML)
- [ ] Inter-step validation working
- [ ] Checkpointing working
- [ ] Resume functionality working
- [ ] Error handling working
- [ ] Tool API routes working
- [ ] All Phase 3 tests passing
- [ ] Test coverage > 85%

### Phase 4 Complete When:

- [ ] routes.ts split into modules
- [ ] storage.ts replaced with repositories
- [ ] DI container configured
- [ ] All services injectable
- [ ] OpenAPI spec generated
- [ ] Swagger UI working
- [ ] All endpoints documented
- [ ] All Phase 4 tests passing
- [ ] Test coverage > 80%

---

## Final Validation

### Pre-Deployment Checklist

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All e2e tests passing
- [ ] Coverage requirements met
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] OpenAPI spec valid
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Environment variables documented
- [ ] Deployment scripts tested
- [ ] Rollback procedure documented

### Performance Benchmarks

| Metric | Target | Method |
|--------|--------|--------|
| API response time (p95) | < 200ms | Load test |
| Agent execution time (avg) | < 5000ms | Benchmark |
| Database query time (p95) | < 50ms | Query logs |
| Memory usage | < 512MB | Runtime metrics |
| Error rate | < 0.1% | Error tracking |

### Security Audit

- [ ] No hardcoded secrets
- [ ] All inputs validated
- [ ] All outputs sanitized
- [ ] RLS policies working
- [ ] API keys properly hashed
- [ ] Rate limiting working
- [ ] CORS configured correctly
- [ ] Helmet headers present
- [ ] No SQL injection possible
- [ ] No XSS possible

---

## Sign-Off Requirements

| Phase | Reviewer | Date | Status |
|-------|----------|------|--------|
| Phase 1 | ________ | ____ | ______ |
| Phase 2 | ________ | ____ | ______ |
| Phase 3 | ________ | ____ | ______ |
| Phase 4 | ________ | ____ | ______ |
| Final | ________ | ____ | ______ |

---

*Document Version: 1.0*
*Created: 2024*
*Last Updated: 2024*
