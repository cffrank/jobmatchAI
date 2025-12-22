# Login Protection Implementation Guide

## SEC-004: Account Lockout After Failed Login Attempts

### Overview

JobMatch AI implements brute-force protection by locking accounts after 5 failed login attempts within 15 minutes. This prevents credential stuffing and password guessing attacks.

---

## Architecture

### Database Layer
- **Table**: `failed_login_attempts` - Tracks all failed login attempts
- **Table**: `account_lockouts` - Tracks locked accounts
- **Functions**: PostgreSQL stored procedures for lockout logic
- **Location**: `/supabase/migrations/013_failed_login_tracking.sql`

### Backend Layer
- **Middleware**: `loginProtection.ts` - Provides lockout checking and recording
- **Location**: `/backend/src/middleware/loginProtection.ts`
- **Scheduled Jobs**: Auto-cleanup and auto-unlock
- **Location**: `/backend/src/jobs/scheduled.ts`

### Frontend Layer
- **Client**: Supabase Auth handles authentication
- **Integration**: Frontend must call backend to check lockout status
- **Location**: To be implemented in `/src/pages/LoginPage.tsx`

---

## Configuration

### Lockout Settings

| Parameter | Value | Configurable Location |
|-----------|-------|----------------------|
| **Failed Attempt Threshold** | 5 attempts | `013_failed_login_tracking.sql` (line 120) |
| **Lockout Window** | 15 minutes | `013_failed_login_tracking.sql` (line 121) |
| **Lockout Duration** | 30 minutes | `013_failed_login_tracking.sql` (line 122) |
| **Attempt History Retention** | 24 hours | `cleanup_old_failed_logins()` function |

To change these settings, update the SQL migration and redeploy.

---

## Implementation Status

### ✅ Completed

1. **Database Schema**
   - `failed_login_attempts` table created
   - `account_lockouts` table created
   - Database functions implemented
   - RLS policies applied

2. **Backend Middleware**
   - `checkAccountLockout()` - Pre-login check
   - `recordFailedLogin()` - Post-failed-login tracking
   - `clearFailedAttempts()` - Post-successful-login cleanup
   - `unlockAccount()` - Manual admin unlock

3. **Scheduled Jobs**
   - Hourly cleanup of old failed attempts (>24 hours)
   - Every 15 minutes: auto-unlock expired lockouts

### 🔄 To Implement (Frontend Integration)

The frontend login flow currently uses Supabase Auth directly. To integrate account lockout protection:

#### Option 1: Backend API Endpoint (Recommended)

Create a backend login endpoint that wraps Supabase Auth:

**Backend** (`/backend/src/routes/auth.ts`):
```typescript
import { checkAccountLockout, recordFailedLogin, clearFailedAttempts } from '../middleware/loginProtection';

router.post('/login', checkAccountLockout, async (req, res) => {
  const { email, password } = req.body;

  // Attempt Supabase authentication
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Record failed attempt
    const lockoutResult = await recordFailedLogin(req, email);

    if (lockoutResult?.locked) {
      return res.status(429).json({
        error: 'Account locked',
        message: lockoutResult.message,
        locked_until: lockoutResult.locked_until,
      });
    }

    return res.status(401).json({
      error: 'Invalid credentials',
      attempts_remaining: lockoutResult?.attempts_remaining,
    });
  }

  // Clear failed attempts on successful login
  await clearFailedAttempts(email);

  res.json({
    session: data.session,
    user: data.user,
  });
});
```

**Frontend** (`/src/pages/LoginPage.tsx`):
```typescript
const handleLogin = async (email: string, password: string) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (response.status === 429) {
      const data = await response.json();
      toast.error(data.message);
      return;
    }

    if (!response.ok) {
      const data = await response.json();
      if (data.attempts_remaining) {
        toast.error(`Invalid credentials. ${data.attempts_remaining} attempts remaining.`);
      } else {
        toast.error('Invalid credentials');
      }
      return;
    }

    const { session } = await response.json();
    // Set session in Supabase client
    await supabase.auth.setSession(session);
    navigate('/dashboard');
  } catch (error) {
    toast.error('Login failed');
  }
};
```

