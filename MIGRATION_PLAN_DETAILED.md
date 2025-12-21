# Firebase → Supabase + Railway Migration Plan
## JobMatch AI - Complete Stack Migration

**Status:** Planning Phase
**Last Updated:** 2025-12-20
**Estimated Timeline:** 2-3 weeks (no time constraints)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Target Architecture Design](#target-architecture-design)
4. [8-Phase Migration Breakdown](#8-phase-migration-breakdown)
5. [Dependency Graph](#dependency-graph)
6. [Risk Assessment](#risk-assessment)
7. [Rollback Strategy](#rollback-strategy)

---

## Executive Summary

### Migration Objectives
- ✅ Migrate from Firebase to Supabase + Railway
- ✅ Replace Cloud Firestore with PostgreSQL
- ✅ Replace Cloud Functions with Express.js backend on Railway
- ✅ Maintain LinkedIn OAuth integration
- ✅ NO data migration (fresh start)
- ✅ All-at-once cutover (not phased)

### Key Decisions
- **Database:** Supabase PostgreSQL with Row Level Security (RLS)
- **Backend:** Express.js on Railway (replacing Cloud Functions)
- **Frontend:** Vite + React on Railway (replacing Firebase Hosting)
- **Auth:** Supabase Auth (PostgreSQL-backed, replacing Firebase Auth)
- **Storage:** Supabase Storage (S3-compatible, replacing Firebase Storage)
- **OAuth:** LinkedIn OAuth via Railway backend callback

---

## Current Architecture Analysis

### Firebase Stack Overview

#### **Authentication**
- Firebase Authentication SDK
- Email/password auth
- LinkedIn OAuth via `OAuthProvider('oidc.linkedin')`
- Session management with Firestore-backed session tracking
- Password strength validation with zxcvbn
- Security event logging

**Files:**
- `src/contexts/AuthContext.tsx` - Main auth provider
- `src/lib/sessionManagement.ts` - Session tracking
- `src/lib/securityService.ts` - Security event logging
- `src/lib/passwordValidation.ts` - Password validation

#### **Database (Cloud Firestore)**
Collection structure:
```
users/{userId}/
├── (user profile document)
├── workExperience/{experienceId}
├── education/{educationId}
├── skills/{skillId}
├── jobs/{jobId}                    # User-specific job search results
├── savedJobs/{savedJobId}          # Bookmarked jobs
├── applications/{applicationId}    # Generated applications
│   └── emails/{emailId}            # Email history per application
├── emails/{emailId}                # Top-level emails for rate limiting
├── notifications/{notificationId}
└── sessions/{sessionId}            # Session tracking for security

jobs/ (global collection - not user-specific, may not be used)
```

**Key Features:**
- Subcollections for nested data (workExperience, education, etc.)
- User-specific data isolation (all data under `users/{userId}`)
- Cursor-based pagination (20 items per page, 80-90% read reduction)
- Real-time subscriptions via react-firebase-hooks

**Files:**
- `src/lib/firebase.ts` - Firebase initialization
- `src/hooks/useJobs.ts` - Jobs data hook with pagination
- `src/hooks/useApplications.ts` - Applications data hook with pagination
- `src/hooks/useTrackedApplications.ts` - Application tracking
- `src/hooks/useProfile.ts` - User profile management
- `src/hooks/useWorkExperience.ts` - Work experience CRUD
- `src/hooks/useEducation.ts` - Education CRUD
- `src/hooks/useSkills.ts` - Skills CRUD

#### **Cloud Functions (Backend)**
**Location:** `functions/index.js` (CommonJS)

**Functions:**
1. `generateApplication` (onCall)
   - OpenAI GPT-4o-mini integration
   - Generates 3 application variants (Impact, Keyword, Concise)
   - Fetches user profile, work experience, education, skills from Firestore
   - Rate limited via PostgreSQL-backed rate limiter
   - Secrets: OPENAI_API_KEY

2. `linkedInAuth` (onCall)
   - Initiates LinkedIn OAuth flow
   - Generates CSRF state token
   - Stores state in Firestore with expiration
   - Secrets: LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET

3. `linkedInCallback` (onRequest)
   - Handles LinkedIn OAuth callback
   - Validates CSRF state token
   - Exchanges code for access token
   - Fetches LinkedIn profile (limited to openid, profile, email)
   - Imports data to Firestore
   - Redirects to frontend success/error pages

4. `exportApplication` (onCall)
   - Generates PDF/DOCX exports
   - Uploads to Firebase Storage
   - Returns signed download URL (24-hour expiration)
   - Rate limited

5. `sendApplicationEmail` (onCall)
   - SendGrid integration for email delivery
   - HTML email template with cover letter + resume
   - Rate limited (10 emails/hour per user)
   - Tracks email history in Firestore
   - Secrets: SENDGRID_API_KEY

6. `searchJobsForAllUsers` (scheduled, daily 2 AM)
   - Automated job search for all users
   - Populates user-specific jobs collections

7. `cleanupOAuthStates` (scheduled, hourly)
   - Removes expired OAuth state tokens

8. `onUserCreate` (trigger)
   - Initial job search on user signup

9. `onFileUpload` (trigger)
   - File validation and security scanning

**Files:**
- `functions/index.js` - Main functions export
- `functions/lib/validation.js` - Zod schema validation
- `functions/lib/rateLimiter.js` - PostgreSQL-backed rate limiting
- `functions/lib/securityLogger.js` - Security event logging
- `functions/lib/oauthStateManagement.js` - OAuth state management
- `functions/lib/redirectValidator.js` - URL redirect validation
- `functions/lib/pdfGenerator.js` - PDF generation
- `functions/lib/docxGenerator.js` - DOCX generation
- `functions/scheduled/searchJobsForAllUsers.js`
- `functions/scheduled/cleanupOAuthStates.js`
- `functions/triggers/onUserCreate.js`
- `functions/triggers/onFileUpload.js`

#### **Frontend (Vite + React)**
- React 19 with React Router DOM 7
- Tailwind CSS 3 for styling
- shadcn/ui components (Radix UI primitives)
- Firebase SDK 10.14.1
- react-firebase-hooks for real-time subscriptions
- TypeScript throughout

**Key Libraries:**
- `firebase` - Firebase SDK
- `react-firebase-hooks` - Firestore/Auth hooks
- `zxcvbn` - Password strength validation
- `ua-parser-js` - User agent parsing for session tracking
- `sonner` - Toast notifications

#### **CI/CD (GitHub Actions)**
**File:** `.github/workflows/firebase-deploy.yml`

**Pipeline:**
1. Validation & Build
   - ESLint (frontend + functions)
   - TypeScript compilation
   - Vite build (frontend)
   - Functions build (TypeScript)
   - Firestore/Storage rules validation

2. Security Scanning
   - npm audit (frontend + functions)
   - Blocks deployment on critical vulnerabilities

3. Deploy Preview (PR only)
   - Firebase Hosting preview channels (7-day expiration)
   - Frontend only, no functions

4. Deploy Production (main branch)
   - Firestore rules & indexes
   - Storage rules
   - Cloud Functions (with secrets)
   - Firebase Hosting

5. Post-Deployment Verification
   - Frontend health check (HTTP 200)
   - Manual function verification instructions

**Secrets:**
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- FIREBASE_SERVICE_ACCOUNT (JSON key)

**Firebase Functions Secrets (managed separately):**
- OPENAI_API_KEY
- SENDGRID_API_KEY
- LINKEDIN_CLIENT_ID
- LINKEDIN_CLIENT_SECRET

---

## Target Architecture Design

### Supabase + Railway Stack

#### **Authentication (Supabase Auth)**
- Supabase Auth API (PostgreSQL-backed)
- Email/password auth
- LinkedIn OAuth via Railway backend
- JWT-based sessions (stored in browser, verified by backend)
- Row Level Security (RLS) policies in PostgreSQL

**Migration Changes:**
- Replace Firebase Auth SDK with Supabase JS client
- Update AuthContext to use Supabase auth methods
- Implement JWT verification middleware in Express.js
- Migrate session tracking to PostgreSQL table
- Update security event logging to PostgreSQL

#### **Database (Supabase PostgreSQL)**

**Schema Design (Relational, not subcollections):**

```sql
-- Core user profile
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  profile_image_url TEXT,
  headline TEXT,
  summary TEXT,
  linkedin_imported BOOLEAN DEFAULT false,
  linkedin_imported_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Work experience
CREATE TABLE work_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  current BOOLEAN DEFAULT false,
  accomplishments JSONB, -- Array of strings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Education
CREATE TABLE education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  school TEXT NOT NULL,
  degree TEXT NOT NULL,
  field TEXT,
  location TEXT,
  start_date DATE,
  end_date DATE,
  graduation_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Skills
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  endorsements INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Jobs (user-specific search results)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  work_arrangement TEXT, -- remote, hybrid, onsite
  salary_min INTEGER,
  salary_max INTEGER,
  description TEXT,
  required_skills TEXT[], -- Array of strings
  preferred_skills TEXT[],
  match_score NUMERIC(5,2), -- Pre-calculated match score
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Saved jobs (bookmarks)
CREATE TABLE saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, job_id)
);

-- Applications
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  status TEXT NOT NULL, -- draft, submitted, interviewing, rejected, accepted
  variants JSONB NOT NULL, -- Array of variant objects
  selected_variant_id TEXT NOT NULL,
  edit_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  last_email_sent_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Email history (per application)
CREATE TABLE email_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  include_resume BOOLEAN DEFAULT true,
  include_cover_letter BOOLEAN DEFAULT true,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  status TEXT DEFAULT 'sent', -- sent, failed, bounced
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Email rate limiting (top-level for rate limiter)
CREATE TABLE user_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Security sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Security events
CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- auth, function_call, oauth, validation, security, error
  severity TEXT NOT NULL, -- INFO, WARNING, ERROR, CRITICAL
  message TEXT NOT NULL,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- OAuth state tokens (for CSRF protection)
CREATE TABLE oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  state_token TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL, -- linkedin
  metadata JSONB,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  action_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Rate limiting (unified for all rate-limited operations)
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  operation TEXT NOT NULL, -- generateApplication, exportApplication, sendApplicationEmail, linkedInAuth
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, operation, timestamp)
);

-- Indexes for performance
CREATE INDEX idx_work_experience_user_id ON work_experience(user_id);
CREATE INDEX idx_work_experience_start_date ON work_experience(start_date DESC);
CREATE INDEX idx_education_user_id ON education(user_id);
CREATE INDEX idx_education_end_date ON education(end_date DESC);
CREATE INDEX idx_skills_user_id ON skills(user_id);
CREATE INDEX idx_skills_endorsements ON skills(endorsements DESC);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_match_score ON jobs(match_score DESC);
CREATE INDEX idx_jobs_added_at ON jobs(added_at DESC);
CREATE INDEX idx_saved_jobs_user_id ON saved_jobs(user_id);
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_created_at ON applications(created_at DESC);
CREATE INDEX idx_email_history_application_id ON email_history(application_id);
CREATE INDEX idx_email_history_sent_at ON email_history(sent_at DESC);
CREATE INDEX idx_user_emails_user_id_sent_at ON user_emails(user_id, sent_at);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX idx_oauth_states_state_token ON oauth_states(state_token);
CREATE INDEX idx_oauth_states_expires_at ON oauth_states(expires_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_rate_limits_user_id_operation ON rate_limits(user_id, operation);
CREATE INDEX idx_rate_limits_timestamp ON rate_limits(timestamp);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_experience_updated_at BEFORE UPDATE ON work_experience FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_education_updated_at BEFORE UPDATE ON education FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Row Level Security (RLS) Policies:**

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE education ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
-- Users table
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth_id = auth.uid());
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth_id = auth.uid());

-- Work experience
CREATE POLICY "Users can view own work experience" ON work_experience FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can insert own work experience" ON work_experience FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can update own work experience" ON work_experience FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can delete own work experience" ON work_experience FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Education (similar pattern)
CREATE POLICY "Users can view own education" ON education FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can insert own education" ON education FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can update own education" ON education FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can delete own education" ON education FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Skills (similar pattern)
CREATE POLICY "Users can view own skills" ON skills FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can insert own skills" ON skills FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can update own skills" ON skills FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can delete own skills" ON skills FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Jobs (similar pattern)
CREATE POLICY "Users can view own jobs" ON jobs FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can insert own jobs" ON jobs FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can delete own jobs" ON jobs FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Saved jobs (similar pattern)
CREATE POLICY "Users can view own saved jobs" ON saved_jobs FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can insert own saved jobs" ON saved_jobs FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can delete own saved jobs" ON saved_jobs FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Applications (similar pattern)
CREATE POLICY "Users can view own applications" ON applications FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can insert own applications" ON applications FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can update own applications" ON applications FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can delete own applications" ON applications FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Email history (similar pattern)
CREATE POLICY "Users can view own email history" ON email_history FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can insert own email history" ON email_history FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- User emails (similar pattern)
CREATE POLICY "Users can view own user emails" ON user_emails FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can insert own user emails" ON user_emails FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Sessions (similar pattern)
CREATE POLICY "Users can view own sessions" ON sessions FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can insert own sessions" ON sessions FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can update own sessions" ON sessions FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can delete own sessions" ON sessions FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Security events (similar pattern)
CREATE POLICY "Users can view own security events" ON security_events FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- OAuth states (similar pattern)
CREATE POLICY "Users can view own oauth states" ON oauth_states FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can insert own oauth states" ON oauth_states FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can delete own oauth states" ON oauth_states FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Notifications (similar pattern)
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Rate limits (similar pattern)
CREATE POLICY "Users can view own rate limits" ON rate_limits FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can insert own rate limits" ON rate_limits FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
```

#### **Backend (Express.js on Railway)**

**Structure:**
```
backend/
├── src/
│   ├── index.ts                    # Express server entry point
│   ├── config/
│   │   ├── supabase.ts             # Supabase client initialization
│   │   ├── openai.ts               # OpenAI client initialization
│   │   └── sendgrid.ts             # SendGrid client initialization
│   ├── middleware/
│   │   ├── auth.ts                 # JWT verification middleware
│   │   ├── rateLimit.ts            # Rate limiting middleware (PostgreSQL-backed)
│   │   ├── validation.ts           # Zod schema validation middleware
│   │   └── errorHandler.ts         # Global error handler
│   ├── routes/
│   │   ├── applications.ts         # POST /api/applications/generate
│   │   ├── export.ts               # POST /api/applications/:id/export
│   │   ├── email.ts                # POST /api/applications/:id/send-email
│   │   ├── auth.ts                 # GET /api/auth/linkedin/callback
│   │   └── jobs.ts                 # POST /api/jobs/scrape (scheduled job trigger)
│   ├── services/
│   │   ├── applicationGenerator.ts # OpenAI application generation logic
│   │   ├── linkedInOAuth.ts        # LinkedIn OAuth flow logic
│   │   ├── pdfGenerator.ts         # PDF generation (migrate from functions)
│   │   ├── docxGenerator.ts        # DOCX generation (migrate from functions)
│   │   ├── emailService.ts         # SendGrid email sending
│   │   └── jobScraper.ts           # Job scraping logic (migrate from functions)
│   ├── utils/
│   │   ├── validation.ts           # Zod schemas (migrate from functions)
│   │   ├── securityLogger.ts       # Security event logging (PostgreSQL)
│   │   ├── redirectValidator.ts    # URL redirect validation
│   │   └── oauthState.ts           # OAuth state management (PostgreSQL)
│   └── types/
│       └── index.ts                # TypeScript interfaces
├── package.json
├── tsconfig.json
└── .env.example
```

**API Routes:**

1. `POST /api/applications/generate`
   - Generate application variants for a job
   - Auth: Required (JWT)
   - Rate limited: 10 requests/hour per user
   - Body: `{ jobId: string }`
   - Response: `{ application: GeneratedApplication }`

2. `POST /api/applications/:id/export`
   - Export application as PDF/DOCX
   - Auth: Required (JWT)
   - Rate limited: 20 requests/hour per user
   - Body: `{ format: 'pdf' | 'docx' }`
   - Response: `{ downloadUrl: string, fileName: string, expiresAt: string }`

3. `POST /api/applications/:id/send-email`
   - Send application via email
   - Auth: Required (JWT)
   - Rate limited: 10 emails/hour per user
   - Body: `{ recipientEmail: string }`
   - Response: `{ success: boolean, emailId: string }`

4. `GET /api/auth/linkedin/initiate`
   - Initiate LinkedIn OAuth flow
   - Auth: Required (JWT)
   - Rate limited: 5 requests/hour per user
   - Response: `{ authUrl: string, state: string }`

5. `GET /api/auth/linkedin/callback`
   - Handle LinkedIn OAuth callback
   - Auth: Not required (OAuth flow)
   - Query params: `code`, `state`
   - Redirects to frontend with success/error

6. `POST /api/jobs/scrape`
   - Trigger job scraping for a user
   - Auth: Required (JWT)
   - Body: `{ query: string, location?: string }`
   - Response: `{ jobCount: number }`

7. `GET /api/health`
   - Health check endpoint
   - Auth: Not required
   - Response: `{ status: 'ok', timestamp: string }`

**Middleware:**

```typescript
// auth.ts
export const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Invalid token' })

  req.user = user
  next()
}

// rateLimit.ts
export const rateLimit = (operation: string, maxRequests: number, windowMs: number) => {
  return async (req, res, next) => {
    const userId = req.user.id
    const windowStart = new Date(Date.now() - windowMs)

    const { count } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('operation', operation)
      .gte('timestamp', windowStart.toISOString())

    if (count >= maxRequests) {
      return res.status(429).json({ error: 'Rate limit exceeded' })
    }

    await supabase.from('rate_limits').insert({ user_id: userId, operation })
    next()
  }
}
```

#### **Frontend (Vite + React on Railway)**

**Migration Changes:**

1. Replace Firebase SDK with Supabase JS client
2. Update AuthContext to use Supabase auth methods
3. Replace Firestore queries with PostgreSQL queries via Supabase client
4. Replace Firestore pagination (cursor-based) with LIMIT/OFFSET
5. Replace react-firebase-hooks with custom hooks using Supabase realtime subscriptions
6. Update all custom hooks to use Supabase client

**Key Files to Update:**

```typescript
// src/lib/supabase.ts (NEW - replaces src/lib/firebase.ts)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// src/contexts/AuthContext.tsx (UPDATE)
// Replace Firebase auth methods with Supabase auth methods
const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

const signInWithLinkedIn = async () => {
  // Call backend to get LinkedIn auth URL
  const response = await fetch(`${API_URL}/api/auth/linkedin/initiate`, {
    headers: { Authorization: `Bearer ${session.access_token}` }
  })
  const { authUrl } = await response.json()
  window.location.href = authUrl
}

// src/hooks/useJobs.ts (UPDATE)
// Replace Firestore query with PostgreSQL query
const { data: jobs, error } = await supabase
  .from('jobs')
  .select('*')
  .eq('user_id', user.id)
  .order('match_score', { ascending: false })
  .order('added_at', { ascending: false })
  .range(page * pageSize, (page + 1) * pageSize - 1)

// src/hooks/useApplications.ts (UPDATE)
// Similar PostgreSQL query pattern
const { data: applications, error } = await supabase
  .from('applications')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .range(page * pageSize, (page + 1) * pageSize - 1)
```

**Dependencies to Add:**
- `@supabase/supabase-js` - Supabase client
- Remove: `firebase`, `react-firebase-hooks`

**Environment Variables:**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://your-backend.railway.app
```

#### **Railway Deployment**

**Projects:**
1. Backend (Express.js)
   - Environment: Node.js 20
   - Build command: `npm run build`
   - Start command: `npm start`
   - Domain: `jobmatch-api.railway.app`
   - Environment variables:
     - SUPABASE_URL
     - SUPABASE_SERVICE_ROLE_KEY
     - OPENAI_API_KEY
     - SENDGRID_API_KEY
     - LINKEDIN_CLIENT_ID
     - LINKEDIN_CLIENT_SECRET
     - JWT_SECRET

2. Frontend (Vite + React)
   - Environment: Node.js 20
   - Build command: `npm run build`
   - Serve: Static files from `dist/`
   - Domain: `jobmatch-ai.railway.app`
   - Environment variables:
     - VITE_SUPABASE_URL
     - VITE_SUPABASE_ANON_KEY
     - VITE_API_URL

**CI/CD (GitHub Actions → Railway):**

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
        working-directory: backend
      - run: npm run build
        working-directory: backend
      - run: npm run test
        working-directory: backend
      - uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: backend

  deploy-frontend:
    runs-on: ubuntu-latest
    needs: deploy-backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
      - uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: frontend
```

---

## 8-Phase Migration Breakdown

### **Phase 1: Supabase Database Setup** (3-4 days)

**Objective:** Design and implement PostgreSQL schema with RLS policies

**Tasks:**
1. ✅ Create Supabase project
2. ✅ Design PostgreSQL schema (relational, not subcollections)
3. ✅ Implement Row Level Security (RLS) policies
4. ✅ Create indexes for performance optimization
5. ✅ Set up triggers for `updated_at` automation
6. ✅ Write SQL migration scripts
7. ✅ Test schema with sample data
8. ✅ Document schema and RLS policies

**Specialist Agent:** `database-architect` (Opus)

**Deliverables:**
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_rls_policies.sql`
- `supabase/migrations/003_indexes.sql`
- `SUPABASE_SCHEMA.md` - Schema documentation

**Acceptance Criteria:**
- All tables created with proper foreign keys
- RLS policies enforce user data isolation
- Indexes created for all frequently queried columns
- Sample data successfully inserted and queried

---

### **Phase 2: Railway Backend Setup** (5-7 days)

**Objective:** Build Express.js backend to replace Cloud Functions

**Tasks:**
1. ✅ Initialize Express.js project with TypeScript
2. ✅ Set up Supabase client with service role key
3. ✅ Implement authentication middleware (JWT verification)
4. ✅ Implement rate limiting middleware (PostgreSQL-backed)
5. ✅ Migrate validation logic (Zod schemas)
6. ✅ Implement security logging service
7. ✅ Implement API routes:
   - POST /api/applications/generate (OpenAI integration)
   - POST /api/applications/:id/export (PDF/DOCX generation)
   - POST /api/applications/:id/send-email (SendGrid integration)
   - GET /api/auth/linkedin/initiate
   - GET /api/auth/linkedin/callback
   - POST /api/jobs/scrape
   - GET /api/health
8. ✅ Migrate PDF/DOCX generation logic
9. ✅ Write integration tests for all routes
10. ✅ Set up error handling and logging

**Specialist Agent:** `backend-typescript-architect` (Opus)

**Deliverables:**
- `backend/` directory with full Express.js implementation
- `backend/package.json` with all dependencies
- `backend/tsconfig.json` with TypeScript configuration
- `backend/.env.example` with environment variable documentation
- `backend/README.md` with API documentation

**Acceptance Criteria:**
- All API routes respond with correct status codes and data
- Authentication middleware correctly verifies Supabase JWTs
- Rate limiting prevents abuse (enforced via PostgreSQL)
- OpenAI integration generates application variants
- LinkedIn OAuth flow completes successfully
- PDF/DOCX exports generate correctly
- SendGrid emails send successfully
- All tests pass

---

### **Phase 3: Frontend Migration** (5-7 days)

**Objective:** Migrate frontend from Firebase SDK to Supabase JS client

**Tasks:**
1. ✅ Install Supabase JS client
2. ✅ Remove Firebase SDK and react-firebase-hooks
3. ✅ Create Supabase client configuration (`src/lib/supabase.ts`)
4. ✅ Update AuthContext:
   - Replace Firebase auth methods with Supabase auth methods
   - Update session management for Supabase sessions
   - Update LinkedIn OAuth flow to use backend API
5. ✅ Update all custom hooks:
   - `useJobs.ts` - Replace Firestore queries with PostgreSQL queries
   - `useApplications.ts` - Replace Firestore queries with PostgreSQL queries
   - `useTrackedApplications.ts` - Replace Firestore queries with PostgreSQL queries
   - `useProfile.ts` - Replace Firestore queries with PostgreSQL queries
   - `useWorkExperience.ts` - Replace Firestore queries with PostgreSQL queries
   - `useEducation.ts` - Replace Firestore queries with PostgreSQL queries
   - `useSkills.ts` - Replace Firestore queries with PostgreSQL queries
   - `useSecuritySettings.ts` - Replace Firestore queries with PostgreSQL queries
6. ✅ Update pagination from cursor-based to LIMIT/OFFSET
7. ✅ Update all component imports and usage
8. ✅ Test all pages and features locally

**Specialist Agent:** `integration-specialist` (Sonnet)

**Deliverables:**
- Updated `src/lib/supabase.ts` (replaces `src/lib/firebase.ts`)
- Updated `src/contexts/AuthContext.tsx`
- Updated all hooks in `src/hooks/`
- Updated `package.json` (remove Firebase, add Supabase)
- Updated `.env.example` with Supabase variables

**Acceptance Criteria:**
- All pages load without errors
- Authentication works (signup, login, logout)
- LinkedIn OAuth redirects to backend and completes successfully
- All data CRUD operations work (jobs, applications, profile, etc.)
- Pagination works correctly
- Real-time subscriptions work (if implemented)
- No Firebase imports remain in codebase

---

### **Phase 4: Railway Frontend Deployment** (2-3 days)

**Objective:** Deploy frontend to Railway and test in production

**Tasks:**
1. ✅ Create Railway project for frontend
2. ✅ Configure build settings (Vite build)
3. ✅ Set environment variables
4. ✅ Configure custom domain (if needed)
5. ✅ Deploy and test
6. ✅ Monitor logs and fix any issues

**Specialist Agent:** `cloud-architect` (Sonnet)

**Deliverables:**
- Railway project configured and deployed
- Custom domain configured (optional)
- Deployment logs showing successful build

**Acceptance Criteria:**
- Frontend accessible at Railway URL
- All pages load correctly
- Environment variables correctly set
- No console errors in production build

---

### **Phase 5: LinkedIn OAuth Configuration** (1-2 days)

**Objective:** Update LinkedIn OAuth app with new Railway backend callback URL

**Tasks:**
1. ✅ Register new LinkedIn OAuth app OR update existing app
2. ✅ Add Railway backend callback URL: `https://jobmatch-api.railway.app/api/auth/linkedin/callback`
3. ✅ Add frontend success/error redirect URLs
4. ✅ Update client ID and secret in Railway backend environment variables
5. ✅ Test OAuth flow end-to-end

**Specialist Agent:** `integration-specialist` (Sonnet)

**Deliverables:**
- LinkedIn OAuth app configured with Railway URLs
- Environment variables updated in Railway

**Acceptance Criteria:**
- LinkedIn OAuth flow initiates from frontend
- User redirected to LinkedIn login
- OAuth callback hits Railway backend
- Profile data imported successfully
- User redirected back to frontend with success message

---

### **Phase 6: Testing & Validation** (3-5 days)

**Objective:** Comprehensive end-to-end testing of all features

**Test Areas:**

1. **Authentication**
   - ✅ Signup (email/password)
   - ✅ Login (email/password)
   - ✅ Logout
   - ✅ Password reset
   - ✅ LinkedIn OAuth
   - ✅ Session management
   - ✅ JWT expiration and refresh

2. **Profile Management**
   - ✅ Create profile
   - ✅ Update profile
   - ✅ LinkedIn import
   - ✅ Work experience CRUD
   - ✅ Education CRUD
   - ✅ Skills CRUD

3. **Job Discovery**
   - ✅ View jobs
   - ✅ Save/unsave jobs
   - ✅ Pagination
   - ✅ Job matching scores

4. **Application Generation**
   - ✅ Generate application variants
   - ✅ Select variant
   - ✅ Edit application
   - ✅ Export PDF/DOCX
   - ✅ Send email

5. **Security**
   - ✅ RLS policies enforce data isolation
   - ✅ Rate limiting prevents abuse
   - ✅ Security events logged
   - ✅ CSRF protection in OAuth

6. **Performance**
   - ✅ Page load times
   - ✅ Database query performance
   - ✅ API response times

**Specialist Agent:** `security-auditor` (Sonnet)

**Deliverables:**
- Test plan document
- Test results report
- Bug fixes for any issues found

**Acceptance Criteria:**
- All tests pass
- No critical bugs
- Performance meets baseline (similar to Firebase)

---

### **Phase 7: CI/CD Pipeline Updates** (2-3 days)

**Objective:** Update GitHub Actions workflows for Railway deployment

**Tasks:**
1. ✅ Create new workflow: `.github/workflows/railway-deploy.yml`
2. ✅ Configure Railway deployment for backend
3. ✅ Configure Railway deployment for frontend
4. ✅ Set up GitHub secrets:
   - RAILWAY_TOKEN
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
   - VITE_API_URL
5. ✅ Test automated deployment
6. ✅ Remove old Firebase workflow

**Specialist Agent:** `cicd-automation-architect` (Haiku)

**Deliverables:**
- `.github/workflows/railway-deploy.yml`
- GitHub secrets configured
- Deployment verified

**Acceptance Criteria:**
- Push to main triggers deployment
- Backend deploys successfully
- Frontend deploys successfully
- Deployment logs show no errors

---

### **Phase 8: Firebase Cleanup** (1-2 days)

**Objective:** Delete Firebase project and remove all Firebase code

**Tasks:**
1. ✅ Verify all functionality on Supabase + Railway
2. ✅ Export any needed data from Firebase (if any)
3. ✅ Delete Firebase project in console
4. ✅ Remove Firebase dependencies from package.json
5. ✅ Delete `functions/` directory
6. ✅ Delete `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`
7. ✅ Delete `.github/workflows/firebase-deploy.yml`
8. ✅ Remove Firebase environment variables from `.env.example`
9. ✅ Update README with new architecture
10. ✅ Clean up all Firebase-related documentation

**Specialist Agent:** Manual (coordinator)

**Deliverables:**
- Firebase project deleted
- All Firebase code removed
- README updated
- Migration complete documentation

**Acceptance Criteria:**
- No Firebase dependencies in package.json
- No Firebase imports in codebase
- Firebase project deleted and billing stopped
- Documentation reflects new architecture

---

## Dependency Graph

```
Phase 1: Database Setup
  └─> Phase 2: Backend Setup (depends on database schema)
        └─> Phase 5: LinkedIn OAuth (depends on backend API)
        └─> Phase 3: Frontend Migration (depends on backend API)
              └─> Phase 4: Frontend Deployment
                    └─> Phase 6: Testing (depends on all deployments)
                          └─> Phase 7: CI/CD Updates
                                └─> Phase 8: Firebase Cleanup
```

**Parallel Work Opportunities:**
- Phase 2 (Backend) and Phase 3 (Frontend) can partially overlap after backend structure is established
- Phase 4 (Frontend Deployment) can be done while Phase 5 (LinkedIn OAuth) is in progress
- Phase 7 (CI/CD) can be prepared in parallel with Phase 6 (Testing)

---

## Risk Assessment

### **High Risk**
1. **LinkedIn OAuth Migration**
   - Risk: OAuth callback URL change may break existing user flows
   - Mitigation: Test thoroughly, provide clear user communication
   - Rollback: Revert to Firebase temporarily if critical issues arise

2. **Data Model Mismatch**
   - Risk: Relational PostgreSQL schema may not map cleanly from Firestore subcollections
   - Mitigation: Careful schema design in Phase 1, thorough testing
   - Rollback: None (no data migration), but schema changes may be needed

3. **Performance Degradation**
   - Risk: PostgreSQL queries may be slower than Firestore for certain operations
   - Mitigation: Proper indexing, query optimization, EXPLAIN ANALYZE
   - Rollback: None, optimize queries as needed

### **Medium Risk**
1. **Authentication Session Management**
   - Risk: Session handling differs between Firebase and Supabase
   - Mitigation: Implement session management carefully, test edge cases
   - Rollback: Revert to Firebase Auth temporarily

2. **Rate Limiting**
   - Risk: PostgreSQL-backed rate limiting may have edge cases
   - Mitigation: Test rate limiting thoroughly, monitor in production
   - Rollback: Adjust rate limits or fallback to in-memory rate limiting

3. **Email Delivery**
   - Risk: SendGrid integration may fail in new backend
   - Mitigation: Test email sending thoroughly, monitor SendGrid logs
   - Rollback: None, fix issues as they arise

### **Low Risk**
1. **Frontend Build Issues**
   - Risk: Railway deployment may have build errors
   - Mitigation: Test build locally first, monitor deployment logs
   - Rollback: Redeploy previous version

2. **CI/CD Pipeline**
   - Risk: GitHub Actions workflow may fail
   - Mitigation: Test workflow in separate branch first
   - Rollback: Use manual deployment temporarily

---

## Rollback Strategy

Since this is a **fresh start migration** with no data to migrate, the rollback strategy is straightforward:

### **During Migration (Before Cutover)**
- Firebase remains live and operational
- Supabase + Railway are built and tested in parallel
- Users continue using Firebase until cutover

### **After Cutover (If Critical Issues Arise)**
1. **Immediate Rollback (< 1 hour)**
   - Revert DNS/domain to point back to Firebase Hosting
   - Disable Railway deployments
   - Firebase remains intact and functional

2. **Partial Rollback (1-4 hours)**
   - Identify specific failing component (frontend, backend, database)
   - Rollback only the failing component
   - Keep working components on Supabase + Railway

3. **Full Rollback (> 4 hours)**
   - Revert all DNS/domains to Firebase
   - Keep Supabase + Railway for debugging
   - Fix issues and retry migration

### **No Rollback After Firebase Deletion**
- Once Firebase project is deleted (Phase 8), rollback is not possible
- Only proceed to Phase 8 after extensive testing and user acceptance

---

## Success Metrics

### **Performance**
- ✅ Page load times ≤ Firebase baseline (within 10%)
- ✅ Database query times ≤ 500ms for 90th percentile
- ✅ API response times ≤ 1s for 90th percentile
- ✅ Application generation time ≤ 30s

### **Reliability**
- ✅ Uptime ≥ 99.5%
- ✅ Error rate < 1%
- ✅ Zero data loss
- ✅ Zero authentication failures

### **Security**
- ✅ RLS policies prevent unauthorized access
- ✅ Rate limiting prevents abuse
- ✅ OAuth CSRF protection works
- ✅ Security events logged for audit

### **User Experience**
- ✅ All features work as expected
- ✅ No user-facing errors
- ✅ LinkedIn OAuth completes successfully
- ✅ Application generation produces high-quality output

---

## Next Steps

1. **Review this migration plan** with the user
2. **Launch specialist agents** for Phase 1 and Phase 2:
   - `database-architect` (Opus) for PostgreSQL schema design
   - `backend-typescript-architect` (Opus) for Express.js backend architecture
3. **Begin Phase 1: Supabase Database Setup**
4. **Track progress** using todo list and update this document

---

## Questions for User

Before proceeding, please confirm:

1. ✅ **Fresh start migration:** You're OK with no data migration from Firebase?
2. ✅ **LinkedIn OAuth:** You have access to LinkedIn developer console to update redirect URIs?
3. ✅ **Supabase plan:** Which Supabase pricing tier do you plan to use? (Free, Pro, Team)
4. ✅ **Railway plan:** Which Railway pricing tier do you plan to use? (Free trial, Developer, Team)
5. ✅ **Domain:** Do you want to use a custom domain or Railway subdomain?
6. ✅ **Timeline:** No time constraints - proceed at steady pace with thorough testing?

---

**End of Migration Plan**
