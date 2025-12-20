# LinkedIn OAuth Integration Setup Guide

This guide walks you through setting up LinkedIn OAuth authentication for JobMatch AI.

## Overview

The LinkedIn OAuth integration allows users to connect their LinkedIn profile and import basic profile information (name, email, photo, headline) into the app. This data is then used to populate their JobMatch AI profile.

## Architecture

```
User clicks "Connect LinkedIn"
    ↓
Frontend calls linkedInAuth Cloud Function
    ↓
Function generates OAuth URL with state token
    ↓
User is redirected to LinkedIn
    ↓
User authorizes the app on LinkedIn
    ↓
LinkedIn redirects to linkedInCallback Cloud Function
    ↓
Function exchanges authorization code for access token
    ↓
Function fetches LinkedIn profile data
    ↓
Function imports data to Firestore
    ↓
User is redirected back to app with success status
```

## Prerequisites

1. Firebase project set up (ai-career-os-139db)
2. Cloud Functions deployed
3. Firestore database configured
4. LinkedIn Developer account

---

## Step 1: Create LinkedIn Application

### 1.1 Navigate to LinkedIn Developers

Go to: https://www.linkedin.com/developers/apps

### 1.2 Create New App

Click **"Create app"** and fill in:

- **App name**: JobMatch AI
- **LinkedIn Page**: Your company LinkedIn page (required)
  - If you don't have one, create a company page first at: https://www.linkedin.com/company/setup/new/
- **Privacy policy URL**: Your app's privacy policy
  - Example: `https://ai-career-os-139db.web.app/privacy`
- **App logo**: Upload a square logo (at least 100x100px)
- **Legal agreement**: Check the box to agree to LinkedIn's API Terms of Use

Click **"Create app"**

### 1.3 Verify Your App (Required)

