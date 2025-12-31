# Supabase Migration Plan

## Document Purpose

This document provides the complete migration plan from PostgreSQL + Drizzle ORM to Supabase, including schema migration, authentication changes, Row Level Security policies, and data migration strategy.

---

## Table of Contents

1. [Migration Overview](#1-migration-overview)
2. [Current State Analysis](#2-current-state-analysis)
3. [Supabase Project Setup](#3-supabase-project-setup)
4. [Schema Migration](#4-schema-migration)
5. [Authentication Migration](#5-authentication-migration)
6. [Row Level Security](#6-row-level-security)
7. [Data Migration](#7-data-migration)
8. [Client Integration](#8-client-integration)
9. [Testing Strategy](#9-testing-strategy)
10. [Rollback Plan](#10-rollback-plan)

---

## 1. Migration Overview

### 1.1 Goals

| Goal | Description |
|------|-------------|
| **Database** | Migrate all tables from current PostgreSQL to Supabase PostgreSQL |
| **Authentication** | Replace session-based auth with Supabase Auth |
| **Authorization** | Implement Row Level Security for all tables |
| **ORM** | Replace Drizzle ORM with Supabase client + generated types |
| **Storage** | Use Supabase Storage for file uploads |
| **Real-time** | Enable real-time subscriptions for applicable features |

### 1.2 Migration Phases

```
Phase 1: Setup & Schema Migration
├── Create Supabase project
├── Convert Drizzle schema to SQL migrations
├── Set up type generation
└── Configure connection pooling

Phase 2: Authentication Migration
├── Configure Supabase Auth
├── Migrate user accounts
├── Update auth middleware
└── Handle session transition

Phase 3: Row Level Security
├── Define RLS policies for all tables
├── Test access patterns
└── Audit security coverage

Phase 4: Data Migration
├── Export current data
├── Transform and import to Supabase
├── Verify data integrity
└── Switch traffic

Phase 5: Cleanup
├── Remove Drizzle dependencies
├── Update environment variables
├── Archive old database
└── Documentation update
```

### 1.3 Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss during migration | Low | Critical | Full backup, incremental migration, verification |
| Authentication disruption | Medium | High | Graceful transition period, both systems active |
| Performance regression | Low | Medium | Benchmark before/after, connection pooling |
| RLS misconfiguration | Medium | High | Comprehensive policy testing, security audit |

---

## 2. Current State Analysis

### 2.1 Current Database

- **Provider**: PostgreSQL (Neon.tech)
- **ORM**: Drizzle ORM 0.39.1
- **Schema Location**: `/shared/schema.ts`
- **Connection**: Direct PostgreSQL connection string
- **Pooling**: pg Pool (default 10 connections)

### 2.2 Current Tables (from schema.ts)

```
Core Tables:
├── users
├── sessions (express-session)
├── password_reset_tokens
├── email_verifications

Product/Subscription Tables:
├── products
├── packages
├── tiers
├── tier_limits
├── user_tier_subscriptions
├── user_package_subscriptions

Content Tables:
├── guideline_profiles
├── brand_context_embeddings
├── crawl_jobs
├── crawl_pages
├── content_chunks

Generated Content Tables:
├── generated_content
├── content_versions
├── generated_seo_meta
├── generated_google_ads
├── generated_social_content

AI/Workflow Tables:
├── langgraph_threads
├── langgraph_checkpoints
├── agent_audit_logs (NEW)
├── api_keys (NEW)

Admin Tables:
├── pages (CMS)
├── page_blocks
├── page_views
├── error_logs
├── ai_usage_logs
```

### 2.3 Current Authentication

- **Session Store**: connect-pg-simple
- **Strategy**: Passport.js with local strategy
- **Password Hashing**: bcryptjs
- **Session Duration**: 7 days

---

## 3. Supabase Project Setup

### 3.1 Create Project

1. Go to https://supabase.com/dashboard
2. Create new project:
   - Organization: AtomToolsAI
   - Project name: atomtools-production
   - Database password: (generate strong password)
   - Region: (closest to Railway deployment)
   - Pricing plan: Pro (for connection pooling, daily backups)

### 3.2 Project Configuration

```typescript
// File: /server/config/supabase.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@shared/types/database.types';
import { env } from './index';

/**
 * Supabase client configuration.
 */
const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: false, // Server-side, no persistence
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-application': 'atomtools-api',
    },
  },
  db: {
    schema: 'public',
  },
};

/**
 * Create Supabase client with service role key.
 * Use this for server-side operations that bypass RLS.
 */
export function createServiceClient(): SupabaseClient<Database> {
  return createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseConfig
  );
}

/**
 * Create Supabase client with anon key.
 * Use this for operations that should respect RLS.
 */
export function createAnonClient(): SupabaseClient<Database> {
  return createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    supabaseConfig
  );
}

/**
 * Create Supabase client for a specific user.
 * Use this for user-scoped operations.
 */
export function createUserClient(
  accessToken: string
): SupabaseClient<Database> {
  return createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      ...supabaseConfig,
      global: {
        ...supabaseConfig.global,
        headers: {
          ...supabaseConfig.global.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
}

// Export singleton service client
export const supabase = createServiceClient();
```

### 3.3 Environment Variables

```bash
# File: /.env.example (additions)

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

### 3.4 Type Generation

```bash
# Generate types from Supabase schema
npx supabase gen types typescript --project-id your-project-ref > shared/types/database.types.ts
```

---

## 4. Schema Migration

### 4.1 Migration Strategy

Convert Drizzle schema to SQL migrations file by file:

```
/supabase/migrations/
├── 00001_create_extensions.sql
├── 00002_create_users_table.sql
├── 00003_create_products_tables.sql
├── 00004_create_guideline_tables.sql
├── 00005_create_content_tables.sql
├── 00006_create_workflow_tables.sql
├── 00007_create_api_keys_table.sql
├── 00008_create_audit_logs_table.sql
├── 00009_create_indexes.sql
└── 00010_create_rls_policies.sql
```

### 4.2 Core Tables Migration

```sql
-- File: /supabase/migrations/00001_create_extensions.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector"; -- For embeddings

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'pending');
CREATE TYPE content_status AS ENUM ('draft', 'processing', 'completed', 'failed');
CREATE TYPE crawl_status AS ENUM ('pending', 'processing', 'completed', 'failed');
```

```sql
-- File: /supabase/migrations/00002_create_users_table.sql

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Profile info
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company VARCHAR(255),
  role user_role DEFAULT 'user',

  -- Settings
  preferences JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT false,

  -- Email verification (managed by Supabase Auth)
  email_verified BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Index for email lookups
CREATE INDEX idx_users_email ON public.users(email);
```

```sql
-- File: /supabase/migrations/00003_create_products_tables.sql

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tiers table (subscription levels)
CREATE TABLE public.tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  price_monthly DECIMAL(10, 2),
  price_yearly DECIMAL(10, 2),
  stripe_price_id_monthly VARCHAR(255),
  stripe_price_id_yearly VARCHAR(255),
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tier limits table
CREATE TABLE public.tier_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier_id UUID NOT NULL REFERENCES public.tiers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  monthly_limit INTEGER,
  daily_limit INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tier_id, product_id)
);

-- User tier subscriptions
CREATE TABLE public.user_tier_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.tiers(id),
  status subscription_status DEFAULT 'active',

  -- Stripe integration
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),

  -- Billing
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,

  -- Usage tracking
  current_usage JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tier_subscriptions ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_subscriptions_user ON public.user_tier_subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.user_tier_subscriptions(status);
```

```sql
-- File: /supabase/migrations/00004_create_guideline_tables.sql

-- Guideline profiles (brand guidelines)
CREATE TABLE public.guideline_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Profile info
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Brand voice
  voice_tone TEXT,
  voice_style TEXT,
  voice_personality TEXT,

  -- Brand values
  values TEXT[],
  restrictions TEXT[],

  -- Target audience
  target_audience TEXT,
  target_demographics JSONB,

  -- Visual brand (optional)
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  logo_url TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brand context embeddings (for RAG)
CREATE TABLE public.brand_context_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guideline_profile_id UUID NOT NULL REFERENCES public.guideline_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Content
  content TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- 'guideline', 'example', 'restriction'

  -- Vector embedding
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.guideline_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_context_embeddings ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_guideline_profiles_user ON public.guideline_profiles(user_id);
CREATE INDEX idx_brand_embeddings_profile ON public.brand_context_embeddings(guideline_profile_id);
CREATE INDEX idx_brand_embeddings_vector ON public.brand_context_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

```sql
-- File: /supabase/migrations/00005_create_content_tables.sql

-- Generated content (main content output)
CREATE TABLE public.generated_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  guideline_profile_id UUID REFERENCES public.guideline_profiles(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id),

  -- Content type
  content_type VARCHAR(50) NOT NULL, -- 'article', 'seo_meta', 'google_ads', 'social'

  -- Input
  topic TEXT NOT NULL,
  input_data JSONB DEFAULT '{}',

  -- Output
  content TEXT,
  output_data JSONB DEFAULT '{}',

  -- Status
  status content_status DEFAULT 'draft',

  -- Quality metrics
  quality_score DECIMAL(3, 2),
  brand_match_score DECIMAL(3, 2),
  fact_check_passed BOOLEAN,

  -- Workflow tracking
  thread_id UUID,
  current_step VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Content versions (history)
CREATE TABLE public.content_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES public.generated_content(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,

  content TEXT NOT NULL,
  output_data JSONB,

  -- Change tracking
  change_reason VARCHAR(255),
  changed_by UUID REFERENCES public.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_content_user ON public.generated_content(user_id);
CREATE INDEX idx_content_status ON public.generated_content(status);
CREATE INDEX idx_content_type ON public.generated_content(content_type);
CREATE INDEX idx_content_versions_content ON public.content_versions(content_id);
```

```sql
-- File: /supabase/migrations/00006_create_workflow_tables.sql

-- LangGraph threads (workflow instances)
CREATE TABLE public.langgraph_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Tool identification
  tool_id VARCHAR(100) NOT NULL,
  tool_version VARCHAR(20),

  -- Status
  status VARCHAR(50) DEFAULT 'active',
  current_step VARCHAR(100),

  -- Configuration
  config JSONB DEFAULT '{}',

  -- Metrics
  total_steps INTEGER DEFAULT 0,
  completed_steps INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- LangGraph checkpoints (workflow state)
CREATE TABLE public.langgraph_checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES public.langgraph_threads(id) ON DELETE CASCADE,
  parent_checkpoint_id UUID REFERENCES public.langgraph_checkpoints(id),

  -- Checkpoint data
  checkpoint_ns VARCHAR(255) DEFAULT '',
  checkpoint_id VARCHAR(255) NOT NULL,
  checkpoint_data JSONB NOT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  step_name VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent audit logs
CREATE TABLE public.agent_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  correlation_id VARCHAR(50) NOT NULL,

  -- Agent info
  agent_id VARCHAR(100) NOT NULL,
  agent_version VARCHAR(20),

  -- Context
  user_id UUID REFERENCES public.users(id),
  api_key_id UUID, -- References api_keys table
  tool_id VARCHAR(100),
  step_index INTEGER,

  -- Execution
  status VARCHAR(20) NOT NULL, -- 'success', 'failure'
  execution_time_ms INTEGER,

  -- LLM metrics
  tokens_used JSONB,
  model VARCHAR(100),

  -- Error info
  error_code VARCHAR(100),
  error_message TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.langgraph_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.langgraph_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_audit_logs ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_threads_user ON public.langgraph_threads(user_id);
CREATE INDEX idx_threads_status ON public.langgraph_threads(status);
CREATE INDEX idx_checkpoints_thread ON public.langgraph_checkpoints(thread_id);
CREATE INDEX idx_audit_correlation ON public.agent_audit_logs(correlation_id);
CREATE INDEX idx_audit_agent ON public.agent_audit_logs(agent_id);
CREATE INDEX idx_audit_time ON public.agent_audit_logs(created_at);
```

```sql
-- File: /supabase/migrations/00007_create_api_keys_table.sql

-- API keys for programmatic access
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Key identification
  name VARCHAR(255) NOT NULL,
  prefix VARCHAR(8) NOT NULL UNIQUE, -- First 8 chars for identification
  hash VARCHAR(255) NOT NULL, -- bcrypt hash of full key

  -- Scoping
  scopes TEXT[] DEFAULT '{}',
  tool_ids TEXT[] DEFAULT '{}',

  -- Rate limiting
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_day INTEGER DEFAULT 10000,

  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  total_requests INTEGER DEFAULT 0,

  -- Lifecycle
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_api_keys_prefix ON public.api_keys(prefix) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_user ON public.api_keys(user_id);
```

---

## 5. Authentication Migration

### 5.1 Supabase Auth Configuration

```typescript
// Supabase Dashboard Settings:
// Authentication > Providers:
// - Email enabled
// - Password minimum length: 8
// - Require email confirmation: true
//
// Authentication > URL Configuration:
// - Site URL: https://atomtools.ai
// - Redirect URLs: https://atomtools.ai/auth/callback
//
// Authentication > Email Templates:
// - Customize confirmation email
// - Customize reset password email
```

### 5.2 Auth Middleware Update

```typescript
// File: /server/middleware/auth.ts

import { Request, Response, NextFunction } from 'express';
import { createUserClient, supabase } from '../config/supabase';
import { logger } from '../logging/logger';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
      supabaseClient?: ReturnType<typeof createUserClient>;
    }
  }
}

/**
 * Extract and validate Supabase access token.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const correlationId = (req as any).correlationId;

  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(); // No token, continue to check API key
  }

  const token = authHeader.substring(7);

  // Skip API keys (handled by api-key middleware)
  if (token.startsWith('atk_')) {
    return next();
  }

  try {
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.debug({
        correlationId,
        event: 'auth_token_invalid',
        error: error?.message,
      });
      return next(); // Invalid token, continue to check API key
    }

    // Get user profile from database
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email!,
      role: profile?.role ?? 'user',
    };

    // Create user-scoped Supabase client
    req.supabaseClient = createUserClient(token);

    logger.debug({
      correlationId,
      event: 'auth_token_validated',
      userId: user.id,
    });

    next();
  } catch (error) {
    logger.error({
      correlationId,
      event: 'auth_middleware_error',
      error,
    });
    next(); // Continue without user
  }
}

/**
 * Require authenticated user.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user && !req.apiKey) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
      correlationId: (req as any).correlationId,
    });
    return;
  }

  next();
}

/**
 * Require admin role.
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
      },
      correlationId: (req as any).correlationId,
    });
    return;
  }

  next();
}
```

### 5.3 User Migration Script

```typescript
// File: /scripts/migrate-users.ts

import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const OLD_DB_URL = process.env.OLD_DATABASE_URL!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function migrateUsers() {
  // Connect to old database
  const sql = postgres(OLD_DB_URL);
  const oldDb = drizzle(sql);

  // Connect to Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Get all users from old database
  const oldUsers = await sql`SELECT * FROM users`;

  console.log(`Migrating ${oldUsers.length} users...`);

  for (const oldUser of oldUsers) {
    try {
      // Create auth user in Supabase
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: oldUser.email,
        email_confirm: oldUser.email_verified,
        password: undefined, // Will require password reset
        user_metadata: {
          first_name: oldUser.first_name,
          last_name: oldUser.last_name,
          migrated: true,
          old_id: oldUser.id,
        },
      });

      if (authError) {
        console.error(`Failed to create auth user for ${oldUser.email}:`, authError);
        continue;
      }

      // Create profile in public.users
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email: oldUser.email,
          first_name: oldUser.first_name,
          last_name: oldUser.last_name,
          company: oldUser.company,
          role: oldUser.role,
          preferences: oldUser.preferences,
          onboarding_completed: oldUser.onboarding_completed,
          email_verified: oldUser.email_verified,
          created_at: oldUser.created_at,
        });

      if (profileError) {
        console.error(`Failed to create profile for ${oldUser.email}:`, profileError);
        continue;
      }

      console.log(`Migrated user: ${oldUser.email}`);
    } catch (error) {
      console.error(`Error migrating ${oldUser.email}:`, error);
    }
  }

  console.log('User migration complete');
  await sql.end();
}

migrateUsers().catch(console.error);
```

---

## 6. Row Level Security

### 6.1 RLS Policies

```sql
-- File: /supabase/migrations/00010_create_rls_policies.sql

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- PRODUCTS/TIERS POLICIES (Public read)
-- =====================================================

-- Anyone can read products
CREATE POLICY "Public read products"
  ON public.products
  FOR SELECT
  USING (is_active = true);

-- Anyone can read tiers
CREATE POLICY "Public read tiers"
  ON public.tiers
  FOR SELECT
  USING (is_active = true);

-- Anyone can read tier limits
CREATE POLICY "Public read tier limits"
  ON public.tier_limits
  FOR SELECT
  USING (true);

-- =====================================================
-- SUBSCRIPTIONS POLICIES
-- =====================================================

-- Users can read their own subscriptions
CREATE POLICY "Users read own subscriptions"
  ON public.user_tier_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own subscriptions (for cancellation)
CREATE POLICY "Users update own subscriptions"
  ON public.user_tier_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- GUIDELINE PROFILES POLICIES
-- =====================================================

-- Users can CRUD their own guideline profiles
CREATE POLICY "Users CRUD own guideline profiles"
  ON public.guideline_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can CRUD their own brand embeddings
CREATE POLICY "Users CRUD own brand embeddings"
  ON public.brand_context_embeddings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- GENERATED CONTENT POLICIES
-- =====================================================

-- Users can CRUD their own content
CREATE POLICY "Users CRUD own content"
  ON public.generated_content
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own content versions
CREATE POLICY "Users read own content versions"
  ON public.content_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.generated_content
      WHERE id = content_versions.content_id AND user_id = auth.uid()
    )
  );

-- =====================================================
-- WORKFLOW POLICIES
-- =====================================================

-- Users can CRUD their own threads
CREATE POLICY "Users CRUD own threads"
  ON public.langgraph_threads
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can CRUD their own checkpoints (via thread)
CREATE POLICY "Users CRUD own checkpoints"
  ON public.langgraph_checkpoints
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.langgraph_threads
      WHERE id = langgraph_checkpoints.thread_id AND user_id = auth.uid()
    )
  );

-- =====================================================
-- API KEYS POLICIES
-- =====================================================

-- Users can CRUD their own API keys
CREATE POLICY "Users CRUD own API keys"
  ON public.api_keys
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- AUDIT LOGS POLICIES
-- =====================================================

-- Users can read their own audit logs
CREATE POLICY "Users read own audit logs"
  ON public.agent_audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert audit logs (bypasses RLS)
-- This is handled by using service role key for inserts

-- =====================================================
-- SERVICE ROLE BYPASS
-- =====================================================
-- Note: All tables have RLS enabled, but service role key
-- bypasses RLS. API server uses service role for:
-- - Audit log inserts
-- - Admin operations
-- - Background jobs
```

---

## 7. Data Migration

### 7.1 Migration Script

```typescript
// File: /scripts/migrate-all-data.ts

import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

interface MigrationConfig {
  oldDbUrl: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
}

async function migrateAllData(config: MigrationConfig) {
  const oldSql = postgres(config.oldDbUrl);
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

  const tables = [
    'products',
    'tiers',
    'tier_limits',
    'guideline_profiles',
    'brand_context_embeddings',
    'generated_content',
    'content_versions',
    'langgraph_threads',
    'langgraph_checkpoints',
    'error_logs',
    'ai_usage_logs',
  ];

  for (const table of tables) {
    console.log(`Migrating ${table}...`);

    try {
      // Get all rows from old database
      const rows = await oldSql`SELECT * FROM ${oldSql(table)}`;
      console.log(`  Found ${rows.length} rows`);

      if (rows.length === 0) continue;

      // Insert in batches of 1000
      const batchSize = 1000;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        const { error } = await supabase
          .from(table)
          .insert(batch);

        if (error) {
          console.error(`  Error inserting batch ${i / batchSize}:`, error);
        } else {
          console.log(`  Inserted batch ${i / batchSize + 1}`);
        }
      }

      console.log(`  Completed ${table}`);
    } catch (error) {
      console.error(`  Failed to migrate ${table}:`, error);
    }
  }

  console.log('Migration complete');
  await oldSql.end();
}

// Run migration
migrateAllData({
  oldDbUrl: process.env.OLD_DATABASE_URL!,
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
}).catch(console.error);
```

### 7.2 Data Verification

```typescript
// File: /scripts/verify-migration.ts

async function verifyMigration() {
  const oldSql = postgres(process.env.OLD_DATABASE_URL!);
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tables = ['users', 'products', 'guideline_profiles', 'generated_content'];

  for (const table of tables) {
    const oldCount = await oldSql`SELECT COUNT(*) FROM ${oldSql(table)}`;
    const { count: newCount } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    const oldNum = Number(oldCount[0].count);
    const newNum = newCount ?? 0;

    const status = oldNum === newNum ? '✓' : '✗';
    console.log(`${status} ${table}: ${oldNum} -> ${newNum}`);
  }

  await oldSql.end();
}

verifyMigration();
```

---

## 8. Client Integration

### 8.1 Repository Pattern

```typescript
// File: /server/repositories/base.repository.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@shared/types/database.types';
import { logger } from '../logging/logger';

export abstract class BaseRepository<T extends keyof Database['public']['Tables']> {
  constructor(
    protected readonly supabase: SupabaseClient<Database>,
    protected readonly tableName: T
  ) {}

  protected get table() {
    return this.supabase.from(this.tableName);
  }

  protected handleError(operation: string, error: any): never {
    logger.error({
      event: 'database_error',
      table: this.tableName,
      operation,
      error,
    });

    throw new Error(`Database error in ${operation}: ${error.message}`);
  }
}
```

```typescript
// File: /server/repositories/user.repository.ts

import { BaseRepository } from './base.repository';
import { Database } from '@shared/types/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];
type UserUpdate = Database['public']['Tables']['users']['Update'];

export class UserRepository extends BaseRepository<'users'> {
  async findById(id: string): Promise<UserRow | null> {
    const { data, error } = await this.table
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      this.handleError('findById', error);
    }

    return data;
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const { data, error } = await this.table
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      this.handleError('findByEmail', error);
    }

    return data;
  }

  async create(user: UserInsert): Promise<UserRow> {
    const { data, error } = await this.table
      .insert(user)
      .select()
      .single();

    if (error) this.handleError('create', error);
    return data!;
  }

  async update(id: string, updates: UserUpdate): Promise<UserRow> {
    const { data, error } = await this.table
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) this.handleError('update', error);
    return data!;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.table
      .delete()
      .eq('id', id);

    if (error) this.handleError('delete', error);
  }
}
```

---

## 9. Testing Strategy

### 9.1 Migration Tests

```typescript
// File: /tests/migration/schema.test.ts

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('Schema Migration', () => {
  it('should have all required tables', async () => {
    const tables = [
      'users',
      'products',
      'tiers',
      'guideline_profiles',
      'generated_content',
      'langgraph_threads',
      'api_keys',
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(1);
      expect(error?.message).not.toContain('does not exist');
    }
  });

  it('should have RLS enabled on all tables', async () => {
    const { data } = await supabase.rpc('check_rls_enabled');
    // Custom function to check RLS
    expect(data).toEqual(expect.arrayContaining([
      expect.objectContaining({ table_name: 'users', rls_enabled: true }),
    ]));
  });
});
```

### 9.2 RLS Policy Tests

```typescript
// File: /tests/migration/rls.test.ts

import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('RLS Policies', () => {
  it('should prevent users from reading other users data', async () => {
    // Create client for user A
    const userAClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${userAToken}` },
        },
      }
    );

    // Try to read user B's guideline profile
    const { data, error } = await userAClient
      .from('guideline_profiles')
      .select('*')
      .eq('user_id', userBId);

    // Should return empty array (no access)
    expect(data).toEqual([]);
  });

  it('should allow users to read their own data', async () => {
    const userClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${userToken}` },
        },
      }
    );

    const { data, error } = await userClient
      .from('guideline_profiles')
      .select('*')
      .eq('user_id', userId);

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  });
});
```

---

## 10. Rollback Plan

### 10.1 Rollback Triggers

| Trigger | Action |
|---------|--------|
| Data integrity issues | Revert to Drizzle connection |
| Authentication failures | Re-enable session-based auth |
| Performance degradation > 50% | Switch back to Neon |
| Security vulnerability in RLS | Disable new endpoints |

### 10.2 Rollback Steps

```bash
# 1. Switch environment variables back
DATABASE_URL=$OLD_DATABASE_URL

# 2. Redeploy with old configuration
railway up --environment production

# 3. Verify old system is working
curl https://atomtools.ai/health

# 4. Notify users of temporary disruption
```

### 10.3 Data Sync During Transition

```typescript
// Dual-write mode: Write to both databases during transition
async function createContent(data: ContentInput) {
  // Write to new database
  await supabase.from('generated_content').insert(data);

  // Also write to old database (for rollback safety)
  await oldDb.insert(generatedContent).values(data);
}
```

---

## Summary

This migration plan covers:

1. **Project Setup** - Supabase configuration and credentials
2. **Schema Migration** - All tables converted from Drizzle to SQL
3. **Auth Migration** - Session-based to Supabase Auth
4. **RLS Policies** - Complete row-level security
5. **Data Migration** - Scripts for migrating existing data
6. **Client Integration** - Repository pattern with type safety
7. **Testing** - Verification of migration success
8. **Rollback** - Plan for reverting if issues arise

---

*Document Version: 1.0*
*Created: 2024*
*Last Updated: 2024*
