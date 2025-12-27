# Security Updates - Rate Limiting, Logging, and Redirect Validation

## Overview

This document describes the security enhancements implemented to address findings H2, H4, and H7 from the security audit:

- **H2**: Lack of rate limiting on Cloud Functions
- **H4**: Insufficient security logging and monitoring
- **H7**: Unvalidated redirects in OAuth flow

## New Security Modules

### 1. Rate Limiter (`lib/rateLimiter.js`)

Implements per-user, per-endpoint rate limiting with configurable limits:

- `generateApplication`: 10 requests/hour
- `scrapeJobs`: 5 requests/hour
- `linkedInCallback`: 3 requests/hour
- `exportApplication`: 20 requests/hour
- `sendApplicationEmail`: 10 requests/hour
- `linkedInAuth`: 5 requests/hour

**Usage:**
```javascript
const { withRateLimit, checkRateLimit } = require('./lib/rateLimiter');

// Option 1: Use wrapper (recommended)
exports.myFunction = onCall(config, withRateLimit('myFunction', async (request) => {
  // Your function logic
}));

// Option 2: Manual check
exports.myFunction = onCall(config, async (request) => {
  await checkRateLimit(request.auth?.uid || request.rawRequest?.ip, 'myFunction');
  // Your function logic
});
```

### 2. Security Logger (`lib/securityLogger.js`)

Provides structured logging with automatic sensitive data sanitization:

**Usage:**
```javascript
const { securityLogger } = require('./lib/securityLogger');

// Log authentication events
securityLogger.auth('User login attempt', {
  userId,
  email,
  success: true,
  method: 'oauth',
  ip: request.rawRequest?.ip
});

// Log authorization checks
securityLogger.authz('Permission check', {
  userId,
  resource: 'application',
  action: 'create',
  allowed: true
});

// Log security events
securityLogger.security('Rate limit exceeded', {
  userId,
  endpoint,
  currentCount,
  limit
});

// Log function calls
securityLogger.functionCall('generateApplication', {
  userId,
  params: { jobId },
  duration: 1500,
  success: true
});
```

### 3. Redirect Validator (`lib/redirectValidator.js`)

Validates redirect URLs against a whitelist to prevent open redirects:

**Usage:**
```javascript
const {
  getSafeRedirectUrl,
  buildErrorRedirectUrl,
  buildSuccessRedirectUrl,
  validateRedirectParameter
} = require('./lib/redirectValidator');

// Validate redirect URL
const safeUrl = getSafeRedirectUrl(requestedUrl, fallback, { userId });

// Build error redirect with validation
const errorUrl = buildErrorRedirectUrl(baseUrl, 'oauth_error', { userId });

// Validate redirect parameter
const { valid, url } = validateRedirectParameter(request, 'redirect_uri');
```

## Required Code Changes to index.js

### Step 1: Add imports at the top

Add these lines after the existing require statements (around line 11):

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

### Step 2: Update generateApplication function

Wrap the existing handler with rate limiting and add logging:

```javascript
exports.generateApplication = onCall(
  {
    timeoutSeconds: 120,
    memory: '512MiB',
    secrets: ['OPENAI_API_KEY']
  },
  withRateLimit('generateApplication', async (request) => {
    const startTime = Date.now();
    const userId = request.auth?.uid;

    // Log function invocation
    securityLogger.functionCall('generateApplication', {
      userId,
      params: { jobId: request.data?.jobId }
    });

    // Authentication check
    if (!userId) {
      securityLogger.auth('Unauthenticated generateApplication attempt', {
        success: false,
        ip: request.rawRequest?.ip,
        severity: 'WARNING'
      });
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    try {
      // ... existing function logic ...

      // Log success
      securityLogger.functionCall('generateApplication', {
        userId,
        params: { jobId: request.data?.jobId },
        duration: Date.now() - startTime,
        success: true
      });

      return result;
    } catch (error) {
      // Log failure
      securityLogger.functionCall('generateApplication', {
        userId,
        params: { jobId: request.data?.jobId },
        duration: Date.now() - startTime,
        success: false,
        error: error.message
      });
      throw error;
    }
  })
);
```

### Step 3: Update linkedInAuth function

Add rate limiting and logging:

```javascript
exports.linkedInAuth = onCall(
  {
    secrets: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET']
  },
  withRateLimit('linkedInAuth', async (request) => {
    const userId = request.auth?.uid;

    if (!userId) {
      securityLogger.auth('Unauthenticated linkedInAuth attempt', {
        success: false,
        ip: request.rawRequest?.ip,
        severity: 'WARNING'
      });
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    // Validate redirect URI if provided
    const redirectValidation = validateRedirectParameter(request);
    if (!redirectValidation.valid) {
      securityLogger.validation('Invalid redirect URI in linkedInAuth', {
        userId,
        requestedUrl: redirectValidation.originalUrl,
        severity: 'WARNING'
      });
    }

    securityLogger.oauth('LinkedIn auth initiated', {
      userId,
      provider: 'linkedin',
      stage: 'initiate',
      success: true
    });

    // ... existing function logic ...
  })
);
```

