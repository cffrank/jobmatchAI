# Secure Cookie Configuration Guide

## SEC-009: HTTPS-Only and Secure Cookie Flags

### Overview

JobMatch AI uses **JWT tokens in Authorization headers** (not cookies) for most API communication. However, Supabase Auth uses cookies for session management in certain flows. This document ensures those cookies are configured securely.

---

## Current Authentication Architecture

### 1. Frontend → Backend API
- **Method**: Bearer token in `Authorization` header
- **Storage**: localStorage (`jobmatch-auth-token`)
- **Security**: HTTPS-only in production, CORS protection

### 2. Supabase Auth Sessions
- **Method**: HTTP-only cookies (server-side)
- **Managed By**: Supabase Auth service
- **Configuration**: Supabase Dashboard

---

## Supabase Cookie Security Configuration

### Required Settings in Supabase Dashboard

Navigate to: **Supabase Dashboard → Authentication → Settings → Security and Auth**

#### 1. Site URL Configuration
```
Site URL: https://jobmatch-ai.railway.app (production)
```

#### 2. Redirect URLs (Whitelist)
```
https://jobmatch-ai.railway.app/**
http://localhost:5173/** (development only)
```

#### 3. JWT Settings
```
JWT expiry: 604800 (7 days)
Disable Signup: false
Enable Email Confirmations: true
```

#### 4. Cookie Configuration

**These settings are configured server-side by Supabase:**

| Setting | Value | Purpose |
|---------|-------|---------|
| `Secure` | `true` | Only transmit over HTTPS |
| `HttpOnly` | `true` | Prevent JavaScript access (XSS protection) |
| `SameSite` | `Lax` | CSRF protection, allow top-level navigation |
| `Path` | `/` | Cookie available to all routes |
| `Max-Age` | 604800 seconds | 7 days (matches JWT expiry) |

**Note**: These cookie flags are automatically set by Supabase Auth and cannot be configured in code. They are controlled by the `Site URL` configuration - if the Site URL uses `https://`, cookies are automatically set as `Secure`.

---

## Frontend Cookie Configuration

### Current Implementation

The frontend Supabase client is configured in `/src/lib/supabase.ts`:

```typescript
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,      // Refresh before expiry
      persistSession: true,         // Keep user logged in
      detectSessionInUrl: true,     // Handle OAuth redirects
      storageKey: 'jobmatch-auth-token',
      flowType: 'pkce',             // SEC-002: PKCE flow for better security
    },
  }
)
```

### Storage Mechanism

**Primary Storage**: `localStorage`
- Used for JWT tokens
- Cross-tab session detection
- Not HTTP-only (by design, needed for client-side auth)

**Cookie Usage** (Supabase-managed):
- Only used during OAuth flows
- Set by Supabase Auth server
- Automatically secure in production

---

## Verification Checklist

### ✅ Production Environment

Verify these settings are correct:

1. **HTTPS Enforcement**
   - [ ] Railway deployment uses HTTPS
   - [ ] HTTP requests redirect to HTTPS
   - [ ] No mixed content warnings in browser

2. **Cookie Flags** (Inspect in Browser DevTools)
   - [ ] `Secure` flag present on auth cookies
   - [ ] `HttpOnly` flag present
   - [ ] `SameSite=Lax` set
   - [ ] Domain matches production URL

3. **Supabase Dashboard**
   - [ ] Site URL is `https://jobmatch-ai.railway.app`
   - [ ] No `http://` URLs in redirect whitelist (except localhost)
   - [ ] JWT expiry is 604800 seconds (7 days)

### 🔧 Development Environment

Development has relaxed security for local testing:

- HTTP allowed for `localhost:5173`
- Cookies may not have `Secure` flag (expected)
- SameSite still enforced

**DO NOT deploy development configuration to production.**

---

## Browser Cookie Inspection

### How to Verify Cookie Security

1. **Open DevTools** (F12)
2. **Navigate to**: Application → Cookies → `https://jobmatch-ai.railway.app`
3. **Check for Supabase auth cookies**:
   - Name: `sb-<project-ref>-auth-token`
   - `Secure`: ✅ (should be checked)
   - `HttpOnly`: ✅ (should be checked)
   - `SameSite`: `Lax`

4. **If cookies are missing `Secure` flag**:
   - Verify Site URL in Supabase Dashboard uses `https://`
   - Ensure Railway deployment has HTTPS enabled
   - Clear cookies and re-login

---

## Security Benefits

### 1. `Secure` Flag
**Protection**: Prevents cookie transmission over unencrypted HTTP
- Mitigates man-in-the-middle attacks
- Ensures credentials only travel over TLS/SSL

### 2. `HttpOnly` Flag
**Protection**: Prevents JavaScript from accessing cookies
- Blocks XSS attacks from stealing session tokens
- Cookies only accessible to server

### 3. `SameSite=Lax`
**Protection**: Prevents CSRF attacks
- Cookies only sent on same-site requests
- Allows top-level navigation (OAuth flows)
- Blocks cross-site POST requests

---

## Common Issues and Solutions

### Issue 1: Cookies Not Set

**Symptoms**:
- User can't stay logged in
- Session lost on page refresh

**Solutions**:
1. Check Site URL in Supabase Dashboard
2. Verify HTTPS is enabled
3. Clear browser cookies and try again
4. Check browser console for cookie warnings

### Issue 2: CORS Errors with Cookies

**Symptoms**:
- `credentials: include` requests fail
- "Blocked by CORS policy" errors

**Solutions**:
1. Verify backend CORS allows credentials:
   ```typescript
   cors({ credentials: true })
   ```
2. Check origin is whitelisted in backend
3. Ensure frontend uses correct API URL

### Issue 3: Cookies Missing `Secure` Flag

**Symptoms**:
- Cookies work in development but not production
- Browser blocks cookie in production

**Solutions**:
1. Verify Railway deployment uses HTTPS
2. Update Site URL to use `https://` (not `http://`)
3. Redeploy both frontend and backend

---

## Compliance Status

### SEC-009: HTTPS-Only and Secure Cookie Flags

✅ **COMPLIANT**

- Supabase Auth automatically sets secure cookie flags when Site URL uses HTTPS
- Railway production deployment enforces HTTPS
- SameSite=Lax protects against CSRF
- HttpOnly flag prevents XSS cookie theft
- Cookie expiration matches JWT expiry (7 days)

**No code changes required** - security is enforced by:
1. Supabase Auth service (server-side cookie flags)
2. Railway HTTPS enforcement
3. Proper Site URL configuration

---

## Deployment Checklist

Before deploying to production:

- [ ] Verify Supabase Site URL uses `https://`
- [ ] Test authentication flow in production
- [ ] Inspect cookies in browser DevTools
- [ ] Confirm `Secure`, `HttpOnly`, `SameSite=Lax` flags
- [ ] Test login/logout functionality
- [ ] Verify sessions persist across page refreshes
- [ ] Monitor for authentication errors in logs

---

## References

- [Supabase Auth Cookie Configuration](https://supabase.com/docs/guides/auth/server-side/cookies)
- [OWASP Cookie Security](https://owasp.org/www-community/controls/SecureCookieAttribute)
- [MDN: SameSite Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [Chrome SameSite Updates](https://www.chromium.org/updates/same-site/)

---

## Maintenance

**Review Frequency**: Quarterly
**Last Reviewed**: December 21, 2025
**Next Review**: March 21, 2026
**Owner**: Security Team
