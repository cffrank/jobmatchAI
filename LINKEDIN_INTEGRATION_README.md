# LinkedIn OAuth Integration - Complete Documentation

## Overview

This document provides complete information about the LinkedIn OAuth integration for JobMatch AI. The integration allows users to import their basic profile information from LinkedIn, reducing manual data entry during onboarding.

## Status: ✅ Implementation Complete

The LinkedIn OAuth integration is **fully implemented** and ready to deploy. All code is in place:

- ✅ Cloud Functions (`linkedInAuth`, `linkedInCallback`)
- ✅ Frontend UI (Import from LinkedIn button)
- ✅ Error handling and user notifications
- ✅ Security features (CSRF protection, token validation)
- ✅ Firestore security rules
- ✅ Data mapping and import logic

**What's needed**: Configuration only (LinkedIn app setup + Firebase secrets)

## Quick Links

- **Quick Start**: `LINKEDIN_OAUTH_QUICKSTART.md` - 5 minute setup
- **Detailed Setup**: `LINKEDIN_OAUTH_SETUP.md` - Complete step-by-step guide
- **Setup Script**: `setup-linkedin-oauth.sh` - Automated configuration
- **Test Script**: `test-linkedin-oauth.sh` - Validate configuration

## Architecture

### OAuth Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Experience                          │
└─────────────────────────────────────────────────────────────────┘

User visits /profile/edit
         │
         ↓
    Clicks "Import from LinkedIn"
         │
         ↓
┌────────────────────────┐
│  linkedInAuth Function │  ← Generates OAuth URL + state token
└────────────────────────┘
         │
         ↓
Redirects to LinkedIn.com
         │
         ↓
User authorizes app on LinkedIn
         │
         ↓
LinkedIn redirects back with code
         │
         ↓
┌───────────────────────────┐
│ linkedInCallback Function │  ← Exchanges code for token
└───────────────────────────┘
         │
         ↓
    Fetches LinkedIn profile data
         │
         ↓
    Imports to Firestore
         │
         ↓
Redirects to /profile?linkedin=success
         │
         ↓
    Shows success notification
```

### Data Flow

```
LinkedIn API
    ↓
┌─────────────────────┐
│   Cloud Function    │
│  (linkedInCallback) │
└─────────────────────┘
    ↓
