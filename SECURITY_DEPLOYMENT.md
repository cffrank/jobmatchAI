# Security Implementation Deployment Guide

## Overview

This guide walks through deploying all security enhancements to your Firebase project.

## Prerequisites

- Firebase CLI installed and authenticated
- Node.js 20+ installed
- Project deployed to Firebase Hosting
- Firebase Blaze plan (required for Cloud Functions)

## Step 1: Deploy Updated Firebase Configuration

The firebase.json file has been updated with comprehensive security headers including:
- Content Security Policy (CSP) - now in enforce mode
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- Permissions-Policy, X-XSS-Protection, X-Download-Options
- HTTPS enforcement redirects

Deploy the hosting configuration:

```bash
cd /home/carl/application-tracking/jobmatch-ai
firebase deploy --only hosting
```

## Step 2: Deploy Storage Security Rules

Updated storage rules include enhanced file validation and path traversal prevention.

```bash
firebase deploy --only storage:rules
```

## Step 3: Set Up Cloud Functions

### Install Dependencies

```bash
cd functions
npm install
```

### Configure API Keys

Set your API keys for external services:

```bash
# OpenAI API key (if using AI features)
firebase functions:config:set openai.key="YOUR_OPENAI_KEY"

# Apify API key (if using job scraping)
firebase functions:config:set apify.key="YOUR_APIFY_KEY"

# Verify configuration
firebase functions:config:get
```

### Build and Deploy Functions

```bash
# Build TypeScript functions
npm run build

# Deploy all security functions
cd ..
firebase deploy --only functions
```

This deploys:
- `scanUploadedFile` - Automatic malware scanning on file upload
- `scanFile` - Manual file scan trigger
- `checkRateLimit` - Rate limit validation
- `cleanupRateLimits` - Daily cleanup of expired records
- `proxyOpenAI` - Secure OpenAI API proxy
- `proxyJobSearch` - Secure job search API proxy

## Step 4: Verify Deployment

### Check Security Headers

Use securityheaders.com to verify your headers:

```bash
# Visit your site
https://YOUR_PROJECT.web.app

# Check at
https://securityheaders.com/?q=https://YOUR_PROJECT.web.app
```

Expected score: A or A+

### Test File Upload Scanning

1. Log into your application
2. Upload a test file (PDF or image)
3. Check Firestore collection `file_scans` for scan result
4. Upload a suspicious file (e.g., .exe renamed to .pdf) and verify quarantine

### Test Rate Limiting

1. Make multiple rapid API requests
2. Verify rate limit error after threshold
3. Check Firestore collection `rate_limits` for tracking
4. Check `security_events` for violations

## Step 5: Enable Security Monitoring

### Set Up Cloud Monitoring Alerts

Create alerts for security events:

```bash
# Navigate to Cloud Console
https://console.cloud.google.com/monitoring/alerting

# Create alerts for:
# 1. High rate of quarantine events
# 2. Unusual spike in rate limit violations
# 3. Function execution errors
# 4. High function latency
```

### Configure Log Exports

Export security logs to BigQuery for analysis:

```bash
# Enable BigQuery export in Cloud Logging
gcloud logging sinks create security-logs \
  bigquery.googleapis.com/projects/YOUR_PROJECT/datasets/security_logs \
  --log-filter='resource.type="cloud_function"
    AND (
      textPayload=~"QUARANTINE"
      OR textPayload=~"rate_limit"
      OR textPayload=~"security_event"
    )'
```

## Step 6: Test CSP Compliance

### Check for CSP Violations

1. Open your application in browser
2. Open Developer Console (F12)
3. Check for CSP violation errors
4. Fix any reported violations

### Common CSP Issues

**Issue**: Inline scripts blocked
**Solution**: Add nonce to script tags or move scripts to external files

**Issue**: Tailwind styles blocked
**Solution**: Already configured with 'unsafe-inline' for style-src

**Issue**: External API calls blocked
**Solution**: Add domain to connect-src in firebase.json

## Step 7: Update Client-Side Code

### Integrate Rate Limiting Hook

Update components that make API calls:

