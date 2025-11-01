# Environment Configuration Check Report

Generated: 2025-01-31

## Executive Summary

**Status**: ⚠️ **VERIFICATION NEEDED**

The application is configured for deployment on Railway with the following status:

- ✅ Railway service is linked and configured
- ✅ Railway domain is set: atomtoolsai-production.up.railway.app
- ⚠️ Database connection needs verification (Railway Postgres or Supabase)
- ⚠️ Supabase connection is timing out
- ⚠️ Environment variables need verification in Railway dashboard

**Action Required**: Verify all required environment variables are set in Railway dashboard.

## Overview

This document checks all required environment variables, API keys, secrets, and connection points for the AtomToolsAI application.

---

## Required Environment Variables

Based on `server/config.ts`, the following environment variables are **REQUIRED**:

### 1. Database Configuration

- **DATABASE_URL** (REQUIRED)
  - Format: PostgreSQL connection string (e.g., `postgresql://user:pass@host:port/dbname`)
  - Status: ⚠️ **NEEDS VERIFICATION**
  - Notes:
    - Railway project "attractive-vibrancy" has a Postgres service
    - Supabase project URL: `https://nqsuvximwdipyvcxftbo.supabase.co`
    - Supabase connection is timing out - may need to check connection string
    - Database must have pgvector extension for embeddings

### 2. Security

- **SESSION_SECRET** (REQUIRED)
  - Format: Minimum 32 characters
  - Status: ⚠️ **NEEDS VERIFICATION**
  - Notes: Must be a cryptographically secure random string
  - Generate with: `openssl rand -base64 32`

### 3. AI APIs

- **OPENAI_API_KEY** (REQUIRED)

  - Format: Must start with `sk-`
  - Status: ⚠️ **NEEDS VERIFICATION**
  - Used in: routes.ts, langgraph nodes, embeddings

- **ANTHROPIC_API_KEY** (OPTIONAL but recommended)
  - Format: Anthropic API key
  - Status: ⚠️ **NEEDS VERIFICATION**
  - Used in: Brand analyzer, social content nodes, PDF analyzer
  - Required for: Brand guideline analysis, social content generation

### 4. Email Service

- **SENDGRID_API_KEY** (REQUIRED)
  - Format: Must start with `SG.`
  - Status: ⚠️ **NEEDS VERIFICATION**
  - Used in: server/email.ts for verification emails

### 5. Deployment

- **NODE_ENV** (defaults to 'development')

  - Options: 'development', 'production', 'test'
  - Status: ✅ Set by Railway (production)

- **PORT** (defaults to '5000')

  - Status: ✅ Railway sets this automatically

- **FRONTEND_URL** (OPTIONAL)

  - Format: Valid URL
  - Status: ⚠️ **NEEDS VERIFICATION**
  - Used for: CORS configuration, email links

- **REPLIT_DOMAIN** (OPTIONAL)
  - Format: Domain string
  - Status: ⚠️ **NEEDS VERIFICATION**
  - Used for: Email verification links (if using Replit)

### 6. Database Pool

- **DB_POOL_SIZE** (defaults to '10')
  - Status: ✅ Has default value

### 7. Feature Flags

- **HYBRID_SEARCH_ENABLED** (defaults to 'false')

  - Options: 'true', 'false'
  - Status: ✅ Has default value

- **RERANKING_ENABLED** (defaults to 'false')
  - Options: 'true', 'false'
  - Status: ✅ Has default value
  - Requires: COHERE_API_KEY if enabled

---

## Optional Environment Variables

### 8. Object Storage (for local dev, optional in Railway)

- **PUBLIC_OBJECT_SEARCH_PATHS** (OPTIONAL)

  - Status: ⚠️ Only needed for local file serving

- **PRIVATE_OBJECT_DIR** (OPTIONAL)
  - Status: ⚠️ Only needed for local file storage

### 9. Observability

- **LANGCHAIN_API_KEY** (OPTIONAL)

  - Status: ⚠️ **NEEDS VERIFICATION**
  - Used for: LangSmith tracing (optional)

- **SENTRY_DSN** (OPTIONAL)
  - Status: ⚠️ **NEEDS VERIFICATION**
  - Used for: Error tracking (optional)

### 10. Cohere (for reranking)

- **COHERE_API_KEY** (OPTIONAL)
  - Status: ⚠️ **NEEDS VERIFICATION**
  - Required if: RERANKING_ENABLED=true

---

## Railway Configuration

### Current Setup

- **Project**: daring-manifestation (ID: 1254d82e-4e13-423d-a5da-497beaaafe1e)
- **Service**: AtomToolsAI
- **Environment**: production
- **Domain**: atomtoolsai-production.up.railway.app

### Railway-Specific Variables (Auto-set)

