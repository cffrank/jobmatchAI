-- Fix jobs_fts virtual table to remove invalid content= parameter
-- The jobs table has column "id" but FTS expects "job_id" causing errors
-- Error: D1_ERROR: no such column: T.job_id: SQLITE_ERROR
--
-- This is the same issue as 0002_fix_users_fts_content_table.sql
-- Solution: Remove content= parameter and manage FTS table manually via triggers

-- Drop existing triggers
DROP TRIGGER IF EXISTS jobs_fts_update;
DROP TRIGGER IF EXISTS jobs_fts_delete;
DROP TRIGGER IF EXISTS jobs_fts_insert;

-- Drop existing FTS table
DROP TABLE IF EXISTS jobs_fts;

-- Recreate jobs_fts WITHOUT content= parameter (standalone FTS table)
CREATE VIRTUAL TABLE jobs_fts USING fts5(
    job_id UNINDEXED,
    title,
    company,
    description
    -- Removed: content=jobs, content_rowid=rowid
);

-- Recreate triggers to keep FTS in sync
CREATE TRIGGER jobs_fts_insert AFTER INSERT ON jobs BEGIN
    INSERT INTO jobs_fts(rowid, job_id, title, company, description)
    VALUES (new.rowid, new.id, new.title, new.company, new.description);
END;

CREATE TRIGGER jobs_fts_delete AFTER DELETE ON jobs BEGIN
    DELETE FROM jobs_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER jobs_fts_update AFTER UPDATE ON jobs BEGIN
    DELETE FROM jobs_fts WHERE rowid = old.rowid;
    INSERT INTO jobs_fts(rowid, job_id, title, company, description)
    VALUES (new.rowid, new.id, new.title, new.company, new.description);
END;

-- Rebuild FTS index from existing jobs
INSERT INTO jobs_fts(rowid, job_id, title, company, description)
SELECT rowid, id, title, company, description
FROM jobs;
