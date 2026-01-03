# Railway + Supabase Architecture (Final)

**Goal:** Move OFF Firebase completely to Railway (frontend + backend) + Supabase (data layer)
**User Base:** 1,000 monthly active users
**Status:** Ready to Deploy
**Estimated Time:** 2-3 hours

---

## Final Architecture (Off Firebase)

```
┌─────────────────────────────────────────────────┐
│                   RAILWAY                       │
│                                                 │
│  ┌──────────────────┐    ┌─────────────────┐   │
│  │   Frontend       │    │   Backend API   │   │
│  │   (Vite/React)   │───→│   (Express.js)  │   │
│  │   Static files   │    │                 │   │
│  │                  │    │ ✅ AI Gen       │   │
│  │   Port: 3000     │    │ ✅ Job Scrape   │   │
│  └──────────────────┘    │ ✅ Email Send   │   │
│                          │ ✅ OAuth        │   │
│                          │ ✅ PDF Export   │   │
│                          │                 │   │
│                          │ Port: 3001      │   │
│                          └─────────────────┘   │
│                                  │              │
└──────────────────────────────────┼──────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │       SUPABASE           │
                    │                          │
                    │  ✅ PostgreSQL Database  │
                    │  ✅ Authentication       │
                    │  ✅ File Storage         │
                    │  ✅ Real-time            │
                    └──────────────────────────┘
```

---

## Why Railway for Both?

Based on research for 1,000 monthly users:

### Cost Comparison (1,000 MAU)

**Option A: Railway Frontend + Backend (CHOSEN)**
```
Railway Monorepo:
├─ Frontend (static): $0-5/month (minimal resources)
├─ Backend (API):     $10-15/month (actual compute)
└─ Total Railway:     $10-20/month

Supabase:             $25/month (Pro plan)

Total: $35-45/month
```

**Option B: Vercel + Railway**
```
Vercel (frontend):    $0 (free tier)
Railway (backend):    $10-15/month
Supabase:             $25/month

Total: $35-40/month
```

**Why Railway for Frontend?**
1. ✅ **Single platform** - easier to manage
2. ✅ **Single deployment** - frontend + backend together
3. ✅ **No CORS complexity** - same origin
3. ✅ **Simpler CI/CD** - one pipeline
4. ✅ **Better for monorepos** - Railway handles this well
5. ✅ **Similar cost** - Only $5-10 more than Vercel option

---

## Railway Project Structure

### Monorepo Layout

```
jobmatch-ai/
├── frontend/              ← Vite React app
│   ├── dist/             ← Built static files
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/              ← Express.js API
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
│
├── railway.json          ← Railway configuration
└── package.json          ← Root workspace
```

### Railway Configuration

Create `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## Deployment Plan

### Phase 1: Set Up Railway Monorepo (30 minutes)

#### Step 1.1: Restructure Project

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Create workspace structure (if not already done)
# Your project is already structured correctly:
# - Frontend: /home/carl/application-tracking/jobmatch-ai (root)
# - Backend:  /home/carl/application-tracking/jobmatch-ai/backend
```

#### Step 1.2: Create Railway Services

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init
# Name: jobmatch-ai

# Create two services:
# 1. Frontend service
# 2. Backend service
```

#### Step 1.3: Configure Backend Service

```bash
# In Railway Dashboard:
# Create service "jobmatch-backend"
# Settings:
#   - Root Directory: /backend
#   - Start Command: npm start
#   - PORT: 3001
```

**Environment Variables (Backend):**
```bash
NODE_ENV=production
PORT=3001

# Supabase
SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# External APIs
OPENAI_API_KEY=sk-...
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@jobmatch.ai
APIFY_API_KEY=apify_api_...
LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-client-secret

# CORS
ALLOWED_ORIGINS=https://jobmatch-frontend-production.railway.app
```

#### Step 1.4: Configure Frontend Service

```bash
# In Railway Dashboard:
# Create service "jobmatch-frontend"
# Settings:
#   - Root Directory: / (project root)
#   - Build Command: npm run build
#   - Start Command: npx serve dist -s -p $PORT
#   - PORT: 3000
```

**Environment Variables (Frontend):**
```bash
# Supabase
VITE_SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Backend API (Railway internal URL)
VITE_BACKEND_URL=https://jobmatch-backend-production.railway.app

# No Firebase variables anymore!
```

---

### Phase 2: Deploy Backend to Railway (30 minutes)

#### Step 2.1: Deploy Backend

```bash
cd /home/carl/application-tracking/jobmatch-ai/backend

# Deploy to Railway
railway up
```

#### Step 2.2: Verify Backend Deployment

```bash
# Get backend URL
railway domain

# Test health endpoint
curl https://jobmatch-backend-production.railway.app/health

