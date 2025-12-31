# Test Strategy & Existing Tests Documentation

## Overview

This document catalogs existing tests and defines the testing approach for the refactoring effort.

---

## Existing Test Infrastructure

### Test Framework
- **Framework**: Vitest
- **Config**: `tools/vitest.config.ts` (currently tools-only)
- **Test Files**: 35 existing test files

### Existing Test Files

#### Server API Tests
| File | Purpose | Status |
|------|---------|--------|
| `server/__tests__/api/auth.test.ts` | Authentication endpoints | Active |
| `server/__tests__/api/guideline-profiles.test.ts` | Guideline profiles CRUD | Active |

#### Server Utility Tests
| File | Purpose | Status |
|------|---------|--------|
| `server/utils/__tests__/sanitize.test.ts` | Input sanitization | Active |
| `server/utils/__tests__/rag-regression.test.ts` | RAG functionality regression | Active |

#### Tool Component Tests
| File | Purpose | Status |
|------|---------|--------|
| `tools/component-tools/concept-generator/tests/unit/*.test.ts` | Concept generator unit tests | Active |
| `tools/component-tools/concept-generator/tests/regression/*.test.ts` | Concept generator regression | Active |
| `tools/component-tools/outline-builder/tests/*.test.ts` | Outline builder tests | Active |
| `tools/component-tools/subtopic-generator/tests/*.test.ts` | Subtopic generator tests | Active |
| `tools/component-tools/article-generator/tests/*.test.ts` | Article generator tests | Active |
| `tools/component-tools/wireframe-generator/tests/*.test.ts` | Wireframe generator tests | Active |

---

## Test Categories

### 1. Unit Tests
Tests individual functions/classes in isolation.

**Location**: `*/__tests__/*.test.ts` or `*/tests/unit/*.test.ts`

**Coverage Target**: 70% lines

**What to Test**:
- Pure functions (validation, transformation, formatting)
- Class methods with mocked dependencies
- Error handling paths

**Example**:
```typescript
// server/utils/__tests__/sanitize.test.ts
import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeFilename } from '../sanitize';

describe('sanitizeHtml', () => {
  it('removes script tags', () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    expect(sanitizeHtml(input)).toBe('<p>Hello</p>');
  });

  it('preserves allowed tags', () => {
    const input = '<p><strong>Bold</strong></p>';
    expect(sanitizeHtml(input)).toBe('<p><strong>Bold</strong></p>');
  });
});
```

### 2. Integration Tests
Tests components working together (API routes, database queries).

**Location**: `tests/integration/*.test.ts`

**Coverage Target**: 60% of critical paths

**What to Test**:
- API endpoint request/response
- Database operations
- Service interactions

**Example**:
```typescript
// tests/integration/auth.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server';

describe('Auth API', () => {
  it('POST /api/auth/login returns token for valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  it('POST /api/auth/login returns 401 for invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });

    expect(response.status).toBe(401);
  });
});
```

### 3. Regression Tests
Tests that prevent previously fixed bugs from recurring.

**Location**: `*/tests/regression/*.test.ts`

**Naming Convention**: `<feature>-regression.test.ts`

**What to Document**:
- Original bug description
- Steps to reproduce
- Expected behavior
- Link to issue/PR

**Example**:
```typescript
// tools/component-tools/concept-generator/tests/regression/concept-generator-regression.test.ts
import { describe, it, expect } from 'vitest';
import { generateConcepts } from '../../index';

describe('Concept Generator Regression Tests', () => {
  /**
   * Regression test for issue #123
   * Bug: Empty topics caused infinite loop
   * Fixed: Added input validation
   */
  it('handles empty topic gracefully', async () => {
    await expect(generateConcepts({ topic: '' }))
      .rejects.toThrow('Topic is required');
  });

  /**
   * Regression test for issue #145
   * Bug: Unicode characters in topic caused encoding issues
   * Fixed: Normalized Unicode input
   */
  it('handles unicode topics correctly', async () => {
    const result = await generateConcepts({ topic: '日本語トピック' });
    expect(result.concepts).toBeDefined();
  });
});
```

### 4. E2E Tests (Future)
End-to-end tests for critical user flows.

**Framework**: Playwright (recommended)

**Location**: `tests/e2e/*.test.ts`

**Priority Flows**:
1. User login/logout
2. Create content workflow
3. View/edit guidelines

---

## New Tests Required

### Phase 1: Foundation

