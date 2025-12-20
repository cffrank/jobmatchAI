# Firebase Deployment - Quick Reference

This is a quick reference card for deploying JobMatch AI to Firebase. For detailed explanations, see `DEPLOYMENT.md`.

---

## Prerequisites Checklist

- [ ] Firebase CLI installed: `npm install -g firebase-tools`
- [ ] Logged in: `firebase login`
- [ ] Project selected: `firebase use ai-career-os-139db`
- [ ] OpenAI API key obtained
- [ ] GitHub secrets configured (for CI/CD)

---

## One-Time Setup

### 1. Set OpenAI API Key

```bash
firebase functions:secrets:set OPENAI_API_KEY
# Paste your sk-... key when prompted
```

### 2. Verify Configuration

```bash
# Run verification script
chmod +x verify-deployment.sh
./verify-deployment.sh
```

---

## Manual Deployment Commands

### Deploy Everything

```bash
# Install dependencies
npm ci
cd functions && npm ci && cd ..

# Build frontend
npm run build

# Deploy all services
firebase deploy --project ai-career-os-139db
```

### Deploy Specific Services

```bash
# Firestore rules and indexes only
firebase deploy --only firestore

# Storage rules only
firebase deploy --only storage

# Cloud Functions only
firebase deploy --only functions

# Hosting (frontend) only
firebase deploy --only hosting
```

### Deploy Specific Function

```bash
firebase deploy --only functions:generateApplication
```

---

## Automated Deployment (GitHub Actions)

### Setup (One-Time)

1. Add repository secrets in GitHub:
   - Settings > Secrets and variables > Actions
   - Add all 7 secrets (see `GITHUB_SECRETS_SETUP.md`)

2. Push to main branch triggers deployment:
   ```bash
   git push origin main
   ```

### Manual Trigger

```bash
# Trigger workflow manually from GitHub
# Go to: Actions > Deploy to Firebase > Run workflow
```

---

## Verification Commands

### Check Deployment Status

```bash
# Run automated verification
./verify-deployment.sh

# Check hosting
curl https://ai-career-os-139db.web.app

# List deployed functions
firebase functions:list

# List Firestore indexes
firebase firestore:indexes
```

### View Logs

```bash
# All function logs
firebase functions:log

# Specific function logs
firebase functions:log --only generateApplication

# Last 100 lines
firebase functions:log --limit 100

# Real-time logs
firebase functions:log --follow

# Errors only
firebase functions:log --severity ERROR
```

---

## Common Tasks

### Update Firestore Rules

```bash
# Edit firestore.rules file, then:
firebase deploy --only firestore
```

### Update Storage Rules

```bash
# Edit storage.rules file, then:
firebase deploy --only storage
```

### Update Cloud Function

```bash
# Edit functions/index.js, then:
cd functions && npm install  # if dependencies changed
cd ..
firebase deploy --only functions
```

### Rebuild and Redeploy Frontend

```bash
npm run build
firebase deploy --only hosting
```

---

## Emergency Rollback

### Rollback Hosting

```bash
firebase hosting:rollback
```

### Rollback Firestore Rules

```bash
# Restore previous version from Git
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore
git checkout main firestore.rules
```

### Rollback Function

```bash
# Checkout previous commit and redeploy
git log --oneline  # Find last good commit
git checkout <commit-hash>
firebase deploy --only functions
git checkout main
```

---

## Monitoring Commands

### Check Firebase Usage

```bash
# View usage in console
# Firebase Console > Usage and billing

# List projects
firebase projects:list

# Current project info
firebase projects:get ai-career-os-139db
```

### Check Secrets

```bash
# List all secrets
firebase functions:secrets:list

# View secret metadata
firebase functions:secrets:describe OPENAI_API_KEY

# Access secret value (requires permissions)
firebase functions:secrets:access OPENAI_API_KEY
```

### Check Hosting Channels

```bash
# List preview channels
firebase hosting:channel:list

# View channel details
firebase hosting:channel:open <channel-id>
```

---

## Troubleshooting

### Build Fails

```bash
# Check environment variables
cat .env.local

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist
npm run build
```

### Function Deploy Fails

```bash
# Check function dependencies
cd functions
npm install
npm audit fix

# Test function locally
firebase emulators:start --only functions
```

### Permission Errors

```bash
# Re-authenticate
firebase logout
firebase login

# Check project permissions
firebase projects:get ai-career-os-139db
```

### Secret Not Found

```bash
# Set or update secret
firebase functions:secrets:set OPENAI_API_KEY --force

# Verify it's accessible
firebase functions:secrets:access OPENAI_API_KEY

# Redeploy function
firebase deploy --only functions
```

---

## Local Development

### Start Emulators

```bash
# All emulators
firebase emulators:start

# Specific emulators
firebase emulators:start --only firestore,functions,hosting

# With import data
firebase emulators:start --import ./emulator-data
```

### Run App Locally

```bash
# Terminal 1: Start emulators
firebase emulators:start

# Terminal 2: Start dev server
npm run dev
```

---

## Production URLs

- **Hosting:** https://ai-career-os-139db.web.app
- **Firebase Console:** https://console.firebase.google.com/project/ai-career-os-139db
- **Functions Dashboard:** https://console.firebase.google.com/project/ai-career-os-139db/functions
- **Firestore:** https://console.firebase.google.com/project/ai-career-os-139db/firestore
- **Storage:** https://console.firebase.google.com/project/ai-career-os-139db/storage

---

## Important File Locations

```
/home/carl/application-tracking/jobmatch-ai/
├── firestore.rules              # Firestore security rules
├── firestore.indexes.json       # Firestore indexes
├── storage.rules                # Storage security rules
├── firebase.json                # Firebase config
├── .env.local                   # Local environment variables
├── .env.example                 # Environment template
├── functions/
│   ├── index.js                 # Cloud Functions code
│   ├── package.json             # Functions dependencies
│   └── .env                     # Functions local env (optional)
├── .github/workflows/
│   └── firebase-deploy.yml      # CI/CD pipeline
└── verify-deployment.sh         # Verification script
```

---

## Documentation Files

- `DEPLOYMENT.md` - Complete deployment guide
- `PRE_DEPLOYMENT_CHECKLIST.md` - Pre-deployment verification
- `FUNCTIONS_ENV_CONFIG.md` - Functions configuration
- `FIREBASE_APP_CHECK_SETUP.md` - App Check setup
- `DEPLOYMENT_SUMMARY.md` - Configuration summary
- `GITHUB_SECRETS_SETUP.md` - GitHub secrets setup

---

## Support

**For detailed help, see:**
- Full deployment guide: `DEPLOYMENT.md`
- Troubleshooting: `DEPLOYMENT.md` > Troubleshooting section
- Firebase docs: https://firebase.google.com/docs

**Common issues:**
- Missing secrets → Set with `firebase functions:secrets:set`
- Build errors → Check `.env.local` has all variables
- Permission errors → Run `firebase login` again
- Function errors → Check `firebase functions:log`

---

**Quick Start Commands:**

```bash
# First deployment
firebase login
firebase use ai-career-os-139db
firebase functions:secrets:set OPENAI_API_KEY
npm ci && cd functions && npm ci && cd ..
npm run build
firebase deploy
./verify-deployment.sh

# Subsequent deployments
git push origin main  # Uses GitHub Actions
# OR
npm run build && firebase deploy  # Manual
```

---

**Last Updated:** December 19, 2025
