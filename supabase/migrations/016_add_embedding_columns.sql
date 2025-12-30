-- Migration: Add embedding columns for semantic job matching
-- Created: 2025-12-29
-- Description: Adds JSONB columns to store 768-dimensional embedding vectors
--              from Cloudflare Workers AI (@cf/baai/bge-base-en-v1.5 model)
--              for semantic similarity-based job matching.

-- =============================================================================
-- Add embedding column to jobs table
-- =============================================================================

-- Add column (if not exists)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS embedding JSONB DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN jobs.embedding IS '768-dimensional vector from Workers AI (@cf/baai/bge-base-en-v1.5) for semantic job matching. Stored as JSONB array of floats.';

-- Create GIN index for efficient JSONB queries
-- This index helps with existence checks and partial matching
CREATE INDEX IF NOT EXISTS idx_jobs_embedding
ON jobs USING GIN(embedding)
WHERE embedding IS NOT NULL;

-- =============================================================================
-- Add resume_embedding column to users table
-- =============================================================================

-- Add column (if not exists)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS resume_embedding JSONB DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN users.resume_embedding IS '768-dimensional vector of user profile/resume for semantic job matching. Generated from profile headline, summary, work experience, and skills. Stored as JSONB array of floats.';

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_users_resume_embedding
ON users USING GIN(resume_embedding)
WHERE resume_embedding IS NOT NULL;

-- =============================================================================
-- Notes
-- =============================================================================

-- PostgreSQL doesn't have a native vector type in Supabase's version,
-- so we use JSONB to store the embedding arrays. This is compatible with
-- the pgvector extension if we add it later.
--
-- For semantic similarity queries, we'll need to:
-- 1. Fetch embeddings from database
-- 2. Calculate cosine similarity in application code
-- 3. Sort results by similarity score
--
-- Future optimization: Add pgvector extension for native vector operations
-- and create IVFFlat or HNSW indexes for faster similarity search at scale.
--
-- Example pgvector migration (future):
-- CREATE EXTENSION IF NOT EXISTS vector;
-- ALTER TABLE jobs ADD COLUMN embedding_vector vector(768);
-- CREATE INDEX ON jobs USING ivfflat (embedding_vector vector_cosine_ops);
