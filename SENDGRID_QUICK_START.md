# SendGrid Quick Start Guide

## 5-Minute Setup

### Step 1: Create SendGrid Account (2 minutes)
1. Go to https://sendgrid.com/
2. Sign up with carl.f.frank@gmail.com
3. Verify your email

### Step 2: Verify Sender Email (2 minutes)
1. Login to SendGrid Dashboard
2. Go to **Settings > Sender Authentication**
3. Click **Verify a Single Sender**
4. Enter:
   - From Email: **carl.f.frank@gmail.com**
   - From Name: **Carl Frank**
5. Check email and click verification link

### Step 3: Create API Key (1 minute)
1. Go to **Settings > API Keys**
2. Click **Create API Key**
3. Name: **JobMatch AI Email Sending**
4. Permissions: **Restricted Access > Mail Send** (Full Access)
5. Copy the API key (starts with `SG.`)

### Step 4: Set Firebase Secret (1 minute)
```bash
cd /home/carl/application-tracking/jobmatch-ai
firebase functions:secrets:set SENDGRID_API_KEY --project ai-career-os-139db
# Paste API key when prompted
```

### Step 5: Deploy Function
Function deploys automatically when you push to main:
```bash
git add .
git commit -m "Configure SendGrid integration"
git push origin main
```

Or deploy manually:
```bash
cd functions
npm ci
firebase deploy --only functions:sendApplicationEmail --project ai-career-os-139db
```

### Step 6: Test Email
1. Go to https://ai-career-os-139db.web.app
2. Open an application
3. Click "Email" button
4. Send to carl.f.frank@gmail.com
5. Check inbox

---

## Verification Checklist

- [ ] SendGrid account created
- [ ] Sender email verified (shows "Verified" in dashboard)
- [ ] API key created and copied
- [ ] Firebase secret set (`SENDGRID_API_KEY`)
- [ ] Function deployed successfully
- [ ] Test email sent and received

---

## Troubleshooting

**"SendGrid API key is not configured"**
```bash
firebase functions:secrets:set SENDGRID_API_KEY --project ai-career-os-139db
firebase deploy --only functions:sendApplicationEmail --project ai-career-os-139db
```

**"The from address does not match a verified Sender Identity"**
- Verify carl.f.frank@gmail.com in SendGrid: Settings > Sender Authentication

**Email not received**
- Check spam folder
- Check SendGrid Activity dashboard for delivery status

---

## Key Information

**SendGrid Free Tier:** 100 emails/day (permanently free)

**Rate Limit:** 10 emails/hour per user

**Sender Email:** carl.f.frank@gmail.com (must be verified)

**Function Name:** `sendApplicationEmail`

**Firestore Path:** `users/{userId}/applications/{appId}/emails/{emailId}`

---

## Links

- SendGrid Dashboard: https://app.sendgrid.com/
- Firebase Console: https://console.firebase.google.com/project/ai-career-os-139db
- Application URL: https://ai-career-os-139db.web.app
- Full Guide: See SENDGRID_SETUP_GUIDE.md

---

**Total Setup Time:** 5-10 minutes

**Status:** Ready to deploy
