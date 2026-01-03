# Migration Tasks Remaining

**Document Version:** 1.0
**Date:** 2026-01-03
**Migration Status:** 35% Complete

## Executive Summary

This document outlines all remaining Supabase PostgreSQL database violations in the frontend codebase that must be migrated to use Workers API → D1. All database operations should be handled by Workers API endpoints, not direct Supabase client queries.

**Total Violations Found:** 13 direct database operations
**Critical Priority:** 9 violations
**High Priority:** 4 violations
**Estimated Total Effort:** 16-20 hours

---

## Violation Categories

### 1. Session Management (6 violations) - CRITICAL
**Location:** `src/lib/securityService.ts`

All session management operations currently write directly to Supabase `sessions` table. These must be migrated to Workers API endpoints.

#### 1.1 Create/Update Session
- **File:** `src/lib/securityService.ts:145-149`
- **Issue:** Direct `.upsert()` to `sessions` table
- **Code:**
  ```typescript
  const { error } = await supabase
    .from('sessions')
    .upsert(sessionData, {
      onConflict: 'session_id',
    })
  ```
- **Network Call:** `POST https://vkstdibhypprasyiswny.supabase.co/rest/v1/sessions?on_conflict=session_id`
- **Migration Required:**
  - Create Workers API endpoint: `POST /api/sessions`
  - Replace with: `await workersApi.createOrUpdateSession(userId, sessionId, deviceInfo)`
- **Estimated Effort:** 3 hours
- **Priority:** CRITICAL

#### 1.2 Update Session Activity
- **File:** `src/lib/securityService.ts:172-178`
- **Issue:** Direct `.update()` to `sessions` table
- **Code:**
  ```typescript
  const { error } = await supabase
    .from('sessions')
    .update({
      last_active: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('session_id', sessionId)
  ```
- **Migration Required:**
  - Create Workers API endpoint: `PATCH /api/sessions/:sessionId`
  - Replace with: `await workersApi.updateSessionActivity(sessionId)`
- **Estimated Effort:** 2 hours
- **Priority:** CRITICAL

#### 1.3 Get Active Sessions
- **File:** `src/lib/securityService.ts:198-204`
- **Issue:** Direct `.select()` from `sessions` table
- **Code:**
  ```typescript
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', now.toISOString())
    .order('last_active', { ascending: false })
    .limit(20)
  ```
- **Migration Required:**
  - Create Workers API endpoint: `GET /api/sessions?userId=:userId&active=true`
  - Replace with: `await workersApi.getActiveSessions(userId)`
- **Estimated Effort:** 2 hours
- **Priority:** CRITICAL

#### 1.4 Revoke Session
- **File:** `src/lib/securityService.ts:234-238`
- **Issue:** Direct `.delete()` from `sessions` table
- **Code:**
  ```typescript
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('user_id', userId)
    .eq('session_id', sessionId)
  ```
- **Migration Required:**
  - Create Workers API endpoint: `DELETE /api/sessions/:sessionId`
  - Replace with: `await workersApi.revokeSession(userId, sessionId)`
- **Estimated Effort:** 2 hours
- **Priority:** CRITICAL

#### 1.5 Cleanup Expired Sessions
- **File:** `src/lib/securityService.ts:262-267`
- **Issue:** Direct `.delete()` from `sessions` table
- **Code:**
  ```typescript
  const { data, error } = await supabase
    .from('sessions')
    .delete()
    .eq('user_id', userId)
    .lte('expires_at', now.toISOString())
    .select('id')
  ```
- **Migration Required:**
  - Create Workers API endpoint: `DELETE /api/sessions/expired?userId=:userId`
  - Replace with: `await workersApi.cleanupExpiredSessions(userId)`
- **Estimated Effort:** 2 hours
- **Priority:** HIGH

#### 1.6 Get 2FA Settings
- **File:** `src/lib/securityService.ts:366-370`
- **Issue:** Direct `.select()` from `users` table
- **Code:**
  ```typescript
  const { data, error } = await supabase
    .from('users')
    .select('two_factor_enabled')
    .eq('id', userId)
    .single()
  ```
