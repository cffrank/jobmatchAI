# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JobMatch AI is an AI-powered job search and application tracking platform with a React frontend and Express backend, using Supabase (PostgreSQL) for data and Railway for hosting.

**Tech Stack:**
- Frontend: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui
- Backend: Node.js 22+, Express, TypeScript
- Database: Cloudflare Di
- AI: OpenAI GPT-4
- Hosting: Cloudflare (backend), Cloudflare (frontend)
- Email: SendGrid
- Job Scraping: Apify

## Common Development Commands

### Frontend Development
```bash
npm run dev              # Start dev server (localhost:5173)
npm run build            # Production build
npm run build:check      # TypeScript check + build
npm run lint             # ESLint
npm run preview          # Preview production build

# E2E Tests (Playwright)
npm run test:e2e         # Run E2E tests
npm run test:e2e:ui      # Run with UI
npm run test:e2e:headed  # Run in browser
```

### Backend Development
```bash
cd backend
npm run dev              # Start dev server with hot reload (localhost:3000)
npm run build            # Compile TypeScript to dist/
npm start                # Run production build
npm run lint             # ESLint
npm run typecheck        # TypeScript type checking

# Testing
npm run test             # Run all tests
npm run test:watch       # Watch mode
npm run test:ui          # Vitest UI
npm run test:coverage    # Coverage report
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:cors        # CORS tests
```

### Database & Utilities
```bash
npm run migrate          # Migrate mock data
npm run create-test-users # Create test users
npm run test:storage     # Test storage
npm run test:auth        # Test Supabase auth
```

## Branch Strategy & Deployment Pipeline

**Three-environment workflow:**
```
feature/x → develop → staging → main
            ↓         ↓          ↓
          dev env  staging   production
```

**Branch conventions:**
- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `hotfix/description` - Urgent production fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation
- `test/description` - Test additions/fixes

**Protected branches:**
- `main` (production) - Requires PR + approval + tests passing
- `staging` (pre-prod) - Requires PR + approval + tests passing
- `develop` (integration) - Requires PR + tests passing

**Always create feature branches from `develop`, not from `main`.**

## Architecture

### Backend Architecture (`backend/src/`)

**Entry Point:** `index.ts`
- Express app with helmet security, CORS, rate limiting
- All endpoints secured with Supabase JWT auth (except /health)
- 

**Routes (`routes/`):**
- `applications.ts` - Application CRUD + AI generation
- `auth.ts` - OAuth (supabase), session management
- `emails.ts` - SendGrid email sending
- `exports.ts` - PDF/DOCX export generation
- `jobs.ts` - Job CRUD + scraping
- `resume.ts` - Resume upload/parsing (with PDF support)

**Services (`services/`):**
- `openai.service.ts` - GPT-4 integration for resume/cover letter generation, job matching, compatibility analysis
- `jobScraper.service.ts` - Apify integration for LinkedIn/Indeed scraping
- `sendgrid.service.ts` - Email sending

**Middleware (`middleware/`):**
- `auth.ts` - Supabase JWT verification
- `errorHandler.ts` - Centralized error handling
- `rateLimiter.ts` - IP-based + user-based rate limiting 
- `loginProtection.ts` - Account lockout protection (5 attempts/15min → 30min lockout)

**Utilities (`lib/`):**
- `sanitize.ts` - Input sanitization for XSS prevention (strict/basic/rich levels)

**Scheduled Jobs (`jobs/`):**
- `scheduled.ts` - Cron jobs for automated job scraping, stale job cleanup

### Frontend Architecture (`src/`)

**Entry:** `main.tsx` → `App.tsx` → `lib/router.tsx`

**Key directories:**
- `sections/` - Feature modules (application-tracker, job-discovery-matching, profile-resume-management, account-billing, application-generator)
- `components/` - Reusable UI components (shadcn/ui based)
- `lib/` - Utilities and services
- `contexts/` - React contexts (auth, theme)
- `hooks/` - Custom React hooks
- `types/` - TypeScript types (including auto-generated Supabase types)
- `pages/` - Route pages

