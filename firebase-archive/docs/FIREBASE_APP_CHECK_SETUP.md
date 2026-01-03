# Firebase App Check Setup Guide

Firebase App Check helps protect your Firebase resources from abuse by preventing unauthorized clients from accessing your backend services. This is an **optional but highly recommended** security enhancement for production deployments.

---

## What is Firebase App Check?

Firebase App Check works with platform-specific attestation providers to verify that requests to your Firebase services come from your authentic app and not from unauthorized parties.

**Benefits:**
- Prevents unauthorized API access to Cloud Functions
- Blocks quota theft and abuse of Firestore/Storage
- Protects against bots and scrapers
- Reduces costs from fraudulent traffic
- Meets security compliance requirements

**How it works:**
1. App Check verifies the request comes from your real app
2. Issues a short-lived App Check token
3. Firebase services verify the token before processing requests
4. Blocks requests without valid tokens

---

## Prerequisites

Before setting up App Check:

- [ ] Firebase project is on Blaze (pay-as-you-go) plan
- [ ] App is deployed to production
- [ ] You have access to Firebase Console
- [ ] You understand it may block legitimate traffic if misconfigured

---

## Setup Steps

### Step 1: Enable App Check in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `ai-career-os-139db`
3. Navigate to **Build > App Check**
4. Click **Get Started**

### Step 2: Register Your Web App

#### For Web (Recommended: reCAPTCHA Enterprise)

1. In App Check settings, select your web app
2. Choose **reCAPTCHA Enterprise** as the provider
3. Click **Register**

**Why reCAPTCHA Enterprise?**
- More reliable than reCAPTCHA v3
- Better bot detection
- Transparent to most users
- 10,000 free assessments/month

**Alternative: reCAPTCHA v3**
- Completely invisible to users
- Less reliable than Enterprise
- 10,000 free assessments/month
- Good for low-traffic apps

### Step 3: Get reCAPTCHA Enterprise Site Key

#### Option A: reCAPTCHA Enterprise (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: `ai-career-os-139db`
3. Navigate to **Security > reCAPTCHA Enterprise**
4. Enable the API if not already enabled
5. Click **Create Key**
6. Configure:
   - **Display name**: JobMatch AI Production
   - **Platform type**: Website
   - **Domains**:
     - `ai-career-os-139db.web.app`
     - `ai-career-os-139db.firebaseapp.com`
     - Add your custom domain if applicable
   - **Security preference**: Score-based
   - **Challenge page**: Use default
7. Click **Create**
8. Copy the **Site Key**

#### Option B: reCAPTCHA v3

