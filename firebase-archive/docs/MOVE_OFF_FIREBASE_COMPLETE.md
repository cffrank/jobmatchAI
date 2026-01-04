# Complete Firebase to Supabase + Railway Migration Plan

**Goal:** Move OFF Firebase completely to Supabase + Railway architecture
**Status:** Ready to Execute
**Estimated Time:** 2-4 hours

---

## Target Architecture

### Current (Firebase - DEPRECATED)
```
Frontend: Firebase Hosting ❌
Backend: Firebase Cloud Functions ❌
Database: Firestore ❌
Auth: Firebase Auth ❌
Storage: Firebase Storage ❌
```

### Target (Supabase + Railway)
```
Frontend: Vercel (FREE) ✅
Backend: Railway Express.js ($5-10/month) ✅
Database: Supabase PostgreSQL ✅
Auth: Supabase Auth ✅
Storage: Supabase Storage ✅
```

**Cost Savings:** $40-95/month

---

## Phase 1: Deploy Railway Backend (1 hour)

### Step 1.1: Configure Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway init

# Link to existing project (if you already created one)
railway link
```

### Step 1.2: Set Environment Variables in Railway

```bash
# Navigate to Railway Dashboard
# Settings → Variables → Add all:

OPENAI_API_KEY=sk-...
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@jobmatch.ai
APIFY_API_KEY=apify_api_...
LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-client-secret
SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3000
NODE_ENV=production
```

### Step 1.3: Deploy Railway Backend

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Option A: Deploy from backend directory
cd backend
railway up

# Option B: Use Railway GitHub integration (recommended)
# 1. Push backend code to GitHub
# 2. Connect Railway to GitHub repo
# 3. Set root directory to "backend"
# 4. Railway auto-deploys on push
```

### Step 1.4: Verify Railway Deployment

```bash
# Get Railway URL
railway domain

# Test endpoints
curl https://your-app.railway.app/health
```

**Expected Backend URL:** `https://jobmatch-backend-production.railway.app`

---

## Phase 2: Deploy Frontend to Vercel (30 minutes)

### Step 2.1: Install Vercel CLI

```bash
npm install -g vercel
vercel login
```

### Step 2.2: Configure Environment Variables

Create `.env.production`:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Railway Backend URL
VITE_BACKEND_URL=https://jobmatch-backend-production.railway.app

# Remove all Firebase variables (no longer needed)
# VITE_FIREBASE_API_KEY=   ← DELETE
# VITE_FIREBASE_AUTH_DOMAIN=   ← DELETE
# etc.
```

### Step 2.3: Deploy to Vercel

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Build frontend
npm run build

# Deploy to Vercel
vercel --prod

# Or connect GitHub for auto-deploy
vercel --prod --github
```

**Expected Frontend URL:** `https://jobmatch-ai.vercel.app`

### Step 2.4: Update Vercel Environment Variables

```bash
# In Vercel Dashboard → Settings → Environment Variables
# Add all variables from .env.production

# Or via CLI
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_BACKEND_URL production
```

---

## Phase 3: Update Frontend Code (1 hour)

### Step 3.1: Remove Firebase Dependencies

```bash
# Remove Firebase packages
npm uninstall firebase firebase-admin firebase-functions

# Remove Firebase SDK files
rm src/lib/firebase.ts

# Remove Firebase Cloud Functions directory
rm -rf functions/
```

### Step 3.2: Update API Calls to Railway Backend

**Before (Firebase Cloud Functions):**
```typescript
import { httpsCallable } from 'firebase/functions'
const generateApp = httpsCallable(functions, 'generateApplication')
```

**After (Railway Backend):**
```typescript
const backendUrl = import.meta.env.VITE_BACKEND_URL
const response = await fetch(`${backendUrl}/api/applications/generate`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  },
  body: JSON.stringify({ jobId, userId })
})
```

### Step 3.3: Update Remaining 7 Files

Files still using Firebase (from migration report):

