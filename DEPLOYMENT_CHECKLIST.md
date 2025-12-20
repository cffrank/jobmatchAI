# LinkedIn OAuth - Deployment Checklist

## Current Status: ✅ Code Complete, ⏳ Configuration Needed

All LinkedIn OAuth code is implemented and ready. You just need to configure it.

---

## Quick Deployment (5-10 Minutes)

### Option A: Automated Setup (Recommended)

```bash
cd /home/carl/application-tracking/jobmatch-ai
chmod +x setup-linkedin-oauth.sh
./setup-linkedin-oauth.sh
```

The script will guide you through everything.

### Option B: Manual Setup

Follow `LINKEDIN_OAUTH_QUICKSTART.md` for step-by-step instructions.

---

## Pre-Deployment Checklist

Before you begin, make sure you have:

- [ ] LinkedIn company page (required for creating LinkedIn app)
- [ ] Admin access to the LinkedIn company page
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Firebase authentication (`firebase login`)
- [ ] 10 minutes of time

---

## Step-by-Step Deployment

### Step 1: Create LinkedIn App (3 minutes)

1. Go to https://www.linkedin.com/developers/apps
2. Click "Create app"
3. Fill in:
   - App name: `JobMatch AI`
   - LinkedIn Page: Select your company page
   - Privacy policy: `https://ai-career-os-139db.web.app/privacy`
   - Upload app logo
4. Verify app with your LinkedIn page
5. Go to **Auth** tab:
   - Add redirect URL: `https://us-central1-ai-career-os-139db.cloudfunctions.net/linkedInCallback`
   - Request scopes: `openid`, `profile`, `email`
6. Copy **Client ID** and **Client Secret**

### Step 2: Configure Firebase Secrets (2 minutes)

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Set Client ID (paste when prompted)
firebase functions:secrets:set LINKEDIN_CLIENT_ID

# Set Client Secret (paste when prompted)
firebase functions:secrets:set LINKEDIN_CLIENT_SECRET
```

### Step 3: Deploy Functions (3 minutes)

```bash
# Install dependencies
cd functions
npm install
cd ..

# Deploy LinkedIn OAuth functions
firebase deploy --only functions:linkedInAuth,functions:linkedInCallback

# Deploy updated Firestore rules
firebase deploy --only firestore:rules
```

### Step 4: Test (2 minutes)

```bash
# Run automated tests
chmod +x test-linkedin-oauth.sh
./test-linkedin-oauth.sh
```

Or test manually:
1. Navigate to: https://ai-career-os-139db.web.app/profile/edit
2. Click "Import from LinkedIn"
3. Authorize the app on LinkedIn
4. Verify profile data imports successfully

---

## Verification Checklist

After deployment, verify:

- [ ] LinkedIn app shows "Verified" status
- [ ] Redirect URL saved in LinkedIn app
- [ ] OAuth scopes approved
- [ ] Secrets set in Firebase (`firebase functions:secrets:access LINKEDIN_CLIENT_ID`)
- [ ] Functions deployed (`firebase functions:list`)
- [ ] Firestore rules deployed
- [ ] Can click "Import from LinkedIn" button
- [ ] Redirects to LinkedIn authorization page
- [ ] After approval, redirects back to app
- [ ] Success notification appears
- [ ] Profile data visible in Firestore
- [ ] Profile form auto-populates

---

## What Gets Imported

### ✅ Available (Standard OAuth)
- First name
- Last name
- Email address
- Profile photo
- Professional headline
- LinkedIn profile URL

### ❌ Not Available (Requires Partner API)
- Work experience
- Education
- Skills and endorsements

Users will see a notification explaining they need to add these manually.

---

## Important URLs

### Production
- **Callback URL**: `https://us-central1-ai-career-os-139db.cloudfunctions.net/linkedInCallback`
- **App URL**: `https://ai-career-os-139db.web.app`
- **Profile Edit**: `https://ai-career-os-139db.web.app/profile/edit`

### Firebase Console
- **Project**: https://console.firebase.google.com/project/ai-career-os-139db
- **Functions**: https://console.firebase.google.com/project/ai-career-os-139db/functions
- **Firestore**: https://console.firebase.google.com/project/ai-career-os-139db/firestore
- **Logs**: https://console.firebase.google.com/project/ai-career-os-139db/functions/logs

### LinkedIn Developer
- **Apps**: https://www.linkedin.com/developers/apps
- **Docs**: https://docs.microsoft.com/en-us/linkedin/

---

## Monitoring

### View Logs
```bash
# Real-time logs
firebase functions:log --only linkedInCallback --follow

# Recent logs
firebase functions:log --only linkedInCallback --limit 50
```

### Check Metrics
Monitor in Firebase Console:
- Function invocations
- Error rate
- Execution time
- Success rate

