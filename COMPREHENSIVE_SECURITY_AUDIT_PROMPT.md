# Comprehensive Repository Security and Performance Audit Prompt
## AI Marketing Tools Platform - GDPR & SOC 2 Compliant Review

You are a senior staff engineer and security reviewer performing a comprehensive repository review for this project.

---

## Repository Context

### Main Application Stack
- **Backend**: Node.js with Express, TypeScript (ESM modules)
- **Frontend**: React 18 with Vite, TypeScript, Wouter routing, TanStack Query, shadcn/ui components
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM
  - pgvector extension for embeddings (RAG implementation)
  - Full-text search capabilities
  - Session storage in `sessions` table
- **Session Management**: express-session with PostgreSQL store (connect-pg-simple)
- **Authentication**: Session-based with bcrypt password hashing, email verification, profile completion checks
- **AI/ML Services**: 
  - OpenAI (GPT-4, embeddings)
  - Anthropic (Claude Opus, Sonnet, Haiku)
  - LangChain and LangGraph for content generation workflows
  - LangSmith for AI observability
  - Cohere for reranking
- **External Integrations**: 
  - Stripe (payments and subscriptions)
  - SendGrid and Nodemailer (transactional emails)
  - Google Cloud Storage (object storage)
  - Neon PostgreSQL (managed database)

### Secondary Application
- **Python Flask application** in `Ad Copy Generator App/` directory
- Google Ads API integration with OAuth 2.0
- Docker containerized deployment (separate build/deployment pipeline)

### Architecture Overview
- **Monolithic Express.js application** serving both API and frontend
  - REST API on `/api/*` routes
  - Built React SPA for all other routes
  - Single port deployment (default 5000, configurable via `PORT` env var)
  - WebSocket server for real-time updates
- **Multi-tenant SaaS** with role-based access control
- **Trust boundaries**:
  1. Unauthenticated public ? Public routes (login, signup, pricing, CMS)
  2. Authenticated users ? Protected tools (requires email verification + profile completion)
  3. Admin users ? User management, analytics, error logs, content management
  4. External services ? Stripe webhooks, GCS, AI APIs
  5. Database ? Direct access via Drizzle ORM

### Key Features
- AI-powered tools: SEO meta generator, Google Ads copy generator, content writer, social content generator
- Brand guideline management with URL crawling and analysis
- Subscription-based access control (Stripe integration)
- File uploads to Google Cloud Storage
- Admin dashboard for user management, analytics, and error logging
- Email verification workflow
- RAG (Retrieval-Augmented Generation) with vector similarity search

### Intended Runtime Environments
- **Primary**: Docker containers deployed on Railway (Express server serving both API and static React build)
- **Development**: Local development with Vite HMR
- **Future consideration**: AWS Lambda deployment (serverless Neon connections would require adaptation)

### Target Threat Model
- Handling customer PII (user emails, names, company data, profile data, verification tokens)
- Financial data via Stripe integration (payment processing, subscription management, payment metadata)
- Internal administrative dashboards restricted to verified users only
- AI-generated content that may reference brand guidelines and user-specific context
- Proprietary business data and brand guidelines
- Session-based authentication with 24-hour expiry

### Compliance Requirements
- **GDPR**: Data protection, right to access, right to erasure, data portability, consent management, data breach notification
- **SOC 2 Type II**: Security controls, availability, processing integrity, confidentiality, privacy

### Project Structure
- `/server` - Express API routes, auth middleware, RAG services, LangGraph workflows
- `/client` - React frontend application
- `/shared` - Shared TypeScript schemas (Zod validation, Drizzle schema)
- `/Ad Copy Generator App` - Separate Python application (different deployment pipeline)

### Build Process
- Frontend: Vite builds to `dist/public/`
- Backend: esbuild bundles server code to `dist/index.js`
- Production: Single Express server serves both static files and API routes
- Port configuration: Uses `PORT` env var (defaults to 5000), binds to `0.0.0.0`

### Known Technical Details
- Uses Neon serverless database with WebSocket connections
- Session cookies: `secure: false` (flag for HTTPS requirement in production), `httpOnly: true`, `sameSite: "lax"`
- CORS: `origin: true, credentials: true` (allows all origins with credentials)
- Express JSON limit: 20MB (large payload handling for file uploads)
- Database schema uses Drizzle ORM with migrations in `/server/db/migrations`
- Error logging to database via `errorLogger.ts`
- 47 environment variable references across 27 files

### Critical Infrastructure Gaps
- **Missing**: Dockerfile for main Node.js application (required for Railway deployment)
- **Missing**: CI/CD pipeline for main Node.js application (currently only Python app has CI/CD)
- **Missing**: Health check endpoint for Railway monitoring
- **Limited**: Test coverage (only a few test files found)

---

## Scope

Review the entire repository including:
- **Source code**: `/server`, `/client`, `/shared`, `/Ad Copy Generator App`
- **Configuration scripts**: `vite.config.ts`, `drizzle.config.ts`, `tsconfig.json`, `tailwind.config.ts`
- **Build files and deployment configs**: No Dockerfile in root yet for main app; Python app has Dockerfile
- **Package manifests**: `package.json` with dependency versions, `requirements.txt` for Python app
- **Infrastructure considerations**: Railway deployment, AWS Lambda compatibility
- **CI/CD files**: `.github/workflows/` (currently only covers Python app)
- **Environment variables**: All `process.env` usage and secrets management
- **Session and authentication**: Implementation and security configuration
- **Database queries**: ORM usage patterns, migrations, sensitive data handling
- **External API integrations**: OpenAI, Anthropic, Stripe, SendGrid, GCS, Cohere
- **AI/ML workflow security**: LangGraph state, prompt injection risks, RAG access controls
- **Container security**: Python app Docker configuration
- **Documentation and tests**: README files, test coverage, implementation guides

