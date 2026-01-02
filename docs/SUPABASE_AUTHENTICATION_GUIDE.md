# Supabase Authentication Implementation Guide

**Last Updated:** January 2, 2026

This comprehensive guide documents exactly what information, keys, and tokens are required to implement Supabase authentication in JobMatch AI, a React frontend (Cloudflare Pages) + Cloudflare Workers backend application.

---

## Table of Contents

1. [Overview](#overview)
2. [Required Keys and Tokens](#required-keys-and-tokens)
3. [Current Project Configuration](#current-project-configuration)
4. [Frontend vs Backend Requirements](#frontend-vs-backend-requirements)
5. [Authentication Flow](#authentication-flow)
6. [Environment Variable Setup](#environment-variable-setup)
7. [Security Best Practices](#security-best-practices)
8. [Migration from Legacy to Modern Keys](#migration-from-legacy-to-modern-keys)
9. [Troubleshooting](#troubleshooting)
10. [References](#references)

---

## Overview

JobMatch AI uses Supabase for:
- User authentication (JWT-based)
- PostgreSQL database with Row Level Security (RLS)
- Storage (migrating to R2)

**Current Architecture:**
- **Frontend:** React 19 on Cloudflare Pages
- **Backend:** Cloudflare Workers
- **Database:** Supabase PostgreSQL
- **Current Project:** Development branch (project_ref: `vkstdibhypprasyiswny`)

---

## Required Keys and Tokens

### 1. Supabase URL

**What it is:**
- The base URL for your Supabase project
- Format: `https://[project-ref].supabase.co`

**What it's used for:**
- API endpoint for all Supabase services
- Database connections
- Authentication requests
- Storage access

**Current Value:**
```
https://vkstdibhypprasyiswny.supabase.co
```

**Security Level:** PUBLIC (safe to expose in frontend)

**Where to find it:**
- Supabase Dashboard → Project Settings → API → Project URL

---

### 2. Supabase Anon Key (Legacy)

**What it is:**
- A JSON Web Token (JWT) signed by your project's legacy JWT secret
- Represents the `anon` (anonymous/public) Postgres role
- Also called the "Anonymous/Public Key"

**Current Value:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrc3RkaWJoeXBwcmFzeWlzd255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTE4NDAsImV4cCI6MjA4MjcyNzg0MH0.hPn1GVfmNAuHk3-VcqSw1khJChhSYZ5TRwePTUl553E
```

**What it's used for:**
- Client-side Supabase operations
- Authentication requests
- Database queries (respects RLS policies)
- Storage access (respects RLS policies)

**Security Level:** PUBLIC (safe to expose in frontend)
- Protected by Row Level Security (RLS)
- Cannot access data without proper RLS policies
- Cannot bypass security controls

**Key Properties:**
- **Expiry:** Long-lived (expires in 2035 based on the `exp` claim)
- **Permissions:** Low privilege, respects RLS
- **RLS Enforcement:** YES - all queries respect RLS policies

**Where to find it:**
- Supabase Dashboard → Project Settings → API → Project API keys → `anon` `public`

**Important Notes:**
- This is a **LEGACY KEY** being phased out
- Supabase is migrating to modern publishable keys (see below)
- Projects created before November 1, 2025 have this key
- **Projects restored from November 1, 2025 onwards will NOT have legacy keys**

---

### 3. Supabase Publishable Key (Modern - Recommended)

**What it is:**
- Modern replacement for the legacy anon key
- Format: `sb_publishable_...`
- Provides the same low-privilege access as anon key

**Current Value:**
```
sb_publishable_mqponSQzK-carH4c-OqXkw_F0ifWPco
```

**What it's used for:**
- Same purposes as anon key
- Client-side Supabase operations
- Database queries (respects RLS)
- Authentication requests

**Security Level:** PUBLIC (safe to expose in frontend)

**Key Properties:**
- **Better Security:** Independent rotation from JWT secret
- **No Downtime:** Can rotate without affecting authentication
- **Modern:** Recommended for all new implementations
- **RLS Enforcement:** YES - same as anon key

**Advantages over Legacy Anon Key:**
- Independent rotation (no coupling with JWT secret)
- Ability to roll back rotations
- Better separation of concerns
- No downtime during rotation

**Migration Status:**
- Available NOW for all projects
- Can use interchangeably with anon key
- Will become mandatory after legacy keys are deprecated

**Where to find it:**
- Supabase Dashboard → Project Settings → API → Project API keys → `default` (type: publishable)

---

### 4. Supabase Service Role Key

**What it is:**
- A JSON Web Token (JWT) with elevated privileges
- Represents the `service_role` Postgres role
- **BYPASSES ALL ROW LEVEL SECURITY (RLS)**

**What it's used for:**
- Server-side operations requiring admin privileges
- Background jobs (cleanup, scheduled tasks)
- Cross-user queries (analytics, aggregations)
- Admin operations (user management, bulk updates)

**Security Level:** SECRET - NEVER EXPOSE IN FRONTEND

**Key Properties:**
- **Permissions:** HIGH - bypasses all RLS policies
- **Danger:** Can read/write ALL data regardless of user
- **Usage:** Backend/server-side ONLY

**Where to use it:**
- ✅ Cloudflare Workers (server-side)
- ✅ Backend API (Node.js Express)
- ✅ Server-side scripts
- ❌ NEVER in frontend code
- ❌ NEVER in client-side JavaScript
- ❌ NEVER in environment variables with `VITE_` prefix

**Where to find it:**
- Supabase Dashboard → Project Settings → API → Project API keys → `service_role` `secret`

**CRITICAL SECURITY WARNING:**
> If this key is exposed, attackers can access ALL data in your database, bypassing all security policies. Treat this like a database password.

---

### 5. JWT Secret (For Self-Hosted Only)

**What it is:**
- The secret used to sign and verify JWTs
- Used to create custom JWTs

**Current Setup:**
- Managed by Supabase (hosted solution)
- NOT required for application code
- Only needed if:
  - Self-hosting Supabase
  - Creating custom JWTs outside Supabase Auth

**Our Usage:** NOT USED (we use Supabase-hosted solution)

---

## Current Project Configuration

### Current Supabase Project

**Project Name:** Development
**Project Reference:** `vkstdibhypprasyiswny`
**Project URL:** `https://vkstdibhypprasyiswny.supabase.co`

### Available Keys

| Key Type | Value | Status | Disabled |
|----------|-------|--------|----------|
| Legacy Anon Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Active | No |
| Publishable Key | `sb_publishable_mqponSQzK-carH4c-OqXkw_F0ifWPco` | Active | No |
| Service Role Key | (SECRET - not shown) | Active | No |

### Current Implementation Status

✅ **Frontend (React/Vite):**
- Uses legacy anon key
- Configured in `.env.local` with `VITE_SUPABASE_ANON_KEY`
- Supabase client initialized in `src/lib/supabase.ts`

✅ **Backend (Cloudflare Workers):**
- Uses service role key for admin operations
- Uses anon key for user-scoped operations
- Configured via Wrangler secrets
- Multiple client creation functions in `workers/api/services/supabase.ts`

⚠️ **Migration Needed:**
- Should migrate to publishable key for future-proofing
- Legacy anon key will be deprecated eventually

---

## Frontend vs Backend Requirements

### Frontend Requirements (React on Cloudflare Pages)

**Required Environment Variables:**
```bash
VITE_SUPABASE_URL=https://vkstdibhypprasyiswny.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# OR (recommended for new code)
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_mqponSQzK-carH4c-OqXkw_F0ifWPco
```

**Security:**
- ✅ Safe to expose (public keys)
- ✅ Protected by RLS policies
- ✅ Can be in client-side code
- ✅ Can be in Git (via `.env.example`)

**Usage Pattern:**
```typescript
import { createClient } from '@supabase/supabase-js'

// Current implementation (legacy anon key)
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)

// Recommended (publishable key)
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)
```

**What Frontend Can Do:**
- User authentication (sign up, sign in, sign out)
- Password reset requests
- OAuth flows (LinkedIn, Google, etc.)
- Database queries (RLS-protected)
- Storage operations (RLS-protected)
- User-scoped data access

**What Frontend CANNOT Do:**
- Bypass RLS policies
- Access other users' data (unless RLS allows)
- Admin operations
- Bulk data operations
- Service-level tasks

---

### Backend Requirements (Cloudflare Workers)

**Required Secrets (via Wrangler):**
```bash
# Set via: wrangler secret put SUPABASE_URL --env production
SUPABASE_URL=https://vkstdibhypprasyiswny.supabase.co

# Set via: wrangler secret put SUPABASE_ANON_KEY --env production
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Set via: wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
SUPABASE_SERVICE_ROLE_KEY=<secret-service-role-key>
```

**Security:**
- ❌ NEVER expose service role key
- ❌ NEVER commit to Git
- ❌ NEVER send to frontend
- ✅ Store in Cloudflare Workers secrets
- ✅ Audit access regularly

**Usage Patterns:**

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Env } from './types';

// Pattern 1: Admin client (bypasses RLS)
export function createSupabaseAdmin(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

// Pattern 2: Anon client (respects RLS)
export function createSupabaseClient(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

// Pattern 3: User-authenticated client (RLS with user context)
export function createSupabaseUserClient(env: Env, jwt: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });
}
```

**What Backend Can Do:**
- Everything frontend can do (via anon key)
- Admin operations (via service role key)
- Background jobs
- Cross-user analytics
- Bulk operations
- User management

**Best Practice:**
- Use Pattern 3 (user-authenticated) whenever possible
- Only use Pattern 1 (admin) when absolutely necessary
- Log all service role key usage for security auditing

---

## Authentication Flow

### Complete JWT Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase JWT Authentication Flow             │
└─────────────────────────────────────────────────────────────────┘

1. USER AUTHENTICATION
   ┌──────────┐                    ┌──────────────┐
   │ Frontend │ ──sign in req───→  │ Supabase     │
   │ (React)  │                    │ Auth Service │
   └──────────┘                    └──────────────┘
        │                                 │
        │                                 ✓ Verify credentials
        │                                 ✓ Generate JWT + refresh token
        │                                 │
        │  ← JWT token (access_token) ────┘
        │    refresh_token
        │    user metadata
        │
        ✓ Store in localStorage/cookies
        ✓ Store key: 'jobmatch-auth-token'

2. AUTHENTICATED API REQUEST
   ┌──────────┐                    ┌────────────────┐
   │ Frontend │ ──API request────→ │ Cloudflare     │
   │          │   + JWT in header  │ Workers        │
   └──────────┘                    └────────────────┘
                                          │
                                          ✓ Extract JWT from
                                            Authorization: Bearer <jwt>
                                          │
                                          ▼
   ┌──────────────┐              ┌────────────────┐
   │ Supabase     │ ←─verify JWT─│ Workers        │
   │ Auth         │              │ Backend        │
   └──────────────┘              └────────────────┘
        │                                 │
        ✓ Decode JWT                     │
        ✓ Verify signature               │
        ✓ Check expiration               │
        │                                 │
        └─ user data ──────────────────→ │
                                          ✓ Attach user to request context
                                          ✓ Make RLS-aware query
                                          │
   ┌──────────────┐              ┌────────────────┐
   │ Supabase     │ ←─query with─│ Workers        │
   │ PostgreSQL   │   user JWT   │                │
   └──────────────┘              └────────────────┘
        │                                 │
        ✓ Apply RLS policies             │
        ✓ Filter by auth.uid()           │
        ✓ Return authorized data         │
        │                                 │
        └─ results ───────────────────→  │
                                          │
   ┌──────────┐                    ┌────────────────┐
   │ Frontend │ ← JSON response ───│ Workers        │
   └──────────┘                    └────────────────┘

3. TOKEN REFRESH (before expiry)
   ┌──────────┐                    ┌──────────────┐
   │ Frontend │ ──refresh token──→ │ Supabase     │
   │          │                    │ Auth         │
   └──────────┘                    └──────────────┘
        │                                 │
        │                                 ✓ Verify refresh token
        │                                 ✓ Generate new JWT
        │                                 │
        │  ← new JWT ─────────────────────┘
        │
        ✓ Update stored token
```

### Key Components

**1. JWT Token Structure**
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "iss": "supabase",
    "ref": "vkstdibhypprasyiswny",
    "role": "authenticated",  // or "anon"
    "iat": 1767151840,        // issued at
    "exp": 2082727840,        // expires at
    "sub": "user-uuid",       // user ID
    "email": "user@example.com",
    "app_metadata": {},
    "user_metadata": {}
  }
}
```

**2. Authorization Header Format**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**3. Session Duration**
- **Access Token (JWT):** Default 1 hour
- **Refresh Token:** Long-lived (configurable, default 7 days)
- **Inactivity Timeout:** 30 minutes (frontend enforcement)

**4. Row Level Security (RLS) Integration**

When a JWT is present:
```sql
-- RLS policy can access user ID via auth.uid()
CREATE POLICY "Users can only see their own data"
ON applications
FOR SELECT
USING (user_id = auth.uid());
```

Without JWT (using anon key):
```sql
-- auth.uid() returns NULL
-- User can only access public data
CREATE POLICY "Anyone can view public jobs"
ON jobs
FOR SELECT
USING (is_public = true);
```

### Token Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                         Token Lifecycle                         │
└─────────────────────────────────────────────────────────────────┘

Login
  ↓
[JWT Created] ──────────────────────┐
  │                                 │
  │ Token Age: 0 min               │ Store in localStorage
  ↓                                 │ Key: 'jobmatch-auth-token'
[Active Session]                    │
  │                                 │
  │ Make API requests              │
  │ JWT auto-included              │
  ↓                                 │
[Token Age: 55 min]                │
  │                                 │
  │ Auto-refresh triggered         │
  ↓                                 │
[New JWT] ←─────────────────────────┘
  │
  │ Old JWT expired
  │ New JWT valid for 1 hour
  ↓
[Continue Session]
  │
  │ 30 min inactivity
  ↓
[Frontend Timeout]
  │
  │ Clear token
  │ Redirect to login
  ↓
[Logout]
```

---

## Environment Variable Setup

### Frontend (.env.local)

```bash
# =============================================================================
# Frontend Environment Variables (Cloudflare Pages / Vite)
# =============================================================================

# Supabase Configuration
VITE_SUPABASE_URL=https://vkstdibhypprasyiswny.supabase.co

# OPTION 1: Legacy Anon Key (current implementation)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrc3RkaWJoeXBwcmFzeWlzd255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTE4NDAsImV4cCI6MjA4MjcyNzg0MH0.hPn1GVfmNAuHk3-VcqSw1khJChhSYZ5TRwePTUl553E

# OPTION 2: Modern Publishable Key (recommended)
# VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_mqponSQzK-carH4c-OqXkw_F0ifWPco

# Backend API URL
VITE_API_URL=http://localhost:8787  # Development
# VITE_API_URL=https://jobmatch-ai-dev.workers.dev  # Development (deployed)
# VITE_API_URL=https://jobmatch-ai-staging.workers.dev  # Staging
# VITE_API_URL=https://jobmatch-ai-prod.workers.dev  # Production

# Feature Flags
VITE_USE_WORKERS_API=true
VITE_CLOUDFLARE_PAGES=true
```

**File Location:** `/home/carl/application-tracking/jobmatch-ai/.env.local`

**Important:**
- Must use `VITE_` prefix for Vite to include in build
- Variables are PUBLIC (visible in browser dev tools)
- Never put secrets in frontend environment variables
- Commit `.env.example` to Git, NOT `.env.local`

---

### Backend (Cloudflare Workers Secrets)

**Set secrets via Wrangler CLI:**

```bash
# Development environment
wrangler secret put SUPABASE_URL --env development
# Enter: https://vkstdibhypprasyiswny.supabase.co

wrangler secret put SUPABASE_ANON_KEY --env development
# Enter: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env development
# Enter: <your-service-role-key>

# Repeat for staging and production
wrangler secret put SUPABASE_URL --env staging
wrangler secret put SUPABASE_ANON_KEY --env staging
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env staging

wrangler secret put SUPABASE_URL --env production
wrangler secret put SUPABASE_ANON_KEY --env production
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
```

**Verify secrets:**
```bash
wrangler secret list --env production
```

**Configuration in wrangler.toml:**
```toml
# Secrets are NOT defined in wrangler.toml
# They are set via wrangler secret put command
# This is documented in comments:

# Secrets (configure via wrangler secret put)
# Required secrets:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - OPENAI_API_KEY
# - SENDGRID_API_KEY
# - LINKEDIN_CLIENT_ID
# - LINKEDIN_CLIENT_SECRET
# - APP_URL
```

**Environment Type Definition:**
```typescript
// workers/api/types.ts
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  // ... other secrets
}
```

---

### Environment-Specific Configuration

#### Development

**Frontend:**
```bash
VITE_SUPABASE_URL=https://vkstdibhypprasyiswny.supabase.co
VITE_SUPABASE_ANON_KEY=<dev-anon-key>
VITE_API_URL=http://localhost:8787
```

**Backend (Workers):**
```bash
wrangler secret put SUPABASE_URL --env development
wrangler secret put SUPABASE_ANON_KEY --env development
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env development
```

#### Staging

**Frontend:**
```bash
VITE_SUPABASE_URL=https://vkstdibhypprasyiswny.supabase.co
VITE_SUPABASE_ANON_KEY=<staging-anon-key>
VITE_API_URL=https://jobmatch-ai-staging.workers.dev
```

**Backend (Workers):**
```bash
wrangler secret put SUPABASE_URL --env staging
wrangler secret put SUPABASE_ANON_KEY --env staging
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env staging
```

#### Production

**Frontend:**
```bash
VITE_SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co  # Production project
VITE_SUPABASE_ANON_KEY=<production-anon-key>
VITE_API_URL=https://jobmatch-ai-prod.workers.dev
```

**Backend (Workers):**
```bash
wrangler secret put SUPABASE_URL --env production
wrangler secret put SUPABASE_ANON_KEY --env production
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
```

---

## Security Best Practices

### 1. Key Security Guidelines

**DO:**
- ✅ Use RLS policies on all tables
- ✅ Store service role key in secure secrets manager
- ✅ Rotate keys regularly (every 90-180 days)
- ✅ Use publishable key for new implementations
- ✅ Audit service role key usage
- ✅ Use environment-specific keys
- ✅ Test RLS policies thoroughly

**DON'T:**
- ❌ Expose service role key in frontend
- ❌ Commit secrets to Git
- ❌ Use `VITE_` prefix for secrets
- ❌ Share keys in public channels
- ❌ Use production keys in development
- ❌ Disable RLS policies
- ❌ Skip security testing

### 2. Row Level Security (RLS) Best Practices

**How RLS Works with Keys:**

1. **Anon Key (or Publishable Key):**
   - Postgres role: `anon`
   - RLS applies: YES
   - `auth.uid()` returns: NULL (unless JWT provided)
   - Use case: Public access, unauthenticated users

2. **Anon Key + User JWT:**
   - Postgres role: `authenticated`
   - RLS applies: YES
   - `auth.uid()` returns: User's UUID
   - Use case: Logged-in user operations

3. **Service Role Key:**
   - Postgres role: `service_role`
   - RLS applies: NO (bypassed)
   - `auth.uid()` returns: NULL
   - Use case: Admin operations, background jobs

**Example RLS Policies:**

```sql
-- Policy 1: Users can only see their own applications
CREATE POLICY "Users view own applications"
ON applications
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Anyone can view public jobs
CREATE POLICY "Public jobs visible to all"
ON jobs
FOR SELECT
USING (is_public = true);

-- Policy 3: Users can insert their own applications
CREATE POLICY "Users create own applications"
ON applications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can update their own profile
CREATE POLICY "Users update own profile"
ON users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

**Testing RLS:**
```typescript
// Test with user JWT (should see only their data)
const supabase = createSupabaseUserClient(env, userJwt);
const { data } = await supabase.from('applications').select('*');
// Returns only applications where user_id = auth.uid()

// Test with anon key (should see only public data)
const supabase = createSupabaseClient(env);
const { data } = await supabase.from('jobs').select('*');
// Returns only jobs where is_public = true

// Test with service role (should see ALL data)
const supabase = createSupabaseAdmin(env);
const { data } = await supabase.from('applications').select('*');
// Returns ALL applications (RLS bypassed)
```

### 3. JWT Security

**Token Storage:**
- Frontend: localStorage or secure httpOnly cookies
- Backend: Never store (stateless)

**Token Transmission:**
- Always use HTTPS
- Authorization header: `Bearer <token>`
- Never in URL query params
- Never in localStorage on server

**Token Validation:**
```typescript
// Backend verification
export async function verifyToken(env: Env, jwt: string) {
  const supabase = createSupabaseClient(env);
  const { data: { user }, error } = await supabase.auth.getUser(jwt);

  if (error || !user) {
    return null;
  }

  return user;
}
```

### 4. Credential Rotation Schedule

**Critical Secrets (90 days):**
- Supabase Service Role Key
- OpenAI API Key
- SendGrid API Key

**Standard Secrets (180 days):**
- Supabase Anon Key (or migrate to publishable key)
- LinkedIn Client Secret

**Long-lived (365 days):**
- JWT Signing Secret (self-hosted only)

**Rotation Procedure:**
1. Generate new key in Supabase Dashboard
2. Update Cloudflare Workers secrets
3. Deploy backend
4. Update frontend environment variables
5. Deploy frontend
6. Revoke old key after 24-48 hours

### 5. Security Monitoring

**Audit Logging:**
```typescript
// Log all service role key usage
function logServiceRoleAccess(operation: string, userId?: string) {
  console.log('[SECURITY AUDIT]', {
    timestamp: new Date().toISOString(),
    operation,
    userId,
    keyType: 'service_role',
  });
}

// Use in admin operations
const supabase = createSupabaseAdmin(env);
logServiceRoleAccess('bulk_user_update', 'system');
await supabase.from('users').update({ status: 'active' });
```

**Monitor Failed Auth Attempts:**
- Track in `failed_login_attempts` table
- Alert on suspicious patterns
- Implement account lockout (5 attempts / 15 min)

---

## Migration from Legacy to Modern Keys

### Why Migrate?

**Problems with Legacy Keys:**
1. Tight coupling between JWT secret and API keys
2. Cannot rotate independently without downtime
3. Cannot roll back problematic rotations
4. Security risk if JWT secret is compromised

**Benefits of Modern Keys:**
1. Independent rotation from JWT secret
2. Zero-downtime rotation
3. Rollback capability
4. Better security isolation

### Migration Timeline

**Current Status (January 2026):**
- Legacy keys still supported
- Publishable keys available for all projects
- Can use both interchangeably

**Important Dates:**
- **November 1, 2025:** New/restored projects don't get legacy keys
- **TBD 2026:** Legacy keys deprecated (Supabase will announce)
- **Action Required:** Migrate before deprecation date

### Migration Steps

#### Step 1: Update Backend (Cloudflare Workers)

**Current code (workers/api/services/supabase.ts):**
```typescript
export function createSupabaseClient(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
```

**New code (supports both keys):**
```typescript
export function createSupabaseClient(env: Env) {
  // Prefer publishable key, fall back to anon key
  const apiKey = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;

  return createClient(env.SUPABASE_URL, apiKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
```

**Add secret:**
```bash
wrangler secret put SUPABASE_PUBLISHABLE_KEY --env development
# Enter: sb_publishable_mqponSQzK-carH4c-OqXkw_F0ifWPco

wrangler secret put SUPABASE_PUBLISHABLE_KEY --env staging
wrangler secret put SUPABASE_PUBLISHABLE_KEY --env production
```

**Update types (workers/api/types.ts):**
```typescript
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string; // Keep for backward compatibility
  SUPABASE_PUBLISHABLE_KEY?: string; // New
  SUPABASE_SERVICE_ROLE_KEY: string;
  // ...
}
```

#### Step 2: Update Frontend

**Current code (src/lib/supabase.ts):**
```typescript
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  // ...
);
```

**New code:**
```typescript
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY, // Fallback
  // ...
);
```

**Update .env.local:**
```bash
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_mqponSQzK-carH4c-OqXkw_F0ifWPco
# Keep VITE_SUPABASE_ANON_KEY for backward compatibility during rollout
```

**Update .env.example:**
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co

# RECOMMENDED: Modern publishable key
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx

# LEGACY: Anon key (deprecated, use publishable key instead)
# VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### Step 3: Update Cloudflare Pages Build Config

**wrangler-pages.toml:**
```toml
[env.production.vars]
VITE_SUPABASE_URL = "https://lrzhpnsykasqrousgmdh.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_xxx"  # Add this
# VITE_SUPABASE_ANON_KEY = "legacy-key"  # Keep as fallback initially
```

#### Step 4: Test Migration

**Test checklist:**
- [ ] User authentication works (sign in, sign up, sign out)
- [ ] JWT tokens are valid
- [ ] RLS policies enforce correctly
- [ ] API requests succeed with new key
- [ ] Frontend can make authenticated requests
- [ ] Backend can verify user tokens
- [ ] Service role operations still work

**Test script:**
```typescript
// test-publishable-key.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vkstdibhypprasyiswny.supabase.co',
  'sb_publishable_mqponSQzK-carH4c-OqXkw_F0ifWPco'
);

// Test 1: Anonymous access
const { data: jobs } = await supabase.from('jobs').select('*').eq('is_public', true);
console.log('✓ Anonymous query works:', jobs?.length);

// Test 2: Authentication
const { data: authData, error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'password123',
});
console.log('✓ Authentication works:', !error);

// Test 3: Authenticated query
const { data: apps } = await supabase.from('applications').select('*');
console.log('✓ Authenticated query works:', apps?.length);
```

#### Step 5: Rollout Plan

**Phase 1: Backend (Week 1)**
1. Add publishable key support to Workers
2. Deploy to development
3. Test for 48 hours
4. Deploy to staging
5. Test for 48 hours
6. Deploy to production

**Phase 2: Frontend (Week 2)**
1. Add publishable key support to React app
2. Deploy to development (Cloudflare Pages preview)
3. Test for 48 hours
4. Deploy to staging
5. Test for 48 hours
6. Deploy to production

**Phase 3: Cleanup (Week 3)**
1. Monitor for any issues
2. After 1 week with no issues, remove anon key fallbacks
3. Update documentation
4. Revoke old anon key (optional, but recommended)

---

## Troubleshooting

### Common Issues

#### Issue 1: "Invalid API key" Error

**Symptoms:**
```
Error: Invalid API key
```

**Causes:**
- Wrong project URL/key combination
- Using production key in development
- Key expired or revoked

**Solutions:**
1. Verify project URL matches key:
   ```bash
   # Extract 'ref' from JWT
   echo "eyJhbGciOiJI..." | base64 -d | jq '.ref'
   # Should match URL: https://<ref>.supabase.co
   ```

2. Check key in Supabase Dashboard → Project Settings → API

3. Regenerate key if needed

#### Issue 2: "User not authenticated" Error

**Symptoms:**
```
Error: User not authenticated
Error: JWT expired
```

**Causes:**
- Token expired (> 1 hour old)
- Token not included in request
- Invalid token format

**Solutions:**
1. Check token expiry:
   ```typescript
   const token = localStorage.getItem('jobmatch-auth-token');
   const payload = JSON.parse(atob(token.split('.')[1]));
   console.log('Expires:', new Date(payload.exp * 1000));
   ```

2. Verify Authorization header:
   ```typescript
   console.log('Headers:', request.headers.authorization);
   // Should be: "Bearer eyJhbGciOiJ..."
   ```

3. Refresh token:
   ```typescript
   const { data, error } = await supabase.auth.refreshSession();
   ```

#### Issue 3: RLS Policy Blocking Access

**Symptoms:**
```
Error: No rows returned
Error: Permission denied
```

**Causes:**
- RLS policy too restrictive
- Using wrong role (anon vs authenticated)
- `auth.uid()` not matching `user_id`

**Solutions:**
1. Check RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'applications';
   ```

2. Test with service role (temporarily):
   ```typescript
   // Backend only!
   const supabase = createSupabaseAdmin(env);
   const { data } = await supabase.from('applications').select('*');
   // If this works, RLS is the issue
   ```

3. Verify user ID in token matches database:
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('Token user ID:', user.id);

   const { data } = await supabase.from('applications')
     .select('user_id')
     .eq('id', applicationId);
   console.log('DB user ID:', data[0].user_id);
   ```

#### Issue 4: CORS Errors

**Symptoms:**
```
Access to fetch at 'https://xxx.supabase.co' from origin 'http://localhost:5173'
has been blocked by CORS policy
```

**Causes:**
- Origin not allowed in Supabase
- Missing credentials in request

**Solutions:**
1. Add origin to Supabase allowed list:
   - Supabase Dashboard → Authentication → URL Configuration
   - Add: `http://localhost:5173`, `http://localhost:8787`
   - Production: `https://jobmatch-ai.pages.dev`

2. Include credentials:
   ```typescript
   const supabase = createClient(url, key, {
     auth: {
       persistSession: true,
       detectSessionInUrl: true,
     },
   });
   ```

#### Issue 5: Environment Variable Not Found

**Symptoms:**
```
Error: Missing Supabase environment variables
```

**Causes:**
- `.env.local` not loaded
- Wrong variable name
- Missing `VITE_` prefix

**Solutions:**
1. Check file exists:
   ```bash
   ls -la .env.local
   ```

2. Verify prefix:
   ```bash
   # Correct (Vite)
   VITE_SUPABASE_URL=...

   # Wrong (won't be loaded)
   SUPABASE_URL=...
   ```

3. Restart dev server:
   ```bash
   npm run dev
   ```

4. Check in browser console:
   ```typescript
   console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
   console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY);
   ```

### Debug Checklist

When authentication fails:

1. **Verify Keys:**
   - [ ] Correct project URL
   - [ ] Correct anon/publishable key
   - [ ] Service role key in backend only
   - [ ] Environment-specific keys

2. **Check Token:**
   - [ ] JWT format valid (3 parts separated by dots)
   - [ ] Token not expired
   - [ ] Token includes user ID
   - [ ] Token signature valid

3. **Verify RLS:**
   - [ ] RLS enabled on table
   - [ ] Policy allows operation
   - [ ] Using correct role (anon/authenticated)
   - [ ] `auth.uid()` returns expected value

4. **Test Network:**
   - [ ] Can reach Supabase URL
   - [ ] CORS configured correctly
   - [ ] Authorization header included
   - [ ] Request payload valid

5. **Environment:**
   - [ ] Using correct environment (dev/staging/prod)
   - [ ] Environment variables loaded
   - [ ] No typos in variable names
   - [ ] Values not truncated

---

## References

### Official Documentation

- [Understanding API Keys - Supabase Docs](https://supabase.com/docs/guides/api/api-keys)
- [JWT Signing Keys - Supabase Docs](https://supabase.com/docs/guides/auth/signing-keys)
- [JSON Web Token (JWT) - Supabase Docs](https://supabase.com/docs/guides/auth/jwts)
- [Row Level Security - Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Securing Your API - Supabase Docs](https://supabase.com/docs/guides/api/securing-your-api)
- [Securing Your Data - Supabase Docs](https://supabase.com/docs/guides/database/secure-data)
- [User Sessions - Supabase Docs](https://supabase.com/docs/guides/auth/sessions)

### GitHub Discussions

- [Upcoming changes to Supabase API Keys](https://github.com/orgs/supabase/discussions/29260)
- [Use of new API keys (replacing legacy JWT)](https://github.com/orgs/supabase/discussions/40300)
- [Rotating Anon, Service, and JWT Secrets](https://supabase.com/docs/guides/troubleshooting/rotating-anon-service-and-jwt-secrets-1Jq6yd)

### Project-Specific Documentation

- `/home/carl/application-tracking/jobmatch-ai/CLAUDE.md` - Project overview
- `/home/carl/application-tracking/jobmatch-ai/docs/SUPABASE_SESSION_CONFIGURATION.md` - Session management
- `/home/carl/application-tracking/jobmatch-ai/docs/CREDENTIAL_ROTATION_POLICY.md` - Key rotation schedule
- `/home/carl/application-tracking/jobmatch-ai/docs/SECURITY_FIXES_SUMMARY.md` - Security implementations

---

## Summary Checklist

### Frontend Setup

- [ ] Install `@supabase/supabase-js`
- [ ] Create `.env.local` with:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] Initialize Supabase client in `src/lib/supabase.ts`
- [ ] Configure auth settings (autoRefresh, persistSession)
- [ ] Never include service role key

### Backend Setup

- [ ] Install `@supabase/supabase-js`
- [ ] Set secrets via Wrangler:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Create client factory functions:
  - [ ] `createSupabaseClient()` - anon key
  - [ ] `createSupabaseAdmin()` - service role key
  - [ ] `createSupabaseUserClient(jwt)` - user-authenticated
- [ ] Implement JWT verification middleware
- [ ] Log service role key usage

### Security

- [ ] Enable RLS on all tables
- [ ] Create appropriate RLS policies
- [ ] Test RLS with different roles
- [ ] Never expose service role key
- [ ] Use HTTPS in production
- [ ] Rotate keys on schedule
- [ ] Monitor failed auth attempts
- [ ] Audit service role operations

### Testing

- [ ] Test anonymous access (anon key)
- [ ] Test authenticated access (anon key + JWT)
- [ ] Test admin operations (service role key)
- [ ] Test RLS policies
- [ ] Test token expiry/refresh
- [ ] Test CORS configuration
- [ ] Load test authentication flow

### Migration (Legacy → Modern)

- [ ] Get publishable key from Supabase Dashboard
- [ ] Add fallback support in code (publishable || anon)
- [ ] Set publishable key in environment
- [ ] Test both keys work
- [ ] Deploy to development
- [ ] Deploy to staging
- [ ] Deploy to production
- [ ] Remove anon key fallback after 1 week
- [ ] Update documentation

---

**Document Version:** 1.0
**Last Updated:** January 2, 2026
**Next Review:** April 2, 2026 (or when Supabase deprecates legacy keys)
