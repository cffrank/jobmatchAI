# Railway Environment Variables Setup Guide

**Purpose:** Configure backend service environment variables directly in Railway dashboard to eliminate redeploy cycles during CI/CD deployment.

**Status:** Phase 1 of Railway CI/CD Migration
**Updated:** 2025-12-24

---

## Quick Summary

The current deployment process sets environment variables **after** deployment via CLI, which triggers unnecessary redeploys and adds 1.5-2 minutes of wait time. This guide moves all variables to Railway dashboard configuration where they should be.

**Expected Result:** Deployment time reduced from 3-5 minutes to 2-3 minutes

---

## Prerequisites

- Access to Railway dashboard (https://railway.app/dashboard)
- Backend service already deployed to Railway
- GitHub secrets available for reference (in GitHub repo settings)

---

## Step-by-Step Setup Instructions

### Step 1: Log Into Railway Dashboard

1. Go to https://railway.app/dashboard
2. Sign in with your account
3. Select your **JobMatch AI** project

### Step 2: Navigate to Backend Service Configuration

1. In the project view, click on the **Backend** service card
2. You should see the service overview with deployment history
3. Click on the **Variables** tab (should be in the top navigation)
   - Alternative path: Service → Settings → Variables

### Step 3: Add Environment Variables

You will add 15 environment variables. The values come from your GitHub repository secrets.

To find your GitHub secrets:
1. Go to your GitHub repository: https://github.com/[your-org]/jobmatch-ai
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. You'll see all the secrets needed below

#### Step 3.1: Supabase Configuration (3 variables)

Add these three variables from your GitHub secrets:

| Variable Name | Value Source | Example |
|---|---|---|
| SUPABASE_URL | GitHub secret: `SUPABASE_URL` | `https://xxx.supabase.co` |
| SUPABASE_ANON_KEY | GitHub secret: `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiI...` |
| SUPABASE_SERVICE_ROLE_KEY | GitHub secret: `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiI...` |

**How to add:**
1. Click the **+ Add Variable** button
2. Enter the variable name (e.g., `SUPABASE_URL`)
3. Paste the value from your GitHub secret
4. Click **Add**
5. Repeat for the other 2 variables

#### Step 3.2: OpenAI Configuration (1 variable)

| Variable Name | Value Source |
|---|---|
| OPENAI_API_KEY | GitHub secret: `OPENAI_API_KEY` |

#### Step 3.3: SendGrid Configuration (2 variables)

| Variable Name | Value Source |
|---|---|
| SENDGRID_API_KEY | GitHub secret: `SENDGRID_API_KEY` |
| SENDGRID_FROM_EMAIL | GitHub secret: `SENDGRID_FROM_EMAIL` |

#### Step 3.4: Application Configuration (5 variables)

These are standard configuration values:

| Variable Name | Value | Description |
|---|---|---|
| NODE_ENV | `production` | Always "production" for production environment |
| PORT | `3000` | Backend runs on port 3000 |
| JWT_SECRET | GitHub secret: `JWT_SECRET` | Authentication secret |
| APP_URL | GitHub secret: `FRONTEND_URL` | Frontend URL (e.g., `https://jobmatch.com`) |
| STORAGE_BUCKET | `exports` | S3/storage bucket name |

#### Step 3.5: LinkedIn OAuth (3 variables - REQUIRED)

| Variable Name | Value Source |
|---|---|
| LINKEDIN_CLIENT_ID | GitHub secret: `LINKEDIN_CLIENT_ID` |
| LINKEDIN_CLIENT_SECRET | GitHub secret: `LINKEDIN_CLIENT_SECRET` |
| LINKEDIN_REDIRECT_URI | GitHub secret: `LINKEDIN_REDIRECT_URI` |

#### Step 3.6: Apify Integration (1 variable - OPTIONAL)

| Variable Name | Value Source | Required? |
|---|---|---|
| APIFY_API_TOKEN | GitHub secret: `APIFY_API_TOKEN` | Optional (only if using Apify) |

---

## Verification Checklist

After adding all variables, verify they are correctly set:

### Quick Visual Check
- [ ] All 15 variables appear in the Variables tab
- [ ] No red error indicators
- [ ] Values are not visible in the list (hidden for security)

### Variable Count Checklist

| Category | Count | Variables |
|---|---|---|
| Supabase | 3 | SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY |
| OpenAI | 1 | OPENAI_API_KEY |
| SendGrid | 2 | SENDGRID_API_KEY, SENDGRID_FROM_EMAIL |
| Application | 5 | NODE_ENV, PORT, JWT_SECRET, APP_URL, STORAGE_BUCKET |
| LinkedIn | 3 | LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI |
| Apify | 1 | APIFY_API_TOKEN |
| **TOTAL** | **15** | |

---

## Testing the Configuration

### Option A: Automatic Test (Recommended)

1. In GitHub, navigate to **Actions** → **Deploy Backend to Railway**
2. Click **Run workflow** → **Run workflow**
3. The workflow will:
   - Deploy the backend
   - Skip setting variables (they're already in Railway)
   - Run health checks
   - Report success/failure

### Option B: Manual Test (If needed)

1. Make a small change to `backend/` (e.g., update a comment in a file)
2. Commit and push: `git add backend/ && git commit -m "test: verify railway variables" && git push`
3. GitHub Actions will automatically trigger the deployment
4. Monitor the action run and verify it completes in 2-3 minutes

### Option C: Verify via Railway Dashboard

1. Go to Railway dashboard → Backend service
2. Click **Deployments** tab
3. Verify the latest deployment:
   - Status: **Success** (green checkmark)
   - Duration: ~2-3 minutes
   - No redeploy cycles visible

---

## Troubleshooting

### Problem: Variables appear but deployment fails

**Cause:** A required variable is missing or has wrong value

**Fix:**
1. Click on the failed deployment
2. Check the logs for specific error (look for "undefined variable" or similar)
3. Find which variable is missing
4. Add it or correct its value in the Variables tab
5. The next deployment will use the updated variables

### Problem: Deployment still takes 3-5 minutes

**Cause:** Workflow might still be setting variables via CLI

**Fix:**
1. Check the GitHub Actions workflow output
2. Verify line "Set Environment Variables" is NOT running
3. If it is, the workflow file hasn't been updated yet
4. Wait for the updated workflow to be deployed

### Problem: Variables show in Railway but deployment still has issues

**Cause:** Variables might not have been saved

**Fix:**
1. Click on each variable in Railway
2. Verify the value is complete (not truncated)
3. Ensure there are no extra spaces or special characters
4. Save and test deployment again

### Problem: Can't find Variables tab in Railway

**Fix:**
1. Make sure you're viewing the Backend service (not another service)
2. Look for tabs at the top: **Overview**, **Deployments**, **Variables**, **Settings**
3. If not visible, click **Settings** and look for Variables option there

---

## Important Notes

### Variable Visibility

- Variable values are **hidden** in the Railway dashboard for security
- You can only view the variable names, not their values
- If you need to verify a value, you must reference your GitHub secrets

### Updating Variables

If you need to change a variable later:

1. Find the variable in Railway dashboard
2. Click edit (pencil icon)
3. Update the value
4. Save
5. Railway will automatically redeploy with new value (one-time)

### Security Best Practices

- Never paste secrets into public documents
- Never share variable values over chat/email
- Keep GitHub secrets synced with Railway variables
- Rotate secrets periodically (update both places)

---

## Next Steps

### 1. Complete This Setup

Ensure all 15 variables are added to Railway dashboard before deploying.

### 2. Update GitHub Actions Workflow

The workflow has been updated to skip variable setting since they're now in Railway.
- See: `.github/workflows/deploy-backend-railway.yml`
- Changes: Removed "Set Environment Variables" job, optimized health check timing

### 3. Test the Deployment

Once variables are set:

```bash
# Option 1: Manual trigger in GitHub
# Go to Actions → Deploy Backend to Railway → Run workflow

# Option 2: Automatic trigger
git add backend/src/some-file.ts
git commit -m "test: verify railway deployment"
git push origin main
```

### 4. Verify Success

Check that:
- Deployment completes in 2-3 minutes
- Health check passes
- Backend is responsive at its Railway URL

---

## Additional Resources

### Railway Documentation
- [Environment Variables Guide](https://docs.railway.app/develop/variables)
- [Deployments Guide](https://docs.railway.app/deploy/)
- [Environment Templates](https://docs.railway.app/develop/environments)

### JobMatch AI Documentation
- [CI/CD Architecture](../CI-CD-ARCHITECTURE.md) - Updated with Railway info
- [Railway Migration Analysis](../RAILWAY-MIGRATION-ANALYSIS.md) - Full context
- [Deployment Troubleshooting](./RAILWAY_DEPLOYMENT_TROUBLESHOOTING.md)

### Railway Dashboard Links
- [Your Project Dashboard](https://railway.app/dashboard)
- [Deployment History](https://railway.app/dashboard) (from your project)
- [Variables Management](https://railway.app/dashboard) (from your service)

---

## FAQ

**Q: Why do we need to set variables in Railway if they're in GitHub secrets?**

A: GitHub secrets are for GitHub Actions. Railway needs them in its own configuration so the backend service can access them at runtime. Setting them in Railway ensures they're injected when the service starts.

**Q: What if I use a variable that's not in GitHub secrets?**

A: Some variables are standard config (NODE_ENV, PORT, etc.) and don't need to be secrets. These you can set directly in the guide.

**Q: How often do I need to add variables?**

A: Only once during initial setup. If you add new environment variables to your code later, you'll need to add them to both GitHub secrets and Railway.

**Q: Can I test variables without deploying?**

A: Yes, you can view them in Railway dashboard anytime. To test at runtime, deploy and check the logs for any "undefined variable" errors.

**Q: What if a deployment fails after I add variables?**

A: Check the deployment logs in Railway dashboard. Look for error messages mentioning specific variables. Then verify those variables are correctly set.

---

**Document Status:** Ready for Phase 1 Implementation
**Last Updated:** 2025-12-24
**Maintained By:** DevOps Team