# Expected response:
# { "status": "ok", "timestamp": "..." }
```

#### Step 2.3: Test API Endpoints

```bash
# Test each endpoint
curl https://jobmatch-backend-production.railway.app/api/applications
curl https://jobmatch-backend-production.railway.app/api/jobs
curl https://jobmatch-backend-production.railway.app/api/emails
curl https://jobmatch-backend-production.railway.app/api/auth
curl https://jobmatch-backend-production.railway.app/api/exports
```

---

### Phase 3: Deploy Frontend to Railway (30 minutes)

#### Step 3.1: Update Frontend Environment

Create `.env.production`:

```bash
VITE_SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_BACKEND_URL=https://jobmatch-backend-production.railway.app
```

#### Step 3.2: Build Frontend

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Install dependencies
npm install

# Build for production
npm run build

# Verify dist/ folder created
ls -la dist/
```

#### Step 3.3: Deploy Frontend

```bash
# Deploy to Railway
railway up

# Or link to specific service
railway link
# Select: jobmatch-frontend
railway up
```

#### Step 3.4: Verify Frontend Deployment

```bash
# Get frontend URL
railway domain

# Open in browser
open https://jobmatch-frontend-production.railway.app
```

---

### Phase 4: Update Frontend Code to Call Railway Backend (1 hour)

#### Files to Update (6 remaining)

**1. `src/sections/profile-resume-management/components/EditProfileForm.tsx`**

Before:
```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'
```

After:
```typescript
import { supabase } from '@/lib/supabase'

// Use Supabase Storage
const { data, error } = await supabase.storage
  .from('user-files')
  .upload(`${userId}/profile/${file.name}`, file)
```

**2. `src/sections/application-generator/ApplicationEditorPage.tsx`**

Before:
```typescript
import { httpsCallable } from 'firebase/functions'
```

After:
```typescript
const backendUrl = import.meta.env.VITE_BACKEND_URL
const response = await fetch(`${backendUrl}/api/applications/generate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ jobId, userId })
})
```

**3. `src/lib/exportApplication.ts`**

Before:
```typescript
import { storage } from '@/lib/firebase'
```

After:
```typescript
const backendUrl = import.meta.env.VITE_BACKEND_URL
const response = await fetch(`${backendUrl}/api/exports/pdf`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ applicationId })
})

const blob = await response.blob()
```

**4. `src/hooks/useSubscription.ts`**

Before:
```typescript
import { collection, doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
```

After:
```typescript
import { supabase } from '@/lib/supabase'

const { data, error } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('user_id', userId)
  .single()
```

**5. `src/hooks/useResumeExport.ts`**

Before:
```typescript
import { httpsCallable } from 'firebase/functions'
```

After:
```typescript
const backendUrl = import.meta.env.VITE_BACKEND_URL
const response = await fetch(`${backendUrl}/api/exports/resume`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ resumeId, format })
})
```

**6. `src/hooks/useLinkedInAuth.ts`**

Before:
```typescript
import { httpsCallable } from 'firebase/functions'
```

After:
```typescript
const backendUrl = import.meta.env.VITE_BACKEND_URL
window.location.href = `${backendUrl}/api/auth/linkedin`
```

---

### Phase 5: Remove Firebase Completely (30 minutes)

#### Step 5.1: Remove Firebase Dependencies

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Uninstall Firebase packages
npm uninstall firebase firebase-admin firebase-functions

# Remove from backend too
cd backend
npm uninstall firebase firebase-admin firebase-functions
cd ..
```

#### Step 5.2: Delete Firebase Files

```bash
# Remove Firebase SDK
rm src/lib/firebase.ts

# Remove Firebase Cloud Functions
rm -rf functions/

# Remove Firebase config
rm firebase.json
rm .firebaserc
rm firestore.rules
rm firestore.indexes.json
rm storage.rules

# Remove GitHub Actions Firebase deployment
rm .github/workflows/firebase-deploy.yml
```

#### Step 5.3: Delete Firebase Documentation

```bash
# Remove all Firebase-related docs
rm FIREBASE_*.md
rm DEPLOYMENT.md
rm PRE_DEPLOYMENT_CHECKLIST.md
rm docs/PHASE3-DEPLOYMENT.md
rm FUNCTIONS_ENV_CONFIG.md
rm DEPLOYMENT_SUMMARY.md
rm HOSTING_DEPLOYMENT_NEXT_STEPS.md

# Keep:
# - RAILWAY_ARCHITECTURE_FINAL.md (this file)
# - MOVE_OFF_FIREBASE_COMPLETE.md
# - Supabase migration docs
```

#### Step 5.4: Update .gitignore

```bash
# Remove Firebase-specific entries
sed -i '/firebase/d' .gitignore
sed -i '/\.firebase/d' .gitignore
sed -i '/\.runtimeconfig\.json/d' .gitignore
```

---

### Phase 6: Delete Supabase Edge Functions (15 minutes)

Since Railway backend handles everything, delete Edge Functions:

```bash
# Only keep rate-limit if you want database-level rate limiting
# Otherwise delete everything:

# List what's deployed
supabase functions list --project-ref lrzhpnsykasqrousgmdh

# Delete Edge Functions
supabase functions delete send-email --project-ref lrzhpnsykasqrousgmdh
supabase functions delete generate-application --project-ref lrzhpnsykasqrousgmdh
supabase functions delete scrape-jobs --project-ref lrzhpnsykasqrousgmdh
supabase functions delete linkedin-oauth --project-ref lrzhpnsykasqrousgmdh

# Optional: Delete rate-limit too if handling in Railway
supabase functions delete rate-limit --project-ref lrzhpnsykasqrousgmdh

# Delete local Edge Functions code
rm -rf supabase/functions/
rm deploy-edge-functions.sh
```