Examine both application security surfaces and operational security (deployment, monitoring, secrets rotation).

---

## Rules

Be exhaustive but practical. Prefer concrete findings over generic advice.

For each issue, include:
- **File path and line range** (e.g., `server/auth.ts:22-32`)
- **A short code snippet** (if safe to include, redact secrets)
- **Why it's a problem** (cite OWASP ASVS 4.0, CWE, GDPR Articles, or SOC 2 Trust Services Criteria)
- **A risk rating** (P0?P3):
  - **P0 (Critical)**: Exploitable vulnerability, data breach potential, compliance violation, must fix before production
  - **P1 (High)**: Significant security gap, major performance issue, data integrity risk, fix in next release
  - **P2 (Medium)**: Defense-in-depth improvement, moderate performance gain, minor compliance gap, address in planned sprint
  - **P3 (Low)**: Best practice improvement, technical debt, nice-to-have, future-proofing
- **Suggested fix** with code or configuration example (minimal safe change)
- **Verification steps** (how to test the fix)
- **Deployment-specific considerations** (Railway vs Lambda differences if applicable)

Use plain UK English, avoid unnecessary jargon, and write findings that can directly inform pull requests.

---

## Process

### 1. Map the Project Architecture

Read top-level files:
- `package.json` (dependencies, scripts, build process)
- `server/index.ts` (entry point, middleware setup)
- `server/routes.ts` (API route registration)
- `server/auth.ts` (authentication and authorization logic)
- `shared/schema.ts` (database schema, validation schemas)
- Deployment configuration (Railway-specific files if present)
- Environment variable documentation

Produce a short architecture overview showing:
- System components and their responsibilities
- Data flow between client, server, database, and external services
- External dependencies (AI APIs, payment processor, email service, object storage)
- Trust boundaries (client ? server ? database, server ? external APIs)
- Data flow for sensitive operations (authentication, payments, AI generation)
- Session management flow
- Environment variable dependencies

### 2. Build Dependency and Surface Inventory

List:
- **Direct dependencies** from `package.json` (check for unpinned versions using `^` or `~`)
- **Transitive dependencies** (use `npm ls` or dependency analysis)
- **Python dependencies** from `Ad Copy Generator App/requirements.txt`
- **Risky dependencies**: Packages with known CVEs, outdated major versions, or excessive permissions
- **External services**: OpenAI, Anthropic, Stripe, SendGrid, Google Cloud Storage, Cohere, Neon
- **Ports and endpoints**: Default port 5000, API routes under `/api`, static files, WebSocket
- **Environment variables**: Required vs optional, default values, sensitive flags
- **Database tables and sensitive fields**: From `shared/schema.ts`
- **File upload mechanisms**: GCS integration, validation, storage
- **Session configuration**: Cookie settings, store configuration
- **Binary dependencies**: Buffer utilities for WebSocket handling

Flag:
- Unpinned dependency versions (`^x.x.x` patterns)
- Packages with known security advisories (run `npm audit`)
- Deprecated or unmaintained packages
- Services without rate limiting or quota monitoring
- Environment variables without validation or fallbacks

### 3. Security Review

Identify issues across these categories:

