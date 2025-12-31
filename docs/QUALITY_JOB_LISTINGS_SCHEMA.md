# Quality Job Listings & AI Matching - Database Schema

This document describes the database schema changes for Feature 1: Quality Job Listings & AI Matching.

## Overview

The schema additions support four key capabilities:

1. **Job Deduplication Tracking** - Identify and merge duplicate job postings from multiple sources
2. **Spam Detection** - Track spam probability scores and detection metadata
3. **User Feedback System** - Collect feedback on job matches for ML training
4. **Enhanced Matching Metadata** - Store match quality scores and algorithm versioning for A/B testing

## Migration Files

- `020_quality_job_listings_schema.sql` - Main schema (tables, columns, indexes, functions)
- `021_quality_jobs_extensions_and_cleanup.sql` - Extensions, cleanup functions, views

---

## New Enums

### `job_feedback_type`
Types of feedback users can provide on job matches:

| Value | Description |
|-------|-------------|
| `thumbs_up` | User explicitly liked the job match |
| `thumbs_down` | User explicitly disliked the job match |
| `not_interested` | User marked job as not interested |
| `applied` | User applied to the job |
| `saved` | User saved the job for later |
| `hidden` | User hid the job from results |
| `reported_spam` | User reported job as spam |
| `reported_scam` | User reported job as potential scam |
| `reported_expired` | User reported job as already filled/expired |

### `spam_status`
Status of spam detection for a job posting:

| Value | Description |
|-------|-------------|
| `clean` | Job passed all spam checks |
| `suspicious` | Job has some spam indicators |
| `spam` | Job detected as spam |
| `scam` | Job detected as potential scam |
| `expired` | Job detected as expired/filled |
| `pending_review` | Awaiting manual review |
| `manually_approved` | Manually approved after review |
| `manually_rejected` | Manually rejected after review |

### `dedup_status`
Deduplication status for job postings:

| Value | Description |
|-------|-------------|
| `canonical` | This is the primary/canonical version |
| `duplicate` | This is a duplicate of another job |
| `merged` | This job was merged into another |
| `unique` | No duplicates found |
| `pending` | Deduplication check pending |

---

## New Columns on `jobs` Table

### Spam Detection Columns

| Column | Type | Description |
|--------|------|-------------|
| `spam_score` | `NUMERIC(5,2)` | Spam probability score 0-100 (higher = more likely spam) |
| `spam_status` | `spam_status` | Current spam detection status |
| `spam_flags` | `TEXT[]` | Array of detected spam indicators |
| `spam_metadata` | `JSONB` | Detection metadata (model version, timestamp, reasons) |
| `quality_score` | `NUMERIC(5,2)` | Overall listing quality score 0-100 |

### Deduplication Columns

| Column | Type | Description |
|--------|------|-------------|
| `canonical_hash` | `TEXT` | Hash for deduplication (auto-computed) |
| `dedup_status` | `dedup_status` | Deduplication status |
| `canonical_job_id` | `UUID` | Reference to canonical job (for duplicates) |
| `dedup_confidence` | `NUMERIC(5,2)` | Confidence score 0-100 |
| `all_sources` | `JSONB` | All sources where job was found |

### Matching Metadata Columns

| Column | Type | Description |
|--------|------|-------------|
| `match_algorithm_version` | `TEXT` | Version of matching algorithm (e.g., "v2.1.0") |
| `match_explanation` | `JSONB` | Detailed match explanation |
| `match_computed_at` | `TIMESTAMPTZ` | When match score was computed |

### Job Freshness Columns

| Column | Type | Description |
|--------|------|-------------|
| `posted_at` | `TIMESTAMPTZ` | Original posting date from source |
| `expires_at` | `TIMESTAMPTZ` | Estimated expiration date |
| `last_seen_at` | `TIMESTAMPTZ` | Last time job was confirmed active |
| `is_closed` | `BOOLEAN` | Whether job is confirmed filled/closed |

---

## New Tables

### `job_duplicates`

Tracks relationships between duplicate job postings.

