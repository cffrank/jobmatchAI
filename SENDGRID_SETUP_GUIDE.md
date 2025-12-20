# SendGrid Email Integration Setup Guide

## Overview

This guide walks you through setting up SendGrid email integration for JobMatch AI. The implementation is already complete - you just need to configure your SendGrid account and API key.

**Current Status:**
- ✅ Email function implemented (`sendApplicationEmail`)
- ✅ Email UI components created
- ✅ Security features implemented (rate limiting, HTML sanitization, validation)
- ✅ Email history tracking in Firestore
- ⏳ SendGrid API key configuration needed
- ⏳ Sender email verification needed

---

## Implementation Review

### Code Quality Check

The `sendApplicationEmail` function in `/home/carl/application-tracking/jobmatch-ai/functions/index.js` (lines 1305-1577) has been reviewed:

**✅ Security Features:**
- Authentication required (`request.auth` check on line 1313)
- Input validation using Zod schemas (line 1328-1333)
- Rate limiting via `withRateLimit` wrapper (10 emails/hour)
- HTML sanitization using `sanitizeHtml` from validation module
- Firebase secrets configuration for API key (line 1307)
- Comprehensive error handling and logging

**✅ Implementation Quality:**
- Proper error handling for SendGrid errors (lines 1558-1574)
- Email history tracked in Firestore (lines 1496-1529)
- Professional HTML email template (lines 1395-1434)
- Plain text fallback included (lines 1437-1466)
- Email tracking enabled (open/click tracking)
- Reply-to set to user's email address
- Signature includes contact information

**✅ Configuration:**
- Function timeout: 60 seconds
- Memory allocation: 256 MiB
- Secret reference: `SENDGRID_API_KEY`
- Rate limit: 10 emails/hour per user (via unified rate limiter)

**No security issues or bugs found. Implementation is production-ready.**

---

## Step 1: Create SendGrid Account

