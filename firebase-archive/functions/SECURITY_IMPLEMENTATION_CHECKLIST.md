# Security Implementation Checklist

## Implementation Steps

### Phase 1: Module Setup ✓
- [x] Create lib/rateLimiter.js
- [x] Create lib/securityLogger.js
- [x] Create lib/redirectValidator.js
- [ ] Add imports to index.js

### Phase 2: Function Updates
- [ ] Update generateApplication with rate limiting and logging
- [ ] Update linkedInAuth with rate limiting and logging
- [ ] Update linkedInCallback with rate limiting, redirect validation, and logging
- [ ] Update exportApplication with rate limiting and logging
- [ ] Update sendApplicationEmail with rate limiting and logging
- [ ] Replace redirectWithError with validated version

### Phase 3: Testing
- [ ] Test rate limiting on generateApplication (make 12 rapid requests)
- [ ] Test rate limiting on linkedInAuth (make 6 rapid requests)
- [ ] Test redirect validation with malicious URL
- [ ] Test redirect validation with valid URL
- [ ] Verify logs appear in Cloud Logging
- [ ] Check log sanitization (no sensitive data)

### Phase 4: Cloud Logging Setup
- [ ] Create notification channels (email, Slack, etc.)
- [ ] Create rate limit violation alert
- [ ] Create failed authentication alert
- [ ] Create suspicious redirect alert
- [ ] Create OAuth failure alert
- [ ] Create function error rate alert
- [ ] Create critical security event alert
- [ ] Create validation failure alert
- [ ] Test each alert

### Phase 5: Deployment
- [ ] Deploy functions to staging (if available)
- [ ] Verify rate limiting works in staging
- [ ] Verify logging works in staging
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Document any custom configurations

### Phase 6: Monitoring Setup
- [ ] Create Cloud Monitoring dashboard
- [ ] Add function invocation metrics
- [ ] Add error rate metrics
- [ ] Add rate limit violation metrics
- [ ] Add authentication metrics
- [ ] Set up weekly log review process

## Manual Code Changes Required

### 1. Add Imports to index.js

After line 11 (after validation imports), add:

```javascript
const { withRateLimit, checkRateLimit } = require('./lib/rateLimiter');
const { securityLogger } = require('./lib/securityLogger');
const {
  getSafeRedirectUrl,
  buildErrorRedirectUrl,
  buildSuccessRedirectUrl,
  validateRedirectParameter
} = require('./lib/redirectValidator');
```

### 2. Update Each Function

See SECURITY_UPDATES.md for detailed code changes for each function.

Key changes for each function:
1. Wrap with `withRateLimit(endpoint, handler)`
2. Add `securityLogger.functionCall()` at start
3. Add authentication logging with `securityLogger.auth()`
4. Add success/failure logging
5. For linkedInCallback: add redirect validation

### 3. Update redirectWithError Function

Replace the existing `redirectWithError` function (around line 852) with the validated version from SECURITY_UPDATES.md.

## Verification Commands

### Test Rate Limiting
```bash
# Should succeed for first 10, then fail with 429
for i in {1..12}; do
  curl -X POST "https://REGION-PROJECT.cloudfunctions.net/generateApplication" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"jobId":"test"}' &
done
```

### View Security Logs
```bash
gcloud logging read 'jsonPayload.eventType="SECURITY"' --limit 50
gcloud logging read 'jsonPayload.eventType="AUTH"' --limit 50
gcloud logging read 'jsonPayload.eventType="OAUTH"' --limit 50
```

### Test Redirect Validation
```bash
# Should fail (malicious URL)
curl "https://REGION-PROJECT.cloudfunctions.net/linkedInAuth" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"redirect_uri":"https://evil.com"}'

# Should succeed (allowed URL)
curl "https://REGION-PROJECT.cloudfunctions.net/linkedInAuth" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"redirect_uri":"https://ai-career-os-139db.web.app/profile"}'
```

## Rollback Plan

If issues occur after deployment:

1. Redeploy from backup:
   ```bash
   cp index.js.backup-security index.js
   npm run deploy
   ```

2. Or revert specific function:
   ```bash
   firebase functions:delete FUNCTION_NAME
   # Then redeploy old version
   ```

3. Disable alerts temporarily:
   ```bash
   gcloud alpha monitoring policies list
   gcloud alpha monitoring policies update POLICY_ID --enabled=false
   ```

## Notes

- Rate limits are configurable in lib/rateLimiter.js
- Redirect whitelist is in lib/redirectValidator.js
- All logs automatically sanitize sensitive data
- Alert thresholds can be adjusted in Cloud Monitoring console
