# Test Coverage Analysis

## Summary
This document identifies functions, units, and endpoints that currently lack automated test coverage.

## Test Coverage Status

### ✅ Currently Tested

#### Utility Functions (server/utils)
- ✅ `url-normalizer.ts` - All functions tested
- ✅ `web-crawler.ts` - Core functions tested
- ✅ `ad-spec-validator.ts` - All validation functions tested
- ✅ `rag-service.ts` - Integration and regression tests
- ✅ `query-transformer.ts` - Unit tests (mock implementation)

#### Endpoints
- ✅ `social-content-types.ts` - Type validation tested
- ✅ `ad-spec-validator.test.ts` - Validation logic tested

---

## ❌ Missing Test Coverage

### 1. Utility Functions (server/utils) - HIGH PRIORITY

#### Security & Sanitization
- ❌ `sanitize.ts`
  - `sanitizeHTML()` - Critical for XSS prevention
  - `sanitizeText()` - Critical for XSS prevention
  - `sanitizeForLogging()` - Critical for data privacy
  - `validateURL()` - Critical for SSRF prevention

#### Formatting & Guidelines
- ❌ `format-guidelines.ts`
  - `getRegulatoryGuidelineFromBrand()`
  - `formatBrandGuidelines()`
  - `formatSelectedTargetAudiences()`
  - `formatRegulatoryGuidelines()`

#### Brand Analysis
- ❌ `brand-analyzer.ts`
  - `analyzeBrandGuidelines()` - Core AI function

- ❌ `pdf-brand-analyzer.ts`
  - `analyzePdfForBrandGuidelines()` - PDF processing

#### Language & Content
- ❌ `language-helpers.ts`
  - `getLanguageInstruction()`
  - `getWebArticleStyleInstructions()`
  - `getAntiFabricationInstructions()`

- ❌ `html-to-markdown.ts`
  - `htmlToMarkdown()`

#### URL & Validation
- ❌ `url-validator.ts`
  - `validateAndNormalizeUrl()`

#### Services (Classes)
- ❌ `embeddings.ts` - `EmbeddingsService` class
- ❌ `chunking.ts` - `DocumentChunker` class
- ❌ `reranking-service.ts` - `RerankingService` class
- ❌ `hybrid-search-service.ts` - `HybridSearchService` class

#### Caching
- ❌ `cache.ts`
  - `getCacheStats()`
  - `clearAllCaches()`

#### API & Retry Logic
- ❌ `api-retry.ts`
  - `createRetryClient()`

#### AI Logging
- ❌ `ai-logger.ts`
  - `logAiUsage()`
  - `loggedOpenAICall()`
  - `loggedAnthropicCall()`

#### LangSmith Configuration
- ❌ `langsmith-config.ts`
  - `initializeLangSmith()`
  - `validateAndInitializeLangSmith()`
  - `isLangSmithEnabled()`
  - `getValidationError()`

#### Social Content Access
- ❌ `social-content-access.ts`
  - `checkSocialContentAccess()`
  - `validatePlatformAccess()`
  - `canGenerateVariations()`
  - `getMaxFormatsPerPlatform()`

#### OpenAI Client
- ❌ `openai-client.ts`
  - `getOpenAIClient()`

#### Logger
- ❌ `logger.ts` - Basic logging functions

#### Web Crawler (Additional Functions)
- ❌ `web-crawler.ts` - Additional functions:
  - `crawlWebsiteWithEarlyExit()`
  - `categorizePages()`
  - `findServicePagesByPattern()`
  - `extractBlogPostsFromPage()`
  - `discoverContextPages()`
  - `discoverContextPagesOld()`

---

### 2. API Endpoints - HIGH PRIORITY

#### Authentication Endpoints (server/routes.ts)
- ❌ `POST /api/auth/login`
- ❌ `POST /api/auth/logout`
- ❌ `POST /api/auth/signup`
- ❌ `GET /api/auth/verify-email`
- ❌ `POST /api/auth/resend-verification`
- ❌ `GET /api/auth/me`
- ❌ `PUT /api/auth/profile`
- ❌ `POST /api/auth/change-password`
- ❌ `DELETE /api/auth/account`
- ❌ `GET /api/auth/account-data`

#### Health & Debug
- ❌ `GET /health`
- ❌ `GET /health/live`
- ❌ `GET /api/debug/session`

#### Products & Subscriptions
- ❌ `GET /api/products`
- ❌ `GET /api/products/with-status`
- ❌ `GET /api/tier-subscriptions`
- ❌ `POST /api/tier-subscriptions`
- ❌ `DELETE /api/tier-subscriptions/:tierId`
- ❌ `GET /api/subscriptions`
- ❌ `POST /api/subscriptions`
- ❌ `DELETE /api/subscriptions/:productId`
- ❌ `GET /api/products/:productId/access`