### Step 4: Update linkedInCallback function

Add rate limiting, redirect validation, and comprehensive logging:

```javascript
exports.linkedInCallback = onRequest(
  {
    secrets: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
    cors: true,
    timeoutSeconds: 60
  },
  async (req, res) => {
    // Rate limiting for callback (use state or IP as identifier)
    const identifier = req.query.state || req.ip || 'anonymous';

    try {
      await checkRateLimit(identifier, 'linkedInCallback');
    } catch (error) {
      securityLogger.security('linkedInCallback rate limit exceeded', {
        identifier,
        ip: req.ip,
        severity: 'WARNING'
      });
      // Use validated redirect
      const appUrl = process.env.APP_URL || 'https://ai-career-os-139db.web.app';
      const safeUrl = getSafeRedirectUrl(appUrl);
      const errorUrl = buildErrorRedirectUrl(safeUrl, 'rate_limit_exceeded');
      return res.redirect(302, errorUrl);
    }

    let userId = null;

    try {
      const { code, state, error, error_description } = req.query;

      // Handle OAuth errors from LinkedIn
      if (error) {
        securityLogger.oauth('LinkedIn OAuth error', {
          error,
          description: error_description,
          provider: 'linkedin',
          stage: 'callback',
          success: false,
          severity: 'WARNING'
        });

        const appUrl = process.env.APP_URL || 'https://ai-career-os-139db.web.app';
        const safeUrl = getSafeRedirectUrl(appUrl);
        const errorUrl = buildErrorRedirectUrl(
          safeUrl,
          error === 'user_cancelled_authorize' ? 'user_cancelled' : 'oauth_error'
        );
        return res.redirect(302, errorUrl);
      }

      // Validate required parameters
      if (!code || !state) {
        securityLogger.validation('Missing OAuth parameters', {
          hasCode: !!code,
          hasState: !!state,
          provider: 'linkedin',
          severity: 'WARNING'
        });

        const appUrl = process.env.APP_URL || 'https://ai-career-os-139db.web.app';
        const safeUrl = getSafeRedirectUrl(appUrl);
        const errorUrl = buildErrorRedirectUrl(safeUrl, 'missing_parameters');
        return res.redirect(302, errorUrl);
      }

      // Verify state token to prevent CSRF
      const stateDoc = await admin.firestore().collection('_oauth_states').doc(state).get();

      if (!stateDoc.exists) {
        securityLogger.security('Invalid OAuth state token', {
          state: state.substring(0, 20),
          provider: 'linkedin',
          severity: 'WARNING'
        });

        const appUrl = process.env.APP_URL || 'https://ai-career-os-139db.web.app';
        const safeUrl = getSafeRedirectUrl(appUrl);
        const errorUrl = buildErrorRedirectUrl(safeUrl, 'invalid_state');
        return res.redirect(302, errorUrl);
      }

      const stateData = stateDoc.data();
      userId = stateData.userId;

      // Delete used state token
      await stateDoc.ref.delete().catch(err => {
        securityLogger.warn('Failed to delete state token', {
          error: err.message,
          userId,
          severity: 'WARNING'
        });
      });

      // Check if state has expired
      if (stateData.expiresAt.toDate() < new Date()) {
        securityLogger.security('Expired OAuth state token', {
          userId,
          provider: 'linkedin',
          severity: 'WARNING'
        });

        const appUrl = process.env.APP_URL || 'https://ai-career-os-139db.web.app';
        const safeUrl = getSafeRedirectUrl(appUrl);
        const errorUrl = buildErrorRedirectUrl(safeUrl, 'expired_state');
        return res.redirect(302, errorUrl);
      }

      securityLogger.oauth('LinkedIn callback processing', {
        userId,
        provider: 'linkedin',
        stage: 'callback',
        success: true
      });

      // ... existing token exchange and profile fetch logic ...

      // On success:
      securityLogger.oauth('LinkedIn OAuth completed successfully', {
        userId,
        provider: 'linkedin',
        stage: 'complete',
        success: true
      });

      const appUrl = process.env.APP_URL || 'https://ai-career-os-139db.web.app';
      const safeUrl = getSafeRedirectUrl(appUrl);
      const successUrl = buildSuccessRedirectUrl(safeUrl, {}, { userId });
      res.redirect(302, successUrl);

    } catch (error) {
      securityLogger.error('LinkedIn callback error', {
        userId,
        error: error.message,
        provider: 'linkedin',
        severity: 'ERROR'
      });

      const appUrl = process.env.APP_URL || 'https://ai-career-os-139db.web.app';
      const safeUrl = getSafeRedirectUrl(appUrl);
      const errorUrl = buildErrorRedirectUrl(safeUrl, 'internal_error', { userId });
      res.redirect(302, errorUrl);
    }
  }
);
```