| Test File | Component | Tests Needed |
|-----------|-----------|--------------|
| `server/middleware/__tests__/correlation-id.test.ts` | Correlation ID middleware | - Generates ID when missing<br>- Uses existing header<br>- Attaches to response |
| `server/middleware/__tests__/validate.test.ts` | Validation middleware | - Passes valid body<br>- Rejects invalid body<br>- Rejects invalid query<br>- Returns field paths |
| `server/middleware/__tests__/api-key.test.ts` | API key auth | - Authenticates valid key<br>- Rejects invalid key<br>- Rejects expired key<br>- Falls through when no key |
| `server/middleware/__tests__/error-handler.test.ts` | Error handler | - Logs errors<br>- Returns sanitized response<br>- Reports to Sentry |

### Phase 2: Agent Wrappers

| Test File | Component | Tests Needed |
|-----------|-----------|--------------|
| `server/agents/__tests__/validation-wrapper.test.ts` | Agent wrapper | - Validates input<br>- Validates output<br>- Logs execution time<br>- Handles errors |
| `server/agents/concept-generator/__tests__/schema.test.ts` | Concept schemas | - Input schema accepts valid<br>- Input schema rejects invalid<br>- Output schema validates |

---

## Test Execution

### Local Development
```bash
# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Run specific test file
npm test -- server/middleware/__tests__/validate.test.ts

# Run with coverage
npm run test:coverage

# Run only unit tests
npm test -- --grep "unit"

# Run only regression tests
npm test -- --grep "regression"
```

### CI Pipeline
Tests run automatically on:
- Every push to `main`, `staging`, `develop`
- Every pull request to `main`, `staging`

Pipeline stages:
1. `lint-and-typecheck` - ESLint + TypeScript
2. `test` - Unit tests with coverage
3. `build` - Application build (after tests pass)

### Coverage Reporting
Coverage reports uploaded as artifacts:
- `coverage/` directory
- `test-results.xml` for JUnit parsing

---

## Testing Standards

### Test File Naming
- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts`
- Regression tests: `*-regression.test.ts`
- E2E tests: `*.e2e.test.ts`

### Test Structure
Use AAA pattern (Arrange, Act, Assert):

```typescript
it('should validate email format', () => {
  // Arrange
  const schema = userSchema;
  const invalidEmail = { email: 'not-an-email' };

  // Act
  const result = schema.safeParse(invalidEmail);

  // Assert
  expect(result.success).toBe(false);
  expect(result.error.issues[0].path).toContain('email');
});
```

### Mocking Guidelines
1. Mock external services (APIs, databases) in unit tests
2. Use real dependencies in integration tests
3. Avoid mocking the thing under test

```typescript
// Good: mock external dependency
vi.mock('../services/openai', () => ({
  generateCompletion: vi.fn().mockResolvedValue('mocked response'),
}));

// Bad: mock the function being tested
// vi.mock('../utils/validate') // Don't do this in validate.test.ts
```

### Test Documentation
Document complex test scenarios:

```typescript
/**
 * Tests the rate limiting behavior of API key authentication.
 *
 * Scenario: User exceeds rate limit of 100 requests/minute
 * Expected: 429 Too Many Requests after limit exceeded
 *
 * Related: API key middleware, rate limiting config
 */
it('returns 429 when rate limit exceeded', async () => {
  // ... test implementation
});
```

---

## Coverage Requirements

| Component | Line Coverage | Branch Coverage |
|-----------|---------------|-----------------|
| Middleware | 80% | 70% |
| Services | 70% | 60% |
| Utilities | 85% | 75% |
| Agents | 75% | 65% |
| Repositories | 70% | 60% |

### Checking Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

---

## Regression Test Workflow

When a bug is found and fixed:

1. **Document the bug** in the test file
2. **Write a test** that reproduces the bug
3. **Verify test fails** before the fix
4. **Apply the fix**
5. **Verify test passes** after the fix
6. **Commit test with fix** (same PR)

Example commit message:
```
fix: handle empty topic in concept generator

- Added input validation for empty topics
- Added regression test for issue #123
```

---

## Vitest Configuration (Full Project)

Update `vitest.config.ts` at project root:

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
      'tests/**/*.test.ts',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'server/**/*.ts',
        'tools/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/__tests__/**',
        '**/node_modules/**',
        '**/*.d.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@server': path.resolve(__dirname, './server'),
      '@shared': path.resolve(__dirname, './shared'),
      '@tools': path.resolve(__dirname, './tools'),
    },
  },
});
```

---

*Document Version: 1.0*
*Created: December 2025*
