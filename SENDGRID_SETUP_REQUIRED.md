# SendGrid Setup Required for Email Functionality

## Current Status

✅ **PDF/DOCX Export**: Deployed and ready to test
⏳ **Email Functionality**: Requires SendGrid API key configuration

## What's Complete

The email functionality has been fully implemented:
- `sendApplicationEmail` Cloud Function created
- Email dialog component created
- UI integration complete
- Rate limiting implemented (10 emails/hour)
- Professional HTML email templates
- Email history tracking in Firestore

## What's Needed

To enable email sending, you need to:

### Step 1: Create SendGrid Account

1. Go to [SendGrid](https://sendgrid.com/)
2. Sign up for a free account (100 emails/day free tier)
3. Verify your email address

### Step 2: Verify Sender Email

1. Log in to SendGrid
2. Go to **Settings** > **Sender Authentication**
3. Click **Verify a Single Sender**
4. Enter **carl.f.frank@gmail.com** as the sender email
5. Fill in the form with your details
6. Check carl.f.frank@gmail.com inbox for verification email
7. Click the verification link

This step is **REQUIRED** - SendGrid will not send emails from unverified addresses.

### Step 3: Create API Key

1. In SendGrid, go to **Settings** > **API Keys**
2. Click **Create API Key**
3. Name it: "JobMatch AI Email Sending"
4. Permissions: Select **Full Access** (or at minimum **Mail Send**)
5. Click **Create & View**
6. **IMPORTANT**: Copy the API key immediately (you won't see it again!)
   - Format: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 4: Set Firebase Secret

In your terminal:

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Set the SendGrid API key as a Firebase secret
firebase functions:secrets:set SENDGRID_API_KEY

# When prompted, paste your SendGrid API key
```

Enter the API key you copied from SendGrid when prompted.

### Step 5: Deploy Email Function

```bash
# Deploy the email function
firebase deploy --only functions:sendApplicationEmail
```

This will deploy the email functionality with the configured API key.

### Step 6: Test Email Functionality

1. Navigate to one of John Frank's applications in the app
2. Click the **Email** button
3. Enter recipient email: `carl.f.frank@gmail.com`
4. Click **Send Application**
5. Wait for confirmation
6. Check carl.f.frank@gmail.com inbox for the email

## Verification Checklist

After completing the steps above:

- [ ] SendGrid account created
- [ ] Sender email carl.f.frank@gmail.com verified in SendGrid
- [ ] API key created in SendGrid
- [ ] API key set as Firebase secret
- [ ] Email function deployed successfully
- [ ] Test email sent successfully
- [ ] Email received in carl.f.frank@gmail.com

## Email Format

When working, emails will include:

**Subject**: Application for [Job Title] at [Company]

**Body**:
- Professional cover letter (full text, formatted with paragraphs)
- Complete resume with:
  - Professional Summary
  - Work Experience (with bullet points)
  - Skills
  - Education
- Applicant signature with contact information

**From**: carl.f.frank@gmail.com (verified sender)
**Reply-To**: User's email address (e.g., cffrank@yahoo.com)

## Rate Limiting

- Maximum 10 emails per hour per user
- Tracked in Firestore `users/{userId}/emails` collection
- Error shown if limit exceeded: "Rate limit exceeded. You can send 10 emails per hour. Please try again later."

## Cost

**SendGrid Free Tier:**
- 100 emails/day
- Sufficient for testing and light personal use
- Upgrade to paid plan if you need more

## Troubleshooting

### "SendGrid API key is not configured"
**Solution**: Run `firebase functions:secrets:set SENDGRID_API_KEY` and redeploy

### "The from address does not match a verified Sender Identity"
**Solution**: Verify carl.f.frank@gmail.com in SendGrid console under Settings > Sender Authentication

### Email not received
**Check**:
- Spam/junk folder
- SendGrid Activity dashboard for delivery status
- Ensure SendGrid account is not suspended
- Verify recipient email is correct

### Rate limit exceeded
**Solution**: Wait 1 hour from first email sent, or increase rate limit in `functions/index.js` (line 537: `RATE_LIMIT_MAX_EMAILS`)

## Quick Reference

**SendGrid Dashboard**: https://app.sendgrid.com/
**Email Activity**: Settings > Activity > Monitor delivery status
**API Keys**: Settings > API Keys > Manage API keys
**Sender Auth**: Settings > Sender Authentication > Verify senders

## Status After Setup

Once SendGrid is configured:

✅ PDF/DOCX Export: Working
✅ Email Functionality: Working
✅ Full workflow: Complete

---

**Next Steps After This Setup:**
1. Complete SendGrid setup (Steps 1-5 above)
2. Test email sending (Step 6)
3. Test PDF/DOCX export (already deployed)
4. All original requirements will be complete