┌─────────────────────┐
│  Data Transformation │
└─────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│          Firestore Database             │
├─────────────────────────────────────────┤
│ users/{userId}                          │
│   - firstName                           │
│   - lastName                            │
│   - email                               │
│   - profileImageUrl                     │
│   - linkedInUrl                         │
│   - headline                            │
│   - linkedInImported: true              │
│   - linkedInImportedAt: timestamp       │
│                                         │
│ users/{userId}/notifications/{id}      │
│   - type: "linkedin_import_limited"     │
│   - message: "Basic profile imported... "│
└─────────────────────────────────────────┘
```

## Implementation Details

### Cloud Functions

**File**: `/home/carl/application-tracking/jobmatch-ai/functions/index.js`

#### `linkedInAuth` (lines 345-425)
- **Type**: Callable function (onCall)
- **Auth**: Required (authenticated users only)
- **Secrets**: LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
- **Purpose**: Initiates OAuth flow

**Process**:
1. Validates user is authenticated
2. Generates cryptographically secure state token
3. Stores state in Firestore with 10-minute expiration
4. Constructs LinkedIn authorization URL
5. Returns URL to frontend

**Returns**: `{ authUrl: string, state: string }`

**Error codes**:
- `unauthenticated` - User not logged in
- `failed-precondition` - LinkedIn credentials not configured
- `internal` - Unexpected error

#### `linkedInCallback` (lines 439-524)
- **Type**: HTTP request handler (onRequest)
- **Auth**: Validated via state token
- **Secrets**: LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
- **Purpose**: Handles OAuth callback from LinkedIn

**Process**:
1. Validates OAuth response (code, state, errors)
2. Verifies CSRF state token (expires in 10 min, one-time use)
3. Exchanges authorization code for access token
4. Fetches profile data from LinkedIn API
5. Maps data to Firestore schema
6. Imports to users/{userId} collection
7. Creates notification about limited import
8. Redirects user back to app

**Redirect URLs**:
- Success: `{APP_URL}/profile?linkedin=success`
- Error: `{APP_URL}/profile?linkedin=error&error={errorCode}`

**Error codes**:
- `user_cancelled` - User cancelled OAuth
- `oauth_error` - LinkedIn returned error
- `missing_parameters` - Missing code or state
- `invalid_state` - State validation failed
- `expired_state` - State token expired
- `token_exchange_failed` - Failed to get access token
- `profile_fetch_failed` - Failed to fetch profile
- `internal_error` - Unexpected error

#### Helper Functions

**`exchangeCodeForToken(code, req)`** (lines 534-603)
- Exchanges authorization code for access token
- Uses LinkedIn's `/oauth/v2/accessToken` endpoint
- Returns token data or null on failure

**`fetchLinkedInProfile(accessToken)`** (lines 616-694)
- Fetches profile data using two endpoints:
  - `/v2/userinfo` (OpenID Connect) - primary
  - `/v2/me` (LinkedIn API v2) - additional data
- Returns profile object with `userInfo`, `profileDetails`, `limitedAccess`

**`importProfileToFirestore(userId, linkedInData)`** (lines 710-803)
- Maps LinkedIn data to Firestore schema
- Updates users/{userId} document
- Creates notification for user
- Handles missing/optional fields gracefully

**`redirectWithSuccess(res)`** (lines 810-822)
- Redirects to success page with status parameter

**`redirectWithError(res, errorCode)`** (lines 840-850)
- Redirects to error page with error code

### Frontend

**File**: `/home/carl/application-tracking/jobmatch-ai/src/sections/profile-resume-management/components/EditProfileForm.tsx`

#### Import Button (lines 196-205)
```tsx
<button
  type="button"
  onClick={handleLinkedInImport}
  className="px-4 py-2 bg-[#0A66C2] hover:bg-[#004182] text-white..."
>
  <Linkedin className="w-5 h-5" />
  Import from LinkedIn
</button>
```

#### Import Handler (lines 139-175)
```tsx
const handleLinkedInImport = async () => {
  // Shows loading toast
  // Calls linkedInAuth Cloud Function
  // Redirects to LinkedIn OAuth URL
  // Handles errors with user-friendly messages
}
```

#### Callback Handler (lines 44-80)
```tsx
useEffect(() => {
  // Checks URL for linkedin=success or linkedin=error
  // Shows appropriate toast notification
  // Cleans up URL parameters
}, [])
```

### Security Features

#### CSRF Protection
- Cryptographically secure state tokens (crypto.randomBytes)
- State includes: userId, timestamp, nonce
- Stored in Firestore with expiration
- Validated on callback
- One-time use (deleted after consumption)

#### Token Management
- State tokens expire in 10 minutes
- Access tokens never stored client-side
- Secrets stored in Firebase Secret Manager
- HTTPS-only endpoints

#### Authentication
- User must be authenticated to initiate OAuth
- State token validates user identity
- Firestore rules prevent unauthorized access

### Data Mapping

#### LinkedIn API → Firestore

| LinkedIn Field | API Endpoint | Firestore Field | Required |
|----------------|--------------|-----------------|----------|
| `given_name` | `/v2/userinfo` | `firstName` | No |
| `family_name` | `/v2/userinfo` | `lastName` | No |
| `email` | `/v2/userinfo` | `email` | No |
| `picture` | `/v2/userinfo` | `profileImageUrl` | No |
| `sub` | `/v2/userinfo` | Used for `linkedInUrl` | Yes |
| `localizedHeadline` | `/v2/me` | `headline` | No |
| `locale` | `/v2/userinfo` | `locale` | No |

**Additional fields set**:
- `linkedInImported`: true
- `linkedInImportedAt`: timestamp
- `linkedInLimitedAccess`: true
- `updatedAt`: timestamp

### API Limitations

#### Available with Standard OAuth (openid, profile, email)
- ✅ First name, last name
- ✅ Email address
- ✅ Profile photo
- ✅ Professional headline
- ✅ Profile URL
- ✅ Locale

#### Requires Partner API (NOT Available)
- ❌ Work experience
- ❌ Education history
- ❌ Skills and endorsements
- ❌ Recommendations
- ❌ Certifications
- ❌ Projects
- ❌ Publications
- ❌ Connections

**Notification**: Users receive a notification explaining that work experience, education, and skills must be added manually.

### Firestore Security Rules

**File**: `/home/carl/application-tracking/jobmatch-ai/firestore.rules`

```javascript
// OAuth state tokens (lines 94-100)
match /_oauth_states/{stateId} {
  // Only Cloud Functions can read/write
  allow read, write: if false;
}