#### Option 2: Database RPC Call (Alternative)

Keep Supabase Auth on frontend, but check lockout via RPC:

**Frontend**:
```typescript
const handleLogin = async (email: string, password: string) => {
  // Check if account is locked
  const { data: isLocked } = await supabase.rpc('is_account_locked', {
    user_email: email.toLowerCase(),
  });

  if (isLocked) {
    toast.error('Account is temporarily locked. Please try again later.');
    return;
  }

  // Proceed with normal Supabase auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Note: Cannot record failed attempt from frontend (requires service role)
    // Failed attempts must be tracked by backend or Supabase Auth hooks
    toast.error('Invalid credentials');
    return;
  }

  navigate('/dashboard');
};
```

**Limitation**: This approach can check lockout status but cannot record failed attempts (requires service role key).

#### Option 3: Supabase Auth Hooks (Future Enhancement)

Use Supabase Auth hooks to automatically track failed logins:

1. Enable Auth hooks in Supabase Dashboard
2. Create Edge Function to handle `auth.login.failed` event
3. Call `record_failed_login()` from Edge Function

---

## Testing the Protection

### Manual Testing

1. **Test Failed Login Threshold**:
   ```bash
   # Attempt login 5 times with wrong password
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"wrong"}'

   # 6th attempt should return 429 (Account Locked)
   ```

2. **Test Auto-Unlock**:
   ```sql
   -- Check lockout status
   SELECT * FROM account_lockouts WHERE email = 'test@example.com';

   -- Wait 30 minutes, then check again (should be unlocked)
   ```

3. **Test Manual Unlock**:
   ```typescript
   import { unlockAccount } from './middleware/loginProtection';

   await unlockAccount('test@example.com', adminUserId);
   ```

### Automated Testing

Create end-to-end tests in `/tests/login-protection.spec.ts`:

```typescript
test('Account locks after 5 failed attempts', async () => {
  const email = 'lockout-test@example.com';

  // Attempt login 5 times with wrong password
  for (let i = 0; i < 5; i++) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password: 'wrong' }),
    });
    expect(response.status).toBe(401);
  }

  // 6th attempt should be locked
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password: 'wrong' }),
  });
  expect(response.status).toBe(429);
  expect(await response.json()).toMatchObject({
    error: 'Account locked',
  });
});
```

---

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Lockout Rate**:
   ```sql
   SELECT DATE(locked_at), COUNT(*)
   FROM account_lockouts
   WHERE locked_at > NOW() - INTERVAL '7 days'
   GROUP BY DATE(locked_at)
   ORDER BY 1 DESC;
   ```

2. **Top Targeted Accounts**:
   ```sql
   SELECT email, COUNT(*) as failed_count
   FROM failed_login_attempts
   WHERE attempted_at > NOW() - INTERVAL '24 hours'
   GROUP BY email
   ORDER BY failed_count DESC
   LIMIT 10;
   ```

3. **Attack Patterns (by IP)**:
   ```sql
   SELECT ip_address, COUNT(DISTINCT email) as targeted_accounts
   FROM failed_login_attempts
   WHERE attempted_at > NOW() - INTERVAL '1 hour'
   GROUP BY ip_address
   HAVING COUNT(DISTINCT email) > 5
   ORDER BY targeted_accounts DESC;
   ```

### Alert Thresholds

Set up alerts for:
- More than 10 lockouts per hour (possible attack)
- Single IP targeting >5 different accounts (credential stuffing)
- Unusually high failed login rate (>100/hour)

---

## Admin Functions

### Manually Unlock Account

```bash
# Via backend API (requires admin auth)
curl -X POST http://localhost:3000/api/admin/unlock-account \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

### View Lockout Status

```sql
-- Check if specific account is locked
SELECT * FROM account_lockouts
WHERE email = 'user@example.com'
  AND unlocked_at IS NULL;

