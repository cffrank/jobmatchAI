# Firebase Deployment Checklist

**Project:** JobMatch AI
**Firebase Project ID:** ai-career-os-139db
**Status:** 🔴 Critical issues must be resolved

---

## 🚨 CRITICAL BLOCKER (Do First)

```
Priority: HIGHEST - BLOCKS DEPLOYMENT
Status: 🔴 ACTION REQUIRED
```

### Regenerate Exposed OpenAI Key
- [ ] Go to https://platform.openai.com/api-keys
- [ ] Sign in with your OpenAI account
- [ ] Find and **DELETE** the key: `sk-proj-nCxiSVtt...`
- [ ] **CREATE NEW KEY**
- [ ] Copy new key (format: `sk-proj-xxx`)
- [ ] Store in secure location (NOT in git)
- [ ] Will use in Step 3 below

### Clean Up Exposed Key
- [ ] Delete or move `/home/carl/application-tracking/jobmatch-ai/functions/.env.backup`
  ```bash
  rm functions/.env.backup
  ```
- [ ] Check git history for exposed key
  ```bash
  cd /home/carl/application-tracking/jobmatch-ai
  git log -p -S "sk-proj-" | head -20
  ```
  - If found in recent commits: Rewrite history using BFG Repo-Cleaner
  - Reference: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository

---

## ✅ Obtain Required API Keys

```
Priority: HIGH - REQUIRED FOR DEPLOYMENT
Estimated Time: 30 minutes
```

### 1. OpenAI API Key
**Status:** 🆕 NEW KEY (regenerated from above)
**Source:** https://platform.openai.com/api-keys
**Format:** `sk-proj-...`

**To Get:**
1. Go to https://platform.openai.com/api-keys
2. Click "+ Create new secret key"
3. Copy the key (appears once)
4. Save in secure file: `~/.firebase-secrets/openai-key.txt`

**Verify:**
```bash
# Key should start with sk-proj-
cat ~/.firebase-secrets/openai-key.txt
```

### 2. Apify API Token
**Status:** ❌ NOT YET OBTAINED
**Source:** https://apify.com/
**Format:** Long alphanumeric string

**To Get:**
1. Go to https://apify.com/
2. Sign in (create account if needed - free tier available)
3. Go to: Account → Settings → API tokens
4. Copy your API token
5. Save in secure file: `~/.firebase-secrets/apify-token.txt`

**What It's For:** Scraping LinkedIn and Indeed job listings

**Usage Limits:**
- Free tier: 100 runs/month
- Each job search: 1-2 runs (1 per source)
- Users: 10 searches/hour

**Verify:**
```bash
# Should see API token
cat ~/.firebase-secrets/apify-token.txt
```

### 3. SendGrid API Key
**Status:** ❌ NOT YET OBTAINED
**Source:** https://sendgrid.com/
**Format:** `SG.xxx...` (starts with SG.)

**To Get:**
1. Go to https://sendgrid.com/
2. Sign in (create account if needed - free tier available)
3. Go to: Settings → API Keys
4. Click "Create API Key"
5. Name: "jobmatch-ai-functions"
6. Permissions: Select "Mail Send" (restricted is better)
7. Copy the key (appears once)
8. Save in secure file: `~/.firebase-secrets/sendgrid-key.txt`

**What It's For:** Sending emails from user accounts

**Rate Limits:**
- Per user: 10 emails/hour (enforced in app)
- Account limits depend on SendGrid plan

**Verify:**
```bash
# Should start with SG.
cat ~/.firebase-secrets/sendgrid-key.txt
```

---

## 🔧 Code Updates (Required)

```
Priority: HIGH - BLOCKS PROPER CONFIGURATION
Estimated Time: 30 minutes
```

### Update secureProxy.ts to Use Modern Secrets

**File:** `/home/carl/application-tracking/jobmatch-ai/functions/src/secureProxy.ts`

**Changes Needed:**

At Line 34, update function declaration:
```typescript
// BEFORE:
export const proxyOpenAI = functions.https.onCall(async (data, context) => {

// AFTER:
export const proxyOpenAI = functions.https.onCall(
  {
    secrets: ['OPENAI_API_KEY'],
  },
  async (data, context) => {
```

At Line 48, update secret access:
```typescript
// BEFORE:
const apiKey = functions.config().openai?.key;

// AFTER:
const apiKey = process.env.OPENAI_API_KEY;
```

At Line 115, update proxyJobSearch:
```typescript
// BEFORE:
export const proxyJobSearch = functions.https.onCall(async (data, context) => {

// AFTER:
export const proxyJobSearch = functions.https.onCall(
  {
    secrets: ['APIFY_API_TOKEN'],
  },
  async (data, context) => {
```

At Line 136, update secret access:
```typescript
// BEFORE:
const apiKey = functions.config().apify?.key;

// AFTER:
const apiKey = process.env.APIFY_API_TOKEN;
```