// User notifications (lines 84-89)
match /notifications/{notificationId} {
  allow read: if isAuthenticated() && isOwner(userId);
  allow write: if false;  // Only Cloud Functions
}

// User profiles (lines 17-19)
match /users/{userId} {
  allow read, write: if isAuthenticated() && isOwner(userId);
}
```

## Configuration Requirements

### 1. LinkedIn Developer App

**Required Settings**:
- App name: JobMatch AI
- Verified with company LinkedIn page
- OAuth redirect URL: `https://us-central1-ai-career-os-139db.cloudfunctions.net/linkedInCallback`
- OAuth scopes: `openid`, `profile`, `email`
- Client ID and Client Secret generated

**Where to configure**: https://www.linkedin.com/developers/apps

### 2. Firebase Secrets

**Required Secrets**:
```bash
LINKEDIN_CLIENT_ID      # From LinkedIn app Auth tab
LINKEDIN_CLIENT_SECRET  # From LinkedIn app Auth tab
```

**How to set**:
```bash
firebase functions:secrets:set LINKEDIN_CLIENT_ID
firebase functions:secrets:set LINKEDIN_CLIENT_SECRET
```

### 3. Firebase Configuration (Optional)

**App URL** (for redirects after OAuth):
```bash
firebase functions:config:set app.url="https://ai-career-os-139db.web.app"
```

Or set in `functions/.env`:
```env
APP_URL=https://ai-career-os-139db.web.app
```

### 4. Deploy Functions

```bash
cd /home/carl/application-tracking/jobmatch-ai
firebase deploy --only functions:linkedInAuth,functions:linkedInCallback
```

### 5. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

## Testing

### Automated Testing

```bash
# Run configuration test
chmod +x test-linkedin-oauth.sh
./test-linkedin-oauth.sh
```

### Manual Testing

1. **Start development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to profile edit page**:
   ```
   http://localhost:5173/profile/edit
   ```

3. **Click "Import from LinkedIn"**

4. **Expected behavior**:
   - Loading toast appears
   - Redirects to LinkedIn authorization page
   - After approval, redirects back to app
   - Success toast with message appears
   - Profile form auto-populates with imported data

5. **Verify in Firestore**:
   - Check `users/{userId}` document
   - Verify fields: `firstName`, `lastName`, `email`, `linkedInImported`
   - Check `users/{userId}/notifications` for import notification

### Test Error Scenarios

1. **User cancels OAuth**:
   - Click "Cancel" on LinkedIn authorization page
   - Should redirect to app with error toast

2. **Expired state token**:
   - Start OAuth flow, wait 15 minutes, complete authorization
   - Should show "expired_state" error

3. **Missing secrets**:
   - Remove secrets, try OAuth
   - Should show "integration not configured" error

## Monitoring

### View Logs

```bash
# Real-time logs
firebase functions:log --only linkedInCallback --follow

# Recent logs
firebase functions:log --only linkedInCallback --limit 50

# Specific time range
firebase functions:log --only linkedInCallback --since 1h
```

### Check Firestore

**Collections to monitor**:
- `_oauth_states` - Should be empty (tokens deleted after use)
- `users/{userId}` - Check imported profile data
- `users/{userId}/notifications` - Check import notifications

### Metrics

Track in Firebase Console:
- OAuth initiation rate (linkedInAuth invocations)
- Success rate (successful callbacks vs errors)
- Error distribution (which error codes are most common)
- Import completion time (from auth to callback)

## Cost Analysis

### Firebase Costs

**Cloud Functions**:
- linkedInAuth: ~100ms, 256MB memory
- linkedInCallback: ~500ms, 256MB memory
- Estimated cost: $0.0000004 per OAuth flow

