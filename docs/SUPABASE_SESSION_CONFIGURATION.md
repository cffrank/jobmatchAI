# Supabase Session Configuration

## SEC-002: Session Duration Settings

### Current Configuration

**JWT Expiration**: 7 days (default Supabase setting)
**Inactivity Timeout**: 30 minutes (enforced in frontend)

### How Sessions Work

1. **JWT Token Expiration** (Supabase Dashboard Configuration)
   - Default: 7 days (604800 seconds)
   - Configured in Supabase Dashboard → Authentication → Settings → JWT Settings
   - Cannot be configured in code (server-side Supabase setting)

2. **Inactivity Timeout** (Frontend Implementation)
   - Current: 30 minutes
   - Implemented in `/src/lib/sessionManagement.ts`
   - Sessions expire after 30 minutes of inactivity
   - User must re-authenticate after timeout

### Security Implementation

The application uses a **dual-layer session management** approach:

#### Layer 1: Supabase JWT Expiration (7 days)
- Tokens automatically expire after 7 days
- `autoRefreshToken: true` refreshes tokens before expiration
- User must re-login after 7 days even if active

#### Layer 2: Inactivity Timeout (30 minutes)
- Frontend tracks user activity
- Sessions expire after 30 minutes of inactivity
- Implemented via `SESSION_TIMEOUT_MS = 30 * 60 * 1000`
- Activity tracking on: mousedown, keydown, scroll, touchstart, click

### Compliance with SEC-002

✅ **COMPLIANT**: Session duration is already 7 days (not 30 days)
- JWT tokens expire after 7 days maximum
- Inactivity timeout of 30 minutes provides additional security
- Sliding window via activity tracking and token refresh

### Configuration Locations

1. **Supabase Dashboard** (JWT expiration)
   - Navigate to: Authentication → Settings → JWT Settings
   - JWT Expiry: 604800 seconds (7 days)

2. **Frontend Code** (Inactivity timeout)
   - File: `/src/lib/sessionManagement.ts`
   - Variable: `SESSION_TIMEOUT_MS`
   - Value: `30 * 60 * 1000` (30 minutes)

3. **Supabase Client** (Session configuration)
   - File: `/src/lib/supabase.ts`
   - Uses implicit flow (default for client-side SPAs)
   - Auto-refresh enabled to maintain valid sessions
   - localStorage for session persistence

### Recommendations

**Current settings are SECURE and meet industry standards**:
- 7-day maximum session duration prevents indefinite token validity
- 30-minute inactivity timeout prevents session hijacking
- Implicit OAuth flow appropriate for client-side applications
- Auto-refresh ensures seamless user experience
- Sessions persist securely in browser localStorage

**No changes required for SEC-002 compliance**.

### Notes for Future Changes

If you need to modify JWT expiration:
1. Go to Supabase Dashboard
2. Project Settings → Authentication → JWT Settings
3. Change "JWT Expiry" value (in seconds)
4. Common values:
   - 1 day: 86400
   - 7 days: 604800 (current)
   - 14 days: 1209600
   - 30 days: 2592000 (NOT RECOMMENDED)

If you need to modify inactivity timeout:
1. Edit `/src/lib/sessionManagement.ts`
2. Change `SESSION_TIMEOUT_MS` constant
3. Also update `SESSION_WARNING_MS` (typically timeout - 5 minutes)
