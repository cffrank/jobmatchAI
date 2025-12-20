# LinkedIn OAuth Quick Start Guide

Fast-track guide to get LinkedIn OAuth integration working in under 30 minutes.

## Prerequisites

- Firebase project with Blaze plan (required for Secret Manager)
- Firebase CLI installed: `npm install -g firebase-tools`
- Admin access to LinkedIn Developers portal

## 5-Step Setup

### Step 1: Create LinkedIn App (5 minutes)

1. Go to https://www.linkedin.com/developers/apps
2. Click "Create app"
3. Fill in:
   - App name: `JobMatch AI`
   - LinkedIn Page: (create if needed)
   - Upload logo (any 300x300px image)
   - Privacy policy URL: `https://your-app.com/privacy`
4. Click "Create app"
5. Go to "Auth" tab
6. Copy your **Client ID** and **Client Secret**

### Step 2: Configure LinkedIn OAuth (3 minutes)

In LinkedIn app settings:

1. Under "Authorized redirect URLs", add:
   ```
   https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/linkedInCallback
   ```
   Replace `YOUR_PROJECT_ID` with your Firebase project ID

2. Under "OAuth 2.0 scopes", verify these are enabled:
   - ✅ `openid`
   - ✅ `profile`
   - ✅ `email`

3. Click "Update"

### Step 3: Configure Firebase Secrets (2 minutes)

```bash
cd /home/carl/application-tracking/jobmatch-ai/functions

# Set Client ID
firebase functions:secrets:set LINKEDIN_CLIENT_ID
# Paste your Client ID when prompted

# Set Client Secret
firebase functions:secrets:set LINKEDIN_CLIENT_SECRET
# Paste your Client Secret when prompted
```

### Step 4: Deploy Cloud Functions (5 minutes)

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Deploy LinkedIn OAuth functions
firebase deploy --only functions:linkedInAuth,functions:linkedInCallback
```

Wait for deployment to complete. Note the callback URL in the output.

### Step 5: Deploy Frontend (5 minutes)

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Build and deploy
npm run build
firebase deploy --only hosting
```

## Test It Works (5 minutes)

1. Open your app: `https://your-app.web.app`
2. Sign in with Firebase Auth
3. Go to Profile → Edit Profile
4. Click "Import from LinkedIn"
5. Authorize on LinkedIn
6. You should be redirected back with profile data imported

## Verify Success

Check Firestore Console:
- Go to `users/{your-user-id}`
- You should see:
  - `firstName`, `lastName`, `email` populated
  - `linkedInImported: true`
  - `linkedInImportedAt: [timestamp]`

## Troubleshooting

### "redirect_uri_mismatch" error
- The URL in LinkedIn app must exactly match the deployed function URL
- No trailing slash
- Check: `firebase functions:list` to see the actual URL

### "LinkedIn credentials not configured"
```bash
# Verify secrets are set
firebase functions:secrets:access LINKEDIN_CLIENT_ID
firebase functions:secrets:access LINKEDIN_CLIENT_SECRET
```

### Profile data not imported
```bash
# Check function logs
firebase functions:log --only linkedInCallback
```

### Button does nothing
- Open browser console (F12)
- Check for JavaScript errors
- Verify you're signed in to Firebase Auth

## What Gets Imported

✅ **Available with Standard OAuth**:
- First name
- Last name
- Email address
- Profile picture
- LinkedIn profile URL

❌ **Requires Partner API Access** (not included):
- Work experience
- Education
- Skills & endorsements

Users will see a notification explaining they need to manually add work experience, education, and skills.

## Next Steps

1. Monitor function logs for the first few users
2. Implement resume upload as alternative import method
3. Add user guidance for manual data entry
4. Consider applying for LinkedIn Partner API if needed

## Get Detailed Help

- Full setup guide: `LINKEDIN_SETUP.md`
- Deployment checklist: `DEPLOY_LINKEDIN.md`
- Function logs: `firebase functions:log --follow`

## Command Reference

```bash
# View deployed functions
firebase functions:list

# View function logs
firebase functions:log --only linkedInAuth,linkedInCallback

# Stream logs in real-time
firebase functions:log --only linkedInCallback --follow

# Check secret values
firebase functions:secrets:access LINKEDIN_CLIENT_ID

# Redeploy after code changes
firebase deploy --only functions:linkedInAuth,functions:linkedInCallback
```

## Support

If you encounter issues:
1. Check function logs: `firebase functions:log --only linkedInCallback`
2. Verify LinkedIn app settings (OAuth scopes and redirect URL)
3. Ensure secrets are properly set
4. Review detailed guides in `LINKEDIN_SETUP.md`
