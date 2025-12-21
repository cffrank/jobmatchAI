# Security Quick Reference

## Quick Start

### Deploy All Security Features
```bash
# 1. Set API keys
firebase functions:config:set openai.key="YOUR_KEY"
firebase functions:config:set apify.key="YOUR_KEY"

# 2. Build functions
cd functions && npm install && npm run build && cd ..

# 3. Deploy everything
firebase deploy
```

### Verify Deployment
```bash
# Check security headers
curl -I https://YOUR_PROJECT.web.app

# Test functions deployed
firebase functions:list

# View recent logs
firebase functions:log --only scanUploadedFile
```

## Security Headers at a Glance

| Header | Value | Purpose |
|--------|-------|---------|
| CSP | Strict policy | Prevents XSS |
| HSTS | 2-year max-age | Forces HTTPS |
| X-Frame-Options | DENY | Prevents clickjacking |
| X-Content-Type-Options | nosniff | Prevents MIME attacks |
| Referrer-Policy | strict-origin | Privacy |
| Permissions-Policy | Restrictive | Reduces attack surface |

## File Upload Limits

| File Type | Max Size | Allowed Extensions |
|-----------|----------|-------------------|
| Profile Photos | 2MB | JPG, PNG, GIF, WEBP |
| Resumes | 5MB | PDF, DOCX, TXT |
| Exports | 10MB | ZIP |

## Rate Limits

| Endpoint | Limit | Window | Ban After |
|----------|-------|--------|-----------|
| AI Generation | 10 | 1 min | 50 total |
| Job Scraping | 20 | 1 min | 100 total |
| File Upload | 5 | 1 min | 20 total |
| Authentication | 5 | 5 min | 10 total |

## Cloud Functions

| Function | Type | Purpose |
|----------|------|---------|
| scanUploadedFile | Storage Trigger | Auto malware scan |
| scanFile | HTTPS Callable | Manual scan |
| checkRateLimit | HTTPS Callable | Rate limit check |
| cleanupRateLimits | Scheduled (Daily) | Cleanup old records |
| proxyOpenAI | HTTPS Callable | Secure OpenAI calls |
| proxyJobSearch | HTTPS Callable | Secure job search |

## Client-Side Usage

### Rate Limiting
```typescript
import { useRateLimit } from '@/hooks/useRateLimit';

const { checkRateLimit } = useRateLimit();

// Before API call
const allowed = await checkRateLimit('ai_generation');
if (!allowed) return;

// Proceed with request
```

### OpenAI Proxy
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const proxyOpenAI = httpsCallable(functions, 'proxyOpenAI');

const result = await proxyOpenAI({
  prompt: 'Your prompt...',
  model: 'gpt-4',
  maxTokens: 1000
});
```

### Job Search Proxy
```typescript
const proxyJobSearch = httpsCallable(functions, 'proxyJobSearch');

const result = await proxyJobSearch({
  query: 'Software Engineer',
  location: 'San Francisco',
  maxResults: 10
});
```

## Firestore Collections (Security)

| Collection | Purpose | Retention |
|------------|---------|-----------|
| file_scans | File scan results | 90 days |
| security_events | Security violations | 1 year |
| rate_limits | Request tracking | 24 hours |
| banned_clients | Banned users/IPs | Until expiry |
| api_usage | API call logs | 90 days |

## Common Tasks

### View Security Events
```bash
# Last 100 security events
firebase firestore:get security_events --limit 100
```

### Clear Rate Limit for User
```bash
# Via Firebase Console
# Navigate to: Firestore > rate_limits > [user_id] > Delete
```

### Unban User
```bash
# Via Firebase Console
# Navigate to: Firestore > banned_clients > [user_id] > Delete
```

### View Quarantined Files
```bash
# Via Firebase Console
# Navigate to: Storage > quarantine/
```

### Check Function Logs
```bash
# All functions
firebase functions:log

# Specific function
firebase functions:log --only scanUploadedFile

# Errors only
firebase functions:log --min-log-level error
```

## Troubleshooting

### CSP Blocking Resources
1. Open browser console (F12)
2. Look for CSP violation errors
3. Add legitimate source to firebase.json
4. Redeploy: `firebase deploy --only hosting`

### File Upload Failing
1. Check file size (< 2MB or 5MB)
2. Verify file type (PDF, DOCX, images only)
3. Check Storage rules deployed
4. View logs: `firebase functions:log --only scanUploadedFile`

### Rate Limit Too Strict
1. Edit `/functions/src/rateLimiting.ts`
2. Adjust limits in RATE_LIMITS config
3. Rebuild: `cd functions && npm run build`
4. Deploy: `firebase deploy --only functions`

### Function Not Deploying
1. Check for TypeScript errors: `cd functions && npm run build`
2. Verify Node version: `node --version` (should be 20+)
3. Check Firebase project: `firebase use`
4. View deployment logs for errors

## Emergency Procedures

### Disable CSP (Emergency Only)
Edit firebase.json, change `Content-Security-Policy` to `Content-Security-Policy-Report-Only`:
```bash
# Edit firebase.json
# Change key from "Content-Security-Policy" to "Content-Security-Policy-Report-Only"
firebase deploy --only hosting
```

### Disable Rate Limiting
```bash
# Comment out rate limit check in your code
# Or delete rate_limits collection temporarily
```

### Rollback Deployment
```bash
# List recent deployments
firebase hosting:releases:list

# Rollback to previous
firebase hosting:rollback
```

## Security Checklist

### Before Deploy
- [ ] API keys set in Firebase Config
- [ ] Functions build successfully
- [ ] No TypeScript errors
- [ ] Tests passing

### After Deploy
- [ ] Security headers verified (securityheaders.com)
- [ ] CSP not blocking legitimate resources
- [ ] File upload working
- [ ] Rate limiting working
- [ ] Functions responding
- [ ] Logs clean (no errors)

### Weekly Maintenance
- [ ] Review security_events collection
- [ ] Check quarantined files
- [ ] Monitor rate limit violations
- [ ] Check function error rates

### Monthly Maintenance
- [ ] Update npm dependencies
- [ ] Review and adjust rate limits
- [ ] Rotate API keys
- [ ] Security audit

## Key Files

| File | Purpose |
|------|---------|
| firebase.json | Security headers, CSP |
| storage.rules | File upload validation |
| functions/src/fileScanning.ts | Malware detection |
| functions/src/rateLimiting.ts | Rate limits |
| functions/src/secureProxy.ts | API proxies |
| src/hooks/useRateLimit.ts | Client-side hook |

## Resources

- Full Docs: SECURITY.md
- Deployment Guide: SECURITY_DEPLOYMENT.md
- Summary: SECURITY_SUMMARY.md
- Functions README: functions/README.md

## Support

**Security Issues**: security@jobmatch-ai.com (DO NOT create public issues)

**General Support**:
- Firebase Status: https://status.firebase.google.com
- Firebase Docs: https://firebase.google.com/docs
