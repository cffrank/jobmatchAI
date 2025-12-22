# Security Testing Guide

Quick reference for validating Supabase authentication and security configuration.

---

## Running Security Tests

### Automated Test Suite

```bash
# Run full authentication and security test suite
npm run test:auth

# Alternative command (same test)
npm run test:security
```

### Expected Output

```
================================================================================
🧪 SUPABASE AUTHENTICATION & SECURITY TEST SUITE
================================================================================

✅ Passed:   9
❌ Failed:   0
⚠️  Warnings: 1
📝 Total:    9

✅ ALL TESTS PASSED!
```

---

## What Gets Tested

### 1. Database Connection ✅
- Verifies connectivity to Supabase
- Validates table access
- Checks schema cache

### 2. User Signup ✅
- Creates test user with email/password
- Validates JWT token issuance
- Confirms user creation in auth.users

### 3. Auto-User Creation Trigger ✅
- Verifies `handle_new_user()` trigger fires
- Confirms public.users record created
- Validates foreign key integrity

### 4. RLS Policy - Sessions ✅
- Tests INSERT during signup (unauthenticated)
- Validates SELECT restrictions
- Confirms user isolation

### 5. RLS Policy - Security Events ✅
- Tests INSERT during signup (unauthenticated)
- Confirms event logging works
- Validates data isolation

### 6. Login Flow ✅
- Tests email/password authentication
- Validates JWT token on login
- Checks session creation

### 7. Database Constraints ✅
- Tests unique constraint on session_id
- Validates duplicate prevention
- Confirms ON CONFLICT support

### 8. Security Configuration ✅
- Validates HTTPS enabled
- Checks API key format
- Reviews RLS status on tables

---

## Manual Testing Checklist

### Signup Flow

1. **Open frontend in incognito window**:
   ```
   https://jobmatchai-production.up.railway.app
   ```

2. **Click "Create Account"**

3. **Fill in details**:
   - Email: Use a real email for confirmation
   - Password: Strong password (8+ chars)

4. **Expected behavior**:
   - ✅ No console errors about "placeholder.supabase.co"
   - ✅ No foreign key constraint errors
   - ✅ No RLS policy violations
   - ⚠️ Email confirmation required (or disabled in Supabase settings)

5. **Check browser console (F12)**:
   - Should see: `[Session] New session initialized`
   - Should NOT see: Database errors, RLS errors, constraint errors

### Login Flow

1. **If email confirmed**, try logging in with credentials

2. **Expected behavior**:
   - ✅ Successful login
   - ✅ Session created
   - ✅ Redirected to dashboard

3. **If email NOT confirmed**:
   - ⚠️ Error: "Email not confirmed" (expected)
   - Check email for confirmation link

---

## Checking Security Event Logs

### Via Supabase Dashboard

1. **Go to**: https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh/editor

2. **Navigate to**: `security_events` table

3. **Run query**:
   ```sql
   SELECT * FROM security_events
   ORDER BY timestamp DESC
   LIMIT 10;
   ```

4. **Look for**:
   - `action`: 'signup', 'login', 'logout', etc.
   - `status`: 'success' or 'failure'
   - `user_id`: Matches the user who performed the action
   - `ip_address`: User's IP
   - `user_agent`: Browser/device info

### Via SQL

```bash
# Run from terminal
npm run test:auth -- --verbose
```

---

## Troubleshooting Common Issues

### Issue 1: Email Not Confirmed

**Error**: `AuthApiError: Email not confirmed`

**Solution**:
1. Check email inbox for confirmation link, OR
2. Disable email confirmation:
   - Go to: https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh/auth/providers
   - Click "Email"
   - Turn OFF "Confirm email"
   - Save

### Issue 2: Foreign Key Constraint Violation

**Error**: `violates foreign key constraint "security_events_user_id_fkey"`

**Cause**: `handle_new_user()` trigger not working

**Check**:
```sql
-- Verify trigger exists
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';
```

**Fix**: Re-apply migration 006:
```bash
# Contact support or re-run migration via Supabase dashboard
```

### Issue 3: RLS Policy Violation

**Error**: `new row violates row-level security policy`

**Cause**: RLS policy too restrictive for signup flow

**Check**: Verify policies allow `auth.uid() IS NULL`

**Fix**: Migration 005 and 006 should have fixed this. Re-run tests:
```bash
npm run test:auth
```

### Issue 4: Session Unique Constraint Error

**Error**: `there is no unique or exclusion constraint matching the ON CONFLICT specification`

**Cause**: Missing unique constraint on session_id

**Fix**: Already fixed in migration 005. Verify:
```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'sessions'
  AND constraint_type = 'UNIQUE';
```

Should show: `unique_session_id`

---

## Validating Specific Components

### Check RLS Policies

```sql
-- View all policies on sessions table
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'sessions';
```

### Check Triggers

```sql
-- View trigger on auth.users
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';
```

### Check Migrations

```sql
-- View applied migrations
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC;
```

Expected latest: `20251221213041` - `fix_signup_flow`

---

## Performance Testing

### Load Testing Signup

```bash
# Create multiple test users rapidly
for i in {1..10}; do
  curl -X POST https://lrzhpnsykasqrousgmdh.supabase.co/auth/v1/signup \
    -H "apikey: YOUR_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test$i@example.com\",\"password\":\"TestPassword123!\"}" &
done
```

**Expected**: All requests succeed without errors

### Session Creation Performance

```bash
# Time session creation
time npm run test:auth
```

**Expected**: Complete in < 5 seconds

---

## Security Audit Checklist

Run this checklist monthly or after major changes:

- [ ] Run automated tests: `npm run test:auth`
- [ ] All tests passing (9/9)
- [ ] Review security_events for anomalies
- [ ] Check for failed login attempts
- [ ] Verify RLS policies still enforced
- [ ] Confirm unique constraints active
- [ ] Validate trigger still functioning
- [ ] Check for new Supabase advisories
- [ ] Review rate_limits table for abuse
- [ ] Audit oauth_states for expired entries

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Security Tests

on: [push, pull_request]

jobs:
  security-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - name: Run Security Tests
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        run: npm run test:auth
```

---

## Resources

**Test File**: `test-supabase-auth.js`

**Security Report**: `SUPABASE_SECURITY_REPORT.md`

**Migrations**: `supabase/migrations/006_fix_signup_flow.sql`

**Supabase Dashboard**: https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh

**Support**: Run tests and check logs before reporting issues

---

*Last Updated: 2025-12-21*
