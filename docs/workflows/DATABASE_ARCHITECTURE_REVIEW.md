# Database Architecture Review - Task List

**Review Date**: December 21, 2025
**Reviewer**: Database Architecture Specialist Agent
**Scope**: Supabase PostgreSQL, RLS Policies, Migrations

---

## Summary

Database has 15 migrations with proper RLS policies, foreign keys, and indexes. Good foundation but needs optimization and monitoring improvements.

**Key Findings**:
- ✅ Good: Proper RLS policies, foreign keys, triggers for updated_at
- ⚠️  Concerns: Missing composite indexes, no query performance monitoring, missing database-level validations
- ❌ Issues: N+1 queries in job matching logic, missing materialized views for analytics

---

## Phase 1: Performance and Indexing

### DB-001: Add Composite Indexes for Common Query Patterns
**Priority**: High
**Category**: Performance
**Estimated Effort**: Small

**Description**:
Missing composite indexes for frequently-used query combinations lead to slow queries.

**Missing Indexes**:
```sql
-- Jobs: frequently filtered by user_id + saved + archived
CREATE INDEX idx_jobs_user_saved ON jobs(user_id, saved, archived);

-- Applications: user_id + status + created_at
CREATE INDEX idx_applications_user_status_date ON applications(user_id, status, created_at DESC);

-- Work experience: user_id + start_date (already exists) + is_current
-- Already covered by existing index

-- Sessions: user_id + expires_at (for cleanup queries)
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at)
  WHERE expires_at > NOW();
```

**Files Affected**:
- Create `/supabase/migrations/013_add_composite_indexes.sql`

**Dependencies**: None

---

### DB-002: Optimize Job Ranking Query (N+1 Problem)
**Priority**: Critical
**Category**: Performance
**Estimated Effort**: Medium

**Description**:
Frontend hook fetches jobs, then separately fetches profile, skills, work_experience for ranking. This creates multiple round trips.

**Current Pattern** (from useJobs.ts):
```typescript
// 1. Fetch jobs
const { data } = await supabase.from('jobs').select('*')...
// 2. Separately fetch profile (N queries)
const { profile } = useProfile()
const { skills } = useSkills()
const { workExperience } = useWorkExperience()
// 3. Rank in client
const ranked = rankJobs(jobs, { user, skills, workExperience })
```

**Recommended Solution**:
- Option A: Create PostgreSQL function to rank jobs server-side
- Option B: Use Supabase RPC to fetch all data in one query
- Option C: Create materialized view with pre-calculated match scores

**Files Affected**:
- Create `/supabase/migrations/014_add_job_ranking_function.sql`
- Update `/src/hooks/useJobs.ts` to use RPC

**Dependencies**: None

---

### DB-003: Add Database-Level Constraints
**Priority**: Medium
**Category**: Data Integrity
**Estimated Effort**: Small

**Description**:
Some validations only exist in application code, not database.

**Missing Constraints**:
```sql
-- Email format validation
ALTER TABLE users
  ADD CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Phone format (if standardized)
ALTER TABLE users
  ADD CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$');

-- Salary range validation
ALTER TABLE jobs
  ADD CONSTRAINT valid_salary_range CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_max >= salary_min);
```

**Files Affected**:
- Create `/supabase/migrations/015_add_constraints.sql`

**Dependencies**: None

---

### DB-004: Implement Partitioning for Large Tables
**Priority**: Low
**Category**: Scalability
**Estimated Effort**: Large

**Description**:
As data grows, tables like `jobs`, `applications`, `email_history` will become large. Partitioning by date would improve query performance.

**Recommended Strategy**:
- Partition `jobs` by added_at (monthly)
- Partition `applications` by created_at (monthly)
- Partition `email_history` by sent_at (monthly)
- Partition `security_events` by timestamp (weekly)

**Files Affected**:
- Requires schema changes and data migration
- Create `/supabase/migrations/016_implement_partitioning.sql`

**Dependencies**: None (but should wait until data volume justifies it)

