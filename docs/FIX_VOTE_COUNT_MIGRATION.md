# Fix: vote_count Column Missing Error

## Problem
Content Writer v2 workflow fails with error:
```
column "vote_count" does not exist
```

## Root Cause
The migration `003_add_feedback_vote_columns.sql` has not been applied to the production database. The schema in `shared/schema.ts` defines `voteCount: integer("vote_count")`, but the actual database table is missing this column.

## Solution
Apply the migration to add the missing columns to the `content_feedback` table.

## Migration SQL

Run this SQL in your Supabase dashboard SQL Editor:

```sql
-- Migration: Add vote tracking columns to content_feedback table
-- This migration adds voteCount and votedUserIds columns to support
-- deduplication of feedback at the brand level

-- Add vote_count column with default value of 1
ALTER TABLE content_feedback
ADD COLUMN IF NOT EXISTS vote_count INTEGER DEFAULT 1;

-- Add voted_user_ids column with default empty JSONB array
ALTER TABLE content_feedback
ADD COLUMN IF NOT EXISTS voted_user_ids JSONB DEFAULT '[]'::jsonb;

-- Backfill existing records: set vote_count to 1 and voted_user_ids to array containing the original user_id
UPDATE content_feedback
SET 
  vote_count = 1,
  voted_user_ids = jsonb_build_array(user_id)
WHERE vote_count IS NULL OR voted_user_ids IS NULL;

-- Set NOT NULL constraints after backfill
ALTER TABLE content_feedback
ALTER COLUMN vote_count SET NOT NULL,
ALTER COLUMN vote_count SET DEFAULT 1;

ALTER TABLE content_feedback
ALTER COLUMN voted_user_ids SET NOT NULL,
ALTER COLUMN voted_user_ids SET DEFAULT '[]'::jsonb;

-- Add composite index for faster duplicate detection queries
-- This index helps with finding existing feedback by brand, tool type, and rating
CREATE INDEX IF NOT EXISTS idx_content_feedback_brand_tool_rating 
ON content_feedback(guideline_profile_id, tool_type, rating)
WHERE guideline_profile_id IS NOT NULL;

-- Also create index for cases where guideline_profile_id is NULL (global feedback)
CREATE INDEX IF NOT EXISTS idx_content_feedback_global_tool_rating 
ON content_feedback(tool_type, rating)
WHERE guideline_profile_id IS NULL;
```

## Steps to Apply

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Create a new query
5. Copy and paste the SQL above
6. Click **Run**
7. Verify the migration succeeded (should see "Success. No rows returned")

## Verification

After applying the migration, verify the columns exist:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'content_feedback'
  AND column_name IN ('vote_count', 'voted_user_ids')
ORDER BY column_name;
```

You should see both columns listed.

## Testing

After applying the migration:
1. Go to Content Writer v2 in the app
2. Enter a topic and select a brand
3. Click "Generate Article Concepts"
4. The workflow should now complete successfully without the `vote_count` error

## File Location

The migration file is located at:
```
server/db/migrations/003_add_feedback_vote_columns.sql
```

## Additional Notes

- The migration uses `IF NOT EXISTS` clauses to make it safe to run multiple times
- Existing records will be backfilled with `vote_count = 1` and `voted_user_ids = [user_id]`
- The migration also creates indexes for better query performance