```sql
CREATE TABLE job_duplicates (
  id UUID PRIMARY KEY,
  canonical_job_id UUID NOT NULL REFERENCES jobs(id),
  duplicate_job_id UUID NOT NULL REFERENCES jobs(id),
  confidence_score NUMERIC(5,2) NOT NULL,
  detection_method TEXT NOT NULL, -- 'hash_match', 'fuzzy_match', 'ml_model', 'manual'
  matched_fields TEXT[],
  merged_at TIMESTAMPTZ,
  merged_by TEXT,
  detected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

**RLS Policy**: Service role only (system-managed data).

### `job_feedback`

Tracks user feedback on job matches for ML training.

```sql
CREATE TABLE job_feedback (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  job_id UUID NOT NULL REFERENCES jobs(id),
  feedback_type job_feedback_type NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  reasons TEXT[],
  comment TEXT,
  context JSONB, -- Snapshot of match context for ML training
  used_for_training BOOLEAN DEFAULT FALSE,
  training_batch_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Context JSONB Structure**:
```json
{
  "match_score": 85,
  "match_algorithm_version": "v2.1.0",
  "user_skills": ["python", "react"],
  "job_skills": ["python", "java"],
  "search_query": "software engineer",
  "position_in_results": 3
}
```

**RLS Policy**: Users can CRUD their own feedback.

### `spam_reports`

Tracks user reports of spam/scam jobs.

```sql
CREATE TABLE spam_reports (
  id UUID PRIMARY KEY,
  reporter_user_id UUID REFERENCES users(id),
  job_id UUID NOT NULL REFERENCES jobs(id),
  report_type TEXT NOT NULL, -- 'spam', 'scam', 'expired', 'misleading', 'duplicate', 'other'
  reason TEXT,
  details JSONB,
  review_status TEXT DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  review_notes TEXT,
  action_taken TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**RLS Policy**: Users can view/create their own reports. No update/delete.

### `match_quality_metrics`

Aggregated metrics for A/B testing algorithm performance.

```sql
CREATE TABLE match_quality_metrics (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  algorithm_version TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  -- Counts
  total_jobs_shown INTEGER,
  jobs_clicked INTEGER,
  jobs_saved INTEGER,
  jobs_applied INTEGER,
  jobs_hidden INTEGER,
  thumbs_up_count INTEGER,
  thumbs_down_count INTEGER,
  -- Rates
  click_through_rate NUMERIC(5,4),
  save_rate NUMERIC(5,4),
  apply_rate NUMERIC(5,4),
  positive_feedback_rate NUMERIC(5,4),
  -- Average scores
  avg_match_score_clicked NUMERIC(5,2),
  avg_match_score_applied NUMERIC(5,2),
  avg_match_score_hidden NUMERIC(5,2),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**RLS Policy**: Users can view their own metrics. System manages insert/update.

---

## Helper Functions

### `calculate_job_canonical_hash(company, title, location, salary_min, salary_max)`

Calculates a hash for job deduplication based on normalized fields.

```sql
SELECT calculate_job_canonical_hash('Google', 'Software Engineer', 'Mountain View, CA', 150000, 200000);
-- Returns: 'a1b2c3d4e5f6...' (MD5 hash)
```

### `get_job_feedback_summary(job_id)`

Returns aggregated feedback summary for a job.

```sql
SELECT get_job_feedback_summary('job-uuid-here');
-- Returns JSONB:
-- {
--   "total_feedback": 15,
--   "thumbs_up": 10,
--   "thumbs_down": 3,
--   "applied": 5,
--   "saved": 8,
--   "positive_rate": 76.92
-- }
```

### `find_job_duplicates(job_id, min_confidence)`

Finds potential duplicate jobs with confidence scoring.

```sql
SELECT * FROM find_job_duplicates('job-uuid-here', 70);
-- Returns: duplicate_job_id, confidence_score, matched_fields[]
```

### `cleanup_expired_jobs()`

Marks expired jobs as closed. Call hourly via scheduler.

```sql
SELECT cleanup_expired_jobs();
-- Returns: number of jobs marked as expired
```

### `process_pending_deduplication()`

Processes pending job deduplication. Call every 15 minutes.

```sql
SELECT process_pending_deduplication();
-- Returns: number of jobs processed
```

### `recalculate_match_metrics(user_id, algorithm_version, period_start, period_end)`

Recalculates match quality metrics for a user/algorithm/period.

```sql
SELECT recalculate_match_metrics(
  'user-uuid',
  'v2.1.0',
  NOW() - INTERVAL '7 days',
  NOW()
);
-- Returns: metric row ID
```

---

## Views

### `active_quality_jobs`

Clean, active, non-duplicate jobs ready to show to users.

```sql
SELECT * FROM active_quality_jobs WHERE user_id = 'user-uuid';
```

Filters:
- `archived = FALSE`
- `is_closed = FALSE`
- `spam_status = 'clean'`
- `dedup_status IN ('canonical', 'unique')`
- Not expired

### `jobs_pending_spam_review`

Jobs needing spam review (suspicious or with pending reports).

```sql
SELECT * FROM jobs_pending_spam_review;
```

### `algorithm_performance_summary`

A/B testing comparison of algorithm performance.

```sql
SELECT * FROM algorithm_performance_summary;
-- Returns: algorithm_version, users, total_shown, total_applied, avg_apply_rate, etc.
```

---

## Triggers

### Auto-compute Canonical Hash

Automatically computes `canonical_hash` when company, title, location, or salary changes.

```sql
-- Trigger: trg_compute_job_canonical_hash
-- Fires: BEFORE INSERT OR UPDATE OF company, title, location, salary_min, salary_max
```

### Auto-update Spam Status

Automatically updates `spam_status` based on `spam_score`.

```sql
-- Trigger: trg_update_job_spam_status
-- Fires: BEFORE INSERT OR UPDATE OF spam_score
-- Logic:
--   spam_score >= 80 -> 'spam'
--   spam_score >= 50 -> 'suspicious'
--   spam_score < 50  -> 'clean'
```

---

## Indexes

### Spam Detection Indexes

```sql
idx_jobs_spam_score        -- Spam score descending
idx_jobs_spam_status       -- Filter by status
idx_jobs_spam_flags        -- GIN for array search
idx_jobs_quality_score     -- Quality score descending
```

### Deduplication Indexes

```sql
idx_jobs_canonical_hash    -- Hash lookups
idx_jobs_dedup_status      -- Filter by status
idx_jobs_canonical_job_id  -- Find duplicates of canonical
```

### Fuzzy Matching Indexes (pg_trgm)

```sql
idx_jobs_title_trgm        -- Fuzzy title matching
idx_jobs_company_trgm      -- Fuzzy company matching
idx_jobs_location_trgm     -- Fuzzy location matching
```

### Composite Index for Quality Jobs

```sql
idx_jobs_quality_active    -- user_id, quality_score DESC, posted_at DESC
                           -- WHERE spam_status = 'clean'
                           --   AND dedup_status IN ('canonical', 'unique')
                           --   AND is_closed = FALSE
```

---

## Scheduled Maintenance

Recommended scheduler jobs:

| Schedule | Function | Purpose |
|----------|----------|---------|
| Every 15 min | `process_pending_deduplication()` | Process new job deduplication |
| Every hour | `cleanup_expired_jobs()` | Mark old jobs as expired |
| Every hour | `archive_spam_jobs()` | Archive confirmed spam jobs |
| Daily | `cleanup_old_training_feedback(180)` | Clean up old ML training data |
| Weekly | `recalculate_match_metrics(...)` | Update A/B testing metrics |

---

## Usage Examples

### Recording User Feedback

```sql
INSERT INTO job_feedback (user_id, job_id, feedback_type, reasons, context)
VALUES (
  'user-uuid',
  'job-uuid',
  'thumbs_down',
  ARRAY['salary_too_low', 'wrong_location'],
  '{"match_score": 75, "position_in_results": 5}'::jsonb
);
```

### Reporting a Spam Job

```sql
INSERT INTO spam_reports (reporter_user_id, job_id, report_type, reason)
VALUES (
  'user-uuid',
  'job-uuid',
  'scam',
  'Requires upfront payment for training materials'
);
```

### Finding Quality Jobs

```sql
SELECT *
FROM active_quality_jobs
WHERE user_id = 'user-uuid'
ORDER BY match_score DESC NULLS LAST, quality_score DESC
LIMIT 20;
```

### Checking Algorithm Performance

```sql
SELECT
  algorithm_version,
  avg_apply_rate,
  avg_positive_rate,
  total_applied
FROM algorithm_performance_summary
WHERE algorithm_version IN ('v2.0', 'v2.1');
```

---

## Security Considerations

1. **RLS Enabled**: All new tables have Row Level Security policies
2. **User Isolation**: Users can only access their own feedback and reports
3. **Audit Trail**: Spam reports cannot be deleted by users (admin only)
4. **Service Role**: Cleanup functions require service role permissions
5. **Immutable Context**: Feedback context is captured at creation time for ML training integrity

---

## Migration Notes

1. Run migrations in order (020, then 021)
2. The pg_trgm extension requires superuser or the `CREATE EXTENSION` privilege
3. Existing jobs will have `dedup_status = 'pending'` - run `process_pending_deduplication()` to process
4. Schedule maintenance functions after migration
5. Update application code to use new columns and feedback endpoints