1. Navigate to [SendGrid](https://sendgrid.com/)
2. Click "Start for free" or "Sign up"
3. Complete the registration form:
   - Email: carl.f.frank@gmail.com (or your preferred email)
   - Create a strong password
   - Company name: JobMatch AI (or personal use)
4. Verify your email address by clicking the link sent to your inbox
5. Complete the SendGrid onboarding questions (select "Transactional Email" if asked)

**SendGrid Free Tier:**
- 100 emails/day permanently free
- No credit card required
- Sufficient for testing and personal use
- Email validation and tracking included

---

## Step 2: Verify Sender Email Address

**CRITICAL:** SendGrid will NOT send emails from unverified addresses. This step is mandatory.

1. Log in to [SendGrid Dashboard](https://app.sendgrid.com/)
2. Navigate to **Settings** > **Sender Authentication**
3. Click **Get Started** under "Verify a Single Sender"
4. Fill in the sender verification form:
   - **From Name:** Carl Frank (or your preferred name)
   - **From Email Address:** carl.f.frank@gmail.com
   - **Reply To:** carl.f.frank@gmail.com (or cffrank@yahoo.com)
   - **Company Address:** Your address
   - **City:** Your city
   - **State:** Your state
   - **Zip Code:** Your zip code
   - **Country:** United States (or your country)
   - **Nickname:** JobMatch AI Sender
5. Click **Create**
6. Check your inbox (carl.f.frank@gmail.com) for verification email
7. Click the verification link in the email
8. You should see "Verified" status in SendGrid dashboard

**Verification Status:** You can check status at Settings > Sender Authentication > Single Sender Verification

---

## Step 3: Create SendGrid API Key

1. In SendGrid Dashboard, navigate to **Settings** > **API Keys**
2. Click **Create API Key** button (top right)
3. API Key Configuration:
   - **API Key Name:** `JobMatch AI Email Sending`
   - **API Key Permissions:** Select **Restricted Access**
     - Expand **Mail Send** section
     - Enable **Mail Send** (Full Access)
     - Leave all other permissions disabled (principle of least privilege)
4. Click **Create & View**
5. **CRITICAL:** Copy the API key immediately
   - Format: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - This is the ONLY time you'll see this key
   - Store it temporarily in a secure location (password manager)

**Security Note:** Never commit this API key to version control or share it publicly.

---

## Step 4: Configure Firebase Secret

Now we'll securely store the SendGrid API key in Firebase.

### Option A: Using Firebase CLI (Recommended)

```bash
# Navigate to project directory
cd /home/carl/application-tracking/jobmatch-ai

# Set the SendGrid API key as a Firebase secret
firebase functions:secrets:set SENDGRID_API_KEY --project ai-career-os-139db

# When prompted, paste your SendGrid API key
# Press Enter
```

**Expected Output:**
```
? Enter a value for SENDGRID_API_KEY [input is hidden]
✔ Created a new secret version projects/529057497050/secrets/SENDGRID_API_KEY/versions/1
```

### Option B: Using Firebase Console

If the CLI method doesn't work:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **AI Career OS (ai-career-os-139db)**
3. Navigate to **Functions** > **Configuration** (or **Settings**)
4. Click **Add Secret**
5. Secret name: `SENDGRID_API_KEY`
6. Secret value: Paste your SendGrid API key
7. Click **Save**

### Verify Secret is Set

```bash
# List all secrets
firebase functions:secrets:access SENDGRID_API_KEY --project ai-career-os-139db

# Should output your API key (verify it matches)
```

---

## Step 5: Deploy Email Function

The function is already referenced in `/home/carl/application-tracking/jobmatch-ai/functions/index.js` and will be deployed via CI/CD.

### Automatic Deployment (Recommended)

The function will deploy automatically when you push to `main` branch:

```bash
# Stage changes (if any)
git add .

# Commit
git commit -m "Configure SendGrid email integration"

# Push to main (triggers CI/CD)
git push origin main
```

**CI/CD Pipeline:** The GitHub Actions workflow at `.github/workflows/firebase-deploy.yml` will:
1. Build and test the application
2. Deploy Firestore rules and indexes
3. Deploy Storage rules
4. Install function dependencies
5. Deploy Cloud Functions (including `sendApplicationEmail`)
6. Deploy Frontend to Firebase Hosting

**Monitor Deployment:**
- Go to GitHub repository > Actions tab
- Watch the "Deploy to Firebase" workflow
- Deployment takes ~5-10 minutes

### Manual Deployment (Alternative)

If you need to deploy immediately without pushing to git:

```bash
cd /home/carl/application-tracking/jobmatch-ai/functions

# Install dependencies
npm ci

# Deploy only the email function
firebase deploy --only functions:sendApplicationEmail --project ai-career-os-139db
```

**Expected Output:**
```
=== Deploying to 'ai-career-os-139db'...

i  deploying functions
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
i  functions: ensuring required API cloudbuild.googleapis.com is enabled...
✔  functions: required API cloudbuild.googleapis.com is enabled
✔  functions: required API cloudfunctions.googleapis.com is enabled
i  functions: preparing codebase default for deployment
i  functions: preparing functions directory for uploading...
i  functions: packaged /home/carl/application-tracking/jobmatch-ai/functions (XX.X MB) for uploading
✔  functions: functions folder uploaded successfully
i  functions: creating Node.js 20 function sendApplicationEmail(us-central1)...
✔  functions[sendApplicationEmail(us-central1)] Successful create operation.
Function URL (sendApplicationEmail(us-central1)): https://us-central1-ai-career-os-139db.cloudfunctions.net/sendApplicationEmail

✔  Deploy complete!
```

---

## Step 6: Test Email Functionality

### Prerequisites
- Frontend deployed and accessible at: https://ai-career-os-139db.web.app
- User account created (use test user: john@example.com or create new)
- At least one application generated

### Testing Steps

1. **Log in to the application:**
   - Navigate to https://ai-career-os-139db.web.app
   - Log in with your test account

2. **Navigate to an application:**
   - Go to Applications page
   - Select or create a new application
   - Wait for application generation to complete

3. **Open Email Dialog:**
   - Click the "Email" button in the application editor
   - Email dialog should appear

4. **Send test email:**
   - Recipient email defaults to: `carl.f.frank@gmail.com`
   - Or enter a different email address
   - Click "Send Application"
   - Wait for loading state to complete

5. **Verify success:**
   - Success toast should appear: "Email sent successfully!"
   - Dialog should close
   - Check recipient inbox (carl.f.frank@gmail.com)

6. **Check email content:**
   - **Subject:** Application for [Job Title] at [Company]
   - **From:** carl.f.frank@gmail.com
   - **Reply-To:** User's email (e.g., cffrank@yahoo.com)
   - **Body:** Professional HTML with cover letter, resume, signature
   - **Footer:** "Sent via JobMatch AI - Application Tracking System"

### Expected Delivery Time
- Email should arrive within 1-2 minutes
- Check spam/junk folder if not in inbox

### Test Rate Limiting

To verify rate limiting works correctly:

1. Send 10 emails within an hour
2. Attempt to send the 11th email
3. Should see error: "Rate limit exceeded. You can send 10 emails per hour. Please try again later."
4. Wait 1 hour from the first email
5. Rate limit should reset

---

## Step 7: Verify Email History in Firestore

Email history is automatically tracked in Firestore.

### Check via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select **AI Career OS** project
3. Navigate to **Firestore Database**
4. Browse to:
   ```
   users/{userId}/applications/{applicationId}/emails/{emailId}
   ```
5. Verify email record contains:
   - `recipientEmail`
   - `subject`
   - `body`
   - `sentAt` (timestamp)
   - `status: 'sent'`
   - `fromEmail`
   - `fromName`

### Check Rate Limiting Collection

1. In Firestore, browse to:
   ```
   users/{userId}/emails/{emailId}
   ```
2. Should see records with:
   - `applicationId`
   - `recipientEmail`
   - `sentAt` (timestamp)

---

## Troubleshooting

### Error: "SendGrid API key is not configured"

**Cause:** Firebase secret not set or not accessible by function

**Solutions:**
1. Verify secret exists:
   ```bash
   firebase functions:secrets:access SENDGRID_API_KEY --project ai-career-os-139db
   ```
2. Re-set the secret:
   ```bash
   firebase functions:secrets:set SENDGRID_API_KEY --project ai-career-os-139db
   ```
3. Redeploy function:
   ```bash
   firebase deploy --only functions:sendApplicationEmail --project ai-career-os-139db
   ```

### Error: "The from address does not match a verified Sender Identity"

**Cause:** Sender email (carl.f.frank@gmail.com) not verified in SendGrid

**Solutions:**
1. Go to SendGrid > Settings > Sender Authentication
2. Verify status shows "Verified" for carl.f.frank@gmail.com
3. If not verified, resend verification email
4. Check spam folder for verification email
5. Click verification link

### Email Not Received

**Possible Causes:**
1. Check spam/junk folder
2. Check SendGrid Activity dashboard for delivery status
3. Verify recipient email address is correct
4. Ensure SendGrid account is active (not suspended)

**Check SendGrid Activity:**
1. Go to SendGrid Dashboard
2. Navigate to **Activity**
3. Find your email in the list
4. Check status:
   - **Delivered:** Email sent successfully
   - **Bounced:** Invalid recipient email
   - **Dropped:** SendGrid blocked the email (check reason)
   - **Deferred:** Temporary delivery issue (will retry)

### Rate Limit Exceeded

**Error Message:** "Rate limit exceeded. You can send 10 emails per hour. Please try again later."

**Cause:** User has sent 10 emails in the past hour

**Solutions:**
1. Wait 1 hour from the first email sent
2. Rate limit will reset automatically
3. Or increase rate limit in code (not recommended for production):
   - Edit `/home/carl/application-tracking/jobmatch-ai/functions/index.js`
   - Change `RATE_LIMIT_MAX_EMAILS = 10` to higher value (line 1179)
   - Redeploy function

### Function Timeout

**Error:** Function timed out (60 seconds)

**Solutions:**
1. Check SendGrid API status: https://status.sendgrid.com/
2. Increase timeout in function config (lines 1307-1309):
   ```javascript
   {
     secrets: ['SENDGRID_API_KEY'],
     timeoutSeconds: 120, // Increase from 60 to 120
     memory: '256MiB'
   }
   ```
3. Redeploy function

### SendGrid API Error Codes

Common SendGrid errors:

- **401 Unauthorized:** Invalid API key
- **403 Forbidden:** API key doesn't have Mail Send permission
- **413 Payload Too Large:** Email content exceeds size limit
- **429 Too Many Requests:** SendGrid rate limit exceeded (100/day on free tier)
- **500 Server Error:** SendGrid internal error (retry)

---

## Monitoring and Analytics

### Firebase Functions Logs

View function execution logs:

```bash
# Real-time logs
firebase functions:log --project ai-career-os-139db

# Filter for sendApplicationEmail
firebase functions:log --only sendApplicationEmail --project ai-career-os-139db

# Last 100 lines
firebase functions:log --project ai-career-os-139db -n 100
```

**Or via Firebase Console:**
1. Go to Firebase Console > Functions
2. Click `sendApplicationEmail`
3. Click "Logs" tab
4. View execution logs, errors, and performance metrics

### SendGrid Dashboard Analytics

Monitor email performance:

1. **Activity Feed:**
   - Settings > Activity
   - Real-time email delivery status
   - Filter by date, status, recipient

2. **Statistics:**
   - Dashboard > Stats
   - Open rates, click rates, bounce rates
   - Delivery statistics over time

3. **Email Validation:**
   - Marketing > Sender Authentication
   - Monitor sender reputation

### Firestore Monitoring

Track email usage:

```javascript
// Query user's email history
db.collection('users').doc(userId)
  .collection('emails')
  .orderBy('sentAt', 'desc')
  .limit(10)
  .get()
```

---

## Security Best Practices

### API Key Security

✅ **DO:**
- Store API key in Firebase Secrets (never in code)
- Use Restricted Access API key with minimum permissions
- Rotate API key periodically (every 90 days)
- Revoke API key immediately if compromised

❌ **DON'T:**
- Commit API key to version control
- Share API key in emails or chat
- Use Full Access API key (use Restricted Access)
- Log API key in function logs

### Rate Limiting

Current limits:
- **Per User:** 10 emails/hour
- **SendGrid Free Tier:** 100 emails/day total
- **Firebase Functions:** 2M invocations/month

**Monitor usage:**
- Check Firestore `users/{userId}/emails` collection
- Monitor SendGrid Activity dashboard
- Set up alerts for approaching limits

### Content Validation

All email content is sanitized:
- HTML entities escaped (prevents XSS)
- Email addresses validated (RFC 5322 format)
- Application IDs validated (Firestore ID format)
- User authentication required

---

## Cost Analysis

### SendGrid Free Tier
- **Emails:** 100/day permanently free
- **No credit card required**
- **Includes:** Email validation, click/open tracking, activity feed
- **Upgrade:** $19.95/month for 50,000 emails/month

### Firebase Cloud Functions
- **Free Tier:** 2M invocations/month
- **Each email:** 1 invocation
- **Typical cost:** $0 (stays within free tier)
- **Compute time:** ~1 second per email
- **Memory:** 256 MiB allocated

### Firestore Writes
Per email sent:
- 1 write to `applications/{appId}/emails/{emailId}`
- 1 write to `users/{userId}/emails/{emailId}`
- 1 write to `applications/{appId}` (timestamp update)
- **Total:** 3 writes per email

**Free Tier:** 20,000 writes/day

### Total Cost Estimate
For 100 emails/day:
- SendGrid: $0
- Cloud Functions: $0
- Firestore: $0
- **Total: $0/month** (within free tiers)

---

## Deployment Checklist

Use this checklist to verify setup:

### SendGrid Configuration
- [ ] SendGrid account created
- [ ] Email address verified (carl.f.frank@gmail.com shows "Verified")
- [ ] API key created with Mail Send permission
- [ ] API key copied and stored securely

### Firebase Configuration
- [ ] Firebase secret `SENDGRID_API_KEY` set
- [ ] Secret verified with `firebase functions:secrets:access`
- [ ] Function references secret in config (line 1307)

### Deployment
- [ ] Function code reviewed (no security issues)
- [ ] Function deployed via CI/CD or manual deployment
- [ ] Deployment completed successfully
- [ ] Function appears in Firebase Console

### Testing
- [ ] Test email sent successfully
- [ ] Email received in inbox (carl.f.frank@gmail.com)
- [ ] Email content correct (cover letter + resume)
- [ ] Reply-to set correctly
- [ ] Email history saved in Firestore
- [ ] Rate limiting tested (10 emails/hour)

### Monitoring
- [ ] Firebase Functions logs accessible
- [ ] SendGrid Activity dashboard shows delivery
- [ ] Firestore email history visible
- [ ] No errors in console

---

## Next Steps After Setup

Once SendGrid is configured and tested:

1. **Update Documentation:**
   - Mark email feature as complete in project README
   - Document any customizations made

2. **User Training:**
   - Create user guide for sending applications via email
   - Document rate limits and best practices

3. **Monitoring Setup:**
   - Set up email alerts for function errors
   - Monitor SendGrid daily usage
   - Track email delivery rates

4. **Future Enhancements:**
   - PDF attachments (export + attach to email)
   - Custom email templates
   - Email scheduling
   - Bulk sending to multiple recipients
   - Advanced analytics and tracking

---

## Support and Resources

### SendGrid Documentation
- **Getting Started:** https://docs.sendgrid.com/for-developers/sending-email
- **API Reference:** https://docs.sendgrid.com/api-reference/mail-send/mail-send
- **Sender Authentication:** https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication

### Firebase Documentation
- **Cloud Functions Secrets:** https://firebase.google.com/docs/functions/config-env#secret-manager
- **Cloud Functions:** https://firebase.google.com/docs/functions
- **Firestore:** https://firebase.google.com/docs/firestore

### Project Files
- **Function Implementation:** `/home/carl/application-tracking/jobmatch-ai/functions/index.js` (lines 1305-1577)
- **Validation Module:** `/home/carl/application-tracking/jobmatch-ai/functions/lib/validation.js`
- **Rate Limiter:** `/home/carl/application-tracking/jobmatch-ai/functions/lib/rateLimiter.js`
- **Email Dialog:** `/home/carl/application-tracking/jobmatch-ai/src/components/EmailDialog.tsx`

### Contact
For issues or questions:
1. Check Firebase Functions logs
2. Check SendGrid Activity dashboard
3. Review error messages in browser console
4. Consult troubleshooting section above

---

## Summary

**Implementation Status:** ✅ Complete

The SendGrid email integration is fully implemented and production-ready. The only remaining steps are:

1. Create SendGrid account
2. Verify sender email (carl.f.frank@gmail.com)
3. Create and configure API key
4. Set Firebase secret
5. Deploy function (automatic via CI/CD)
6. Test email sending

Estimated setup time: **15-20 minutes**

Once configured, users will be able to send professional job applications via email directly from the JobMatch AI application, with automatic tracking, rate limiting, and security features.
