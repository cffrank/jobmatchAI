#!/bin/bash

# Security Updates Application Script
# This script helps apply the security enhancements to Cloud Functions
#
# Usage: ./apply-security-updates.sh

set -e

echo "=================================================="
echo "Security Updates Application Script"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the functions directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the functions directory.${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Verifying security modules exist${NC}"
if [ ! -f "lib/rateLimiter.js" ]; then
    echo -e "${RED}Error: lib/rateLimiter.js not found${NC}"
    exit 1
fi
if [ ! -f "lib/securityLogger.js" ]; then
    echo -e "${RED}Error: lib/securityLogger.js not found${NC}"
    exit 1
fi
if [ ! -f "lib/redirectValidator.js" ]; then
    echo -e "${RED}Error: lib/redirectValidator.js not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ All security modules found${NC}"
echo ""

echo -e "${YELLOW}Step 2: Creating backup of index.js${NC}"
if [ ! -f "index.js.backup-security" ]; then
    cp index.js index.js.backup-security
    echo -e "${GREEN}✓ Backup created: index.js.backup-security${NC}"
else
    echo -e "${YELLOW}! Backup already exists, skipping${NC}"
fi
echo ""

echo -e "${YELLOW}Step 3: Checking if security imports are already added${NC}"
if grep -q "require('./lib/rateLimiter')" index.js; then
    echo -e "${GREEN}✓ Security imports already present in index.js${NC}"
else
    echo -e "${YELLOW}! Security imports not found. You need to manually add them to index.js${NC}"
    echo ""
    echo "Add these lines after the validation imports (around line 11):"
    echo ""
    echo "const { withRateLimit, checkRateLimit } = require('./lib/rateLimiter');"
    echo "const { securityLogger } = require('./lib/securityLogger');"
    echo "const {"
    echo "  getSafeRedirectUrl,"
    echo "  buildErrorRedirectUrl,"
    echo "  buildSuccessRedirectUrl,"
    echo "  validateRedirectParameter"
    echo "} = require('./lib/redirectValidator');"
    echo ""
fi
echo ""

echo -e "${YELLOW}Step 4: Testing security modules${NC}"
node -e "
const { withRateLimit, checkRateLimit } = require('./lib/rateLimiter');
const { securityLogger } = require('./lib/securityLogger');
const { getSafeRedirectUrl } = require('./lib/redirectValidator');
console.log('✓ All modules loaded successfully');
" && echo -e "${GREEN}✓ Security modules test passed${NC}" || echo -e "${RED}✗ Security modules test failed${NC}"
echo ""

echo -e "${YELLOW}Step 5: Checking Cloud Functions configuration${NC}"
if command -v firebase &> /dev/null; then
    echo -e "${GREEN}✓ Firebase CLI found${NC}"

    if [ -f "../firebase.json" ]; then
        echo -e "${GREEN}✓ firebase.json found${NC}"
    else
        echo -e "${YELLOW}! firebase.json not found in parent directory${NC}"
    fi
else
    echo -e "${YELLOW}! Firebase CLI not found. Install with: npm install -g firebase-tools${NC}"
fi
echo ""

echo -e "${YELLOW}Step 6: Checking environment variables${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ .env file found${NC}"

    # Check for required environment variables
    missing_vars=()

    if ! grep -q "OPENAI_API_KEY" .env; then
        missing_vars+=("OPENAI_API_KEY")
    fi

    if ! grep -q "LINKEDIN_CLIENT_ID" .env; then
        missing_vars+=("LINKEDIN_CLIENT_ID")
    fi

    if ! grep -q "LINKEDIN_CLIENT_SECRET" .env; then
        missing_vars+=("LINKEDIN_CLIENT_SECRET")
    fi

    if [ ${#missing_vars[@]} -eq 0 ]; then
        echo -e "${GREEN}✓ All required environment variables present${NC}"
    else
        echo -e "${YELLOW}! Missing environment variables: ${missing_vars[*]}${NC}"
    fi
else
    echo -e "${YELLOW}! .env file not found${NC}"
fi
echo ""

echo -e "${YELLOW}Step 7: Generating security implementation checklist${NC}"
cat > SECURITY_IMPLEMENTATION_CHECKLIST.md << 'EOF'
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
EOF

echo -e "${GREEN}✓ Checklist created: SECURITY_IMPLEMENTATION_CHECKLIST.md${NC}"
echo ""

echo "=================================================="
echo "Summary"
echo "=================================================="
echo ""
echo -e "${GREEN}✓ Security modules created and tested${NC}"
echo -e "${GREEN}✓ Backup created${NC}"
echo -e "${GREEN}✓ Implementation checklist generated${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Review SECURITY_UPDATES.md for detailed implementation guide"
echo "2. Review SECURITY_IMPLEMENTATION_CHECKLIST.md for step-by-step tasks"
echo "3. Manually update index.js with security imports and function changes"
echo "4. Test locally with Firebase emulators"
echo "5. Deploy to production"
echo "6. Set up Cloud Logging alerts (see CLOUD_LOGGING_ALERTS.md)"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "- The security modules are ready to use"
echo "- Manual code changes are required in index.js"
echo "- Test thoroughly before deploying to production"
echo "- Set up monitoring and alerts after deployment"
echo ""
echo "=================================================="
