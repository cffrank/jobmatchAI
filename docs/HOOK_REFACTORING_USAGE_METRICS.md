# useUsageMetrics Hook Refactoring

## Summary

Successfully refactored `src/hooks/useUsageMetrics.ts` to use the Workers/Express API instead of direct Supabase database calls.

**Violations Fixed:** 3 direct Supabase database calls
**Status:** ✅ Complete

## Changes Made

### 1. Backend API Route (`backend/src/routes/usage.ts`)

Created new usage metrics route with a single endpoint:

- **GET /api/usage/metrics** - Fetches current user's usage metrics

**Response Format:**
```json
{
  "metrics": {
    "applicationsTracked": 15,
    "resumeVariantsCreated": 8,
    "jobSearchesPerformed": 42,
    "emailsSent": 23
  }
}
```

**Features:**
- Server-side calculation prevents client-side manipulation
- Authenticates user via JWT middleware
- Handles missing usage_limits gracefully (returns 0 for new users)
- Transforms database field names (snake_case → camelCase)

**Metrics Calculation:**
1. **applicationsTracked**: COUNT from `tracked_applications` table
2. **resumeVariantsCreated**: COUNT from `resumes` table WHERE `type = 'tailored'`
3. **jobSearchesPerformed**: `job_searches_used` from `usage_limits` table
4. **emailsSent**: `emails_sent_used` from `usage_limits` table

### 2. Frontend Hook (`src/hooks/useUsageMetrics.ts`)

**Before:**
- 3 direct Supabase database calls:
  - `supabase.from('tracked_applications').select(...)`
  - `supabase.from('resumes').select(...)`
  - `supabase.from('usage_limits').select(...)`

**After:**
- Single API call: `fetch('/api/usage/metrics')`
- Real-time subscriptions maintained (read-only, trigger refetch)
- JWT token authentication via `supabase.auth.getSession()`

**Real-time Updates:**
The hook maintains three real-time subscriptions:
- `tracked_applications` changes → refetch metrics
- `resumes` changes → refetch metrics
- `usage_limits` changes → refetch metrics

### 3. Infrastructure Updates

**Added to `backend/src/config/supabase.ts`:**
```typescript
TRACKED_APPLICATIONS: 'tracked_applications',
RESUMES: 'resumes',
USAGE_LIMITS: 'usage_limits',
```

**Added to `backend/src/index.ts`:**
- Imported `usageRouter`
- Mounted route: `app.use('/api/usage', usageRouter)`
- Updated API documentation

### 4. Testing

Created integration test: `backend/tests/integration/usage.test.ts`

**Test Coverage:**
- ✅ Requires authentication (401 without token)
- ✅ Returns correct metrics structure
- ✅ All metrics are numbers
- ✅ Handles missing usage_limits gracefully

## Architecture Pattern

This refactoring follows the established pattern:

```
Frontend Hook (useUsageMetrics)
    ↓ (JWT auth)
Backend API (/api/usage/metrics)
    ↓ (service role)
Supabase Database (tracked_applications, resumes, usage_limits)
```

**Security Benefits:**
1. **Server-side calculation** - Prevents client manipulation
2. **JWT authentication** - User-scoped queries
3. **RLS bypass on backend** - Uses service role for efficiency
4. **Read-only subscriptions** - Frontend only triggers refetch

## Field Name Transformations

| Database (snake_case) | Frontend (camelCase) |
|----------------------|----------------------|
| `job_searches_used` | `jobSearchesPerformed` |
| `emails_sent_used` | `emailsSent` |

## Migration Notes

**Breaking Changes:** None
- Same interface as before
- Metrics structure unchanged
- Real-time updates still work

**Performance Impact:**
- Slight latency increase (network round-trip)
- Server-side caching could be added if needed

## Verification

```bash
# Backend type check
cd backend && npm run typecheck

# Backend lint
cd backend && npx eslint src/routes/usage.ts

# Frontend lint
npx eslint src/hooks/useUsageMetrics.ts

# Verify no direct database calls
grep -n "supabase\.from" src/hooks/useUsageMetrics.ts
# Expected: No results (only supabase.auth.getSession allowed)

# Run integration tests
cd backend && npm run test:integration
```

## Related Files

**Backend:**
- `backend/src/routes/usage.ts` (NEW)
- `backend/src/config/supabase.ts` (updated TABLES)
- `backend/src/index.ts` (added route)
- `backend/tests/integration/usage.test.ts` (NEW)

**Frontend:**
- `src/hooks/useUsageMetrics.ts` (refactored)

## Next Steps

Consider adding:
1. Server-side caching (Redis/KV) for high-traffic scenarios
2. Rate limiting on metrics endpoint (if needed)
3. Batch metrics endpoint for dashboard views
4. Historical usage tracking (trends over time)

## References

- Pattern based on: `src/hooks/useProfile.ts`
- Backend pattern: `backend/src/routes/profile.ts`
- Authentication: `backend/src/middleware/auth.ts`