#### Guideline Profiles
- ❌ `GET /api/guideline-profiles`
- ❌ `GET /api/guideline-profiles/:id`
- ❌ `POST /api/guideline-profiles`
- ❌ `PUT /api/guideline-profiles/:id`
- ❌ `DELETE /api/guideline-profiles/:id`
- ❌ `POST /api/guideline-profiles/auto-populate`
- ❌ `POST /api/guideline-profiles/auto-populate-pdf`
- ❌ `POST /api/guideline-profiles/discover-context-pages`
- ❌ `POST /api/guideline-profiles/find-services-by-pattern`
- ❌ `POST /api/guideline-profiles/extract-blog-posts`
- ❌ `GET /api/guideline-profiles/:id/extracted-context`
- ❌ `POST /api/guideline-profiles/:id/extract-context`

#### Content Generation Tools
- ❌ `POST /api/tools/seo-meta/generate`
- ❌ `POST /api/tools/google-ads/generate`

#### Content Writer
- ❌ `POST /api/content-writer/sessions`
- ❌ `GET /api/content-writer/sessions/:id`
- ❌ `POST /api/content-writer/sessions/:id/regenerate`
- ❌ `PATCH /api/content-writer/sessions/:sessionId/concepts/:conceptId`
- ❌ `POST /api/content-writer/sessions/:id/subtopics`
- ❌ `POST /api/content-writer/sessions/:id/subtopics/more`
- ❌ `PATCH /api/content-writer/sessions/:sessionId/subtopics/:subtopicId`
- ❌ `POST /api/content-writer/sessions/:id/generate`
- ❌ `GET /api/content-writer/drafts`
- ❌ `DELETE /api/content-writer/drafts/:id`

#### LangGraph Content Writer
- ❌ `POST /api/langgraph/content-writer/start`
- ❌ `POST /api/langgraph/content-writer/resume/:threadId`
- ❌ `GET /api/langgraph/content-writer/status/:threadId`
- ❌ `GET /api/langgraph/content-writer/threads`

#### Generated Content
- ❌ `GET /api/generated-content`
- ❌ `GET /api/generated-content/:id`
- ❌ `POST /api/generated-content`
- ❌ `POST /api/content-feedback`
- ❌ `DELETE /api/generated-content/:id`

#### Crawl Jobs
- ❌ `POST /api/crawl/start`
- ❌ `GET /api/crawl/:jobId/status`
- ❌ `POST /api/crawl/:jobId/cancel`

#### Quality Control
- ❌ `GET /api/qc/config`
- ❌ `POST /api/qc/config`
- ❌ `GET /api/qc/reports/:threadId`
- ❌ `POST /api/qc/decisions`
- ❌ `GET /api/qc/decisions`

#### Pages & Reviews
- ❌ `GET /api/crawls/:id/pages`
- ❌ `PATCH /api/pages/:id/review`

#### User & Notifications
- ❌ `GET /api/user/usage-stats`
- ❌ `GET /api/notifications`
- ❌ `PATCH /api/notifications/:id/read`
- ❌ `PATCH /api/notifications/read-all`
- ❌ `DELETE /api/notifications/:id`
- ❌ `GET /api/user/notification-preferences`
- ❌ `PATCH /api/user/notification-preferences`

#### Admin Endpoints
- ❌ `GET /api/admin/stats`
- ❌ `GET /api/admin/packages`
- ❌ `GET /api/admin/packages/:id`
- ❌ `POST /api/admin/packages`
- ❌ `POST /api/admin/packages/with-tiers`
- ❌ `PUT /api/admin/packages/:id`
- ❌ `PUT /api/admin/packages/with-tiers/:id`
- ❌ `DELETE /api/admin/packages/:id`
- ❌ `GET /api/admin/products`
- ❌ `POST /api/admin/products`
- ❌ `GET /api/admin/products/:id`
- ❌ `PUT /api/admin/products/:id`
- ❌ `DELETE /api/admin/products/:id`
- ❌ `GET /api/admin/users`
- ❌ `PUT /api/admin/users/:id`
- ❌ `PUT /api/admin/users/:id/admin`
- ❌ `DELETE /api/admin/users/:id`
- ❌ `GET /api/admin/error-reports`
- ❌ `PUT /api/admin/error-reports/:id/status`
- ❌ `GET /api/admin/error-logs`
- ❌ `PATCH /api/admin/error-logs/:id/status`
- ❌ `DELETE /api/admin/error-logs/:id`
- ❌ `DELETE /api/admin/error-logs`
- ❌ `GET /api/admin/ai-usage-logs`
- ❌ `GET /api/admin/ai-usage-summary`
- ❌ `GET /api/admin/langgraph-metrics`
- ❌ `GET /api/admin/langgraph-threads`
- ❌ `GET /api/admin/langgraph-threads/:threadId`
- ❌ `PATCH /api/admin/langgraph-threads/:threadId/cancel`
- ❌ `DELETE /api/admin/langgraph-threads/:threadId`

#### Other
- ❌ `POST /api/contact`
- ❌ `POST /api/auth/complete-profile`
- ❌ `GET /api/packages`
- ❌ `POST /api/error-reports`