- **Migration Required:**
  - Create Workers API endpoint: `GET /api/users/:userId/2fa-settings`
  - Replace with: `await workersApi.get2FASettings(userId)`
- **Estimated Effort:** 1 hour
- **Priority:** HIGH

---

### 2. Security Events Logging (2 violations) - CRITICAL
**Location:** `src/lib/securityService.ts`

All security event logging currently writes directly to Supabase `security_events` table.

#### 2.1 Log Security Event
- **File:** `src/lib/securityService.ts:308-310`
- **Issue:** Direct `.insert()` to `security_events` table
- **Code:**
  ```typescript
  const { error } = await supabase
    .from('security_events')
    .insert(eventData)
  ```
- **Migration Required:**
  - Create Workers API endpoint: `POST /api/security-events`
  - Replace with: `await workersApi.logSecurityEvent(userId, action, status, metadata)`
- **Estimated Effort:** 2 hours
- **Priority:** CRITICAL

#### 2.2 Get Recent Security Events
- **File:** `src/lib/securityService.ts:329-334`
- **Issue:** Direct `.select()` from `security_events` table
- **Code:**
  ```typescript
  const { data, error } = await supabase
    .from('security_events')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(maxEvents)
  ```
- **Migration Required:**
  - Create Workers API endpoint: `GET /api/security-events?userId=:userId&limit=:limit`
  - Replace with: `await workersApi.getRecentSecurityEvents(userId, maxEvents)`
- **Estimated Effort:** 1.5 hours
- **Priority:** CRITICAL

---

### 3. OAuth Profile Sync (5 violations) - CRITICAL
**Location:** `src/lib/oauthProfileSync.ts`

OAuth profile synchronization currently writes directly to Supabase `users` table. This is critical because it happens on every OAuth login.

#### 3.1 Check Existing Profile (OAuth Sync)
- **File:** `src/lib/oauthProfileSync.ts:48-52`
- **Issue:** Direct `.select()` from `users` table
- **Code:**
  ```typescript
  const { data: existingProfile } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()
  ```
- **Migration Required:**
  - Create Workers API endpoint: `GET /api/users/:userId/exists`
  - Replace with: `await workersApi.checkUserExists(userId)`
- **Estimated Effort:** 1 hour
- **Priority:** CRITICAL

#### 3.2 Create Profile from OAuth
- **File:** `src/lib/oauthProfileSync.ts:72-81`
- **Issue:** Direct `.insert()` to `users` table
- **Code:**
  ```typescript
  const { error } = await supabase.from('users').insert({
    id: user.id,
    email: profileData.email,
    first_name: profileData.firstName,
    last_name: profileData.lastName,
    photo_url: profileData.profileImageUrl,
    linkedin_url: profileData.linkedInUrl,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  ```
- **Migration Required:**
  - Create Workers API endpoint: `POST /api/users/oauth-profile`
  - Replace with: `await workersApi.createOAuthProfile(user.id, profileData)`
- **Estimated Effort:** 2 hours
- **Priority:** CRITICAL

#### 3.3 Get Existing Profile (OAuth Update)
- **File:** `src/lib/oauthProfileSync.ts:103-107`
- **Issue:** Direct `.select()` from `users` table
- **Code:**
  ```typescript
  const { data: existingProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()
  ```
- **Migration Required:**
  - Use existing: `GET /api/profile/:userId` (likely already exists)
  - Replace with: `await workersApi.getProfile(userId)`
- **Estimated Effort:** 0.5 hours
- **Priority:** CRITICAL

#### 3.4 Update Profile from OAuth
- **File:** `src/lib/oauthProfileSync.ts:147-150`
- **Issue:** Direct `.update()` to `users` table
- **Code:**
  ```typescript
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
  ```
- **Migration Required:**
  - Use existing: `PATCH /api/profile/:userId` (likely already exists)
  - Replace with: `await workersApi.updateProfile(userId, updates)`
- **Estimated Effort:** 0.5 hours
- **Priority:** CRITICAL

