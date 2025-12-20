# LinkedIn OAuth Deployment Checklist

This checklist will guide you through deploying the LinkedIn OAuth integration.

## Pre-Deployment Checklist

### 1. LinkedIn App Configuration

- [ ] LinkedIn app created at https://www.linkedin.com/developers/apps
- [ ] App logo uploaded (recommended 300x300px)
- [ ] Privacy policy URL configured
- [ ] OAuth redirect URLs configured:
  - [ ] Production: `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/linkedInCallback`
  - [ ] Development: `http://localhost:5001/YOUR_PROJECT_ID/us-central1/linkedInCallback` (optional)
- [ ] OAuth scopes enabled:
  - [ ] `openid` (required)
  - [ ] `profile` (required)
  - [ ] `email` (required)
- [ ] Client ID copied
- [ ] Client Secret copied

### 2. Firebase Configuration

- [ ] Firebase project created/selected
- [ ] Firebase CLI installed: `npm install -g firebase-tools`
- [ ] Logged in to Firebase: `firebase login`
- [ ] Project selected: `firebase use YOUR_PROJECT_ID`

### 3. Secret Configuration

- [ ] LinkedIn Client ID stored in Secret Manager:
  ```bash
  cd /home/carl/application-tracking/jobmatch-ai/functions
  firebase functions:secrets:set LINKEDIN_CLIENT_ID
  # Paste Client ID when prompted
  ```

- [ ] LinkedIn Client Secret stored in Secret Manager:
  ```bash
  firebase functions:secrets:set LINKEDIN_CLIENT_SECRET
  # Paste Client Secret when prompted
  ```

- [ ] Verify secrets are set:
  ```bash
  firebase functions:secrets:access LINKEDIN_CLIENT_ID
  firebase functions:secrets:access LINKEDIN_CLIENT_SECRET
  ```

### 4. Environment Variables (Optional)

- [ ] Set app URL for redirects (if different from default):
  ```bash
  firebase functions:config:set app.url="https://your-custom-domain.com"
  ```

## Deployment Steps

### Step 1: Review Code Changes

Review the updated files:
- `/home/carl/application-tracking/jobmatch-ai/functions/index.js` - Cloud Functions
- `/home/carl/application-tracking/jobmatch-ai/src/sections/profile-resume-management/components/EditProfileForm.tsx` - Frontend

### Step 2: Deploy Cloud Functions

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Deploy only the LinkedIn functions (recommended for first deployment)
firebase deploy --only functions:linkedInAuth,functions:linkedInCallback

# OR deploy all functions
firebase deploy --only functions
```

Expected output:
```
✔  functions[linkedInAuth(us-central1)] Successful create operation.
✔  functions[linkedInCallback(us-central1)] Successful create operation.
Function URL (linkedInCallback): https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/linkedInCallback
```

### Step 3: Update LinkedIn App Redirect URI

After deployment, verify the callback URL in your LinkedIn app settings matches:
```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/linkedInCallback
```

Note: Replace `YOUR_PROJECT_ID` with your actual Firebase project ID

### Step 4: Deploy Frontend

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Build the frontend
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

## Post-Deployment Testing

### Test 1: Function Deployment Verification

```bash
# View deployed functions
firebase functions:list

# Check function logs
firebase functions:log --only linkedInAuth,linkedInCallback
```

Expected functions:
- `linkedInAuth` - Status: ACTIVE
- `linkedInCallback` - Status: ACTIVE

### Test 2: End-to-End OAuth Flow

1. [ ] Open your app in a browser (incognito mode recommended)
2. [ ] Sign in with Firebase Authentication
3. [ ] Navigate to Profile → Edit Profile
4. [ ] Click "Import from LinkedIn" button
5. [ ] Verify redirect to LinkedIn authorization page
6. [ ] Authorize the app
7. [ ] Verify redirect back to your app
8. [ ] Check for success toast notification
9. [ ] Verify profile data populated in form (firstName, lastName, email)

### Test 3: Firestore Data Verification

Check Firestore Console:
1. [ ] Navigate to Firebase Console → Firestore Database
2. [ ] Open `users/{userId}` document
3. [ ] Verify fields are populated:
   - [ ] `firstName`
   - [ ] `lastName`
   - [ ] `email`
   - [ ] `linkedInUrl`
   - [ ] `linkedInImported: true`
   - [ ] `linkedInImportedAt: [timestamp]`
   - [ ] `profileImageUrl` (if available)
4. [ ] Check `users/{userId}/notifications` subcollection
5. [ ] Verify notification about limited data import exists

### Test 4: Error Handling

Test error scenarios:
- [ ] User denies authorization → Should show "cancelled" message
- [ ] Invalid OAuth state → Should show security error
- [ ] Network timeout → Should show appropriate error

## Monitoring

### View Function Logs

```bash
# Stream logs in real-time
firebase functions:log --only linkedInAuth,linkedInCallback --follow