#### Social Content Routes (server/social-content-routes.ts)
- ❌ `GET /api/social-content/ad-specs`
- ❌ `POST /api/social-content/sessions`
- ❌ `GET /api/social-content/sessions`
- ❌ `GET /api/social-content/sessions/:id`
- ❌ `POST /api/social-content/sessions/:id/approve-wireframes`
- ❌ `POST /api/social-content/sessions/:id/generate`
- ❌ `GET /api/social-content/sessions/:id/status`
- ❌ `POST /api/social-content/sessions/:id/regenerate`
- ❌ `DELETE /api/social-content/sessions/:id`

#### CMS Routes (server/cms-routes.ts)
- ❌ `POST /api/cms/migrate-pages`
- ❌ `GET /api/public/pages/:slug*`
- ❌ `GET /api/cms/pages`
- ❌ `GET /api/cms/pages/:id`
- ❌ `POST /api/cms/pages`
- ❌ `PUT /api/cms/pages/:id`
- ❌ `POST /api/cms/pages/:id/publish`
- ❌ `DELETE /api/cms/pages/:id`
- ❌ `GET /api/public/pages`

#### Object Storage Routes (server/object-storage-routes.ts)
- ❌ `GET /images/:imagePath(*)`
- ❌ `POST /api/images/upload`
- ❌ `PUT /api/images/confirm`

---

### 3. Server Core Functions

#### Storage Layer
- ❌ `server/storage.ts` - All storage methods
- ❌ `server/db.ts` - Database connection and utilities

#### Authentication
- ❌ `server/auth.ts`
  - `sessionMiddleware`
  - `requireAuth`
  - `authenticateUser`
  - `requireAdmin`

#### Error Handling
- ❌ `server/errorLogger.ts`
  - `logToolError()`
  - `getErrorTypeFromError()`

#### Rate Limiting
- ❌ `server/rate-limit.ts`
  - `authLimiter`
  - `signupLimiter`
  - `aiLimiter`

#### Email
- ❌ `server/email.ts`
  - `sendVerificationEmail()`

#### Crawl Handler
- ❌ `server/crawl-handler.ts`
  - `startBackgroundCrawl()`
  - `getCrawlJobStatus()`
  - `cancelCrawlJob()`

#### LangGraph
- ❌ `server/langgraph/content-writer-graph.ts`
- ❌ All LangGraph node files in `server/langgraph/nodes/`
- ❌ All LangGraph QC agent files in `server/langgraph/qc/agents/`

---

## Priority Recommendations

### 🔴 CRITICAL (Security & Data Integrity)
1. **Security Functions** - `sanitize.ts` (XSS/SSRF prevention)
2. **Authentication Endpoints** - All auth routes (security critical)
3. **URL Validation** - `url-validator.ts`, `validateURL()` in sanitize.ts

### 🟠 HIGH (Core Functionality)
1. **Format & Guidelines** - `format-guidelines.ts`
2. **Brand Analysis** - `brand-analyzer.ts`, `pdf-brand-analyzer.ts`
3. **RAG Services** - `embeddings.ts`, `chunking.ts`, `reranking-service.ts`, `hybrid-search-service.ts`
4. **Content Generation Endpoints** - SEO meta, Google Ads, Content Writer
5. **Guideline Profile Endpoints** - CRUD operations

### 🟡 MEDIUM (User Features)
1. **Social Content Routes** - All social content endpoints
2. **CMS Routes** - All CMS endpoints
3. **User Management** - User endpoints, notifications
4. **Crawl Jobs** - All crawl-related endpoints

### 🟢 LOW (Admin & Monitoring)
1. **Admin Endpoints** - All admin routes
2. **Logging & Monitoring** - `ai-logger.ts`, `logger.ts`
3. **Cache Management** - `cache.ts`
4. **LangSmith** - `langsmith-config.ts`

---

## Test Framework Recommendations

### For Utility Functions
- Use **Vitest** for unit tests (already configured)
- Use **Node.js test runner** for integration tests (already in use)

### For API Endpoints
- Use **Supertest** for HTTP endpoint testing
- Mock database and external services
- Test authentication/authorization flows
- Test error handling and edge cases

### For Services (Classes)
- Unit tests for individual methods
- Integration tests for service interactions
- Mock external dependencies (AI APIs, databases)

---

## Estimated Coverage

- **Current Coverage**: ~15-20% of codebase
- **Utility Functions**: ~30% tested
- **API Endpoints**: ~2% tested
- **Core Services**: ~0% tested

---

## Next Steps

1. **Start with Critical Security Functions** - `sanitize.ts` tests
2. **Add Authentication Endpoint Tests** - Use Supertest
3. **Expand Utility Function Coverage** - Focus on format-guidelines, brand-analyzer
4. **Add Service Class Tests** - Embeddings, Chunking, Reranking
5. **Create Endpoint Test Suite** - Use Supertest framework

