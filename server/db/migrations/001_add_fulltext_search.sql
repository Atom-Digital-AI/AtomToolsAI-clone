-- Migration: Add Full-Text Search to brand_embeddings
-- Purpose: Enable hybrid search (vector + full-text) for better retrieval
-- Article reference: "Hybrid search gave us 30-40% better retrieval"

-- Step 1: Add tsvector column for full-text search
-- This stores the tokenized and normalized text for fast full-text queries
ALTER TABLE brand_embeddings 
ADD COLUMN IF NOT EXISTS chunk_tsv tsvector 
GENERATED ALWAYS AS (to_tsvector('english', chunk_text)) STORED;

-- Step 2: Create GIN index for fast full-text search
-- GIN (Generalized Inverted Index) is optimized for tsvector
CREATE INDEX IF NOT EXISTS chunk_tsv_idx 
ON brand_embeddings USING GIN(chunk_tsv);

-- Step 3: Create a composite index for filtered full-text search
-- This allows fast queries that filter by user and profile
CREATE INDEX IF NOT EXISTS brand_embeddings_user_profile_tsv_idx 
ON brand_embeddings (user_id, guideline_profile_id, chunk_tsv);

-- Step 4: Add helper function for BM25-like scoring
-- PostgreSQL's ts_rank_cd provides ranking, we normalize it to 0-1
CREATE OR REPLACE FUNCTION bm25_score(
  tsvector_col tsvector,
  query tsquery,
  k1 FLOAT DEFAULT 1.2,
  b FLOAT DEFAULT 0.75
) RETURNS FLOAT AS $$
  -- ts_rank_cd with normalization (32 = normalize by document length)
  SELECT ts_rank_cd(tsvector_col, query, 32);
$$ LANGUAGE SQL IMMUTABLE;

-- Step 5: Create a view for easier hybrid search queries
CREATE OR REPLACE VIEW brand_embeddings_search AS
SELECT 
  id,
  user_id,
  guideline_profile_id,
  context_content_id,
  source_type,
  chunk_text,
  embedding,
  chunk_index,
  metadata,
  chunk_tsv,
  created_at
FROM brand_embeddings;

-- Step 6: Grant necessary permissions (if using role-based access)
-- GRANT SELECT ON brand_embeddings_search TO your_app_role;

-- Migration rollback (if needed):
-- DROP INDEX IF EXISTS chunk_tsv_idx;
-- DROP INDEX IF EXISTS brand_embeddings_user_profile_tsv_idx;
-- DROP FUNCTION IF EXISTS bm25_score(tsvector, tsquery, FLOAT, FLOAT);
-- DROP VIEW IF EXISTS brand_embeddings_search;
-- ALTER TABLE brand_embeddings DROP COLUMN IF EXISTS chunk_tsv;

-- Performance notes:
-- - Initial index creation may take time on large tables (expect ~1-2 min per 100K rows)
-- - The STORED generated column auto-updates on INSERT/UPDATE
-- - GIN index size is typically 50-70% of the original text column size
-- - Full-text queries should complete in <100ms for most datasets
