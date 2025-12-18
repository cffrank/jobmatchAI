# Quick Start - CI/CD Setup

Complete these steps to activate your CI/CD pipeline.

## Step 1: Generate Firebase Service Account

### Option A: Firebase Console (Easiest)

1. Visit: https://console.firebase.google.com/project/ai-career-os-139db/settings/serviceaccounts/adminsdk
2. Click **Generate new private key**
3. Click **Generate key** in the confirmation dialog
4. Save the downloaded JSON file
5. Open the JSON file and copy ALL contents

### Option B: Google Cloud Console

1. Visit: https://console.cloud.google.com/iam-admin/serviceaccounts?project=ai-career-os-139db
2. Click **+ CREATE SERVICE ACCOUNT**
3. Name: `github-actions-deploy`
4. Click **CREATE AND CONTINUE**
5. Add roles:
   - Firebase Hosting Admin
   - Service Account User
6. Click **DONE**
7. Click the created service account email
8. Go to **KEYS** tab
9. Click **ADD KEY** → **Create new key**
10. Choose **JSON** format
11. Click **CREATE**
12. Open the downloaded JSON file and copy ALL contents

## Step 2: Add Secret to GitHub

1. Visit: https://github.com/cffrank/jobmatchAI/settings/secrets/actions
2. Click **New repository secret**
3. Enter:
   - **Name:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** Paste the entire JSON contents from Step 1
4. Click **Add secret**

## Step 3: Commit and Push Configuration Files

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Check what files will be committed
git status

# Add all configuration files
git add .firebaserc firebase.json .github/workflows/firebase-deploy.yml .gitignore

# Commit the changes
git commit -m "Add Firebase CI/CD pipeline configuration"

# Push to GitHub
git push origin main
```

## Step 4: Verify Deployment

1. Go to: https://github.com/cffrank/jobmatchAI/actions
2. You should see the workflow running
3. Click on the workflow run to see progress
4. Once complete, visit: https://ai-career-os-139db.web.app

## Testing Pull Request Previews

```bash
# Create a new branch
git checkout -b test-deployment

# Make a small change (e.g., update README)
echo "Testing CI/CD" >> README.md

# Commit and push
git add README.md
git commit -m "Test deployment pipeline"
git push origin test-deployment

# Create pull request on GitHub
# Visit: https://github.com/cffrank/jobmatchAI/compare/main...test-deployment
```

The GitHub Actions bot will comment on your PR with a preview URL.

## Files Created

- `/home/carl/application-tracking/jobmatch-ai/.firebaserc` - Firebase project configuration
- `/home/carl/application-tracking/jobmatch-ai/firebase.json` - Firebase hosting settings
- `/home/carl/application-tracking/jobmatch-ai/.github/workflows/firebase-deploy.yml` - CI/CD workflow
- `/home/carl/application-tracking/jobmatch-ai/.gitignore` - Updated with Firebase entries
- `/home/carl/application-tracking/jobmatch-ai/DEPLOYMENT.md` - Complete documentation
- `/home/carl/application-tracking/jobmatch-ai/QUICK-START.md` - This file

## Troubleshooting

**Workflow fails with "Permission denied"**
- Verify you added the FIREBASE_SERVICE_ACCOUNT secret correctly
- Ensure you copied the ENTIRE JSON contents including curly braces

**Build fails**
- Run `npm run build` locally to check for errors
- Run `npm run lint` locally to check for linting issues

**Need help?**
- Check workflow logs: https://github.com/cffrank/jobmatchAI/actions
- Read full docs: DEPLOYMENT.md

## Expected Workflow Behavior

### On Pull Request
1. Checkout code
2. Install dependencies
3. Run linter
4. Build application
5. Deploy to preview URL
6. Comment on PR with preview link

### On Push to Main
1. Checkout code
2. Install dependencies
3. Run linter
4. Build application
5. Deploy to production (https://ai-career-os-139db.web.app)

## Next Steps

After successful deployment:

1. Configure custom domain (optional)
   - Firebase Console → Hosting → Add custom domain

2. Add environment variables (if needed)
   - GitHub repo → Settings → Secrets → Actions
   - Add as `VITE_YOUR_VAR_NAME`

3. Monitor analytics
   - Firebase Console → Hosting → Usage

Your CI/CD pipeline is ready to use!