**Important files:**
- `lib/aiGenerator.ts` - Frontend AI generation utilities
- `lib/jobMatching.ts` - Job matching logic
- `lib/securityService.ts` - Security utilities (session management, device tracking)
- `lib/sessionManagement.ts` - 30-minute inactivity timeout logic
- `lib/oauthProfileSync.ts` - LinkedIn OAuth profile synchronization
- `lib/sanitize.ts` - Frontend XSS prevention (DOMPurify)

### Data Model

Generated TypeScript types in `src/types/supabase.ts` from Supabase schema:

**Core tables:**
- `users` - User profiles (links to auth.users)
- `jobs` - Job listings
- `applications` - Job applications (links to jobs + users)
- `resumes` - User resumes
- `rate_limits` - Rate limiting tracking (PostgreSQL-backed)
- `failed_login_attempts` - Tracks all failed login attempts (IP, user agent, timestamp)
- `account_lockouts` - Locked accounts with auto-unlock scheduling
- `sessions` - Active sessions with device info

**All tables enforce Row Level Security (RLS)** - users can only access their own data.


## Environment Variables

### Frontend (`.env.local`)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3000  # or production backend URL
```

### Backend (`backend/.env`)
```bash
NODE_ENV=development
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
APIFY_API_TOKEN=your-apify-token
SENDGRID_API_KEY=your-sendgrid-key
APP_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
```

**Never commit `.env.local` or `backend/.env` to git.**

## Testing Strategy

### Backend Tests (`backend/tests/`)
- **Unit tests** (`tests/unit/`) - Middleware, utilities
- **Integration tests** (`tests/integration/`) - API endpoints, CORS, health checks
- **Production tests** (`tests/api/`) - Test production endpoints

Use Vitest for all backend tests. Tests are located in `backend/tests/`.

### Frontend Tests
- Type checking via `npm run build:check`
- Linting via `npm run lint`
- E2E tests via Playwright (`tests/e2e/` in root)

### Running Individual Tests
```bash
# Backend - run specific test file
cd backend
npm run test -- path/to/test.test.ts