---

## Rollback Plan

If something goes wrong:

```bash
# Rollback functions to previous version
firebase deploy --only functions --except linkedInAuth,linkedInCallback

# Or redeploy specific version
firebase functions:rollback linkedInAuth
firebase functions:rollback linkedInCallback
```

---

## Troubleshooting

### Functions Not Working

```bash
# Check deployment
firebase functions:list

# View logs
firebase functions:log --only linkedInCallback

# Verify secrets
firebase functions:secrets:access LINKEDIN_CLIENT_ID
firebase functions:secrets:access LINKEDIN_CLIENT_SECRET
```

### "Redirect URI Mismatch"

Check LinkedIn app has exact URL:
```
https://us-central1-ai-career-os-139db.cloudfunctions.net/linkedInCallback
```
(No trailing slash, must use https://)

### "Integration Not Configured"

```bash
# Set secrets again
firebase functions:secrets:set LINKEDIN_CLIENT_ID
firebase functions:secrets:set LINKEDIN_CLIENT_SECRET

# Redeploy
firebase deploy --only functions
```

### Profile Data Not Importing

Check Firebase Console > Firestore:
1. Look for `users/{userId}` document
2. Check fields: `linkedInImported`, `firstName`, `lastName`
3. Check `users/{userId}/notifications` collection

---

## Security Notes

### What's Protected
- ✅ Client Secret stored in Firebase Secret Manager (not in code)
- ✅ CSRF protection with state tokens
- ✅ State tokens expire in 10 minutes
- ✅ One-time use tokens
- ✅ HTTPS-only endpoints
- ✅ User authentication required

### Best Practices
- 🔒 Never commit secrets to git
- 🔒 Rotate LinkedIn Client Secret periodically
- 🔒 Monitor logs for suspicious activity
- 🔒 Keep dependencies updated

---

## Cost Estimate

**Per OAuth import**:
- Cloud Functions: ~$0.0000004
- Firestore: ~$0.000002
- **Total**: ~$0.000002

**At scale** (1000 imports/month): ~$0.002/month

---

## Documentation Files

Created for you:

1. **LINKEDIN_INTEGRATION_README.md** - Complete reference documentation
2. **LINKEDIN_OAUTH_SETUP.md** - Detailed step-by-step setup guide
3. **LINKEDIN_OAUTH_QUICKSTART.md** - Quick reference (5 min setup)
4. **setup-linkedin-oauth.sh** - Automated setup script
5. **test-linkedin-oauth.sh** - Configuration verification script
6. **DEPLOYMENT_CHECKLIST.md** - This file

---

## Code Locations

All code is already implemented:

### Cloud Functions
- File: `/home/carl/application-tracking/jobmatch-ai/functions/index.js`
- Lines: 330-850
- Functions:
  - `linkedInAuth` (lines 345-425) - Initiates OAuth
  - `linkedInCallback` (lines 439-524) - Handles callback
  - Helper functions (lines 526-850)

### Frontend
- File: `/home/carl/application-tracking/jobmatch-ai/src/sections/profile-resume-management/components/EditProfileForm.tsx`
- Import button (lines 196-205)
- Click handler (lines 139-175)
- Callback handler (lines 44-80)

### Security Rules
- File: `/home/carl/application-tracking/jobmatch-ai/firestore.rules`
- OAuth states (lines 94-100)
- Notifications (lines 84-89)
- Updated with email subcollections

---

## Next Steps

1. **Create LinkedIn app** (3 min)
2. **Set Firebase secrets** (2 min)
3. **Deploy functions** (3 min)
4. **Test integration** (2 min)

**Total time: ~10 minutes**

---

## Success Criteria

You'll know it's working when:

1. ✅ User clicks "Import from LinkedIn"
2. ✅ Redirects to LinkedIn authorization page
3. ✅ User approves access
4. ✅ Redirects back to app
5. ✅ Shows "LinkedIn profile imported successfully!" toast
6. ✅ Profile form auto-fills with name, email, etc.
7. ✅ Data visible in Firestore

---

## Need Help?

1. Run test script: `./test-linkedin-oauth.sh`
2. Check logs: `firebase functions:log --only linkedInCallback`
3. Read docs:
   - Quick start: `cat LINKEDIN_OAUTH_QUICKSTART.md`
   - Full guide: `cat LINKEDIN_OAUTH_SETUP.md`
   - Reference: `cat LINKEDIN_INTEGRATION_README.md`

---

## Ready to Deploy?

```bash
# Option 1: Automated (recommended)
./setup-linkedin-oauth.sh

# Option 2: Manual
# Follow LINKEDIN_OAUTH_QUICKSTART.md
```

**Good luck! 🚀**
