-- =====================================================================
-- Fix work_experience FTS column mismatch
-- =====================================================================
-- Issue: FTS table uses 'work_id' but actual table uses 'id'
-- Error: "D1_ERROR: no such column: T.work_id: SQLITE_ERROR"
-- Created: 2026-01-03
--
-- This migration:
-- 1. Drops existing work_experience FTS table and triggers
-- 2. Recreates FTS table with correct column name 'id' instead of 'work_id'
-- 3. Recreates triggers with correct column references
-- 4. Repopulates FTS table from existing data
-- =====================================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS work_fts_insert;
DROP TRIGGER IF EXISTS work_fts_delete;
DROP TRIGGER IF EXISTS work_fts_update;

-- Drop existing FTS table
DROP TABLE IF EXISTS work_experience_fts;

-- Recreate FTS table with correct column name 'id' (not 'work_id')
CREATE VIRTUAL TABLE work_experience_fts USING fts5(
    id UNINDEXED,          -- Changed from 'work_id' to 'id' to match actual column
    user_id UNINDEXED,
    company,
    title,
    description,
    content=work_experience,
    content_rowid=rowid
);

-- Recreate triggers with correct column references
CREATE TRIGGER work_fts_insert AFTER INSERT ON work_experience BEGIN
    INSERT INTO work_experience_fts(rowid, id, user_id, company, title, description)
    VALUES (new.rowid, new.id, new.user_id, new.company, new.title, new.description);
END;

CREATE TRIGGER work_fts_delete AFTER DELETE ON work_experience BEGIN
    DELETE FROM work_experience_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER work_fts_update AFTER UPDATE ON work_experience BEGIN
    DELETE FROM work_experience_fts WHERE rowid = old.rowid;
    INSERT INTO work_experience_fts(rowid, id, user_id, company, title, description)
    VALUES (new.rowid, new.id, new.user_id, new.company, new.title, new.description);
END;

-- Repopulate FTS table from existing work_experience data
INSERT INTO work_experience_fts(rowid, id, user_id, company, title, description)
SELECT rowid, id, user_id, company, title, description FROM work_experience;