1. Go to [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click **+** to create a new site
3. Configure:
   - **Label**: JobMatch AI
   - **reCAPTCHA type**: v3
   - **Domains**:
     - `ai-career-os-139db.web.app`
     - `ai-career-os-139db.firebaseapp.com`
     - Add your custom domain
   - **Owners**: Your email
   - Accept terms
4. Click **Submit**
5. Copy the **Site Key**

### Step 4: Configure App Check in Your App

#### Install App Check SDK

```bash
npm install firebase/app-check
```

#### Update Firebase Configuration

Edit `/home/carl/application-tracking/jobmatch-ai/src/lib/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'

// Existing Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize App Check
// For production, use the reCAPTCHA Enterprise site key
// For development, use debug token (see below)
if (import.meta.env.PROD) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(
      import.meta.env.VITE_RECAPTCHA_SITE_KEY
    ),
    isTokenAutoRefreshEnabled: true
  })
} else {
  // Development: use debug token (see Step 5)
  // Self-signed token for localhost testing
  // @ts-ignore - global declaration
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true
}

// Export Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app)
```

#### Add Environment Variable

Add to `.env.local`:
```env
VITE_RECAPTCHA_SITE_KEY=6Lf... # Your reCAPTCHA site key
```

Add to `.env.example`:
```env
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
```

Add to GitHub Secrets:
- Secret name: `VITE_RECAPTCHA_SITE_KEY`
- Secret value: Your reCAPTCHA site key

### Step 5: Enable App Check for Each Service

In Firebase Console > App Check:

#### For Cloud Functions:
1. Click on **APIs** tab
2. Find **Cloud Functions**
3. Click **Enforce**
4. Choose enforcement mode:
   - **Monitor**: Logs violations but allows requests (recommended for testing)
   - **Enforce**: Blocks requests without valid App Check token

Start with **Monitor mode** for 1-2 weeks to ensure no legitimate traffic is blocked.

#### For Firestore:
1. Find **Cloud Firestore** in APIs list
2. Click **Enforce**
3. Start with **Monitor mode**

#### For Storage:
1. Find **Cloud Storage** in APIs list
2. Click **Enforce**
3. Start with **Monitor mode**

### Step 6: Configure Debug Tokens (Development)

For local development and testing, you need debug tokens:

1. Run app locally: `npm run dev`
2. Open browser console
3. You'll see a message like:
   ```
   App Check debug token: "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
   ```
4. Copy this token
5. Go to Firebase Console > App Check > Apps > Your Web App
6. Click **Manage debug tokens**
7. Add the debug token
8. Save

Debug tokens are valid for development only and bypass App Check verification.

---

## Testing App Check

### Test in Monitor Mode

1. Deploy your app with App Check configured
2. Verify in Firebase Console that App Check is in **Monitor mode**
3. Use the app normally for a few days
4. Check Firebase Console > App Check > Metrics
5. Verify:
   - Valid requests show up in metrics
   - No legitimate traffic is being flagged
   - App functions correctly

### Check for Blocked Requests

In Firebase Console > App Check > Metrics:
- **Valid tokens**: Requests with valid App Check tokens
- **Invalid tokens**: Blocked or suspicious requests
- **Missing tokens**: Requests without App Check tokens

If you see legitimate traffic in "Invalid/Missing tokens":
- Add missing domains to reCAPTCHA configuration
- Check that App Check SDK is properly initialized
- Verify environment variables are set

### Switch to Enforce Mode

Once confident (after 1-2 weeks of monitoring):

1. Go to Firebase Console > App Check
2. For each service (Functions, Firestore, Storage):
   - Change from **Monitor** to **Enforce**
3. Monitor error rates closely for 24-48 hours
4. Roll back to Monitor mode if issues arise

---

## Updating App Check Configuration

### Add New Domain

If adding a custom domain:

1. Go to reCAPTCHA admin console
2. Add domain to allowed list
3. No code changes needed

### Rotate reCAPTCHA Key

If key is compromised:

1. Create new reCAPTCHA key
2. Update `VITE_RECAPTCHA_SITE_KEY` in all environments
3. Deploy app
4. Delete old key after 24 hours

### Update App Check Provider

To switch from reCAPTCHA v3 to Enterprise:

1. Create reCAPTCHA Enterprise key
2. Update code to use `ReCaptchaEnterpriseProvider`
3. Update environment variable
4. Deploy

---

## Troubleshooting

### "App Check token verification failed"

**Problem:** Functions/Firestore requests fail with App Check error

**Solutions:**
1. Verify App Check is initialized in `firebase.ts`
2. Check `VITE_RECAPTCHA_SITE_KEY` is set correctly
3. Verify domain is in reCAPTCHA allowed list
4. Check browser console for App Check errors
5. Try debug token for local testing

### reCAPTCHA Badge Showing on Page

**Problem:** reCAPTCHA badge appears in bottom right

**Solution:** This is normal for reCAPTCHA. You can hide it with CSS (required to show notice):

```css
/* Add to your global CSS */
.grecaptcha-badge {
  visibility: hidden;
}
```

Then add to your Terms/Privacy page:
```
This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.
```

### App Check Debug Token Not Working

**Problem:** Debug token rejected

**Solutions:**
1. Ensure token is added in Firebase Console
2. Verify `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` is set in development
3. Clear browser cache and regenerate token
4. Check that you're using the token for the correct project

### High reCAPTCHA Costs

**Problem:** Exceeding free tier (10,000 assessments/month)

**Solutions:**
1. Enable token caching (already enabled with `isTokenAutoRefreshEnabled: true`)
2. Tokens auto-refresh every hour (reduce API calls)
3. Consider implementing rate limiting on your side
4. Upgrade to paid reCAPTCHA tier if needed

---

## Monitoring and Metrics

### App Check Metrics

View in Firebase Console > App Check > Metrics:
- **Token exchange requests**: How many App Check tokens issued
- **Verified requests**: Requests with valid tokens
- **Invalid requests**: Blocked requests

### reCAPTCHA Metrics

View in reCAPTCHA admin console:
- **Requests**: Total reCAPTCHA assessments
- **Score distribution**: Bot vs. human traffic
- **Top challenge reasons**: Why users see challenges

### Cloud Functions Logs

Check function logs for App Check errors:
```bash
firebase functions:log --only generateApplication | grep "App Check"
```

---

## Cost Considerations

### reCAPTCHA Costs

**Free tier:**
- reCAPTCHA Enterprise: 10,000 assessments/month
- reCAPTCHA v3: 10,000 assessments/month

**Paid tier:**
- $1 per 1,000 additional assessments

**Typical costs for JobMatch AI (1,000 active users):**
- ~20,000 assessments/month = ~$10/month

### App Check Costs

App Check itself is free. You only pay for:
- reCAPTCHA assessments (see above)
- Standard Firebase usage (Functions, Firestore, Storage)

---

## Security Best Practices

1. **Start with Monitor mode** - Test for 1-2 weeks before enforcing
2. **Use reCAPTCHA Enterprise** - More reliable than v3
3. **Keep domains updated** - Add all legitimate domains to allowlist
4. **Rotate debug tokens** - Remove old debug tokens regularly
5. **Monitor metrics** - Check for blocked legitimate traffic weekly
6. **Enable for all services** - Protect Functions, Firestore, and Storage
7. **Don't commit debug tokens** - Add to .gitignore

---

## Rollback Plan

If App Check causes issues:

1. **Immediate (< 5 minutes):**
   - Switch all services to **Monitor mode** in Firebase Console
   - Requests will flow normally while you investigate

2. **Temporary (< 1 hour):**
   - Disable App Check enforcement entirely:
     - Firebase Console > App Check > Each service > Unenforce

3. **Permanent rollback (< 1 day):**
   - Remove App Check initialization from `firebase.ts`
   - Remove `VITE_RECAPTCHA_SITE_KEY` environment variable
   - Deploy updated code

---

## Additional Resources

- [Firebase App Check Documentation](https://firebase.google.com/docs/app-check)
- [reCAPTCHA Enterprise Documentation](https://cloud.google.com/recaptcha-enterprise/docs)
- [App Check Best Practices](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider)
- [Troubleshooting Guide](https://firebase.google.com/docs/app-check/web/debug-provider)

---

## Summary

App Check adds a critical security layer to protect your Firebase resources from abuse. While optional, it's **highly recommended for production** to:
- Prevent quota theft
- Block unauthorized API access
- Reduce costs from bot traffic
- Meet security compliance requirements

**Recommended timeline:**
- Week 1: Set up App Check in Monitor mode
- Week 2-3: Monitor metrics, adjust configuration
- Week 4: Switch to Enforce mode if no issues
- Ongoing: Monitor weekly, rotate keys quarterly

---

**Last Updated:** December 19, 2025