**Verify Changes:**
```bash
cd /home/carl/application-tracking/jobmatch-ai/functions
npm run build
npm run lint
```

---

## 🔐 Configure Secrets in Firebase

```
Priority: HIGH - REQUIRED FOR DEPLOYMENT
Estimated Time: 10 minutes
```

### Authenticate with Firebase
```bash
cd /home/carl/application-tracking/jobmatch-ai

# Check current authentication
firebase login:list
# Should show: Logged in as carl.f.frank@gmail.com

# If not logged in, run:
# firebase login
```

### Set Secrets (Using Legacy Method - For Now)
```bash
# Set all three secrets
firebase functions:config:set \
  openai.key="PASTE_YOUR_OPENAI_KEY_HERE" \
  apify.key="PASTE_YOUR_APIFY_TOKEN_HERE" \
  sendgrid.key="PASTE_YOUR_SENDGRID_KEY_HERE"

# Verify they're set
firebase functions:config:get
```

**Replace with actual values:**
- `PASTE_YOUR_OPENAI_KEY_HERE` → Your new OpenAI key (sk-proj-...)
- `PASTE_YOUR_APIFY_TOKEN_HERE` → Your Apify token
- `PASTE_YOUR_SENDGRID_KEY_HERE` → Your SendGrid key (SG.xxx)

### Verify Configuration
```bash
firebase functions:config:get

# Should output something like:
# {
#   "openai": { "key": "sk-proj-***" },
#   "apify": { "key": "***" },
#   "sendgrid": { "key": "SG.***" }
# }
```

---

## 🏗️ Build & Test

```
Priority: HIGH - BEFORE DEPLOYMENT
Estimated Time: 15 minutes
```

### Build TypeScript
```bash
cd /home/carl/application-tracking/jobmatch-ai
cd functions
npm install  # If not already done
npm run build
cd ..
```

### Lint Code
```bash
cd functions
npm run lint
cd ..
```

### Verify No Hardcoded Secrets
```bash
# These should return NOTHING
grep -r "sk-proj-" functions/lib/
grep -r "SG\." functions/lib/
grep -r "apify" functions/lib/ | grep -v "apiKey" | grep -v "client"
```

### Test Locally (Optional but Recommended)
```bash
# Start emulator
firebase emulators:start --only functions

# In another terminal, test functions
firebase functions:shell

# Then type (example):
# > proxyOpenAI({prompt: "test message"})
```

---

## 🚀 Deploy

```
Priority: HIGHEST - ACTUAL DEPLOYMENT
Estimated Time: 5 minutes
```

### Final Pre-Deployment Check
- [ ] Code changes completed and tested
- [ ] All secrets configured in Firebase
- [ ] Build succeeds without errors
- [ ] Lint passes without errors

### Deploy Functions
```bash
cd /home/carl/application-tracking/jobmatch-ai

# One-line deploy
firebase deploy --only functions

# Or step by step:
# cd functions && npm run build && cd ..
# firebase deploy --only functions
```

### Watch Deployment
```bash
# View deployment progress (will auto-follow)
firebase functions:log --tail

# Wait for "Function deployed successfully" message
```

### Verify Deployment
```bash
# Should see all functions listed
firebase functions:describe

# No errors should appear in logs
firebase functions:log --level=error

# Should be empty or show old errors only
```

---

## ✨ Post-Deployment Verification

```
Priority: HIGH - VALIDATE DEPLOYMENT
Estimated Time: 10 minutes
```

### Check Function Health
```bash
firebase functions:log --tail
# Watch for errors for 1-2 minutes
```

### Test Each Function
Test through your app UI:
- [ ] **proxyOpenAI** - Try AI feature that uses OpenAI
- [ ] **proxyJobSearch** - Try job search with filters
- [ ] **scrapeJobs** - Trigger job scraping (may take a minute)
- [ ] **sendApplicationEmail** - Send a test email
- [ ] **scanUploadedFile** - Upload a resume file

OR test via CLI:
```bash
firebase functions:shell

# Test OpenAI proxy
> proxyOpenAI({
    prompt: "What is JavaScript?",
    model: "gpt-3.5-turbo",
    maxTokens: 100
  })

# Should return with AI response
```

### Monitor API Usage
Check external services are working:

**OpenAI:**
1. Go to https://platform.openai.com/usage/overview
2. Should see recent API calls
3. Check billing to verify charges are as expected

**Apify:**
1. Go to https://apify.com/dashboard/usage
2. Should see recent actor runs
3. Verify usage is within free tier if applicable

**SendGrid:**
1. Go to https://app.sendgrid.com/statistics
2. Should see sent emails
3. Check bounce rates are low

---

## 📊 Setup Monitoring (Recommended)

```
Priority: MEDIUM - OPERATIONAL EXCELLENCE
Estimated Time: 20 minutes
```