#### Authentication and Authorization
- Session secret handling (`SESSION_SECRET` fallback to "development-secret-key")
- Session cookie configuration (`secure: false`, `sameSite: "lax"`)
- Password hashing (bcrypt rounds, salt handling)
- Email verification token generation and validation
- Admin authorization checks (`requireAdmin` middleware)
- Profile completion enforcement
- Session fixation or hijacking vulnerabilities
- Missing CSRF protection
- OAuth implementation (Python app Google Ads OAuth flow)
- Missing authorization checks on API routes
- Horizontal privilege escalation (user accessing another user's data)
- Vertical privilege escalation (user gaining admin access)
- Insecure direct object references (IDOR)
- Role-based access control gaps

#### Input Validation and Output Encoding
- Zod schema validation coverage (check all API endpoints)
- SQL injection risks (Drizzle ORM usage patterns, raw SQL queries)
- XSS vulnerabilities (React rendering, user-generated content, markdown rendering)
- Path traversal in file operations (GCS uploads, file access)
- Command injection in shell operations
- Prompt injection in AI workflows (user input ? LLM prompts without sanitization)
- JSON parsing limits and DoS risks
- Prototype pollution vulnerabilities
- NoSQL injection (if applicable)

#### Secrets and Credentials
- Hard-coded API keys or secrets in code
- Secrets in version control history
- Environment variable exposure in client-side code
- Default or weak secrets (session secret fallback)
- Missing secrets rotation mechanisms
- API keys in error messages or logs
- Secrets in Docker images or build cache
- `.env` files committed to version control

#### Cryptography
- Password storage (bcrypt configuration, salt rounds)
- Token generation (email verification, password reset)
- TLS/HTTPS enforcement (production vs development)
- Cryptographic randomness (nanoid usage, token generation)
- Encryption at rest (database, file storage)
- Encryption in transit (API calls, WebSocket)

#### Database Security
- SQL injection vectors (raw queries, string concatenation)
- Connection string exposure
- Database user permissions (least privilege)
- Query performance and DoS risks (unbounded queries, missing pagination)
- Sensitive data in logs or error messages
- Migration security (schema changes, backwards compatibility)
- pgvector security (embedding access controls)
- N+1 query problems

#### API Security
- CORS configuration (`origin: true` allows all origins)
- Rate limiting (missing or insufficient)
- Request size limits (20MB JSON limit)
- Authentication bypass risks
- Authorization checks on all protected routes
- API versioning and breaking changes
- Stripe webhook signature verification
- External API error handling
- API key exposure (OpenAI, Anthropic, Stripe, SendGrid, GCS)

#### AI/ML Workflow Security
- Prompt injection in LangGraph nodes (user input ? LLM prompts without sanitization)
- AI-generated content validation and sanitization (XSS, malicious content)
- RAG service access control (user-specific data, cross-user data leakage)
- LangGraph state persistence security (session isolation, state encryption)
- Cost controls (unbounded AI API calls, rate limiting, budget alerts)
- Data leakage in AI prompts (PII exposure to third-party AI services)
- AI model output validation (structured output validation, fallback handling)
- Prompt template security (injection via template variables)
- LangSmith logging sensitivity (PII in traces)
- Vector embedding access controls (pgvector)
- Chunking strategy security (context leakage across tenants)

#### Data Protection and Privacy
- Sensitive data in logs (PII, tokens, passwords, API keys)
- Database encryption at rest (check Neon configuration)
- Transport layer security (HTTPS enforcement, secure WebSocket)
- Sensitive data in query strings or URLs
- Data retention and deletion (GDPR Article 17 - Right to erasure)
- Data minimization (GDPR Article 5)
- File upload validation (type, size, content scanning)
- Google Cloud Storage access controls

#### GDPR Compliance
- **Lawful basis for processing** (Article 6): User consent, legitimate interest
- **Data subject rights** (Articles 15-22):
  - Right to access: User data export functionality
  - Right to rectification: Profile update capabilities
  - Right to erasure: User account deletion, data anonymization
  - Right to data portability: Structured data export (JSON/CSV)
  - Right to restrict processing
  - Right to object
- **Data protection by design and default** (Article 25)
- **Data breach notification** (Article 33): 72-hour requirement, procedures and logging
- **Data processing records** (Article 30): Audit trails, activity logs
- **Privacy policy**: User-facing documentation, clarity
- **Cookie consent**: GDPR-compliant cookie banner
- **Consent management**: User consent tracking, withdrawal mechanism
- **Data minimization**: Collecting only necessary data
- **Purpose limitation**: Using data only for stated purposes

#### SOC 2 Compliance
- **Security (CC6)**: 
  - Access controls (authentication, authorization, MFA)
  - Encryption (at rest, in transit)
  - Vulnerability management (dependency scanning, patching)
  - Network security (firewalls, secure configurations)
- **Availability (A1)**: 
  - Uptime monitoring (health checks, alerting)
  - Redundancy (database backups, failover)
  - Disaster recovery (backup restoration, recovery time objectives)
  - Capacity planning (scaling strategies)
- **Processing Integrity (PI1)**: 
  - Data validation (input validation, output verification)
  - Error handling (graceful degradation, user feedback)
  - Audit logs (user actions, system events)
  - Change management (version control, deployment procedures)
- **Confidentiality (C1)**: 
  - Data encryption (sensitive data at rest and in transit)
  - Access controls (least privilege, role-based access)
  - Secure transmission (HTTPS, TLS configuration)
  - Data classification (sensitivity levels)
- **Privacy (P1)**: 
  - Privacy notice (clear, accessible)
  - Consent management (opt-in, opt-out mechanisms)
  - Data retention (retention policies, automated deletion)
  - Third-party data sharing (vendor agreements, data processing addendums)

#### Container and Infrastructure Security
- Docker base image vulnerabilities (Python app)
- Running containers as root
- Exposed ports or services
- Secrets in Docker images or build cache
- Container escape vulnerabilities
- Resource limits (memory, CPU)

### 4. Performance and Efficiency Review

Highlight:
- **N+1 queries**: Check Drizzle ORM usage, especially in loops or relation loading
- **Blocking I/O**: Synchronous operations in async handlers
- **Unnecessary allocations**: Large object creation, inefficient data structures
- **Unoptimised database queries**: Missing indexes, inefficient joins, full table scans
- **Missing caching**: Repeated AI API calls, database queries for static data, RAG embeddings
- **Unbounded operations**: Pagination missing, result set limits, memory leaks
- **Large bundle sizes**: Frontend bundle optimization, code splitting
- **Expensive computations**: Vector similarity search optimization, embedding generation
- **Webhook processing**: Stripe webhook handling efficiency
- **Cold start performance**: Initialization optimization for Railway/Lambda
- **Memory leaks**: Event listener cleanup, connection pooling

### 5. Correctness and Reliability Review

Check for:
- **Unhandled promise rejections**: Async/await error handling
- **Race conditions**: Concurrent access to shared state
- **Edge cases**: Null/undefined handling, boundary conditions
- **Error handling**: Try-catch blocks, error propagation, user feedback
- **Data consistency**: Transaction handling, rollback mechanisms
- **Retry logic**: External API call resilience
- **Graceful degradation**: Fallback behavior for service failures
- **Validation gaps**: Missing input validation, type mismatches
- **Logic bugs**: Incorrect conditionals, off-by-one errors

### 6. Dependency and Supply-Chain Review

Run or check for:
- `npm audit` (known CVEs in npm packages)
- Unpinned versions (`^`, `~` in package.json)
- Outdated packages (major version updates available)
- Deprecated packages (EOL or unmaintained)
- Transitive dependency vulnerabilities
- Python package vulnerabilities (Safety, Bandit)
- Supply chain risks (typosquatting, malicious packages)
- License compliance issues

### 7. Operational Review

Check for:
- **Logging**: 
  - Structured logging (JSON format)
  - Log aggregation (Railway logs or external service)
  - Sensitive data redaction (PII, API keys, passwords)
  - Audit logging for GDPR/SOC 2 compliance
  - Log retention policies
  - Error log analysis (database error logger)
- **Monitoring**: 
  - Application performance monitoring (APM)
  - Security event detection (failed logins, unusual API usage)
  - Error rate alerting
  - Dependency vulnerability alerts
  - Uptime monitoring (Railway health checks, external services)
  - Resource utilization (CPU, memory, database connections)
- **Deployment**: 
  - Railway configuration recommendations (environment variables, build process)
  - Health check endpoints for Railway monitoring
  - Graceful shutdown handling
  - Blue-green deployment strategy
  - Rollback procedures
  - Database migration strategy
  - WebSocket connection handling
- **Incident response**: 
  - Security incident response plan
  - Data breach notification procedures (GDPR 72-hour requirement)
  - Runbooks for common issues
  - Escalation procedures
  - Post-incident review process
- **Backup and recovery**: 
  - Database backup strategy (Neon automated backups)
  - Backup restoration testing
  - Disaster recovery plan
  - Recovery time objectives (RTO)
  - Recovery point objectives (RPO)
- **Secret rotation**:
  - SESSION_SECRET rotation procedure
  - Database connection string rotation
  - OpenAI/Anthropic API key rotation
  - Stripe API key rotation
  - Google Cloud service account key rotation
  - SendGrid API key rotation
  - Automated rotation schedules
- **GDPR compliance operations**: 
  - Data export automation
  - Data deletion automation
  - Consent management system
  - Data processing activity logs
  - Privacy impact assessments
- **SOC 2 compliance operations**: 
  - Access control documentation
  - Change management process
  - Vendor risk assessment documentation
  - Security monitoring and alerting
  - Annual compliance audits

### 8. Testing Review

Assess test coverage for:
- **Unit tests**: Business logic, utilities, validators
- **Integration tests**: API routes, database operations, external service mocks
- **Security tests**: Authentication, authorization, injection prevention, CSRF, XSS
- **E2E tests**: User flows, payment processing, AI content generation
- **Performance tests**: Load testing, stress testing, scalability
- **Contract tests**: External API integration validation
- **Regression tests**: Bug fix verification, feature stability

Identify testing gaps and recommend essential tests.

### 9. Documentation Review

List missing or outdated documentation for:
- **Setup**: Environment variable requirements, database setup, dependency installation
- **Usage**: API documentation, tool usage guides, admin dashboard operations
- **Deployment**: Railway deployment instructions, environment configuration, scaling considerations
- **Troubleshooting**: Common errors, debugging steps, log analysis
- **Security**: Incident response procedures, secret rotation, backup restoration
- **Compliance**: GDPR procedures, SOC 2 controls, audit trail documentation
- **Development**: Contributing guidelines, code standards, testing requirements
- **Architecture**: System design, data flow diagrams, integration points

Recommend concise updates and templates.

---

## Output Format

Return results in this structure:

### Executive Summary
- **Overall risk level** (Critical/High/Medium/Low)
- **Top three risks** with one-sentence summaries
- **Expected effort to resolve** (person-days/hours, grouped by priority)
- **Compliance readiness** (GDPR, SOC 2)
- **Critical infrastructure gaps** (Dockerfile, CI/CD, health checks)

### Architecture Sketch
Brief description of:
- System components and interactions
- Data flow (client ? server ? database ? external services)
- Trust boundaries and authentication gates
- Deployment architecture (Railway environment)
- External dependencies

### Top 5 Risks
Line-separated list of the **five most urgent issues**, each with:
- One-sentence summary
- Risk rating (P0-P3)
- File location
- Quick fix summary

### Full Findings

Group findings by category:

1. **Critical Security Issues (P0)**
2. **High-Priority Security (P1)**
3. **Authentication and Authorization**
4. **Data Protection and Privacy (GDPR, SOC 2)**
5. **Input Validation and Injection Prevention**
6. **AI/ML Workflow Security**
7. **Dependency and Supply Chain Security**
8. **Configuration and Secrets Management**
9. **API Security and External Integrations**
10. **Performance and Scalability**
11. **Reliability and Error Handling**
12. **Logging and Observability**
13. **Container and Infrastructure Security**
14. **Testing Gaps**
15. **Documentation Issues**

For each finding include:
- **Title** (clear, actionable)
- **Category** (from list above)
- **Risk level** (P0 / P1 / P2 / P3)
- **File(s) and line(s)** (exact locations)
- **Evidence** (code snippet or configuration excerpt, redact secrets)
- **Why it's a problem** (security impact, compliance violation, performance cost)
- **Impact** (what could go wrong, blast radius, compliance impact)
- **Fix** (code/config example with minimal safe change)
- **Verification steps** (how to test the fix)
- **Follow-up recommendation** (if applicable)
- **Deployment considerations** (Railway/Lambda differences)

### Dependency and Supply-Chain Report

- **Outdated packages** with current and recommended versions
- **Packages with known CVEs** (from `npm audit`) with CVE references and severity
- **Unpinned dependencies** (using `^` or `~` ranges)
- **Deprecated or unmaintained packages**
- **Python dependencies** (`Ad Copy Generator App/requirements.txt`)
- **Upgrade commands** and compatibility notes
- **License compliance** issues

### Performance Opportunities

Concrete improvements with:
- **Location and context** (file, function, operation)
- **Current performance characteristic** (latency, throughput, cost)
- **Proposed optimization** (caching, indexing, algorithm improvement)
- **Expected impact** (latency reduction, throughput increase, cost saving)
- **Implementation complexity** (hours, dependencies)
- **Trade-offs** (memory vs speed, complexity vs maintainability)

### Test Plan

List of essential tests to add, grouped by:
- **Unit tests** (business logic, utilities, validators)
- **Integration tests** (API routes, database operations, external service mocks)
- **Security tests** (authentication, authorization, injection prevention, CSRF, XSS)
- **E2E tests** (user flows, payment processing, AI generation)
- **Performance tests** (load testing, stress testing)

Include example test snippets for each category with framework (Node.js test runner, Vitest, etc.).

### Operations and Deployment Actions

#### Infrastructure Setup
- **Dockerfile creation** for main Node.js application
- **Health check endpoint** implementation (`/api/health`, `/health`)
- **Graceful shutdown** handling (SIGTERM, SIGINT)
- **Environment variable validation** on startup
- **WebSocket connection** handling under Railway proxy
- **Database connection pooling** for Neon serverless

#### Railway Deployment
- **Environment variable checklist** (required vs optional, defaults)
- **Build process configuration** (frontend + backend build)
- **Port configuration** (PORT env var, 0.0.0.0 binding)
- **Resource limits** and monitoring
- **Scaling considerations** (horizontal vs vertical)
- **Railway logs** configuration and aggregation

#### CI/CD Pipeline (Recommendations)
- **GitHub Actions workflow** for automated testing
  - Dependency vulnerability scanning (npm audit, Dependabot)
  - SAST integration (Semgrep, CodeQL, ESLint)
  - Secret scanning (GitHub secret scanning, TruffleHog)
  - Test execution (unit, integration, security)
  - Build verification
  - Build artifact signing
  - Deployment automation

#### Secret Rotation Procedures
- SESSION_SECRET rotation (with session migration)
- Database connection string rotation
- OpenAI/Anthropic API key rotation
- Stripe API key rotation (webhook secret)
- Google Cloud service account key rotation
- SendGrid API key rotation
- Automated rotation schedules and monitoring

#### Monitoring and Alerting
- **Error tracking** setup (Sentry, LogRocket, Railway logs)
- **Performance monitoring** (Railway metrics, custom dashboards, APM)
- **Security monitoring** (failed login attempts, unusual API usage, rate limit hits)
- **Uptime monitoring** (Railway health checks, external services like UptimeRobot)
- **Alert thresholds** and notification channels (email, Slack)
- **Cost monitoring** (AI API usage, database costs, Railway resource usage)

### Delivery Plan

Week-by-week plan grouping tasks by theme with hour estimates:

#### Phase 1: Critical Security Fixes (Week 1) - ~19 hours
Priority: P0 issues, must-fix before production
- [ ] Fix session secret handling - require secure value in production (2 hours)
- [ ] Implement CSRF protection middleware (4 hours)
- [ ] Add security headers middleware (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) (2 hours)
- [ ] Pin all dependency versions in package.json (1 hour)
- [ ] Create Dockerfile for main Node.js application (4 hours)
- [ ] Create GitHub Actions CI/CD pipeline for Node.js app (6 hours)
- **Dependencies**: Dockerfile must be created before CI/CD pipeline
- **Total**: ~19 hours

#### Phase 2: Authentication, Authorization, and GDPR Foundation (Weeks 2-3) - ~38 hours
Priority: P1 security and compliance requirements
- [ ] Review and strengthen auth middleware (session security, cookie configuration) (4 hours)
- [ ] Add rate limiting (brute force protection, API abuse prevention) (3 hours)
- [ ] Implement proper CORS configuration (restrict origins, secure credentials) (2 hours)
- [ ] Fix authorization checks on all protected routes (IDOR prevention) (6 hours)
- [ ] Implement GDPR data export endpoint (`/api/users/export-data`) (4 hours)
- [ ] Implement GDPR data deletion endpoint (`/api/users/delete-account`) (4 hours)
- [ ] Add consent tracking in user schema (2 hours)
- [ ] Implement privacy policy and cookie consent UI (4 hours)
- [ ] Add audit logging for data access (GDPR/SOC 2 requirement) (4 hours)
- [ ] Add data processing activity logs (GDPR Article 30) (3 hours)
- [ ] Implement health check endpoint for Railway (2 hours)
- **Dependencies**: Auth fixes required before GDPR features; audit logging depends on auth changes
- **Total**: ~38 hours

#### Phase 3: Input Validation, AI Security, and Injection Prevention (Week 4) - ~24 hours
Priority: P1 security, AI-specific risks
- [ ] Add prompt injection protections (AI workflow security, input sanitization) (6 hours)
- [ ] Enhance Zod validation coverage (all API endpoints, file uploads) (4 hours)
- [ ] Review RAG service access controls (user data isolation, cross-tenant security) (3 hours)
- [ ] Add XSS protection for AI-generated content (output sanitization) (3 hours)
- [ ] Review LangGraph state security (session isolation, sensitive data handling) (3 hours)
- [ ] Implement cost controls for AI APIs (rate limiting, budget alerts) (3 hours)
- [ ] Add pgvector access controls (embedding security) (2 hours)
- **Dependencies**: Input validation required before AI security features
- **Total**: ~24 hours

#### Phase 4: Performance, Reliability, and Database Optimization (Week 5) - ~29 hours
Priority: P2 performance and reliability
- [ ] Optimize database queries (N+1 fixes, missing indexes, query analysis) (8 hours)
- [ ] Add caching layer (session data, RAG embeddings, static content) (6 hours)
- [ ] Implement pagination on all list endpoints (4 hours)
- [ ] Add graceful shutdown handling (SIGTERM, cleanup) (3 hours)
- [ ] Optimize bundle size (code splitting, lazy loading, tree shaking) (4 hours)
- [ ] Add retry logic for external API calls (resilience) (4 hours)
- **Dependencies**: Database optimization before caching; error handling before retry logic
- **Total**: ~29 hours

#### Phase 5: Logging, Monitoring, and SOC 2 Controls (Week 6) - ~27 hours
Priority: P2 operations and compliance
- [ ] Set up structured logging (JSON format, PII redaction) (4 hours)
- [ ] Configure monitoring and alerting (security events, performance, errors) (4 hours)
- [ ] Implement error tracking (Sentry or similar integration) (3 hours)
- [ ] Document incident response procedures (SOC 2 requirement) (3 hours)
- [ ] Document access control procedures (SOC 2 requirement) (3 hours)
- [ ] Implement vendor risk assessment documentation (3 hours)
- [ ] Set up backup and recovery procedures (4 hours)
- [ ] Test disaster recovery plan (3 hours)
- **Dependencies**: Logging before monitoring; monitoring before alerting
- **Total**: ~27 hours

#### Phase 6: Testing and Documentation (Week 7) - ~34 hours
Priority: P2-P3 quality assurance
- [ ] Add unit tests for authentication and authorization (6 hours)
- [ ] Add integration tests for API endpoints (8 hours)
- [ ] Add security tests (input validation, auth bypass, CSRF, XSS) (6 hours)
- [ ] Add GDPR compliance tests (data export, deletion, consent) (4 hours)
- [ ] Set up test coverage reporting (2 hours)
- [ ] Update documentation (README, API docs, deployment guide) (4 hours)
- [ ] Document GDPR procedures (user rights, data breach response) (2 hours)
- [ ] Document SOC 2 controls (security, availability, confidentiality) (2 hours)
- **Dependencies**: All features should be implemented before comprehensive testing
- **Total**: ~34 hours

#### Phase 7: Final Hardening and Compliance Review (Week 8) - ~20 hours
Priority: P3 final polish
- [ ] Security review of all changes (4 hours)
- [ ] Final compliance checklist review (GDPR + SOC 2) (3 hours)
- [ ] Dependency audit and updates (3 hours)
- [ ] Performance testing and benchmarking (4 hours)
- [ ] Documentation review and updates (3 hours)
- [ ] Deployment rehearsal (staging environment) (3 hours)
- **Total**: ~20 hours

**Effort Summary:**
- **Total estimated hours**: ~191 hours (~4.8 person-weeks for one developer, or 2.4 weeks for two developers)
- **Critical path**: Phases 1-3 must be completed in sequence for security
- **Parallelizable work**: Testing and documentation can start after Phase 4
- **Risk level priority**: P0 (Phase 1) ? P1 (Phases 2-3) ? P2 (Phases 4-6) ? P3 (Phase 7)

### Nice-to-Have Improvements

Non-critical enhancements that provide measurable value (implement after delivery plan):
- **Advanced observability**: Distributed tracing (OpenTelemetry), APM integration
- **Developer experience**: Improved error messages, development tooling, hot reload optimization
- **Code quality**: Refactoring opportunities, type safety improvements, stricter linting
- **Performance**: Advanced caching strategies (Redis), CDN integration, image optimization
- **AI enhancements**: Model fallback strategies, response streaming, multi-model comparison
- **Testing**: Property-based testing, mutation testing, visual regression testing
- **Documentation**: Interactive API documentation (Swagger/OpenAPI), architecture diagrams
- **Compliance**: SOC 2 Type II readiness, ISO 27001 preparation, penetration testing

### False Positives and How to Verify

List any items that might be noise and instructions to confirm validity:
- **Framework-specific patterns**: Express middleware that appears to expose data but is framework-standard
  - **How to verify**: Check Express.js documentation for intended usage
  - **Decision criteria**: Safe if following framework best practices
- **Development-only code**: Environment checks (`process.env.NODE_ENV === 'development'`)
  - **How to verify**: Ensure production builds don't include development code paths
  - **Decision criteria**: Safe if properly gated and not reachable in production
- **Third-party code**: Dependencies that report false positives in SAST tools
  - **How to verify**: Review dependency code, check for known false positives in tool documentation
  - **Decision criteria**: Safe if dependency is maintained and issue is documented false positive
- **Intentional design**: Features that look like security issues but are intentional
  - **How to verify**: Check documentation and implementation comments
  - **Decision criteria**: Safe if well-documented with clear security rationale

### Repository Metadata

- **Commit hash**: (Git commit SHA at time of review)
- **Branch**: `cursor/combine-security-audit-prs-into-one-prompt-236e`
- **Date of review**: 2025-11-01
- **Tools/versions used**: 
  - Manual code review
  - npm audit v10.x
  - Static analysis (ESLint, TypeScript compiler)
  - Dependency scanning
- **Files reviewed**: Full repository scan
- **Lines of code**: ~[count] LOC for main Node.js application, ~[count] for Python app
- **Reviewer assumptions**: 
  - Production deployment on Railway as primary target
  - GDPR and SOC 2 compliance required before production launch
  - Multi-tenant SaaS with user data isolation requirements
- **Review limitations**:
  - No dynamic analysis or penetration testing performed
  - No review of third-party service security configurations
  - Limited review of runtime behavior (no profiling data)

---

## Constraints and Fix Preferences

- **Prefer smallest safe change** that resolves the issue without refactoring
- **Keep APIs stable** unless critical security fix requires breaking change
- **Apply least-privilege principle** (database users, Railway service permissions, service accounts, API scopes)
- **Pin all dependency versions** (remove `^` and `~`, use exact versions for production reproducibility)
- **Sign images and build artifacts** (Docker image signing, build verification)
- **Maintain backward compatibility** where possible (session migration, API versioning, database migrations)
- **Document all breaking changes** with migration guides and version bumps
- **Provide rollback procedures** for high-risk changes
- **Consider Railway deployment constraints**: 
  - Port binding (must bind to `PORT` env var, listen on `0.0.0.0`)
  - Environment variable management (Railway dashboard, secrets)
  - Build process (single build command for frontend + backend)
  - Health check endpoints for monitoring
  - WebSocket connections under Railway proxy
  - Database connection pooling for serverless
- **GDPR compliance**: Ensure all fixes maintain or improve GDPR compliance (data minimization, user rights, consent)
- **SOC 2 compliance**: Ensure fixes align with SOC 2 Trust Services Criteria (security, availability, processing integrity, confidentiality, privacy)

---

## Deployment-Specific Considerations

### Railway Deployment (Primary Target)

**Required Infrastructure:**
- [X] Review Railway-specific configuration (if present)
- [ ] **CRITICAL**: Create Dockerfile for containerized deployment
- [ ] Check port binding (must bind to `PORT` env var, listen on `0.0.0.0`)
- [ ] Environment variable management in Railway dashboard (all secrets must be set)
- [ ] Health check endpoint (`/api/health` or `/health`) for Railway monitoring
- [ ] Static file serving in production (Vite build output from `dist/public/`)
- [ ] WebSocket connection handling (upgrade handling, proxy compatibility)

**Recommended:**
- [ ] Railway build logs review (ensure no secrets in logs)
- [ ] Railway resource limits (memory, CPU) configuration
- [ ] Railway deployment notifications and rollback procedures
- [ ] Database connection pooling for Neon serverless (optimal pool size)
- [ ] Graceful shutdown handling (SIGTERM, in-flight request completion)
- [ ] Zero-downtime deployment strategy (health checks, rolling updates)

**Security Considerations:**
- [ ] Session cookie `secure: true` in production (HTTPS enforcement)
- [ ] CORS origin restriction (not `origin: true` in production)
- [ ] Rate limiting configuration (prevent abuse)
- [ ] Environment variable validation on startup (fail fast for missing required vars)

### AWS Lambda Deployment (Future Consideration)

**Note**: Lambda deployment not currently prioritized, but document if considered

**Considerations if pursued:**
- Serverless function compatibility (Express adapter such as `@vendia/serverless-express`)
- Neon serverless connection pooling for Lambda (WebSocket connections in serverless environment)
- Cold start optimization (bundle size reduction, initialization minimization)
- Lambda environment variable limits (4KB total size constraint)
- API Gateway integration (if applicable, request/response transformation)
- Lambda layers for dependencies (reduce individual function bundle size)
- VPC configuration for database access (if required)
- Execution time limits (15-minute Lambda maximum)
- Session management adaptation (external session store required)

---

## Notes for Reviewer

### Dual Application Structure
- **Main Node.js app** (root): Primary focus of this review
- **Python Flask app** (`Ad Copy Generator App/`): Secondary, separate deployment
- Note any shared infrastructure concerns (database access, authentication patterns)

### Critical Infrastructure Gaps (Must Address)
- **CI/CD**: Currently only covers Python app; main Node.js app requires GitHub Actions workflow
- **Dockerfile**: No Dockerfile exists for main Node.js application (required for Railway deployment)
- **Health checks**: No health check endpoint implemented for Railway monitoring
- These are **P0 blockers** for production deployment

### Architecture Strengths
- Session management uses PostgreSQL-backed sessions (good for Railway serverless environments)
- Drizzle ORM provides SQL injection protection (parameterized queries)
- TypeScript provides compile-time type safety
- Zod schemas provide runtime validation
- Modern React patterns (hooks, functional components)

### Security Considerations
- **AI workflows** (LangGraph) have unique security considerations:
  - State management security (session isolation)
  - Prompt injection risks (user input ? LLM prompts)
  - Cost controls (unbounded AI API calls)
- **RAG service** must enforce user data isolation (cross-user data leakage risk)
- **Stripe webhook** signature verification is critical for payment security
- **Multiple external API integrations** require proper secret management and error handling
- **Session-based auth** requires careful cookie configuration and CSRF protection

### Compliance Context
- **GDPR** requires data export and deletion capabilities (may need implementation)
- **GDPR** requires privacy policy, cookie consent, and audit trails
- **SOC 2** requires audit logging, access controls, and incident response procedures
- **Both** compliance frameworks require documentation and process maturity
- Production launch blocked until compliance requirements met

### Testing Status
- **Current state**: Limited test coverage (only a few test files found)
- **Critical gaps**: Authentication, authorization, payment flows, AI workflows
- **Priority**: Security tests must be added before production (auth bypass, injection, XSS)
- **Framework**: Uses Node.js test runner; consider Vitest for better DX

### Python Application Notes
- Separate Google Ads API integration service
- Docker containerized (review Dockerfile for security)
- OAuth 2.0 flow for Google Ads API (review security)
- Separate deployment pipeline from main Node.js app
- Potential shared database access (verify isolation)

---

## Special Considerations for This Repository

### Session-Based Authentication
- Review `express-session` configuration in `server/auth.ts`
- Check session store security (PostgreSQL-backed with connect-pg-simple)
- Verify cookie settings for production deployment:
  - `secure: true` (HTTPS only)
  - `httpOnly: true` (prevent XSS)
  - `sameSite: "strict"` or `"lax"` (CSRF protection)
  - Appropriate `domain` setting

### AI API Usage
- Review rate limiting and cost control for OpenAI/Anthropic APIs
- Check for prompt injection vulnerabilities in user-provided content
- Verify LangSmith logging doesn't expose sensitive data (PII, API keys)
- Ensure AI-generated content is sanitized before rendering (XSS prevention)
- Verify cost monitoring and budget alerts are in place

### Stripe Integration
- Webhook signature verification (critical for security)
- Subscription state management and access control
- Payment metadata handling (ensure no PII in Stripe metadata beyond necessary)
- Test webhook handling for all event types
- Verify idempotency for payment operations

### Google Cloud Storage
- Review IAM permissions and bucket access controls
- Verify signed URL generation and expiration (time-limited access)
- Check file upload validation (type, size, content scanning)
- Ensure proper error handling for storage failures
- Verify deletion cleanup for user data erasure (GDPR)

### pgvector and RAG Implementation
- Review embedding generation for sensitive content (PII leakage to AI APIs)
- Check vector search access controls (user data isolation)
- Verify chunking doesn't leak sensitive context across tenants
- Ensure embedding costs are monitored (OpenAI embedding API calls)
- Test vector similarity search performance at scale

### Python Flask Application
- Docker security (base image vulnerabilities, running as root)
- Google Ads OAuth flow security (CSRF, state parameter validation)
- Environment variable handling in containerized app
- Secrets management (no hardcoded credentials)
- API security (if exposed, authentication and authorization)

### Railway-Specific Concerns
- **No health check endpoint** detected (recommend implementing `/health` or `/api/health`)
- Environment variable validation on startup (fail fast for missing required vars)
- Graceful shutdown for zero-downtime deployments (SIGTERM handling)
- Database connection pooling for Neon serverless (optimal configuration)
- WebSocket connection handling under Railway's proxy (test upgrade handling)
- Build process optimization (caching, layer optimization when Dockerfile created)

---

## Deliverable

A comprehensive audit report following the output format above, with actionable findings, precise fixes, and a prioritised delivery plan. The report should be immediately usable for:

1. **Creating GitHub issues and pull requests** (clear titles, descriptions, code examples)
2. **Discussing with stakeholders** (executive summary for non-technical, detailed findings for technical)
3. **Compliance audits** (GDPR Article references, SOC 2 criteria mapping)
4. **Railway deployment configuration** (environment variables, Dockerfile, health checks)
5. **CI/CD pipeline setup** (GitHub Actions workflow, security scanning, automated testing)
6. **Security hardening** (authentication fixes, input validation, injection prevention)
7. **Performance optimization** (database queries, caching, bundle size)
8. **Operational readiness** (monitoring, alerting, incident response)

Focus on **high-impact, low-effort wins** in the delivery plan, with clear dependencies and risk mitigation strategies. Prioritize **P0 and P1 issues** that block production deployment (security vulnerabilities, compliance gaps, infrastructure requirements).

---

## Example Usage

To use this prompt effectively:

1. **Read entire codebase** starting with high-level files (package.json, README.md, server/index.ts)
2. **Map architecture** before diving into detailed review
3. **Run automated tools** (npm audit, ESLint, TypeScript compiler) to supplement manual review
4. **Follow the process** sequentially (architecture ? dependencies ? security ? performance ? compliance)
5. **Document findings** as you go using the structured format
6. **Prioritize ruthlessly** using P0-P3 risk ratings
7. **Provide actionable fixes** with code examples, not just descriptions
8. **Estimate effort** realistically based on complexity and dependencies
9. **Consider deployment context** (Railway primary, Lambda future consideration)
10. **Verify compliance** against GDPR and SOC 2 requirements

The goal is a **production-ready security and compliance posture** with minimal technical debt and clear operational procedures.