# View recent logs
firebase functions:log --only linkedInAuth,linkedInCallback --lines 100
```

Key log messages to look for:
- `LinkedIn auth initiated for user {userId}`
- `Processing LinkedIn callback for user {userId}`
- `Access token obtained for user {userId}`
- `Profile updated successfully for user {userId}`
- `Successfully imported LinkedIn data for user {userId}`

### Monitor Function Performance

Firebase Console → Functions → Dashboard:
- [ ] Invocations count
- [ ] Execution time (should be <5 seconds)
- [ ] Error rate (should be <5%)

## Troubleshooting

### Issue: "LinkedIn credentials not configured"

**Solution**:
```bash
# Verify secrets exist
firebase functions:secrets:access LINKEDIN_CLIENT_ID
firebase functions:secrets:access LINKEDIN_CLIENT_SECRET

# If missing, set them again
firebase functions:secrets:set LINKEDIN_CLIENT_ID
firebase functions:secrets:set LINKEDIN_CLIENT_SECRET

# Redeploy functions
firebase deploy --only functions:linkedInAuth,functions:linkedInCallback
```

### Issue: "redirect_uri_mismatch"

**Solution**:
1. Get the exact callback URL from deployment logs
2. Go to LinkedIn App → Auth → OAuth 2.0 settings
3. Add/update redirect URL to match exactly (no trailing slash)
4. Wait 5 minutes for LinkedIn to propagate changes

### Issue: User sees "profile_fetch_failed"

**Solution**:
1. Check function logs: `firebase functions:log --only linkedInCallback`
2. Verify OAuth scopes in LinkedIn app include: `openid`, `profile`, `email`
3. Check for rate limiting errors in logs
4. Ensure LinkedIn app is published (not in "Development" mode)

### Issue: No data imported to Firestore

**Solution**:
1. Check function logs for errors
2. Verify Firestore security rules allow writes to `/users/{userId}`
3. Test with Firestore emulator locally
4. Check if user ID matches between Auth and Firestore

### Issue: Function timeout

**Solution**:
1. Increase timeout in function config (already set to 60 seconds)
2. Check LinkedIn API response times in logs
3. Consider implementing caching for repeated requests

## Security Audit

Before going to production:
- [ ] Secrets stored in Secret Manager (not environment variables)
- [ ] State tokens validated for CSRF protection
- [ ] State tokens expire in 10 minutes
- [ ] User authentication required for all endpoints
- [ ] HTTPS enforced for all OAuth redirects
- [ ] LinkedIn app redirect URIs limited to your domain only
- [ ] Function logs don't expose access tokens or secrets

## Cost Estimation

### Firebase Secret Manager
- Secrets used: 2 (Client ID + Client Secret)
- Cost: Free tier (up to 6 secret versions)

### Cloud Functions
- Functions: 2 (linkedInAuth + linkedInCallback)
- Invocations per user: 2
- Expected cost: ~$0.01 per 1,000 users (within free tier for most apps)

### LinkedIn API
- Rate limit: 500 requests/day per app
- User limit: 100 requests/day per user
- Cost: Free

## Next Steps After Deployment

1. [ ] Monitor error rates for first 24 hours
2. [ ] Collect user feedback on import experience
3. [ ] Implement resume upload as alternative import method
4. [ ] Add analytics to track import success rate
5. [ ] Consider applying for LinkedIn Partner API if needed

## Rollback Plan

If deployment fails:

```bash
# View function deployment history
firebase functions:list

# Rollback to previous version (if needed)
# Note: This requires Firebase Blaze plan
firebase functions:delete linkedInAuth
firebase functions:delete linkedInCallback

# Redeploy previous version
git checkout <previous-commit>
firebase deploy --only functions
```

## Support Resources

- [LinkedIn OAuth Documentation](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Firebase Secret Manager](https://firebase.google.com/docs/functions/config-env#secret-manager)
- Setup guide: `/home/carl/application-tracking/jobmatch-ai/LINKEDIN_SETUP.md`

## Deployment Sign-Off

- [ ] All pre-deployment checks completed
- [ ] Functions deployed successfully
- [ ] Frontend deployed successfully
- [ ] End-to-end testing passed
- [ ] Error handling tested
- [ ] Monitoring configured
- [ ] Security audit passed

Deployed by: ___________________
Date: ___________________
Firebase Project: ___________________
LinkedIn App ID: ___________________