### Enable Cloud Logging
```bash
# View all logs in real-time
firebase functions:log --tail

# View error logs only
firebase functions:log --level=error

# View specific function
firebase functions:log --function=scrapeJobs --tail

# Save to file
firebase functions:log > logs.txt
```

### Set Up Alerts (Via Google Cloud Console)
1. Go to https://console.cloud.google.com/functions
2. Select your functions
3. Go to: Monitoring → Uptime checks
4. Create alert for:
   - Error rate > 5%
   - Response time > 30 seconds
   - Execution failures

### Daily Checks
- [ ] Review function logs daily
- [ ] Check API usage dashboards
- [ ] Monitor billing/costs
- [ ] Watch for errors or warnings

---

## 📋 Secrets Maintenance Schedule

```
Ongoing Operations
```

### Monthly
- [ ] Review function logs for errors
- [ ] Check API usage on all services
- [ ] Review billing/cost

### Every 90 Days (Rotation)
- [ ] Regenerate OpenAI API key
  ```bash
  # 1. Create new key at https://platform.openai.com/api-keys
  # 2. Delete old key
  # 3. Update Firebase:
  firebase functions:config:set openai.key="NEW_KEY"
  # 4. Deploy: firebase deploy --only functions
  ```
- [ ] Regenerate Apify token
  ```bash
  # Follow same pattern as above
  ```
- [ ] Regenerate SendGrid key
  ```bash
  # Follow same pattern as above
  ```

### Before March 2026 (Mandatory)
- [ ] Complete migration from `functions.config()` to modern secrets
- [ ] Remove all Runtime Config API usage
- [ ] Test thoroughly
- [ ] Deploy to production

---

## 🐛 Troubleshooting

### Function Fails with "Service configuration error"
**Cause:** Secret not configured
**Solution:**
```bash
# Check configured secrets
firebase functions:config:get

# Set missing secret
firebase functions:config:set openai.key="YOUR_KEY"

# Redeploy
firebase deploy --only functions
```

### Deployment Fails with Type Errors
**Cause:** TypeScript compilation failed
**Solution:**
```bash
cd functions
npm run build
# Fix any errors shown
npm run lint
cd ..
```

### "Cannot find module" errors
**Cause:** Dependencies not installed
**Solution:**
```bash
cd functions
rm -rf node_modules package-lock.json
npm install
npm run build
cd ..
```

### Logs show "Timeout"
**Cause:** Function taking too long
**Solution:**
- Check functions/src for infinite loops
- Increase timeout in function configuration
- Optimize code performance

### Error: "Failed to scrape jobs"
**Cause:** Apify token invalid or actor not found
**Solution:**
```bash
# Verify Apify token works
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.apify.com/v2/users/me

# Check actors exist:
# - https://apify.com/bebity/linkedin-jobs-scraper
# - https://apify.com/misceres/indeed-scraper
```

---

## 📚 Documentation

**Created Files:**
1. **FIREBASE_SECRETS_CONFIGURATION.md** - Complete secrets guide
2. **DEPLOYMENT_READINESS_REPORT.md** - Full assessment and timeline
3. **FIREBASE_DEPLOYMENT_CHECKLIST.md** - This file (quick reference)

**Original Files:**
- `firebase.json` - Firebase configuration
- `functions/package.json` - Function dependencies
- `functions/tsconfig.json` - TypeScript configuration
- `.gitignore` - Git ignore rules (already includes `.env*`)

---

## 📞 Need Help?

**Firebase Issues:**
- Command: `firebase functions:log --tail` - Real-time logs
- Console: https://console.firebase.google.com
- Docs: https://firebase.google.com/docs/functions

**External Services:**
- OpenAI Docs: https://platform.openai.com/docs
- Apify Help: https://apify.com/help
- SendGrid Docs: https://sendgrid.com/docs

---

## Quick Command Reference

```bash
# Navigate to project
cd /home/carl/application-tracking/jobmatch-ai

# Build
cd functions && npm run build && cd ..

# Lint
cd functions && npm run lint && cd ..

# Deploy
firebase deploy --only functions

# View logs
firebase functions:log --tail

# View errors only
firebase functions:log --level=error

# Check config
firebase functions:config:get

# Set secrets
firebase functions:config:set openai.key="KEY" apify.key="TOKEN" sendgrid.key="KEY"

# Test locally
firebase emulators:start --only functions

# Shell testing
firebase functions:shell
```

---

## Sign-Off

**Current Status:** 🔴 NOT READY
**Blockers:** 3 critical issues
**Estimated Time to Ready:** 2-3 hours

**Next Steps:**
1. [ ] Regenerate exposed API key (10 minutes)
2. [ ] Obtain Apify and SendGrid keys (20 minutes)
3. [ ] Update secureProxy.ts code (30 minutes)
4. [ ] Configure secrets in Firebase (10 minutes)
5. [ ] Build and deploy (20 minutes)
6. [ ] Test all functions (15 minutes)

**Total Estimated Time:** 2-3 hours to production-ready

