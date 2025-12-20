# LinkedIn OAuth Quick Start Guide

## TL;DR - 5 Minute Setup

### 1. Create LinkedIn App
1. Go to https://www.linkedin.com/developers/apps
2. Create app, verify with company page
3. Add redirect URL: `https://us-central1-ai-career-os-139db.cloudfunctions.net/linkedInCallback`
4. Request scopes: `openid`, `profile`, `email`
5. Copy Client ID and Client Secret

### 2. Configure Firebase Secrets
```bash
cd /home/carl/application-tracking/jobmatch-ai

# Set secrets (paste values when prompted)
firebase functions:secrets:set LINKEDIN_CLIENT_ID
firebase functions:secrets:set LINKEDIN_CLIENT_SECRET
```

### 3. Deploy Functions
```bash
cd functions
npm install
cd ..
firebase deploy --only functions:linkedInAuth,functions:linkedInCallback
```

### 4. Test It
1. Navigate to: https://ai-career-os-139db.web.app/profile/edit
2. Click "Import from LinkedIn"
3. Authorize the app
4. Verify profile data imported

Done! 🎉

---

## Automated Setup (Recommended)

Run the setup script:

```bash
chmod +x setup-linkedin-oauth.sh
./setup-linkedin-oauth.sh
```

The script will guide you through all steps.

---

## Manual Setup Commands

### Set Secrets
```bash
# Client ID
firebase functions:secrets:set LINKEDIN_CLIENT_ID
# Paste: YOUR_CLIENT_ID

# Client Secret
firebase functions:secrets:set LINKEDIN_CLIENT_SECRET
# Paste: YOUR_CLIENT_SECRET
```

### Verify Secrets
```bash
firebase functions:secrets:access LINKEDIN_CLIENT_ID
firebase functions:secrets:access LINKEDIN_CLIENT_SECRET
```

### Configure App URL (Optional)
```bash
firebase functions:config:set app.url="https://ai-career-os-139db.web.app"
```

### Deploy Functions
```bash
cd functions && npm install && cd ..
firebase deploy --only functions:linkedInAuth,functions:linkedInCallback
```

### View Logs
```bash
# Real-time logs
firebase functions:log --only linkedInCallback --follow

# Recent logs
firebase functions:log --only linkedInCallback
```

---

## Testing Checklist

- [ ] LinkedIn app created and verified
- [ ] Redirect URL added: `https://us-central1-ai-career-os-139db.cloudfunctions.net/linkedInCallback`
- [ ] OAuth scopes approved: `openid`, `profile`, `email`
- [ ] Client ID secret set in Firebase
- [ ] Client Secret secret set in Firebase
- [ ] Functions deployed successfully
- [ ] Can click "Import from LinkedIn" button
- [ ] Redirects to LinkedIn authorization page
- [ ] After approval, redirects back to app
- [ ] Success toast notification appears
- [ ] Profile data appears in Firestore `users/{userId}`
- [ ] Profile form auto-populates with imported data

---

## Common Issues & Quick Fixes

### "LinkedIn integration is not configured"
```bash
# Verify secrets exist
firebase functions:secrets:access LINKEDIN_CLIENT_ID
firebase functions:secrets:access LINKEDIN_CLIENT_SECRET

# If missing, set them
firebase functions:secrets:set LINKEDIN_CLIENT_ID
firebase functions:secrets:set LINKEDIN_CLIENT_SECRET

# Redeploy
firebase deploy --only functions
```

### "Redirect URI mismatch"
1. Check LinkedIn app Auth settings
2. Verify redirect URL exactly matches:
   ```
   https://us-central1-ai-career-os-139db.cloudfunctions.net/linkedInCallback
   ```
3. No trailing slash!
4. Must use `https://`

### "Invalid state token"
- State tokens expire in 10 minutes
- Try OAuth flow again
- Check function logs for details

