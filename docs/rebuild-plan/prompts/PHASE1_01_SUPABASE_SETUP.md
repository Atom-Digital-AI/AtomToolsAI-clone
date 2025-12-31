# Phase 1.1: Supabase Project Setup

## Execution Prompt

You are implementing Phase 1.1 of the AtomToolsAI rebuild. Your task is to set up the Supabase project and create the database schema.

### Prerequisites
- Supabase account created
- Access to Supabase dashboard
- Current codebase available at `/home/user/AtomToolsAI-clone`

### Reference Documents
- `/docs/rebuild-plan/00-MASTER_PLAN.md` - Overall architecture
- `/docs/rebuild-plan/01-SUPABASE_MIGRATION.md` - Detailed migration plan

### Tasks

#### Task 1.1.1: Create Supabase Project

1. Create a new Supabase project with these settings:
   - Project name: `atomtools-production`
   - Region: Select closest to deployment target
   - Database password: Generate strong password (save securely)

2. After creation, collect these values:
   - Project URL (SUPABASE_URL)
   - Anon key (SUPABASE_ANON_KEY)
   - Service role key (SUPABASE_SERVICE_ROLE_KEY)
   - JWT secret (SUPABASE_JWT_SECRET)
   - Database connection strings (pooler and direct)

#### Task 1.1.2: Create Database Schema

Create these migration files in `/supabase/migrations/`:

**File: 00001_create_extensions.sql**
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'pending');
CREATE TYPE content_status AS ENUM ('draft', 'processing', 'completed', 'failed');
```

Then create all tables as specified in `/docs/rebuild-plan/01-SUPABASE_MIGRATION.md` Section 4.

#### Task 1.1.3: Create Supabase Client Configuration

Create file `/server/config/supabase.ts`:

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@shared/types/database.types';
import { env } from './index';

export function createServiceClient(): SupabaseClient<Database> {
  return createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export const supabase = createServiceClient();
```

#### Task 1.1.4: Update Environment Configuration

Update `/server/config/index.ts` to include Supabase environment variables:

```typescript
const envSchema = z.object({
  // ... existing vars ...
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
});
```

#### Task 1.1.5: Generate TypeScript Types

Run type generation:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > shared/types/database.types.ts
```

### Verification Checklist

- [ ] Supabase project created and accessible
- [ ] All migration files created
- [ ] Migrations applied successfully (`npx supabase db push`)
- [ ] Supabase client configuration created
- [ ] Environment variables documented
- [ ] TypeScript types generated
- [ ] Connection test passes

### Verification Test

Create and run `/tests/integration/supabase-connection.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { supabase } from '@server/config/supabase';

describe('Supabase Connection', () => {
  it('should connect to database', async () => {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    expect(error).toBeNull();
  });

  it('should have vector extension', async () => {
    const { data, error } = await supabase.rpc('check_vector_extension');
    expect(error).toBeNull();
  });
});
```

### Success Criteria

1. All tables created with correct schema
2. RLS enabled on all tables
3. Indexes created for performance
4. TypeScript types match schema
5. Connection test passes
6. No console errors on startup

### Next Step

After completing this task, proceed to `PHASE1_02_STRUCTURED_LOGGING.md`