**Firestore**:
- 1 write (state token creation)
- 1 read (state token validation)
- 1 delete (state token cleanup)
- 1 write (user profile update)
- 1 write (notification creation)
- Estimated cost: $0.000002 per OAuth flow

**Total estimated cost**: ~$0.000002 per user import

**At scale** (1000 imports/month): ~$0.002/month

### Rate Limits

**LinkedIn API**:
- Standard tier: Reasonable limits for small-medium apps
- No official public rate limits documented
- Recommend: Monitor for rate limit errors in logs

**Firebase Functions**:
- No specific rate limits
- Subject to project quotas

**Recommendation**: Implement client-side debouncing to prevent accidental double-clicks

## Security Best Practices

### Implemented
- ✅ CSRF protection with state tokens
- ✅ Token expiration (10 minutes)
- ✅ One-time use state tokens
- ✅ HTTPS-only endpoints
- ✅ Secrets in Firebase Secret Manager
- ✅ User authentication required
- ✅ Firestore security rules
- ✅ Input validation
- ✅ Error handling without exposing secrets

### Recommendations
- 🔒 Regularly rotate LinkedIn client secret
- 🔒 Monitor logs for suspicious OAuth patterns
- 🔒 Implement rate limiting if needed
- 🔒 Keep Firebase SDKs updated
- 🔒 Review access logs periodically

## Troubleshooting

See detailed troubleshooting guide in `LINKEDIN_OAUTH_SETUP.md`, section "Troubleshooting"

**Quick fixes**:

```bash
# Secrets not set
firebase functions:secrets:set LINKEDIN_CLIENT_ID
firebase functions:secrets:set LINKEDIN_CLIENT_SECRET

# Functions not deployed
firebase deploy --only functions

# Check logs for errors
firebase functions:log --only linkedInCallback

# Verify secrets
firebase functions:secrets:access LINKEDIN_CLIENT_ID
```

## Future Enhancements

### Potential Improvements

1. **Partner API Access**:
   - Apply for LinkedIn Partner Program
   - Access work experience, education, skills
   - Full profile import capability

2. **Resume Parsing**:
   - Alternative to LinkedIn import
   - Parse uploaded resume PDF
   - Extract structured data

3. **Periodic Sync**:
   - Keep profile in sync with LinkedIn
   - Webhook notifications from LinkedIn
   - Auto-update on profile changes

4. **Enhanced Data**:
   - Import LinkedIn posts/activity
   - Import recommendations
   - Import certifications

5. **Better UX**:
   - Show preview before import
   - Allow selective field import
   - Merge vs replace existing data

## Support

**Documentation**:
- Full setup: `LINKEDIN_OAUTH_SETUP.md`
- Quick start: `LINKEDIN_OAUTH_QUICKSTART.md`
- This file: Complete reference

**Scripts**:
- Setup: `./setup-linkedin-oauth.sh`
- Test: `./test-linkedin-oauth.sh`

**External Resources**:
- LinkedIn API: https://docs.microsoft.com/en-us/linkedin/
- Firebase Functions: https://firebase.google.com/docs/functions
- Firebase Secrets: https://firebase.google.com/docs/functions/config-env

## Summary

The LinkedIn OAuth integration is **production-ready** and only requires configuration:

1. ✅ **Code**: Fully implemented (Cloud Functions + Frontend)
2. ✅ **Security**: CSRF protection, token validation, secure secrets
3. ✅ **Error Handling**: Comprehensive error messages and logging
4. ✅ **Testing**: Automated test script available
5. ⏳ **Configuration**: Needs LinkedIn app setup + Firebase secrets

**Time to deploy**: ~10 minutes (5 min LinkedIn setup + 5 min Firebase config)

**Files to review**:
- Cloud Functions: `/home/carl/application-tracking/jobmatch-ai/functions/index.js` (lines 330-850)
- Frontend: `/home/carl/application-tracking/jobmatch-ai/src/sections/profile-resume-management/components/EditProfileForm.tsx`
- Security rules: `/home/carl/application-tracking/jobmatch-ai/firestore.rules`

---

**Ready to deploy?** Run `./setup-linkedin-oauth.sh` to get started!