- ✅ RAILWAY_ENVIRONMENT=production
- ✅ RAILWAY_ENVIRONMENT_ID
- ✅ RAILWAY_PRIVATE_DOMAIN
- ✅ RAILWAY_PROJECT_ID
- ✅ RAILWAY_PUBLIC_DOMAIN
- ✅ RAILWAY_SERVICE_ATOMTOOLSAI_URL
- ✅ RAILWAY_SERVICE_ID
- ✅ RAILWAY_SERVICE_NAME
- ✅ RAILWAY_STATIC_URL

### Database Service

- **Railway Postgres**: attractive-vibrancy project
  - Status: ⚠️ **NEEDS VERIFICATION**
  - Must be linked to AtomToolsAI service
  - Railway auto-sets `$DATABASE_URL` if linked

---

## Supabase Configuration

### Current Status

- **Project URL**: https://nqsuvximwdipyvcxftbo.supabase.co
- **Connection Status**: ❌ **CONNECTION TIMEOUT**
- **Anonymous Key**: ❌ **Failed to fetch**

### Issues

- Database connection timeout suggests:
  1. Connection string may be incorrect
  2. Database may not be accessible
  3. Firewall/network restrictions
  4. Service may be using Railway Postgres instead

---

## Dependencies Check

### Node.js Dependencies

- ✅ package.json exists with all dependencies listed
- ⚠️ Need to verify all packages are installed (check `node_modules`)

### Key Dependencies

- ✅ drizzle-orm (PostgreSQL ORM)
- ✅ pg (PostgreSQL client)
- ✅ pgvector (Vector similarity search)
- ✅ @sendgrid/mail (Email)
- ✅ openai (OpenAI SDK)
- ✅ @anthropic-ai/sdk (Anthropic SDK)
- ✅ express (Server framework)

---

## Action Items

### Critical (Must Fix)

1. ✅ Verify DATABASE_URL is set correctly in Railway

   - Check if using Railway Postgres or Supabase
   - Test database connection
   - Ensure pgvector extension is installed

2. ✅ Verify SESSION_SECRET is set (min 32 chars)

   - Check in Railway environment variables
   - Regenerate if necessary

3. ✅ Verify OPENAI_API_KEY is set and valid

   - Must start with `sk-`
   - Check in Railway environment variables

4. ✅ Verify SENDGRID_API_KEY is set and valid
   - Must start with `SG.`
   - Check in Railway environment variables

### Important (Should Fix)

5. ✅ Set FRONTEND_URL for CORS

   - Should be: `https://atomtoolsai-production.up.railway.app`
   - Or custom domain if configured

6. ✅ Verify ANTHROPIC_API_KEY if using brand analysis
   - Check in Railway environment variables
   - Required for social content generation

### Optional (Nice to Have)

7. ✅ Set up LangSmith tracing (LANGCHAIN_API_KEY)
8. ✅ Set up Sentry error tracking (SENTRY_DSN)
9. ✅ Configure Cohere for reranking if using (COHERE_API_KEY)

---

## Verification Commands

To verify environment variables in Railway:

```bash
# Check Railway variables (after linking)
railway variables

# Or check specific service
railway variables --service AtomToolsAI
```

To test database connection:

```bash
# If using Railway Postgres, connection string is auto-set
# Test connection with:
psql $DATABASE_URL -c "SELECT 1;"
```

To test API keys:

```bash
# Test OpenAI
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Test SendGrid
curl -X GET "https://api.sendgrid.com/v3/user/profile" \
  -H "Authorization: Bearer $SENDGRID_API_KEY"
```

---

## Connection Points Summary

### ✅ Configured

- Railway service: AtomToolsAI
- Railway domain: atomtoolsai-production.up.railway.app
- Railway environment variables (auto-set)

### ⚠️ Needs Verification

- Database connection (DATABASE_URL)
- All API keys (OpenAI, SendGrid, Anthropic)
- Session secret
- Frontend URL for CORS

### ❌ Issues Found

- Supabase connection timeout
- Supabase anonymous key fetch failed
- Database may be using Railway Postgres instead

---

## Next Steps

1. **Check Railway Environment Variables**

   - Log into Railway dashboard
   - Navigate to AtomToolsAI service
   - Check "Variables" tab
   - Verify all required variables are set

2. **Verify Database Connection**

   - Check if Railway Postgres service is linked
   - Or verify Supabase connection string is correct
   - Test connection

3. **Test API Keys**

   - Verify OpenAI key works
   - Verify SendGrid key works
   - Verify Anthropic key (if used)

4. **Set Missing Variables**

   - Add any missing environment variables in Railway
   - Ensure SESSION_SECRET is at least 32 characters
   - Set FRONTEND_URL for production

5. **Restart Service**
   - After setting variables, restart Railway service
   - Check logs for any configuration errors

---

## Notes

- Railway automatically provides PORT and NODE_ENV
- Railway Postgres service auto-sets DATABASE_URL when linked
- Environment variables should be set in Railway dashboard, not in code
- All secrets should be stored in Railway's secure variable storage
- Never commit API keys or secrets to git