# Frontend E2E - run specific test
npm run test:e2e tests/e2e/your-test.spec.ts
```

## Key Architectural Patterns

### Authentication Flow
1. Frontend authenticates via Supabase auth (email/password or LinkedIn OAuth)
2. Supabase returns JWT token
3. Frontend stores token in localStorage (key: `jobmatch-auth-token`)
4. Backend verifies JWT on each request via `auth.ts` middleware

### AI Generation Flow
1. User requests resume/cover letter generation
2. Frontend calls backend API endpoint (`/api/applications/generate`)
3. Backend fetches user profile + job details from Supabase
4. Backend calls OpenAI service with context
5. OpenAI returns generated content
6. Backend saves to Supabase and returns to frontend

### Job Matching
- AI-powered compatibility analysis in `openai.service.ts:analyzeJobCompatibility()`
- Scoring based on skills, experience, location, salary
- Generates detailed compatibility reports with match percentage

### Rate Limiting
- IP-based limits for unauthenticated requests
- User-based limits for authenticated requests
- Configured in `middleware/rateLimiter.ts`

### Security Features

**Account Lockout Protection:**
- 5 failed login attempts within 15 minutes → 30-minute account lockout
- Automatic unlock after timeout, or manual admin unlock
- Database tables: `failed_login_attempts`, `account_lockouts`
- Middleware: `loginProtection.ts` (checkAccountLockout, recordFailedLogin, clearFailedAttempts)
- Scheduled cleanup jobs run every 15 minutes
- See `docs/LOGIN_PROTECTION_GUIDE.md` for implementation details

**Input Sanitization (XSS Prevention):**
- Backend (primary defense): `backend/src/lib/sanitize.ts` using sanitize-html
- Frontend (defense in depth): `src/lib/sanitize.ts` using DOMPurify
- Three sanitization levels: strict (no HTML), basic (limited formatting), rich (safe links)
- Protects all user-generated content (profiles, work experience, resumes, applications)
- See `docs/INPUT_SANITIZATION_GUIDE.md` for usage

**Session Management:**
- JWT expiry: 7 days (Supabase default)
- Inactivity timeout: 30 minutes (frontend enforcement)
- PKCE flow for OAuth (enhanced security)
- Session tracking in `sessions` table with device info
- Auto-refresh token before expiry
- See `docs/SUPABASE_SESSION_CONFIGURATION.md`

**Other Security Measures:**
- Helmet security headers (CSP, HSTS, X-Frame-Options)
- CORS with strict origin whitelisting (production + specific dev ports only)
- Zod validation for API inputs
- Secure cookie flags (HttpOnly, Secure, SameSite=Lax)
- Automated dependency scanning (GitHub Actions + Dependabot)
- Credential rotation policy (90/180/365-day schedules)

## Migration Notes

## Common Patterns

### Adding a new API endpoint (backend)
1. Create route handler in `backend/src/routes/`
2. Add auth middleware for protected routes
3. Validate input with Zod schema
4. Call service layer if business logic needed
5. Add integration test in `backend/tests/integration/`
6. Update types if needed

### Adding a new feature section (frontend)
1. Create directory in `src/sections/your-feature/`
2. Add components in subdirectory `src/sections/your-feature/components/`
3. Add route in `src/lib/router.tsx`
4. Update types in `src/types/` if needed
5. Add to navigation if applicable

### Database Schema Changes
1. Create migration in `supabase/migrations/`
2. Apply migration to Supabase
3. Regenerate types: Run Supabase CLI to generate new types
4. Update `src/types/supabase.ts` with generated types
5. Update relevant queries/mutations in code

## CI/CD

### Automatic Deployments

GitHub Actions workflows automatically deploy on push:
- `develop` → development environment
- `staging` → staging environment
- `main` → production environment

**Never push directly to protected branches.** Always create PRs.

### Required GitHub Secrets

The following secrets must be configured in GitHub repository settings for CI/CD to work:

**Deployment:**

**Supabase:**
- `SUPABASE_URL` - Production Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key for client-side operations (respects RLS)
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key for backend operations (bypasses RLS, keep secret!)

**Optional (for full integration testing):**
- `OPENAI_API_KEY` - For AI feature testing
- `SENDGRID_API_KEY` - For email testing
- `APIFY_API_TOKEN` - For job scraping tests

See `docs/GITHUB_SECRETS_SETUP.md` for setup instructions.

### Automated Security Scanning

- **Workflow:** `.github/workflows/security-scan.yml`
- **Schedule:** Weekly on Mondays at 9 AM UTC, plus on every push/PR
- **Tools:** npm audit (frontend + backend), Dependabot for automated updates
- **Threshold:** Fails build on moderate+ severity vulnerabilities
- **Scripts:** `npm run audit`, `npm run security:scan`

## Documentation

### Deployment & Infrastructure
- `DEPLOYMENT-WORKFLOW-EXPLAINED.md` - Full deployment pipeline
- `RAILWAY-MULTI-ENVIRONMENT-SETUP.md` - Railway configuration
- `GITHUB-ACTIONS-MULTI-ENV.md` - GitHub Actions workflows
- `ENVIRONMENT-SETUP.md` - Local environment setup
- `GITHUB_SECRETS_SETUP.md` - CI/CD secrets configuration

### Migration to Cloudflare Workers
- `cloudflare-migration/README.md` - Migration overview and getting started guide
- `cloudflare-migration/MIGRATION_STRATEGY.md` - High-level migration approach (8-week timeline)
- `cloudflare-migration/CLOUDFLARE_WORKERS_SETUP.md` - Technical setup guide (Wrangler, Hono, testing)
- `cloudflare-migration/API_MIGRATION_CHECKLIST.md` - Endpoint-by-endpoint migration tasks (18 endpoints)
- `cloudflare-migration/COST_ANALYSIS.md` - Financial comparison ($81/month → $5.50/month = 93% savings)

### Security
- `CREDENTIAL_ROTATION_POLICY.md` - API key rotation schedules (90/180/365-day cycles)
- `LOGIN_PROTECTION_GUIDE.md` - Account lockout implementation
- `INPUT_SANITIZATION_GUIDE.md` - XSS prevention guide
- `SUPABASE_SESSION_CONFIGURATION.md` - Session management details
- `SECURE_COOKIE_CONFIGURATION.md` - Cookie security verification
- `SECURITY_FIXES_SUMMARY.md` - Implemented security fixes
- `STORAGE_POLICIES_SETUP.md` - Supabase Storage RLS policies

### Features
- `LINKEDIN_IMPORT_GUIDE.md` - LinkedIn OAuth integration
- `USER_SPECIFIC_JOB_MATCHING.md` - AI job matching details

### Testing & Quality
- `TESTING_STRATEGY.md` - Comprehensive testing approach (unit/integration/E2E)
- `CORS_DEBUGGING_GUIDE.md` - CORS troubleshooting

### Architecture Reviews
- `COMPREHENSIVE_ARCHITECTURE_REVIEW.md` - Multi-agent code review (113 tasks across 6 areas)
- `workflows/` directory - Detailed reviews (frontend, backend, database, security, QA, refactoring)

See `CONTRIBUTING.md` for contribution guidelines.

## Important Constraints

- **Node.js 22.12.0+** required (specified in package.json engines)
- **npm 10.0.0+** required
- Use TypeScript for all new code (avoid `any` types)
- All backend routes must use auth middleware except `/health`
- All Supabase queries must respect RLS policies
- Never expose service role key in frontend
- Follow existing code style (ESLint config in `eslint.config.js`)

## Security Best Practices

When working on this codebase, always follow these security practices:

1. **Input Sanitization:** Always sanitize user input before storing in database
   - Backend: Use `sanitizePlainText()`, `sanitizeBasicText()`, or `sanitizeRichText()` from `backend/src/lib/sanitize.ts`
   - Frontend: Use corresponding functions from `src/lib/sanitize.ts` for defense in depth

2. **Authentication:** Never bypass auth middleware
   - All protected routes must use `authMiddleware` from `backend/src/middleware/auth.ts`
   - OPTIONS requests automatically bypass for CORS preflight

3. **Rate Limiting:** Rate limiting is automatic via middleware
   - PostgreSQL-backed (survives server restarts)
   - IP-based for unauthenticated, user-based for authenticated
   - Configured in `backend/src/middleware/rateLimiter.ts`

4. **Secrets Management:**
   - Never commit secrets to git (use .env files, always gitignored)
   - Rotate API keys on schedule (see `docs/CREDENTIAL_ROTATION_POLICY.md`)
   - Use environment variables for all secrets

5. **Dependencies:**
   - Run `npm audit` before committing
   - Review and merge Dependabot PRs weekly
   - Check for security vulnerabilities in new packages

6. **Database Security:**
   - All tables must have RLS policies
   - Use service role key only in backend, never in frontend
   - Test RLS policies with multiple user accounts

## Credential Rotation Schedule

**Critical secrets (rotate every 90 days):**
- Supabase Service Role Key
- OpenAI API Key
- SendGrid API Key
- Database Password

**Standard secrets (rotate every 180 days):**
- Apify API Token
- LinkedIn Client Secret
- Supabase Anon Key

**Long-lived secrets (rotate annually):**
- JWT Signing Secret
- Storage Encryption Keys

See `docs/CREDENTIAL_ROTATION_POLICY.md` for detailed procedures.