### Step 5: Update exportApplication function

Add rate limiting and logging:

```javascript
exports.exportApplication = onCall(
  {
    timeoutSeconds: 60,
    memory: '512MiB'
  },
  withRateLimit('exportApplication', async (request) => {
    const userId = request.auth?.uid;

    if (!userId) {
      securityLogger.auth('Unauthenticated exportApplication attempt', {
        success: false,
        ip: request.rawRequest?.ip,
        severity: 'WARNING'
      });
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    securityLogger.functionCall('exportApplication', {
      userId,
      params: { applicationId: request.data?.applicationId, format: request.data?.format }
    });

    // ... existing function logic ...
  })
);
```

### Step 6: Update sendApplicationEmail function

Add rate limiting and logging:

```javascript
exports.sendApplicationEmail = onCall(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    secrets: ['SENDGRID_API_KEY']
  },
  withRateLimit('sendApplicationEmail', async (request) => {
    const userId = request.auth?.uid;

    if (!userId) {
      securityLogger.auth('Unauthenticated sendApplicationEmail attempt', {
        success: false,
        ip: request.rawRequest?.ip,
        severity: 'WARNING'
      });
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    securityLogger.functionCall('sendApplicationEmail', {
      userId,
      params: { applicationId: request.data?.applicationId }
    });

    // ... existing function logic ...
  })
);
```

### Step 7: Replace redirectWithError function

Replace the existing `redirectWithError` function with the new validated version:

```javascript
function redirectWithError(res, errorCode, context = {}) {
  const appUrl = process.env.APP_URL ||
    process.env.FIREBASE_CONFIG?.appUrl ||
    'https://ai-career-os-139db.web.app';

  const safeUrl = getSafeRedirectUrl(appUrl);
  const redirectUrl = buildErrorRedirectUrl(safeUrl, errorCode, context);

  securityLogger.debug('Redirecting to error page', {
    errorCode,
    redirectUrl,
    ...context
  });

  res.redirect(302, redirectUrl);
}
```

## Cloud Logging Alerts Configuration

Create alerts in Cloud Monitoring for security events. See `CLOUD_LOGGING_ALERTS.md` for detailed configuration.

## Deployment Steps

1. Install dependencies (no new packages required - all use built-in Node.js and Firebase SDK)
2. Deploy functions: `npm run deploy`
3. Set up Cloud Logging alerts (see separate document)
4. Test rate limiting with multiple rapid requests
5. Verify logs are appearing in Cloud Logging
6. Test redirect validation with various URLs

## Testing

### Test Rate Limiting

```bash
# Make multiple rapid requests to test rate limiting
for i in {1..12}; do
  curl -X POST "https://REGION-PROJECT_ID.cloudfunctions.net/generateApplication" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"jobId":"test"}' &
done
```

### Test Redirect Validation

```bash
# Try with malicious redirect URL (should fail)
curl "https://REGION-PROJECT_ID.cloudfunctions.net/linkedInAuth" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"redirect_uri":"https://evil.com/steal-tokens"}'

# Try with valid redirect URL (should succeed)
curl "https://REGION-PROJECT_ID.cloudfunctions.net/linkedInAuth" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"redirect_uri":"https://ai-career-os-139db.web.app/profile"}'
```

### View Security Logs

```bash
# View all security events
gcloud logging read 'jsonPayload.eventType="SECURITY"' --limit 50 --format json

# View rate limit events
gcloud logging read 'jsonPayload.message=~"rate limit"' --limit 50 --format json

# View authentication failures
gcloud logging read 'jsonPayload.eventType="AUTH" AND jsonPayload.success=false' --limit 50
```

## Security Improvements Summary

1. **Rate Limiting (H2)**:
   - Per-user, per-endpoint rate limiting
   - Configurable limits with reasonable defaults
   - Returns 429 status with retry-after header
   - Automatic cleanup of expired records

2. **Security Logging (H4)**:
   - Structured logging with severity levels
   - Automatic sensitive data sanitization
   - Event type classification (AUTH, AUTHZ, SECURITY, etc.)
   - Function invocation tracking
   - Comprehensive context for all events

3. **Redirect Validation (H7)**:
   - Whitelist-based redirect URL validation
   - Prevents open redirect vulnerabilities
   - Logs all redirect attempts
   - Fails securely with default safe URL

## Monitoring and Alerting

Set up the following alerts in Cloud Monitoring:

1. **Rate Limit Violations**: Alert when rate limits are hit frequently
2. **Authentication Failures**: Alert on multiple failed login attempts
3. **Suspicious Redirects**: Alert on rejected redirect URLs
4. **Function Errors**: Alert on repeated function failures
5. **OAuth Errors**: Alert on OAuth flow failures

See `CLOUD_LOGGING_ALERTS.md` for detailed alert configurations.