-- View all recent failed attempts
SELECT
  email,
  ip_address,
  attempted_at,
  user_agent
FROM failed_login_attempts
WHERE email = 'user@example.com'
ORDER BY attempted_at DESC
LIMIT 10;
```

### Clear Failed Attempts

```sql
-- Clear failed attempts for specific user (use with caution)
SELECT clear_failed_login_attempts('user@example.com');
```

---

## Security Considerations

### ✅ Best Practices Implemented

1. **Separate Tracking**: Failed attempts tracked separately from user accounts
2. **IP Tracking**: Records IP address for forensic analysis
3. **Auto-Cleanup**: Old records deleted after 24 hours
4. **Auto-Unlock**: Accounts automatically unlock after timeout
5. **RLS Protected**: Tables only accessible via service role
6. **Indexed Queries**: Fast lookups even with millions of attempts

### ⚠️ Potential Issues

1. **Shared IP Addresses**: Multiple users behind NAT may trigger false positives
   - **Mitigation**: Lockout is email-based, not IP-based
   - IPs only tracked for forensics, not enforcement

2. **User Enumeration**: Attackers could discover valid emails
   - **Mitigation**: Return same error message for invalid email vs wrong password
   - Don't indicate whether email exists

3. **Denial of Service**: Attacker could intentionally lock out legitimate users
   - **Mitigation**: Lockout duration is only 30 minutes
   - Admin can manually unlock accounts
   - Monitor for patterns of targeted lockouts

---

## Deployment Checklist

Before deploying to production:

- [ ] Run migration `013_failed_login_tracking.sql`
- [ ] Verify database functions created successfully
- [ ] Test lockout threshold (5 attempts)
- [ ] Test auto-unlock after 30 minutes
- [ ] Verify scheduled jobs are running
- [ ] Set up monitoring alerts
- [ ] Train support team on manual unlock procedure
- [ ] Update user-facing error messages
- [ ] Test with VPN/proxy to verify IP tracking
- [ ] Document admin procedures

---

## Troubleshooting

### Accounts Not Locking

**Check**:
1. Migration applied successfully
2. Functions granted execute permissions
3. Backend calling `record_failed_login()` correctly
4. Check logs for SQL errors

**Debug**:
```sql
-- Check recent failed attempts
SELECT * FROM failed_login_attempts
ORDER BY attempted_at DESC
LIMIT 20;

-- Manually test function
SELECT record_failed_login('test@example.com', '127.0.0.1'::inet, 'test');
```

### Accounts Not Auto-Unlocking

**Check**:
1. Scheduled job running (check backend logs)
2. `locked_until` timestamp is in the past
3. `cleanup_expired_lockouts()` function works

**Debug**:
```sql
-- Manually run cleanup
SELECT cleanup_expired_lockouts();

-- Check lockout table
SELECT * FROM account_lockouts WHERE unlocked_at IS NULL;
```

### High False Positive Rate

**Check**:
- Are multiple users sharing the same IP? (Corporate network, VPN)
- Is threshold too low? (Consider raising to 7-10 attempts)
- Is lockout window too long? (Consider reducing to 10 minutes)

**Adjust**:
```sql
-- Modify lockout parameters in migration file
-- Then re-run migration
```

---

## Future Enhancements

1. **CAPTCHA Integration**: Show CAPTCHA after 3 failed attempts
2. **Email Notifications**: Alert users when their account is locked
3. **Geographic Anomaly Detection**: Flag logins from unusual locations
4. **Device Fingerprinting**: Track trusted devices
5. **Adaptive Thresholds**: Lower threshold for high-risk accounts
6. **IP Blacklisting**: Permanently block IPs with suspicious activity
7. **Two-Factor Recovery**: Require 2FA to unlock account

---

## References

- OWASP: [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- NIST: [Digital Identity Guidelines (SP 800-63B)](https://pages.nist.gov/800-63-3/sp800-63b.html#sec5)
- Security Audit: `/docs/workflows/SECURITY_AUDIT.md` (SEC-004)
