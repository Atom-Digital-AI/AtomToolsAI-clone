-- Enable pgvector extension for vector embeddings
-- This must be run before any tables using the vector type are created
-- Neon supports pgvector natively, but the extension must be enabled first

CREATE EXTENSION IF NOT EXISTS vector;