1. Click the **"Settings"** tab
2. Under "App Settings", click **"Verify"** next to your LinkedIn Page
3. Follow the verification steps (you'll need admin access to the LinkedIn page)

---

## Step 2: Configure OAuth Settings

### 2.1 Navigate to Auth Tab

In your LinkedIn app dashboard, click the **"Auth"** tab

### 2.2 Add Redirect URLs

Under **"OAuth 2.0 settings"**, find **"Authorized redirect URLs for your app"**

Add the following URL:
```
https://us-central1-ai-career-os-139db.cloudfunctions.net/linkedInCallback
```

**Important notes:**
- Must use `https://` (not `http://`)
- No trailing slash
- Replace `ai-career-os-139db` with your actual Firebase project ID if different
- Click **"Update"** to save

### 2.3 Request OAuth Scopes

Under **"OAuth 2.0 scopes"**, request the following:

1. **OpenID Connect scopes**:
   - ✅ `openid` - Required for authentication
   - ✅ `profile` - Basic profile information
   - ✅ `email` - User's email address

Click the **"Request access"** button for each scope if needed.

**Note**: Work experience, education, and skills require the `r_member_social` scope, which is only available to LinkedIn partners. The current implementation uses basic scopes available to all developers.

---

## Step 3: Get Client Credentials

### 3.1 Copy Client ID and Secret

In the **"Auth"** tab:

1. Find **"Client ID"** - copy this value
2. Find **"Client Secret"** - click **"Show"** to reveal it, then copy

### 3.2 Set Firebase Secrets

Open your terminal and run:

```bash
# Navigate to your project
cd /home/carl/application-tracking/jobmatch-ai

# Set LinkedIn Client ID
firebase functions:secrets:set LINKEDIN_CLIENT_ID
# Paste your Client ID when prompted, then press Enter

# Set LinkedIn Client Secret
firebase functions:secrets:set LINKEDIN_CLIENT_SECRET
# Paste your Client Secret when prompted, then press Enter
```

### 3.3 Verify Secrets are Set

```bash
firebase functions:secrets:access LINKEDIN_CLIENT_ID
firebase functions:secrets:access LINKEDIN_CLIENT_SECRET
```

---

## Step 4: Configure Application URL

The Cloud Functions need to know where to redirect users after OAuth completion.

### Option A: Use Environment Variable (Recommended)

Add to `functions/.env`:
```env
APP_URL=https://ai-career-os-139db.web.app
```

For local development:
```env
APP_URL=http://localhost:5173
```

### Option B: Use Firebase Config

```bash
firebase functions:config:set app.url="https://ai-career-os-139db.web.app"
```

---

## Step 5: Deploy Cloud Functions

### 5.1 Install Dependencies

```bash
cd functions
npm install
```

### 5.2 Deploy Functions

```bash
# Deploy only the LinkedIn functions
firebase deploy --only functions:linkedInAuth,functions:linkedInCallback

# Or deploy all functions
firebase deploy --only functions
```

### 5.3 Verify Deployment

```bash
firebase functions:list
```

You should see:
- `linkedInAuth(us-central1)`
- `linkedInCallback(us-central1)`

---

## Step 6: Update Firestore Security Rules

The OAuth flow creates temporary state tokens in Firestore. Ensure your `firestore.rules` includes:

```javascript
// OAuth state tokens (temporary, cleaned up after use)
match /_oauth_states/{stateId} {
  // Only Cloud Functions can write
  allow read, write: if false;
}
```

Deploy the rules:
```bash
firebase deploy --only firestore:rules
```

---

## Step 7: Test the OAuth Flow

### 7.1 Access the LinkedIn Import Page

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to: http://localhost:5173/linkedin/import

### 7.2 Initiate OAuth

1. Click **"Connect with LinkedIn"** button
2. You should be redirected to LinkedIn's authorization page
3. Click **"Allow"** to authorize the app
4. You should be redirected back to: http://localhost:5173/profile?linkedin=success

### 7.3 Verify Data Import

1. Open Firebase Console: https://console.firebase.google.com/
2. Navigate to **Firestore Database**
3. Check the `users/{userId}` document
4. Verify these fields were updated:
   - `linkedInUrl`
   - `linkedInImported: true`
   - `linkedInImportedAt`
   - `firstName`, `lastName`, `email` (if available)
   - `profileImageUrl` (if available)
   - `headline` (if available)

---

## Troubleshooting

### Error: "invalid_redirect_uri"

**Cause**: The redirect URL doesn't match what's configured in LinkedIn app

**Fix**:
1. Check the URL in LinkedIn app settings matches exactly
2. Ensure no trailing slashes
3. Verify you're using `https://` (not `http://`)
4. Confirm the Firebase project ID is correct

### Error: "invalid_state"

**Cause**: State token expired or invalid

**Fix**:
1. State tokens expire after 10 minutes
2. Try the OAuth flow again
3. Check Firestore rules allow function access to `_oauth_states`

### Error: "token_exchange_failed"

**Cause**: Failed to exchange authorization code for access token

**Fix**:
1. Verify Client ID and Client Secret are correct
2. Check they're set as Firebase secrets
3. View function logs: `firebase functions:log --only linkedInCallback`
4. Ensure the authorization code hasn't expired (very short-lived)

### Error: "profile_fetch_failed"

**Cause**: Failed to fetch LinkedIn profile data

**Fix**:
1. Verify OAuth scopes are approved in LinkedIn app
2. Check function logs for API error details
3. Ensure user granted all requested permissions

### No Data Imported

**Cause**: LinkedIn API limitations

**Fix**:
1. Verify OAuth scopes include `openid`, `profile`, `email`
2. Check function logs: `firebase functions:log --only linkedInCallback`
3. Some fields may not be available depending on user's LinkedIn privacy settings

### Function Not Found

**Cause**: Functions not deployed

**Fix**:
```bash
firebase deploy --only functions
firebase functions:list  # Verify deployment
```

---

## Monitoring & Logs

### View Function Logs

```bash
# All function logs
firebase functions:log

# LinkedIn-specific logs
firebase functions:log --only linkedInCallback

# Real-time logs
firebase functions:log --only linkedInCallback --follow
```

### Check OAuth State Tokens

In Firestore Console, check the `_oauth_states` collection:
- Tokens should be created when OAuth starts
- Tokens should be deleted after successful callback
- Old tokens (>10 minutes) can be safely deleted

---

## Security Considerations

1. **State Token Validation**: Prevents CSRF attacks by validating state parameter
2. **Token Expiration**: State tokens expire after 10 minutes
3. **One-Time Use**: State tokens are deleted after use
4. **HTTPS Only**: All OAuth endpoints use HTTPS
5. **Client Secret Protection**: Stored as Firebase secret, never exposed to client
6. **Scoped Access**: Only requests minimal required OAuth scopes

---

## Data Privacy Notes

### What Data is Imported

- ✅ Basic profile info (name, email)
- ✅ Profile photo URL
- ✅ LinkedIn headline
- ✅ LinkedIn profile URL

### What Data is NOT Imported

- ❌ Work experience (requires Partner API access)
- ❌ Education (requires Partner API access)
- ❌ Skills (requires Partner API access)
- ❌ Connections
- ❌ Messages
- ❌ Posts

### User Notifications

Users who connect LinkedIn receive a notification explaining:
- What data was imported
- What data requires manual entry
- How to add missing information

---

## Production Checklist

Before launching to production:

- [ ] LinkedIn app is verified
- [ ] OAuth scopes are approved
- [ ] Redirect URL uses production domain
- [ ] Firebase secrets are set in production
- [ ] APP_URL points to production domain
- [ ] Firestore rules are deployed
- [ ] Functions are deployed to production
- [ ] OAuth flow tested end-to-end
- [ ] Error handling tested (denied access, expired tokens)
- [ ] Privacy policy updated to mention LinkedIn data usage
- [ ] Terms of service updated

---

## Future Enhancements

1. **Partner API Access**: Apply for LinkedIn Partner API to access work experience, education, and skills
2. **Resume Import**: Allow users to upload resume as alternative to LinkedIn import
3. **Periodic Sync**: Implement webhook to sync profile updates from LinkedIn
4. **Additional Scopes**: Request `r_member_social` for posts and network data
5. **Profile Enrichment**: Use imported data to enhance AI-generated applications

---

## Support Resources

- LinkedIn API Documentation: https://docs.microsoft.com/en-us/linkedin/
- LinkedIn Developer Support: https://www.linkedin.com/help/linkedin/ask/API
- Firebase Functions Documentation: https://firebase.google.com/docs/functions
- Firebase Secrets Documentation: https://firebase.google.com/docs/functions/config-env

---

## Summary

You've successfully set up LinkedIn OAuth integration! Users can now:

1. Navigate to `/linkedin/import`
2. Click "Connect with LinkedIn"
3. Authorize the app on LinkedIn
4. Have their basic profile data automatically imported

This provides a seamless onboarding experience and reduces manual data entry for new users.