#### 3.5 (Duplicate Check - Already Counted in 3.1)
- **Note:** Line 49 is part of 3.1, not a separate violation

---

## Implementation Strategy

### Phase 1: Session Management API (CRITICAL - Week 1)
**Estimated Time:** 6-8 hours (reduced from 8-10 hours)
**Storage:** Cloudflare KV (`SESSIONS` namespace - already configured)

**Why KV instead of D1?**
- ✅ Faster (1-10ms vs 10-50ms)
- ✅ Built-in TTL (automatic expiration, no cleanup job needed)
- ✅ Edge-distributed globally
- ✅ Already configured in wrangler.toml
- ✅ Perfect for session storage (key-value lookups)

1. Create Workers API endpoints in `workers/api/routes/sessions.ts`:
   - `POST /api/sessions` - Create/update session (KV PUT with TTL)
   - `PATCH /api/sessions/:sessionId` - Update last active (KV PUT)
   - `GET /api/sessions` - Get active sessions (KV LIST with prefix)
   - `DELETE /api/sessions/:sessionId` - Revoke session (KV DELETE)
   - ~~`DELETE /api/sessions/expired`~~ - **NOT NEEDED** (KV TTL handles expiration automatically)
   - `GET /api/users/:userId/2fa-settings` - Get 2FA settings (D1 query)

2. Implement KV operations for session management:
   ```typescript
   // Create/Update Session
   await c.env.SESSIONS.put(
     sessionId,
     JSON.stringify(sessionData),
     { expirationTtl: 604800 } // 7 days auto-expiration
   );

   // Get Session
   const session = await c.env.SESSIONS.get(sessionId, 'json');

   // List User Sessions (prefix pattern: `user:${userId}:${sessionId}`)
   const { keys } = await c.env.SESSIONS.list({ prefix: `user:${userId}:` });

   // Delete Session
   await c.env.SESSIONS.delete(sessionId);
   ```

3. Update `src/lib/securityService.ts`:
   - Replace all `supabase.from('sessions')` with `workersApi` calls
   - Update error handling
   - Add type safety

4. Test session management:
   - Login/logout flows
   - Session revocation
   - Concurrent sessions
   - **Automatic expiration** (verify KV TTL works)

### Phase 2: Security Events API (CRITICAL - Week 2)
**Estimated Time:** 3-4 hours

1. Create Workers API endpoints in `workers/api/routes/security-events.ts`:
   - `POST /api/security-events` - Log event
   - `GET /api/security-events` - Get recent events

2. Implement D1 queries for security events:
   - Insert with user_id filtering
   - Query with pagination

3. Update `src/lib/securityService.ts`:
   - Replace all `supabase.from('security_events')` with `workersApi` calls

4. Test security logging:
   - Login events
   - Session events
   - Security violations

### Phase 3: OAuth Profile Sync API (CRITICAL - Week 2)
**Estimated Time:** 3-4 hours

1. Create Workers API endpoints in `workers/api/routes/oauth.ts`:
   - `GET /api/users/:userId/exists` - Check if user exists
   - `POST /api/users/oauth-profile` - Create from OAuth
   - Reuse existing `PATCH /api/profile/:userId` for updates

2. Implement D1 queries for OAuth operations:
   - User existence check
   - Profile creation from OAuth
   - Profile update from OAuth

3. Update `src/lib/oauthProfileSync.ts`:
   - Replace all `supabase.from('users')` with `workersApi` calls
   - Update error handling

4. Test OAuth flows:
   - First-time LinkedIn login
   - Subsequent LinkedIn logins
   - Profile enrichment

### Phase 4: Frontend Integration & Testing (Week 3)
**Estimated Time:** 2-3 hours

1. Update `src/lib/workersApi.ts`:
   - Add all new API client methods
   - Add TypeScript types
   - Add error handling

2. Update hooks if needed:
   - `useSecuritySettings.ts`
   - `useAuth.ts`

3. Run comprehensive E2E tests:
   - Complete onboarding flow
   - Session management
   - OAuth login
   - Security events

---

## Testing Checklist