---

## Phase 2: Data Integrity and Cleanup

### DB-005: Add Soft Delete Pattern
**Priority**: Medium
**Category**: Data Management
**Estimated Effort**: Medium

**Description**:
Currently using hard deletes. Soft deletes would allow data recovery and audit trails.

**Recommended Implementation**:
```sql
-- Add deleted_at column to critical tables
ALTER TABLE jobs ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE applications ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Update RLS policies to filter deleted records
CREATE POLICY "Users can view own non-deleted jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Create restore functions
CREATE FUNCTION restore_job(job_id UUID) RETURNS void AS $$
  UPDATE jobs SET deleted_at = NULL WHERE id = job_id;
$$ LANGUAGE sql SECURITY DEFINER;
```

**Files Affected**:
- Create `/supabase/migrations/017_add_soft_deletes.sql`
- Update all delete operations in frontend/backend

**Dependencies**: None

---

### DB-006: Implement Automated Data Cleanup Jobs
**Priority**: Medium
**Category**: Maintenance
**Estimated Effort**: Medium

**Description**:
No automated cleanup for old data:
- Expired sessions (> 30 days old)
- Archived jobs (> 6 months old)
- Old rate limit records (> 24 hours old)
- Email history (> 1 year old)

**Recommended Solution**:
Use Supabase pg_cron extension or backend scheduled job:

```sql
-- Install pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup jobs
SELECT cron.schedule(
  'cleanup-expired-sessions',
  '0 2 * * *', -- Daily at 2 AM
  $$ DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '30 days' $$
);

SELECT cron.schedule(
  'cleanup-old-rate-limits',
  '*/15 * * * *', -- Every 15 minutes
  $$ DELETE FROM rate_limits WHERE window_end < NOW() - INTERVAL '24 hours' $$
);
```

**Files Affected**:
- Create `/supabase/migrations/018_add_cleanup_jobs.sql`
- Or add to `/backend/src/jobs/scheduled.ts`

**Dependencies**: None

---

### DB-007: Add Database Triggers for Audit Logging
**Priority**: Low
**Category**: Security / Compliance
**Estimated Effort**: Medium

**Description**:
No comprehensive audit trail for sensitive operations (deletes, security changes).

**Recommended Implementation**:
```sql
-- Create audit log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  user_id UUID,
  old_data JSONB,
  new_data JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create trigger function
CREATE OR REPLACE FUNCTION audit_trigger() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, operation, user_id, old_data, new_data)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.user_id, OLD.user_id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to sensitive tables
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

**Files Affected**:
- Create `/supabase/migrations/019_add_audit_logging.sql`

**Dependencies**: None

---

## Phase 3: Analytics and Reporting

### DB-008: Create Materialized Views for Analytics
**Priority**: Medium
**Category**: Performance
**Estimated Effort**: Medium

**Description**:
Analytics queries are slow because they scan entire tables. Materialized views would pre-aggregate data.

**Recommended Views**:
```sql
-- User application stats
CREATE MATERIALIZED VIEW user_application_stats AS
SELECT
  user_id,
  COUNT(*) as total_applications,
  COUNT(*) FILTER (WHERE status = 'submitted') as submitted_count,
  COUNT(*) FILTER (WHERE status = 'interviewing') as interview_count,
  COUNT(*) FILTER (WHERE status = 'offered') as offer_count,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_time_to_submit
FROM applications
GROUP BY user_id;

-- Refresh schedule (daily)
CREATE INDEX ON user_application_stats (user_id);
```

**Files Affected**:
- Create `/supabase/migrations/020_add_materialized_views.sql`
- Add refresh job to scheduled tasks

**Dependencies**: DB-006 (cleanup jobs pattern)

---

### DB-009: Add Full-Text Search Indexes
**Priority**: Medium
**Category**: Performance
**Estimated Effort**: Small

**Description**:
Job search currently uses LIKE queries which are slow. Full-text search would be much faster.

**Recommended Implementation**:
```sql
-- Add tsvector column for full-text search
ALTER TABLE jobs ADD COLUMN search_vector tsvector;