1. ✅ `src/hooks/useRateLimit.ts` - DONE
2. ✅ `src/lib/aiGenerator.ts` - DONE
3. ✅ `src/hooks/useJobScraping.ts` - DONE
4. ❌ `src/sections/profile-resume-management/components/EditProfileForm.tsx`
5. ❌ `src/sections/application-generator/ApplicationEditorPage.tsx`
6. ❌ `src/lib/exportApplication.ts`
7. ❌ `src/hooks/useSubscription.ts`
8. ❌ `src/hooks/useResumeExport.ts`
9. ❌ `src/hooks/useLinkedInAuth.ts`

**Action:** Update these 6 files to call Railway backend instead of Firebase.

---

## Phase 4: Migrate Legacy Data (30 minutes)

### Step 4.1: Migrate Subscription Data from Firestore to Supabase

```bash
# Create migration script
cat > scripts/migrate-firestore-to-supabase.ts << 'EOF'
// Script to copy Firestore subscription data to Supabase
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function migrateSubscriptions() {
  const firestore = getFirestore()
  const users = await firestore.collection('users').get()

  for (const user of users.docs) {
    const userId = user.id

    // Migrate subscription
    const subDoc = await firestore
      .collection('users')
      .doc(userId)
      .collection('subscription')
      .doc('current')
      .get()

    if (subDoc.exists) {
      await supabase.from('subscriptions').insert({
        user_id: userId,
        ...subDoc.data()
      })
    }

    // Migrate invoices
    const invoices = await firestore
      .collection('users')
      .doc(userId)
      .collection('invoices')
      .get()

    for (const invoice of invoices.docs) {
      await supabase.from('invoices').insert({
        user_id: userId,
        ...invoice.data()
      })
    }
  }
}

migrateSubscriptions()
EOF

# Run migration
npx tsx scripts/migrate-firestore-to-supabase.ts
```

### Step 4.2: Migrate Legacy Files from Firebase Storage to Supabase

```bash
# Create storage migration script
cat > scripts/migrate-firebase-storage.ts << 'EOF'
// Script to copy files from Firebase Storage to Supabase Storage
import { getStorage } from 'firebase-admin/storage'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function migrateStorage() {
  const bucket = getStorage().bucket()
  const [files] = await bucket.getFiles({ prefix: 'users/' })

  for (const file of files) {
    const [content] = await file.download()
    const path = file.name

    await supabase.storage
      .from('user-files')
      .upload(path, content, {
        contentType: file.metadata.contentType
      })

    console.log(`Migrated: ${path}`)
  }
}

migrateStorage()
EOF

# Run migration
npx tsx scripts/migrate-firebase-storage.ts
```

---

## Phase 5: Decommission Firebase (15 minutes)

### Step 5.1: Verify Everything Works

**Frontend Checklist:**
- [ ] Sign up new user (Supabase Auth)
- [ ] Sign in existing user
- [ ] Upload profile photo (Supabase Storage)
- [ ] Generate AI application (Railway backend)
- [ ] Scrape jobs (Railway backend)
- [ ] Send email (Railway backend)
- [ ] LinkedIn OAuth (Railway backend)
- [ ] No Firebase errors in console

### Step 5.2: Delete Firebase Configuration

```bash
# Remove Firebase config files
rm firebase.json
rm .firebaserc
rm firestore.rules
rm firestore.indexes.json
rm storage.rules

# Remove Firebase from .gitignore
# Remove Firebase-specific entries
```

### Step 5.3: Clean Up Documentation

```bash
# Delete all Firebase-related docs
rm FIREBASE_*.md
rm DEPLOYMENT.md
rm PRE_DEPLOYMENT_CHECKLIST.md
rm docs/PHASE3-DEPLOYMENT.md
rm FUNCTIONS_ENV_CONFIG.md

# Keep only:
# - MOVE_OFF_FIREBASE_COMPLETE.md (this file)
# - Railway deployment docs
# - Supabase migration docs
```

### Step 5.4: Decommission Firebase Project (Optional)

**WARNING:** Only do this after 30 days of stable operation on new stack.

```bash
# Download final backup of Firestore data
gcloud firestore export gs://ai-career-os-139db-backup

# Download final backup of Storage files
gsutil -m cp -r gs://ai-career-os-139db.appspot.com ./firebase-backup

# Delete Firebase project (in Firebase Console)
# Settings → General → Delete Project
```