### Session Management
- [ ] User can login and session is created
- [ ] Session activity updates on page navigation
- [ ] User can view active sessions list
- [ ] User can revoke a specific session
- [ ] Expired sessions are cleaned up automatically
- [ ] 2FA settings are fetched correctly

### Security Events
- [ ] Login events are logged
- [ ] Logout events are logged
- [ ] Failed login attempts are logged
- [ ] Session revocation is logged
- [ ] Security events list displays correctly

### OAuth Profile Sync
- [ ] First-time LinkedIn login creates profile
- [ ] LinkedIn profile photo is synced
- [ ] LinkedIn URL is synced
- [ ] Subsequent logins don't overwrite existing data
- [ ] Profile enrichment works for empty fields

### Network Validation
- [ ] No `POST/GET/PATCH/DELETE` requests to `https://*.supabase.co/rest/v1/*`
- [ ] All data operations go through `http://localhost:8787/api/*` (dev) or Workers URL (prod)
- [ ] Only Supabase Auth API calls (`https://*.supabase.co/auth/v1/*`) are allowed

---

## Dependencies & Prerequisites

### Backend (Workers API)
- D1 database with `sessions`, `security_events`, `users` tables
- Auth middleware for JWT validation
- Error handling middleware
- Rate limiting middleware

### Frontend
- Updated `workersApi.ts` client with new methods
- TypeScript types matching D1 schema
- Error handling for API failures

### Testing
- E2E test suite with network monitoring
- Sample test users in D1 database
- Sample OAuth credentials for LinkedIn

---

## Risk Assessment

### High Risk
1. **Session Management Migration** - Breaking sessions will lock users out
   - Mitigation: Implement feature flag, gradual rollout
   - Fallback: Keep Supabase session code temporarily

2. **OAuth Profile Creation** - New users won't be able to complete signup
   - Mitigation: Extensive testing before deploy
   - Fallback: Keep Supabase OAuth sync code temporarily

### Medium Risk
1. **Security Events Logging** - Lost logs during transition
   - Mitigation: Dual-write for 1 week (both Supabase + D1)
   - Verify D1 logs are working before removing Supabase writes

### Low Risk
1. **2FA Settings** - Read-only operation, safe to migrate
2. **Session Activity Updates** - Non-critical, can fail gracefully

---

## Success Criteria

✅ **100% Migration Complete When:**
1. Zero network calls to `https://*.supabase.co/rest/v1/*` (except storage if not yet migrated)
2. All session management goes through Workers API
3. All security events go through Workers API
4. All OAuth profile sync goes through Workers API
5. E2E test passes with 0 violations
6. Production monitoring shows no errors for 7 days
7. Performance benchmarks meet SLA:
   - Session creation: <200ms
   - Session query: <100ms
   - Event logging: <150ms (async, non-blocking)

---

## Next Steps

1. **Immediate (Today):**
   - Review this document
   - Prioritize which phase to start first
   - Create feature branch: `feature/migrate-session-security-apis`

2. **This Week:**
   - Implement Phase 1 (Session Management API)
   - Test session flows thoroughly
   - Deploy to development environment

3. **Next Week:**
   - Implement Phase 2 (Security Events API)
   - Implement Phase 3 (OAuth Profile Sync API)
   - Run full E2E test suite

4. **Week 3:**
   - Production deployment with feature flag
   - Monitor for errors
   - Gradual rollout to 100% of users

---

## Related Documentation

- `/home/carl/application-tracking/jobmatch-ai/docs/CLOUDFLARE_INFRASTRUCTURE_AUDIT_2026-01-02.md` - Current infrastructure state
- `/home/carl/application-tracking/jobmatch-ai/docs/D1_SCHEMA_MAPPING.md` - Database schema reference
- `/home/carl/application-tracking/jobmatch-ai/workers/api/routes/` - Existing Workers API routes
- `/home/carl/application-tracking/jobmatch-ai/src/lib/workersApi.ts` - Frontend API client

---

**Last Updated:** 2026-01-03
**Reviewed By:** Claude Code (AI Context Engineering Specialist)
