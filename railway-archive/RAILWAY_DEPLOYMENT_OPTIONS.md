# Railway Deployment Options (Without CLI)

Since Railway CLI requires interactive terminal authentication, here are two alternative deployment methods:

---

## ✅ OPTION 1: GitHub Integration (RECOMMENDED)

This is the **easiest and most automated** approach.

### Step 1: Push Code to GitHub

```bash
cd /home/carl/application-tracking/jobmatch-ai

# If not already a git repo with remote
git remote -v

# If needed, create GitHub repo and push
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### Step 2: Connect Railway to GitHub (via Dashboard)

1. **Open Railway Dashboard**: https://railway.app/dashboard
2. **Click "New Project"**
3. **Select "Deploy from GitHub repo"**
4. **Authorize Railway** to access your GitHub account
5. **Select your repository**: `jobmatch-ai`

### Step 3: Create Backend Service

1. **Click "Add Service"** → "GitHub Repo"
2. **Service Name**: `jobmatch-backend`
3. **Settings**:
   - **Root Directory**: `/backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Watch Paths**: `/backend/**`

4. **Add Environment Variables** (Settings → Variables):
```bash
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
SUPABASE_ANON_KEY=sb_publishable_QCbc132gXy457Z8OBZpCyw_G9aOU96h
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
OPENAI_API_KEY=<your-openai-key>
SENDGRID_API_KEY=<your-sendgrid-key>
SENDGRID_FROM_EMAIL=noreply@jobmatch.ai
APIFY_API_KEY=<your-apify-key>
LINKEDIN_CLIENT_ID=<your-linkedin-client-id>
LINKEDIN_CLIENT_SECRET=<your-linkedin-client-secret>
```

5. **Generate Domain**: Settings → Networking → Generate Domain
   - Copy the URL (e.g., `https://jobmatch-backend-production.railway.app`)

### Step 4: Create Frontend Service

1. **Click "Add Service"** → "GitHub Repo" (same repo)
2. **Service Name**: `jobmatch-frontend`
3. **Settings**:
   - **Root Directory**: `/` (project root)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve dist -s -p $PORT`
   - **Watch Paths**: `/src/**`, `/public/**`, `/index.html`

4. **Add Environment Variables**:
```bash
VITE_SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_QCbc132gXy457Z8OBZpCyw_G9aOU96h
VITE_BACKEND_URL=<backend-url-from-step-3>
```

5. **Generate Domain**: Settings → Networking → Generate Domain

### Step 5: Auto-Deploy on Push

**Every time you push to `main`, Railway will automatically:**
- Detect changes
- Rebuild affected services
- Deploy new versions
- Zero downtime deployments

✅ **DONE!** Your app will deploy automatically.

---

## ⚙️ OPTION 2: Manual Railway CLI (from your terminal)

If you prefer CLI, run these commands **in your actual terminal** (not through Claude Code):

### Step 1: Login from Your Terminal

```bash
# Open your actual terminal (iTerm, Terminal.app, etc.)
cd /home/carl/application-tracking/jobmatch-ai

# Login (will open browser)
railway login
```

### Step 2: Initialize Project

```bash
# Create new Railway project
railway init

# Project name: jobmatch-ai
```

### Step 3: Deploy Backend

```bash
cd backend
railway up
```

### Step 4: Deploy Frontend

```bash
cd ..
railway up
```

---

## 🎯 RECOMMENDED APPROACH

**Use Option 1 (GitHub Integration)** because:
- ✅ Automatic deployments on git push
- ✅ No CLI authentication issues
- ✅ Easy rollbacks (just revert git commit)
- ✅ Preview deployments for PRs
- ✅ Built-in CI/CD pipeline

---

## 📋 Checklist: GitHub Integration Setup

```
□ Code committed to git
□ Code pushed to GitHub
□ Railway account created
□ GitHub authorized in Railway
□ Backend service created
□ Backend environment variables set
□ Backend domain generated
□ Frontend service created
□ Frontend environment variables set (with backend URL)
□ Frontend domain generated
□ Both services deployed successfully
□ Test backend: curl <backend-url>/health
□ Test frontend: open <frontend-url> in browser
```

---

## ⏭️ Next Steps

### While You Set Up Railway:

I can **update the 6 frontend files** right now to remove Firebase and prepare for Railway backend. This can happen in parallel with your Railway setup.

**Files I'll update:**
1. `src/sections/profile-resume-management/components/EditProfileForm.tsx`
2. `src/sections/application-generator/ApplicationEditorPage.tsx`
3. `src/lib/exportApplication.ts`
4. `src/hooks/useSubscription.ts`
5. `src/hooks/useResumeExport.ts`
6. `src/hooks/useLinkedInAuth.ts`

### After Railway Setup:

Once you have the Railway backend URL, we'll:
1. Update `.env.production` with the URL
2. Rebuild frontend
3. Push to GitHub (triggers auto-deploy)
4. Verify everything works
5. Delete Firebase and Supabase Edge Functions

---

## 🚀 Ready to Proceed?

**Option A**: Set up Railway GitHub integration (15 minutes)
**Option B**: I'll update the 6 frontend files while you set up Railway (can do in parallel)
**Option C**: Both - you do Railway setup, I do code updates

Which would you like?