---

## Railway Service URLs

After deployment, you'll have:

**Frontend:** `https://jobmatch-frontend-production.railway.app`
**Backend:** `https://jobmatch-backend-production.railway.app`

Or set custom domain:
**Frontend:** `https://jobmatch.ai`
**Backend:** `https://api.jobmatch.ai`

---

## Cost Breakdown (1,000 Monthly Users)

### Railway Costs

**Frontend Service:**
```
- Static file serving
- Minimal compute needed
- Estimated: $0-5/month
```

**Backend Service:**
```
- Express.js API
- AI generation (calls OpenAI)
- Job scraping (calls Apify)
- Email sending (calls SendGrid)
- Estimated: $10-15/month
```

**Total Railway:** $10-20/month

### Supabase Costs

**Pro Plan:** $25/month
```
- 8GB Database
- 100GB Bandwidth
- 100GB File Storage
- Unlimited API requests
```

### External API Costs (Usage-based)

**OpenAI:** $10-30/month (GPT-4o-mini)
**SendGrid:** $0-15/month (Free tier: 100 emails/day)
**Apify:** $0-10/month (Free tier covers most usage)

---

## Total Monthly Cost: $45-90/month

**Compared to Firebase:** $85-125/month
**Savings:** $40-80/month ($480-960/year) 💰

---

## Monitoring & Alerts

### Railway Monitoring

```bash
# In Railway Dashboard:
# Metrics tab shows:
# - CPU usage
# - Memory usage
# - Network traffic
# - Request rate
# - Error rate

# Set up alerts:
# Settings → Notifications
# - High CPU (> 80%)
# - High Memory (> 80%)
# - Error rate (> 5%)
# - Response time (> 2s)
```

### Supabase Monitoring

```bash
# In Supabase Dashboard:
# Database → Reports
# - Query performance
# - Connection pool
# - Storage usage
# - API requests

# Set up alerts:
# - Database size (> 7GB)
# - Slow queries (> 1s)
# - High error rate
```

---

## Deployment Checklist

```
□ Railway CLI installed
□ Railway account created
□ Two services created (frontend + backend)
□ Backend environment variables set
□ Frontend environment variables set
□ Backend deployed and responding
□ Frontend deployed and accessible
□ All 6 frontend files updated
□ Firebase packages uninstalled
□ Firebase files deleted
□ Supabase Edge Functions deleted (optional)
□ Custom domain configured (optional)
□ Monitoring alerts set up
□ Tested all features in production:
  □ User signup/login
  □ AI generation
  □ Job scraping
  □ Email sending
  □ LinkedIn OAuth
  □ PDF/DOCX export
  □ File uploads
  □ Subscription management
□ Firebase project decommissioned (after 30 days)
```

---

## Quick Start Commands

### Deploy Everything

```bash
# 1. Deploy Backend
cd /home/carl/application-tracking/jobmatch-ai/backend
railway login
railway init
railway up

# 2. Deploy Frontend
cd ..
railway up

# 3. Remove Firebase
npm uninstall firebase firebase-admin firebase-functions
rm -rf functions/ firebase.json .firebaserc *.rules

# 4. Delete Edge Functions
supabase functions delete send-email --project-ref lrzhpnsykasqrousgmdh
supabase functions delete generate-application --project-ref lrzhpnsykasqrousgmdh
supabase functions delete scrape-jobs --project-ref lrzhpnsykasqrousgmdh
supabase functions delete linkedin-oauth --project-ref lrzhpnsykasqrousgmdh
supabase functions delete rate-limit --project-ref lrzhpnsykasqrousgmdh
rm -rf supabase/functions/

# 5. Test
open https://jobmatch-frontend-production.railway.app
```

---

## Success Criteria

Migration is successful when:

- ✅ Frontend accessible at Railway URL
- ✅ Backend responding to all API calls
- ✅ Zero Firebase SDK imports in code
- ✅ No Firebase costs on billing
- ✅ All features work:
  - Authentication (Supabase)
  - AI generation (Railway → OpenAI)
  - Job scraping (Railway → Apify)
  - Email sending (Railway → SendGrid)
  - PDF export (Railway)
  - File uploads (Supabase Storage)
- ✅ Zero errors for 48 hours
- ✅ Costs within budget ($45-90/month)

---

## Next Steps

**Ready to deploy?**

1. Run backend deployment first
2. Then frontend deployment
3. Update the 6 frontend files
4. Remove Firebase completely
5. Delete Edge Functions
6. Monitor for 48 hours

**Estimated Total Time:** 2-3 hours
**Risk Level:** LOW (can rollback to Firebase)
**Recommended:** Deploy during low-traffic hours

---

**Status:** Ready to Execute
**Architecture:** Railway (Frontend + Backend) + Supabase (Data)
**Cost:** $45-90/month for 1,000 users
**Created:** December 20, 2025