### Functions not deploying
```bash
# Check you're in project root
cd /home/carl/application-tracking/jobmatch-ai

# Install dependencies
cd functions && npm install && cd ..

# Deploy with verbose logging
firebase deploy --only functions --debug
```

---

## What Gets Imported

### ✅ Available with Standard OAuth
- First name
- Last name
- Email address
- Profile photo URL
- Professional headline
- LinkedIn profile URL

### ❌ Requires Partner API (Not Available)
- Work experience
- Education
- Skills and endorsements
- Recommendations
- Connections

**Note**: Users will be notified that work experience, education, and skills need to be added manually.

---

## File Locations

### Cloud Functions
- **Main functions**: `/home/carl/application-tracking/jobmatch-ai/functions/index.js` (lines 330-850)
  - `linkedInAuth` - Initiates OAuth flow
  - `linkedInCallback` - Handles OAuth callback
  - Helper functions for token exchange and profile import

### Frontend
- **Import button**: `/home/carl/application-tracking/jobmatch-ai/src/sections/profile-resume-management/components/EditProfileForm.tsx`
  - Lines 139-175: `handleLinkedInImport()` function
  - Lines 44-80: OAuth callback handler with error messages

### Documentation
- **Full setup guide**: `LINKEDIN_OAUTH_SETUP.md`
- **This quick start**: `LINKEDIN_OAUTH_QUICKSTART.md`
- **Setup script**: `setup-linkedin-oauth.sh`

---

## Security Features

✓ CSRF protection with cryptographically secure state tokens
✓ State token expiration (10 minutes)
✓ One-time use state tokens
✓ Secrets stored in Firebase Secret Manager
✓ HTTPS-only OAuth endpoints
✓ User authentication required
✓ No client-side secret exposure

---

## Monitoring

### View Function Logs
```bash
# All LinkedIn function logs
firebase functions:log | grep -i linkedin

# Real-time callback logs
firebase functions:log --only linkedInCallback --follow

# Recent auth logs
firebase functions:log --only linkedInAuth
```

### Check Firestore
1. Open Firebase Console: https://console.firebase.google.com/project/ai-career-os-139db/firestore
2. Check collections:
   - `_oauth_states` - Temporary state tokens (should be empty after successful OAuth)
   - `users/{userId}` - User profiles with imported data
   - `users/{userId}/notifications` - Import notifications

---

## Production Deployment

### Before Going Live
1. ✅ Test OAuth flow end-to-end in staging
2. ✅ Verify error handling (user denies access, expired tokens)
3. ✅ Update privacy policy to mention LinkedIn data
4. ✅ Set production app URL:
   ```bash
   firebase functions:config:set app.url="https://your-production-domain.com"
   ```
5. ✅ Deploy to production:
   ```bash
   firebase deploy --only functions
   ```

### Production URLs
- **Callback URL**: `https://us-central1-ai-career-os-139db.cloudfunctions.net/linkedInCallback`
- **App URL**: `https://ai-career-os-139db.web.app`
- **Function Logs**: https://console.firebase.google.com/project/ai-career-os-139db/functions/logs

---

## Need Help?

1. **Check logs**: `firebase functions:log --only linkedInCallback`
2. **Read full guide**: `cat LINKEDIN_OAUTH_SETUP.md`
3. **LinkedIn docs**: https://docs.microsoft.com/en-us/linkedin/
4. **Firebase docs**: https://firebase.google.com/docs/functions

---

## Summary

The LinkedIn OAuth integration is **already implemented** in your codebase. You just need to:

1. Create a LinkedIn app
2. Set two secrets (Client ID and Secret)
3. Deploy the functions

The code handles everything else automatically, including:
- Generating secure OAuth URLs
- Validating CSRF state tokens
- Exchanging authorization codes for access tokens
- Fetching profile data from LinkedIn
- Importing data to Firestore
- Redirecting users back to the app
- Showing success/error notifications
- Creating user notifications about limited data import

**Total setup time**: ~5 minutes

Good luck! 🚀
