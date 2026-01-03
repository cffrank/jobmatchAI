-- Fix users_fts virtual table to remove invalid content= parameter
-- The users table has column "id" but FTS expects "user_id" causing errors

-- Drop existing FTS table and triggers
DROP TRIGGER IF EXISTS users_fts_update;
DROP TRIGGER IF EXISTS users_fts_delete;
DROP TRIGGER IF EXISTS users_fts_insert;
DROP TABLE IF EXISTS users_fts;

-- Recreate users_fts WITHOUT content= parameter (standalone FTS table)
CREATE VIRTUAL TABLE users_fts USING fts5(
    user_id UNINDEXED,
    first_name,
    last_name,
    email,
    current_title,
    professional_summary
    -- Removed: content=users, content_rowid=rowid
);

-- Recreate triggers to keep FTS in sync
CREATE TRIGGER users_fts_insert AFTER INSERT ON users BEGIN
    INSERT INTO users_fts(rowid, user_id, first_name, last_name, email, current_title, professional_summary)
    VALUES (new.rowid, new.id, new.first_name, new.last_name, new.email, new.current_title, new.professional_summary);
END;

CREATE TRIGGER users_fts_delete AFTER DELETE ON users BEGIN
    DELETE FROM users_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER users_fts_update AFTER UPDATE ON users BEGIN
    DELETE FROM users_fts WHERE rowid = old.rowid;
    INSERT INTO users_fts(rowid, user_id, first_name, last_name, email, current_title, professional_summary)
    VALUES (new.rowid, new.id, new.first_name, new.last_name, new.email, new.current_title, new.professional_summary);
END;

-- Rebuild FTS index from existing users
INSERT INTO users_fts(rowid, user_id, first_name, last_name, email, current_title, professional_summary)
SELECT rowid, id, first_name, last_name, email, current_title, professional_summary
FROM users;
