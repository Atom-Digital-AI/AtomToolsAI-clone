# Comprehensive Test Suite Design

## Overview

This document outlines the comprehensive test suite design for the codebase, covering unit tests, integration tests, regression tests, and end-to-end tests.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual functions
│   ├── server/
│   │   ├── utils/          # Server utility tests
│   │   ├── auth/           # Authentication tests
│   │   └── storage/        # Storage layer tests
│   ├── client/
│   │   ├── components/     # React component tests
│   │   ├── hooks/          # Custom hook tests
│   │   └── utils/          # Client utility tests
│   └── tools/              # Tool-specific unit tests
│
├── integration/            # Integration tests
│   ├── api/                # API endpoint tests
│   ├── database/           # Database operation tests
│   ├── auth-flow/          # Authentication flow tests
│   └── content-generation/ # Content generation workflow tests
│
├── regression/             # Regression tests
│   ├── known-bugs/         # Tests for previously fixed bugs
│   └── critical-flows/     # Critical user flow tests
│
├── e2e/                    # End-to-end tests
│   ├── user-journeys/      # Complete user journeys
│   └── admin-flows/        # Admin workflows
│
└── fixtures/               # Test data and mocks
    ├── users.json
    ├── products.json
    └── mock-responses/
```

## Test Categories

### 1. Unit Tests

#### 1.1 Server Utilities

**Priority**: High
**Coverage Target**: 90%

**Files to Test**:
- `server/utils/cache.ts`
  - `getCacheStats()`
  - `clearAllCaches()`
  - Cache hit/miss scenarios
  
- `server/utils/api-retry.ts`
  - `createRetryClient()`
  - Retry logic with exponential backoff
  - Error handling
  
- `server/utils/ai-logger.ts`
  - `logAiUsage()`
  - `loggedOpenAICall()`
  - `loggedAnthropicCall()`
  
- `server/utils/langsmith-config.ts`
  - `initializeLangSmith()`
  - `validateAndInitializeLangSmith()`
  - `isLangSmithEnabled()`
  
- `server/utils/social-content-access.ts`
  - `checkSocialContentAccess()`
  - `validatePlatformAccess()`
  - `canGenerateVariations()`
  
- `server/utils/openai-client.ts`
  - `getOpenAIClient()`
  - Client initialization
  - Error handling

- `server/utils/rag-service.ts`
  - `search()`
  - `addEmbeddings()`
  - `deleteEmbeddings()`
  
- `server/utils/web-crawler.ts`
  - `crawlWebsite()`
  - `crawlWebsiteWithEarlyExit()`
  - `categorizePages()`
  - `discoverContextPages()`

#### 1.2 Client Components

**Priority**: Medium
**Coverage Target**: 80%

**Components to Test**:
- Form components (BrandGuidelineForm, etc.)
- UI components (Button, Input, etc.)
- Layout components (Header, Footer, etc.)
- Admin components (UserManager, ProductManager, etc.)

#### 1.3 Tools

**Priority**: High
**Coverage Target**: 85%

**Tools to Test**:
- SEO Meta Generator
- Google Ads Copy Generator
- Content Writer v2
- Social Content Generator
- Component tools (concept-generator, subtopic-generator, etc.)

### 2. Integration Tests

#### 2.1 API Endpoints

**Priority**: Critical
**Coverage Target**: 100%

**Authentication Endpoints**:
- `POST /api/auth/login`
  - Valid credentials
  - Invalid credentials
  - Rate limiting
  - Session creation
  
- `POST /api/auth/signup`
  - Valid signup
  - Duplicate email
  - Invalid data
  - Email verification
  
- `GET /api/auth/me`
  - Authenticated request
  - Unauthenticated request
  - Session expiry
  
- `POST /api/auth/logout`
  - Successful logout
  - Session cleanup

**Products & Subscriptions**:
- `GET /api/products`
  - List all products
  - Filter by active status
  
- `GET /api/products/:productId/access`
  - User with access
  - User without access
  - Expired subscription
  
- `POST /api/subscriptions`
  - Create subscription
  - Duplicate subscription
  - Invalid product

**Guideline Profiles**:
- `GET /api/guideline-profiles`
  - List user's profiles
  - Filter by type
  
- `POST /api/guideline-profiles`
  - Create profile
  - Validation errors
  
- `PUT /api/guideline-profiles/:id`
  - Update profile
  - Unauthorized access
  
- `POST /api/guideline-profiles/auto-populate`
  - Successful auto-populate
  - Invalid URL
  - Crawl errors

**Content Generation**:
- `POST /api/tools/seo-meta/generate`
  - Successful generation
  - Missing parameters
  - Rate limiting
  - Brand guideline application
  
- `POST /api/tools/google-ads/generate`
  - Successful generation
  - Invalid input
  - API errors
  
- `POST /api/content-writer/sessions`
  - Create session
  - Resume session
  - Session state management

**CMS**:
- `GET /api/public/pages/:slug`
  - Published page
  - Draft page (404)
  - Invalid slug
  
- `GET /api/cms/pages` (admin)
  - List all pages
  - Filter by type
  - Unauthorized access

#### 2.2 Database Operations

**Priority**: High
**Coverage Target**: 90%

**Operations to Test**:
- User creation and authentication
- Subscription management
- Guideline profile CRUD
- Content generation and storage
- RAG embedding operations
- Page crawling and storage

#### 2.3 Authentication Flow

**Priority**: Critical
**Coverage Target**: 100%

**Scenarios**:
1. Complete signup flow
   - Signup → Email verification → Login
   
2. Login flow
   - Valid credentials → Session creation
   - Invalid credentials → Error handling
   
3. Session management
   - Session expiry
   - Session refresh
   - Logout

### 3. Regression Tests

#### 3.1 Known Bugs

**Priority**: High

**Bugs to Prevent Regression**:
- Authentication issues
- Subscription access checks
- Content generation errors
- RAG search failures
- Crawl job failures

#### 3.2 Critical Flows

**Priority**: Critical

**Flows to Test**:
1. User signup and onboarding
2. Content generation with brand guidelines
3. Subscription purchase and activation
4. Guideline profile creation and auto-populate
5. Content Writer workflow (concepts → subtopics → article)

### 4. End-to-End Tests

#### 4.1 User Journeys

**Priority**: High

**Journeys to Test**:
1. **New User Journey**
   - Signup → Email verification → Complete profile → Browse tools → Generate content
   
2. **Content Generation Journey**
   - Select tool → Configure options → Apply brand guidelines → Generate → Review → Save
   
3. **Subscription Journey**
   - Browse pricing → Select tier → Purchase → Access premium features
   
4. **Brand Guideline Journey**
   - Create profile → Auto-populate → Review → Use in content generation

#### 4.2 Admin Flows

**Priority**: Medium

**Flows to Test**:
1. User management
2. Product management
3. Error log review
4. Analytics viewing
5. CMS page management

## Test Implementation Plan

### Phase 1: Foundation (Week 1-2)
- Set up test infrastructure
- Create test utilities and fixtures
- Implement authentication tests
- Implement critical API endpoint tests

### Phase 2: Core Functionality (Week 3-4)
- Content generation tests
- Subscription management tests
- Guideline profile tests
- Database operation tests

### Phase 3: Tools and Utilities (Week 5-6)
- Tool-specific tests
- Utility function tests
- Component tests
- Integration tests

### Phase 4: E2E and Regression (Week 7-8)
- End-to-end user journeys
- Regression tests
- Performance tests
- Load tests

## Test Coverage Goals

- **Overall Coverage**: 80%+
- **Critical Paths**: 95%+
- **API Endpoints**: 100%
- **Authentication**: 100%
- **Content Generation**: 90%+
- **Utilities**: 85%+

## Test Tools and Frameworks

- **Unit Tests**: Vitest (for tools), tsx --test (for server)
- **Integration Tests**: Supertest (for API), Test containers (for database)
- **E2E Tests**: Playwright or Cypress
- **Mocking**: MSW (Mock Service Worker) for API mocking
- **Fixtures**: Custom JSON fixtures and factories

## Continuous Integration

- Run unit tests on every commit
- Run integration tests on pull requests
- Run E2E tests on merge to main
- Generate coverage reports
- Fail builds if coverage drops below threshold

## Test Data Management

- Use test database (separate from development)
- Seed test data before each test run
- Clean up test data after tests
- Use factories for generating test data
- Mock external services (OpenAI, Anthropic, etc.)

## Performance Testing

- API response time tests
- Database query performance
- RAG search performance
- Crawl job performance
- Load testing for concurrent users

## Security Testing

- Authentication bypass attempts
- Authorization checks
- SQL injection prevention
- XSS prevention
- CSRF protection

