-- Fix work_experience_fts virtual table to remove invalid content= parameter
-- The work_experience table triggers are causing T.work_id errors
-- Error: D1_ERROR: no such column: T.work_id: SQLITE_ERROR
--
-- This is the same issue as migrations 0002 (users) and 0006 (jobs)
-- Solution: Remove content= parameter and manage FTS table manually via triggers

-- Drop existing triggers
DROP TRIGGER IF EXISTS work_fts_update;
DROP TRIGGER IF EXISTS work_fts_delete;
DROP TRIGGER IF EXISTS work_fts_insert;

-- Drop existing FTS table
DROP TABLE IF EXISTS work_experience_fts;

-- Recreate work_experience_fts WITHOUT content= parameter (standalone FTS table)
CREATE VIRTUAL TABLE work_experience_fts USING fts5(
    id UNINDEXED,
    user_id UNINDEXED,
    company,
    title,
    description
    -- Removed: content=work_experience, content_rowid=rowid
);

-- Recreate triggers to keep FTS in sync
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

-- Rebuild FTS index from existing work_experience records
INSERT INTO work_experience_fts(rowid, id, user_id, company, title, description)
SELECT rowid, id, user_id, company, title, description
FROM work_experience;