---

## Phase 6: Set Up Monitoring (30 minutes)

### Step 6.1: Railway Monitoring

```bash
# In Railway Dashboard:
# 1. Enable monitoring metrics
# 2. Set up alerts for:
#    - High CPU usage (> 80%)
#    - High memory usage (> 80%)
#    - Error rate (> 5%)
#    - Response time (> 2s)
```

### Step 6.2: Supabase Monitoring

```bash
# In Supabase Dashboard:
# 1. Monitor database performance
# 2. Set up alerts for:
#    - Database size (approaching limits)
#    - Connection pool exhaustion
#    - Slow queries (> 1s)
```

### Step 6.3: Vercel Monitoring

```bash
# In Vercel Dashboard:
# 1. Enable Web Analytics
# 2. Monitor:
#    - Page load times
#    - Error rates
#    - Traffic patterns
```

---

## Cost Breakdown (New Architecture)

| Service | Monthly Cost | Notes |
|---------|--------------|-------|
| **Vercel** (Frontend) | $0 | Free tier (100GB bandwidth) |
| **Railway** (Backend) | $5-10 | Pay-as-you-go (first $5 free) |
| **Supabase** (Database/Auth/Storage) | $25 | Pro plan (8GB DB, 100GB bandwidth) |
| **OpenAI API** | $10-30 | GPT-4o-mini usage-based |
| **SendGrid** | $0-15 | Free tier (100 emails/day) |
| **Apify** | $0-10 | Free tier (some usage) |
| **Total** | **$40-90/month** | |

**Compared to Firebase:** $85-125/month
**Savings:** $45-85/month ($540-1020/year)

---

## Rollback Plan

If something goes wrong, you can rollback:

### Quick Rollback (< 5 minutes)

```bash
# Revert frontend to Firebase Hosting
git checkout HEAD~1 src/
npm run build
firebase deploy --only hosting

# Firebase Cloud Functions are still running
# Users will use old Firebase backend temporarily
```

### Complete Rollback (< 30 minutes)

```bash
# 1. Revert all code changes
git revert HEAD

# 2. Redeploy to Firebase
npm run build
firebase deploy

# 3. Restore Firebase environment variables
# Copy from .env.local.backup

# 4. Pause Railway deployment
railway down
```

---

## Success Criteria

Migration is successful when:

- ✅ Frontend deployed on Vercel and accessible
- ✅ Railway backend responding to all API calls
- ✅ Supabase database has all user data
- ✅ All authentication flows work (email, Google, LinkedIn)
- ✅ File uploads work (Supabase Storage)
- ✅ AI generation works (Railway → OpenAI)
- ✅ Job scraping works (Railway → Apify)
- ✅ Email sending works (Railway → SendGrid)
- ✅ No Firebase SDK imports in code
- ✅ No Firebase costs on billing statement
- ✅ Zero errors in production for 48 hours

---

## Next Steps

**Ready to execute this migration?**

### Quick Start Commands

```bash
# 1. Deploy Railway Backend
cd backend
railway login
railway init
railway up

# 2. Deploy Frontend to Vercel
cd ..
vercel login
vercel --prod

# 3. Update frontend code to call Railway
# (See Phase 3 above)

# 4. Test everything
# (See verification checklist)

# 5. Decommission Firebase
# (After 30 days of stable operation)
```

**Estimated Total Time:** 2-4 hours
**Risk Level:** LOW (Firebase still works as fallback)
**Recommended Day:** Weekend (low traffic)

---

## Questions or Issues?

**Railway Support:**
- Dashboard: https://railway.app/dashboard
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway

**Vercel Support:**
- Dashboard: https://vercel.com/dashboard
- Docs: https://vercel.com/docs
- Discord: https://vercel.com/discord

**Supabase Support:**
- Dashboard: https://supabase.com/dashboard
- Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com

---

**Status:** Ready to Execute
**Created:** December 20, 2025
**Target:** Supabase + Railway + Vercel
**Goodbye:** Firebase 👋