-- Create index
CREATE INDEX idx_jobs_search ON jobs USING GIN(search_vector);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION jobs_search_trigger() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.company, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.requirements, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_jobs_search
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION jobs_search_trigger();
```

**Files Affected**:
- Create `/supabase/migrations/021_add_fulltext_search.sql`
- Update job search queries in frontend/backend

**Dependencies**: None

---

## Phase 4: Security and RLS

### DB-010: Review and Tighten RLS Policies
**Priority**: High
**Category**: Security
**Estimated Effort**: Medium

**Description**:
Some RLS policies may be too permissive or missing.

**Review Checklist**:
- ✅ users table: Properly restricted to own profile
- ✅ work_experience, education, skills: Properly scoped to user
- ⚠️  jobs table: Verify users can only access their own jobs
- ⚠️  applications table: Check for potential leaks via job_id joins
- ⚠️  sessions table: Verify only own sessions accessible
- ❌ rate_limits table: May need RLS policy
- ❌ email_history table: Missing in schema review

**Recommended Actions**:
1. Audit all tables for RLS policies
2. Test with different user contexts
3. Add RLS to any missing tables
4. Document RLS policy decisions

**Files Affected**:
- Create `/supabase/migrations/022_tighten_rls_policies.sql`

**Dependencies**: None

---

### DB-011: Implement Row-Level Encryption for Sensitive Data
**Priority**: Low
**Category**: Security / Compliance
**Estimated Effort**: Large

**Description**:
Consider encrypting sensitive data at rest (resumes, cover letters, personal info).

**Recommended Approach**:
- Use pgcrypto extension
- Encrypt resume content, cover letters
- Store encryption keys in Supabase Vault
- Update queries to decrypt on read

**Files Affected**:
- Create `/supabase/migrations/023_add_encryption.sql`
- Update all queries reading encrypted data

**Dependencies**: None (but coordinate with compliance requirements)

---

## Phase 5: Monitoring and Observability

### DB-012: Enable pg_stat_statements for Query Analysis
**Priority**: High
**Category**: Observability
**Estimated Effort**: Small

**Description**:
Need visibility into slow queries and query patterns.

**Recommended Setup**:
```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Query to find slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time,
  stddev_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**Files Affected**:
- Supabase dashboard configuration
- Create monitoring dashboard

**Dependencies**: None

---

### DB-013: Set Up Database Backup and Recovery Testing
**Priority**: Critical
**Category**: Disaster Recovery
**Estimated Effort**: Small

**Description**:
Verify that Supabase backups are working and test recovery procedures.

**Action Items**:
- Enable daily backups in Supabase dashboard
- Document backup retention policy
- Test point-in-time recovery (PITR)
- Create runbook for data recovery scenarios
- Test restore to staging environment

**Files Affected**:
- Documentation only

**Dependencies**: None

---

## Summary Statistics

**Total Tasks**: 13
**Critical Priority**: 2 tasks
**High Priority**: 3 tasks
**Medium Priority**: 7 tasks
**Low Priority**: 1 task

**Total Estimated Effort**:
- Large: 2 tasks
- Medium: 8 tasks
- Small: 3 tasks

**Recommended Execution Order**:
1. DB-013 (Backup verification) - CRITICAL
2. DB-002 (N+1 query fix) - CRITICAL
3. DB-010 (RLS review) - HIGH
4. DB-001 (Composite indexes) - HIGH
5. DB-012 (Query monitoring) - HIGH
6. DB-003 (Constraints) - MEDIUM
7. DB-005 (Soft deletes) - MEDIUM
8. DB-006 (Cleanup jobs) - MEDIUM
9. DB-009 (Full-text search) - MEDIUM
10. DB-008 (Materialized views) - MEDIUM
11. DB-007 (Audit logging) - LOW
12. DB-004 (Partitioning) - WAIT
13. DB-011 (Encryption) - WAIT