```typescript
import { useRateLimit } from '@/hooks/useRateLimit';

function MyComponent() {
  const { checkRateLimit } = useRateLimit();

  const handleAIGeneration = async () => {
    // Check rate limit before making request
    const allowed = await checkRateLimit('ai_generation');
    if (!allowed) return;

    // Proceed with API call
    await generateAIContent();
  };
}
```

### Use Secure API Proxies

Replace direct API calls with proxy functions:

```typescript
// Before (INSECURE - exposes API key)
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${API_KEY}` }
});

// After (SECURE - uses proxy)
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const proxyOpenAI = httpsCallable(functions, 'proxyOpenAI');

const result = await proxyOpenAI({
  prompt: 'Generate content...',
  model: 'gpt-4'
});
```

## Step 8: HSTS Preload Submission

Submit your domain to the HSTS preload list:

1. Verify HSTS header is deployed (see Step 1)
2. Visit https://hstspreload.org/
3. Enter your domain
4. Follow submission instructions
5. Wait for approval (can take weeks)

## Step 9: Security Audit

Run a comprehensive security audit:

### Automated Scanning

```bash
# Install OWASP ZAP or similar
# Run automated scan against your site
zap-cli quick-scan https://YOUR_PROJECT.web.app

# Check for:
# - XSS vulnerabilities
# - CSRF issues
# - Security misconfigurations
# - Known vulnerabilities
```

### Manual Testing

1. Test file upload with malicious files
2. Attempt SQL injection in forms
3. Try path traversal in URLs
4. Test rate limits across endpoints
5. Verify authentication bypass protection

## Step 10: Documentation and Training

### Update Team Documentation

1. Share SECURITY.md with development team
2. Document custom security policies
3. Create incident response playbook
4. Schedule security training sessions

### Set Up Monitoring Dashboard

Create a security dashboard in Firebase Console showing:
- Recent quarantine events
- Rate limit violations
- API usage trends
- Failed authentication attempts

## Rollback Plan

If issues occur after deployment:

### Rollback Hosting

```bash
# List recent deployments
firebase hosting:releases:list

# Rollback to previous version
firebase hosting:rollback
```

### Rollback Functions

```bash
# Redeploy previous version
git checkout <previous-commit>
cd functions && npm run build && cd ..
firebase deploy --only functions
```

### Temporarily Disable CSP

Edit firebase.json and change CSP to report-only mode:

```json
{
  "key": "Content-Security-Policy-Report-Only",
  "value": "..."
}
```

Then redeploy hosting.

## Post-Deployment Checklist

- [ ] Security headers verified (A+ rating)
- [ ] CSP violations resolved
- [ ] File scanning tested and working
- [ ] Rate limiting tested and working
- [ ] API proxies tested and working
- [ ] Firestore security events logging
- [ ] Cloud Monitoring alerts configured
- [ ] Log exports to BigQuery enabled
- [ ] HSTS preload submitted
- [ ] Security audit completed
- [ ] Team trained on new security measures
- [ ] Incident response plan documented
- [ ] Rollback procedures tested

## Maintenance

### Weekly

- Review security event logs
- Check for CSP violations
- Monitor API usage patterns

### Monthly

- Review and update rate limits
- Analyze quarantined files
- Update dependency versions
- Review Cloud Function costs

### Quarterly

- Full security audit
- Penetration testing
- Review and update security policies
- Rotate API keys

## Troubleshooting

### Functions Not Deploying

```bash
# Check function logs
firebase functions:log

# Verify build succeeds
cd functions && npm run build

# Check for TypeScript errors
npm run lint
```

### CSP Blocking Resources

1. Check browser console for violations
2. Add legitimate sources to firebase.json CSP directive
3. Redeploy hosting

### File Scanning Issues

1. Check Cloud Function logs: `firebase functions:log --only scanUploadedFile`
2. Verify Storage permissions
3. Check file size (must be under 10MB)
4. Review quarantine directory

### Rate Limiting Too Aggressive

1. Adjust limits in `/functions/src/rateLimiting.ts`
2. Rebuild and redeploy functions
3. Clear existing rate limit records if needed

## Support

For security issues:
- Email: security@jobmatch-ai.com
- Do NOT create public GitHub issues

For deployment issues:
- Check Firebase Status: https://status.firebase.google.com/
- Firebase Support: https://firebase.google.com/support
