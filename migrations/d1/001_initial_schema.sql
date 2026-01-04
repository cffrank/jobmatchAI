-- =====================================================================
-- JobMatch AI - D1 Initial Schema Migration
-- =====================================================================
-- Migration from PostgreSQL (Supabase) to SQLite (D1)
-- Created: 2025-12-31
-- PostgreSQL Tables: 26
-- SQLite Tables: 26 + 3 FTS5 virtual tables
--
-- Key Conversions:
-- - UUID → TEXT (use crypto.randomUUID() in Workers)
-- - JSONB → TEXT (store as JSON strings, parse in application)
-- - Arrays[] → TEXT (store as JSON arrays)
-- - timestamp with time zone → TEXT (ISO 8601 format)
-- - inet (IP address) → TEXT
-- - tsvector → Removed (replaced with FTS5 virtual tables)
-- - pgvector embeddings → Removed (migrated to Vectorize in Phase 3)
--
-- RLS Policies: 184 policies removed (will implement in app layer)
-- =====================================================================

-- Disable foreign key checks during migration
PRAGMA foreign_keys = OFF;

-- =====================================================================
-- CORE USER TABLES
-- =====================================================================

-- Users table (core user profiles)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    current_title TEXT,
    professional_summary TEXT,
    location TEXT,
    linkedin_url TEXT,
    photo_url TEXT,
    years_of_experience INTEGER,
    two_factor_enabled INTEGER DEFAULT 0, -- Boolean as INTEGER (0/1)
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Work Experience
CREATE TABLE IF NOT EXISTS work_experience (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    location TEXT,
    employment_type TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT,
    is_current INTEGER DEFAULT 0,
    description TEXT,
    accomplishments TEXT, -- JSON array stored as TEXT
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_work_experience_user_id ON work_experience(user_id);
CREATE INDEX idx_work_experience_is_current ON work_experience(user_id, is_current);

-- Education
CREATE TABLE IF NOT EXISTS education (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    institution TEXT NOT NULL,
    degree TEXT,
    field_of_study TEXT,
    grade TEXT,
    start_date TEXT,
    end_date TEXT,
    is_current INTEGER DEFAULT 0,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_education_user_id ON education(user_id);

-- Skills
CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    proficiency_level TEXT CHECK(proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    years_of_experience INTEGER,
    endorsed_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_skills_user_id ON skills(user_id);
CREATE INDEX idx_skills_name ON skills(name);

-- Resumes
CREATE TABLE IF NOT EXISTS resumes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('master', 'tailored')) DEFAULT 'master',
    sections TEXT NOT NULL, -- JSON stored as TEXT
    formats TEXT, -- JSON array of format strings
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_type ON resumes(user_id, type);

-- =====================================================================
-- JOB TABLES
-- =====================================================================

-- Jobs table (job listings)
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    description TEXT,
    url TEXT,
    source TEXT,
    job_type TEXT CHECK(job_type IN ('full-time', 'part-time', 'contract', 'internship', 'temporary', 'remote')),
    experience_level TEXT CHECK(experience_level IN ('entry', 'mid', 'senior', 'lead', 'executive')),
    salary_min REAL,
    salary_max REAL,
    posted_at TEXT,
    expires_at TEXT,
    last_seen_at TEXT,
    added_at TEXT NOT NULL DEFAULT (datetime('now')),

    -- Matching & Quality
    match_score REAL,
    match_explanation TEXT, -- JSON stored as TEXT
    match_algorithm_version TEXT,
    match_computed_at TEXT,
    quality_score REAL,

    -- Deduplication
    canonical_job_id TEXT,
    canonical_hash TEXT,
    dedup_status TEXT CHECK(dedup_status IN ('canonical', 'duplicate', 'merged', 'unique', 'pending')),
    dedup_confidence REAL,
    all_sources TEXT, -- JSON stored as TEXT

    -- Spam Detection
    spam_status TEXT CHECK(spam_status IN ('clean', 'suspicious', 'spam', 'scam', 'expired', 'pending_review', 'manually_approved', 'manually_rejected')),
    spam_score REAL,
    spam_probability REAL,
    spam_detected INTEGER DEFAULT 0,
    spam_categories TEXT, -- JSON array stored as TEXT
    spam_flags TEXT, -- JSON stored as TEXT
    spam_metadata TEXT, -- JSON stored as TEXT
    spam_analyzed_at TEXT,

    -- User Actions
    saved INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0,
    is_closed INTEGER DEFAULT 0,

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (canonical_job_id) REFERENCES jobs(id) ON DELETE SET NULL
);

CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_title ON jobs(title);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_match_score ON jobs(user_id, match_score DESC);
CREATE INDEX idx_jobs_saved ON jobs(user_id, saved);
CREATE INDEX idx_jobs_archived ON jobs(user_id, archived);
CREATE INDEX idx_jobs_canonical_hash ON jobs(canonical_hash);
CREATE INDEX idx_jobs_canonical_job_id ON jobs(canonical_job_id);
CREATE INDEX idx_jobs_spam_status ON jobs(spam_status);
CREATE INDEX idx_jobs_posted_at ON jobs(posted_at DESC);

-- Job Preferences
CREATE TABLE IF NOT EXISTS job_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    desired_titles TEXT NOT NULL, -- JSON array stored as TEXT
    desired_locations TEXT, -- JSON array stored as TEXT
    keywords TEXT, -- JSON array stored as TEXT
    exclude_keywords TEXT, -- JSON array stored as TEXT
    job_types TEXT, -- JSON array stored as TEXT
    experience_levels TEXT, -- JSON array stored as TEXT
    work_arrangement TEXT, -- JSON array stored as TEXT
    industries TEXT, -- JSON array stored as TEXT
    company_sizes TEXT, -- JSON array stored as TEXT
    benefits TEXT, -- JSON array stored as TEXT
    salary_min REAL,
    salary_max REAL,
    auto_search_enabled INTEGER DEFAULT 0,
    notification_frequency TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_job_preferences_user_id ON job_preferences(user_id);

-- Job Compatibility Analyses
CREATE TABLE IF NOT EXISTS job_compatibility_analyses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    analysis TEXT NOT NULL, -- JSON stored as TEXT
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX idx_job_compatibility_user_id ON job_compatibility_analyses(user_id);
CREATE INDEX idx_job_compatibility_job_id ON job_compatibility_analyses(job_id);
CREATE UNIQUE INDEX idx_job_compatibility_user_job ON job_compatibility_analyses(user_id, job_id);

-- Job Feedback
CREATE TABLE IF NOT EXISTS job_feedback (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    feedback_type TEXT NOT NULL CHECK(feedback_type IN ('thumbs_up', 'thumbs_down', 'not_interested', 'applied', 'saved', 'hidden', 'reported_spam', 'reported_scam', 'reported_expired')),
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    reasons TEXT, -- JSON array stored as TEXT
    comment TEXT,
    context TEXT, -- JSON stored as TEXT
    used_for_training INTEGER DEFAULT 0,
    training_batch_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX idx_job_feedback_user_id ON job_feedback(user_id);
CREATE INDEX idx_job_feedback_job_id ON job_feedback(job_id);
CREATE INDEX idx_job_feedback_type ON job_feedback(feedback_type);

-- Job Duplicates
CREATE TABLE IF NOT EXISTS job_duplicates (
    id TEXT PRIMARY KEY,
    canonical_job_id TEXT NOT NULL,
    duplicate_job_id TEXT NOT NULL,
    overall_similarity REAL NOT NULL,
    title_similarity REAL NOT NULL,
    company_similarity REAL NOT NULL,
    location_similarity REAL NOT NULL,
    description_similarity REAL NOT NULL,
    matched_fields TEXT, -- JSON array stored as TEXT
    detection_method TEXT NOT NULL,
    confidence_level TEXT NOT NULL,
    confidence_score REAL,
    detection_date TEXT NOT NULL DEFAULT (datetime('now')),
    detected_at TEXT,
    manually_confirmed INTEGER DEFAULT 0,
    confirmed_by TEXT,
    confirmed_at TEXT,
    merged_by TEXT,
    merged_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (canonical_job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (duplicate_job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_job_duplicates_canonical ON job_duplicates(canonical_job_id);
CREATE INDEX idx_job_duplicates_duplicate ON job_duplicates(duplicate_job_id);
CREATE INDEX idx_job_duplicates_similarity ON job_duplicates(overall_similarity DESC);

-- Canonical Job Metadata
CREATE TABLE IF NOT EXISTS canonical_job_metadata (
    job_id TEXT PRIMARY KEY,
    is_canonical INTEGER DEFAULT 1,
    duplicate_count INTEGER,
    source_type TEXT,
    source_reliability_score REAL NOT NULL DEFAULT 0.5,
    completeness_score REAL NOT NULL DEFAULT 0.0,
    freshness_score REAL NOT NULL DEFAULT 0.0,
    overall_quality_score REAL NOT NULL DEFAULT 0.0,
    has_url INTEGER,
    has_salary_range INTEGER,
    field_count INTEGER,
    description_length INTEGER,
    calculated_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX idx_canonical_metadata_quality ON canonical_job_metadata(overall_quality_score DESC);
CREATE INDEX idx_canonical_metadata_canonical ON canonical_job_metadata(is_canonical);

-- Spam Reports
CREATE TABLE IF NOT EXISTS spam_reports (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    reporter_user_id TEXT,
    report_type TEXT NOT NULL,
    reason TEXT,
    details TEXT, -- JSON stored as TEXT
    review_status TEXT NOT NULL DEFAULT 'pending',
    reviewed_by TEXT,
    reviewed_at TEXT,
    review_notes TEXT,
    action_taken TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_spam_reports_job_id ON spam_reports(job_id);
CREATE INDEX idx_spam_reports_reporter ON spam_reports(reporter_user_id);
CREATE INDEX idx_spam_reports_status ON spam_reports(review_status);

-- Match Quality Metrics
CREATE TABLE IF NOT EXISTS match_quality_metrics (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    algorithm_version TEXT NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    total_jobs_shown INTEGER,
    jobs_clicked INTEGER,
    jobs_saved INTEGER,
    jobs_applied INTEGER,
    jobs_hidden INTEGER,
    click_through_rate REAL,
    save_rate REAL,
    apply_rate REAL,
    avg_match_score_clicked REAL,
    avg_match_score_saved REAL,
    avg_match_score_applied REAL,
    avg_match_score_hidden REAL,
    thumbs_up_count INTEGER,
    thumbs_down_count INTEGER,
    positive_feedback_rate REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_match_metrics_user_id ON match_quality_metrics(user_id);
CREATE INDEX idx_match_metrics_period ON match_quality_metrics(period_start, period_end);

-- =====================================================================
-- APPLICATION TABLES
-- =====================================================================

-- Applications
CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    job_id TEXT,
    status TEXT CHECK(status IN ('draft', 'ready', 'submitted', 'interviewing', 'offered', 'accepted', 'rejected', 'withdrawn')) DEFAULT 'draft',
    cover_letter TEXT,
    custom_resume TEXT,
    variants TEXT, -- JSON stored as TEXT
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
);

CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_status ON applications(user_id, status);

-- Tracked Applications (enhanced tracking)
CREATE TABLE IF NOT EXISTS tracked_applications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    application_id TEXT,
    job_id TEXT,
    job_title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    status TEXT NOT NULL CHECK(status IN ('applied', 'screening', 'interview_scheduled', 'interview_completed', 'offer', 'accepted', 'rejected', 'withdrawn')) DEFAULT 'applied',
    applied_date TEXT,
    match_score REAL,

    -- Contact Information
    recruiter TEXT, -- JSON stored as TEXT (name, email, phone, linkedin)
    hiring_manager TEXT, -- JSON stored as TEXT

    -- Interview Details
    interviews TEXT, -- JSON array of interview objects
    next_interview_date TEXT,

    -- Follow-ups
    next_action TEXT,
    next_action_date TEXT,
    follow_up_actions TEXT, -- JSON array

    -- Offer Details
    offer_details TEXT, -- JSON stored as TEXT

    -- Notes & History
    notes TEXT,
    tags TEXT, -- JSON array stored as TEXT
    activity_log TEXT, -- JSON array of activity objects
    status_history TEXT, -- JSON array of status changes

    archived INTEGER DEFAULT 0,
    last_updated TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
);

CREATE INDEX idx_tracked_applications_user_id ON tracked_applications(user_id);
CREATE INDEX idx_tracked_applications_status ON tracked_applications(user_id, status);
CREATE INDEX idx_tracked_applications_next_interview ON tracked_applications(user_id, next_interview_date);
CREATE INDEX idx_tracked_applications_next_action ON tracked_applications(user_id, next_action_date);

-- =====================================================================
-- AUTHENTICATION & SECURITY TABLES
-- =====================================================================

-- Sessions (active user sessions)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    device_type TEXT CHECK(device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
    device TEXT,
    browser TEXT,
    os TEXT,
    location TEXT,
    last_active TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Failed Login Attempts
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    metadata TEXT, -- JSON stored as TEXT
    attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_failed_logins_email ON failed_login_attempts(email);
CREATE INDEX idx_failed_logins_ip ON failed_login_attempts(ip_address);
CREATE INDEX idx_failed_logins_attempted_at ON failed_login_attempts(attempted_at);

-- Account Lockouts
CREATE TABLE IF NOT EXISTS account_lockouts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    locked_until TEXT NOT NULL,
    failed_attempt_count INTEGER NOT NULL DEFAULT 0,
    reason TEXT,
    locked_at TEXT,
    unlocked_at TEXT,
    unlocked_by TEXT,
    FOREIGN KEY (unlocked_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_lockouts_email ON account_lockouts(email);
CREATE INDEX idx_lockouts_locked_until ON account_lockouts(locked_until);

-- Security Events
CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('success', 'failed')),
    ip_address TEXT,
    user_agent TEXT,
    device TEXT,
    browser TEXT,
    os TEXT,
    location TEXT,
    metadata TEXT, -- JSON stored as TEXT
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_action ON security_events(action);
CREATE INDEX idx_security_events_timestamp ON security_events(timestamp DESC);

-- =====================================================================
-- BILLING & SUBSCRIPTION TABLES
-- =====================================================================

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start TEXT NOT NULL,
    current_period_end TEXT NOT NULL,
    cancel_at_period_end INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'card',
    stripe_payment_method_id TEXT,
    brand TEXT,
    last4 TEXT,
    exp_month INTEGER,
    exp_year INTEGER,
    is_default INTEGER DEFAULT 0,
    added_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_default ON payment_methods(user_id, is_default);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subscription_id TEXT,
    stripe_invoice_id TEXT,
    invoice_number TEXT,
    invoice_date TEXT NOT NULL,
    due_date TEXT,
    amount_due REAL NOT NULL,
    amount_paid REAL NOT NULL DEFAULT 0.0,
    currency TEXT DEFAULT 'usd',
    status TEXT NOT NULL,
    paid_at TEXT,
    hosted_invoice_url TEXT,
    invoice_pdf_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
);

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Usage Limits
CREATE TABLE IF NOT EXISTS usage_limits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    ai_generations_used INTEGER DEFAULT 0,
    ai_generations_limit INTEGER,
    job_searches_used INTEGER DEFAULT 0,
    job_searches_limit INTEGER,
    emails_sent_used INTEGER DEFAULT 0,
    emails_sent_limit INTEGER,
    period_start TEXT,
    period_end TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
);

CREATE INDEX idx_usage_limits_user_id ON usage_limits(user_id);

-- =====================================================================
-- COMMUNICATION TABLES
-- =====================================================================

-- Email History
CREATE TABLE IF NOT EXISTS email_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    application_id TEXT,
    to_address TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')) DEFAULT 'pending',
    sent_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
);

CREATE INDEX idx_email_history_user_id ON email_history(user_id);
CREATE INDEX idx_email_history_application_id ON email_history(application_id);
CREATE INDEX idx_email_history_status ON email_history(status);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    action_text TEXT,
    read INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- =====================================================================
-- FULL-TEXT SEARCH (FTS5 Virtual Tables)
-- =====================================================================
-- These replace PostgreSQL tsvector columns for full-text search

-- Jobs Full-Text Search
CREATE VIRTUAL TABLE IF NOT EXISTS jobs_fts USING fts5(
    job_id UNINDEXED,
    title,
    company,
    description,
    content=jobs,
    content_rowid=rowid
);

-- Triggers to keep FTS5 in sync with jobs table
CREATE TRIGGER IF NOT EXISTS jobs_fts_insert AFTER INSERT ON jobs BEGIN
    INSERT INTO jobs_fts(rowid, job_id, title, company, description)
    VALUES (new.rowid, new.id, new.title, new.company, new.description);
END;

CREATE TRIGGER IF NOT EXISTS jobs_fts_delete AFTER DELETE ON jobs BEGIN
    DELETE FROM jobs_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS jobs_fts_update AFTER UPDATE ON jobs BEGIN
    DELETE FROM jobs_fts WHERE rowid = old.rowid;
    INSERT INTO jobs_fts(rowid, job_id, title, company, description)
    VALUES (new.rowid, new.id, new.title, new.company, new.description);
END;

-- Users Full-Text Search (for searching user profiles)
CREATE VIRTUAL TABLE IF NOT EXISTS users_fts USING fts5(
    user_id UNINDEXED,
    first_name,
    last_name,
    email,
    current_title,
    professional_summary,
    content=users,
    content_rowid=rowid
);

CREATE TRIGGER IF NOT EXISTS users_fts_insert AFTER INSERT ON users BEGIN
    INSERT INTO users_fts(rowid, user_id, first_name, last_name, email, current_title, professional_summary)
    VALUES (new.rowid, new.id, new.first_name, new.last_name, new.email, new.current_title, new.professional_summary);
END;

CREATE TRIGGER IF NOT EXISTS users_fts_delete AFTER DELETE ON users BEGIN
    DELETE FROM users_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS users_fts_update AFTER UPDATE ON users BEGIN
    DELETE FROM users_fts WHERE rowid = old.rowid;
    INSERT INTO users_fts(rowid, user_id, first_name, last_name, email, current_title, professional_summary)
    VALUES (new.rowid, new.id, new.first_name, new.last_name, new.email, new.current_title, new.professional_summary);
END;

-- Work Experience Full-Text Search
CREATE VIRTUAL TABLE IF NOT EXISTS work_experience_fts USING fts5(
    work_id UNINDEXED,
    user_id UNINDEXED,
    company,
    title,
    description,
    content=work_experience,
    content_rowid=rowid
);

CREATE TRIGGER IF NOT EXISTS work_fts_insert AFTER INSERT ON work_experience BEGIN
    INSERT INTO work_experience_fts(rowid, work_id, user_id, company, title, description)
    VALUES (new.rowid, new.id, new.user_id, new.company, new.title, new.description);
END;

CREATE TRIGGER IF NOT EXISTS work_fts_delete AFTER DELETE ON work_experience BEGIN
    DELETE FROM work_experience_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS work_fts_update AFTER UPDATE ON work_experience BEGIN
    DELETE FROM work_experience_fts WHERE rowid = old.rowid;
    INSERT INTO work_experience_fts(rowid, work_id, user_id, company, title, description)
    VALUES (new.rowid, new.id, new.user_id, new.company, new.title, new.description);
END;

-- Re-enable foreign key checks
PRAGMA foreign_keys = ON;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
-- Total Tables Created: 26
-- Total FTS5 Virtual Tables: 3 (jobs_fts, users_fts, work_experience_fts)
-- Total Indexes: 60+
-- Total Triggers: 9 (for FTS5 sync)
--
-- Notes:
-- - All tables use TEXT for primary keys (UUIDs generated by crypto.randomUUID())
-- - JSON data stored as TEXT (parse with JSON.parse() in application)
-- - Arrays stored as JSON text (parse in application)
-- - Timestamps in ISO 8601 format (YYYY-MM-DDTHH:MM:SS.sssZ)
-- - Boolean values as INTEGER (0 = false, 1 = true)
-- - IP addresses as TEXT (IPv4 or IPv6)
-- - FTS5 replaces tsvector for full-text search
-- - Embeddings removed (migrated to Vectorize in Phase 3)
-- - RLS policies removed (implement in application layer)
--
-- Next Steps:
-- 1. Apply to dev database: wrangler d1 execute jobmatch-dev --file=migrations/d1/001_initial_schema.sql
-- 2. Test with sample data
-- 3. Implement application-layer RLS checks (Phase 3, Task 3.2)
-- 4. Migrate embeddings to Vectorize (Phase 3, Task 3.3)
-- =====================================================================
