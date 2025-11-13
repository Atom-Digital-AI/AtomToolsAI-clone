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

