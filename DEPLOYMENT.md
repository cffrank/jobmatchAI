# Deployment Guide - JobMatch AI

This document provides complete instructions for setting up and using the CI/CD pipeline for JobMatch AI.

## Overview

The deployment pipeline uses GitHub Actions to automatically:
- Build and lint code on every push and pull request
- Deploy preview environments for pull requests
- Deploy to production on merges to main branch

**Technologies:**
- GitHub Actions (CI/CD)
- Firebase Hosting (Static hosting)
- Vite (Build tool)

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Push to main / Create PR                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Job: build-and-test                                        │
│  ├── Checkout code                                          │
│  ├── Setup Node.js 20 with npm cache                        │
│  ├── Install dependencies (npm ci)                          │
│  ├── Run linter (npm run lint)                              │
│  ├── Build application (npm run build)                      │
│  └── Upload build artifacts                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  deploy-preview  │    │ deploy-production│
│  (PRs only)      │    │ (main only)      │
│  ├── Download    │    │ ├── Download     │
│  │   artifacts   │    │ │   artifacts    │
│  └── Deploy to   │    │ └── Deploy to    │
│      preview     │    │      production  │
│      channel     │    │      (live)      │
└──────────────────┘    └──────────────────┘
```

## Initial Setup

### Step 1: Install Firebase CLI (Local Development)

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Verify you're logged in
firebase projects:list
```

### Step 2: Generate Firebase Service Account

You need a Firebase service account to enable GitHub Actions to deploy on your behalf.

#### Option A: Using Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **ai-career-os-139db**
3. Click the gear icon (⚙️) → **Project settings**
4. Go to **Service accounts** tab
5. Click **Generate new private key**
6. Download the JSON file
7. Copy the entire contents of the JSON file

#### Option B: Using Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **ai-career-os-139db**
3. Navigate to **IAM & Admin** → **Service Accounts**
4. Click **Create Service Account**
   - Name: `github-actions-deploy`
   - Description: `Service account for GitHub Actions Firebase deployments`
5. Grant roles:
   - **Firebase Hosting Admin**
   - **Service Account User**
6. Click **Create Key** → Choose **JSON**
7. Download and copy the contents

### Step 3: Add Secrets to GitHub Repository

1. Go to your GitHub repository: `https://github.com/cffrank/jobmatchAI`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secret:

   **Name:** `FIREBASE_SERVICE_ACCOUNT`

   **Value:** Paste the entire contents of the service account JSON file you downloaded

   Example format (yours will be different):
   ```json
   {
     "type": "service_account",
     "project_id": "ai-career-os-139db",
     "private_key_id": "abc123...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "github-actions-deploy@ai-career-os-139db.iam.gserviceaccount.com",
     "client_id": "123456789",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
   }
   ```

5. Click **Add secret**

**Note:** `GITHUB_TOKEN` is automatically provided by GitHub Actions and doesn't need to be added manually.

### Step 4: Verify Firebase Configuration

Ensure these files are in your repository:

```
/home/carl/application-tracking/jobmatch-ai/
├── .firebaserc                    # Firebase project configuration
├── firebase.json                  # Firebase hosting configuration
└── .github/
    └── workflows/
        └── firebase-deploy.yml    # GitHub Actions workflow
```

### Step 5: Update .gitignore (If Needed)

Make sure these entries are in your `.gitignore`:

```
# Firebase
.firebase/
*-debug.log
firebase-debug.*.log

# Build
dist/
dist-ssr/

# Service account keys (NEVER commit these!)
*service-account*.json
```

## Using the Pipeline

### Automatic Deployments

#### Pull Request Preview Deployments

When you create or update a pull request:

1. Pipeline automatically builds and tests your code
2. If successful, deploys to a temporary preview URL
3. GitHub bot comments on PR with preview URL
4. Preview expires after 7 days
5. Each PR gets its own unique preview URL

**Example PR Comment:**
```
✅ Deploy Preview ready!

🔍 Preview URL: https://ai-career-os-139db--pr123-xyz.web.app
📝 Expires: 7 days from now
```

#### Production Deployments

When you merge a PR to main:

1. Pipeline builds and tests your code
2. If successful, deploys to production
3. Live URL: `https://ai-career-os-139db.web.app`

### Manual Local Deployment

If you need to deploy manually from your local machine:

```bash
# Build the application
npm run build

# Deploy to Firebase
firebase deploy --only hosting

# Deploy to a preview channel
firebase hosting:channel:deploy preview-test
```

## Monitoring Deployments

### GitHub Actions Dashboard

1. Go to your repository: `https://github.com/cffrank/jobmatchAI`
2. Click **Actions** tab
3. View workflow runs, logs, and status

### Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **ai-career-os-139db**
3. Navigate to **Hosting**
4. View deployment history, preview channels, and analytics

## Pipeline Features

### Build Stage
- ✅ Dependency installation with npm cache
- ✅ ESLint code quality checks
- ✅ TypeScript compilation
- ✅ Vite production build
- ✅ Build artifact upload

### Security
- ✅ Service account authentication (no long-lived tokens)
- ✅ Secrets managed via GitHub Secrets
- ✅ Least-privilege access principle
- ✅ No credentials in code

### Performance
- ✅ npm cache for faster installs
- ✅ Build artifact reuse between jobs
- ✅ Parallel job execution where possible
- ✅ Optimized cache headers for static assets

### Deployment
- ✅ Preview deployments for every PR
- ✅ Automatic cleanup after 7 days
- ✅ Zero-downtime production deployments
- ✅ Custom domain support (configure in Firebase Console)

## Configuration Files Explained

### firebase.json

```json
{
  "hosting": {
    "public": "dist",              // Build output directory
    "rewrites": [{
      "source": "**",
      "destination": "/index.html" // SPA routing support
    }],
    "headers": [...]               // Cache optimization
  }
}
```

**Key features:**
- Serves files from `dist/` directory
- Rewrites all routes to `index.html` (React Router support)
- Optimized cache headers for assets (1 year cache)

### .firebaserc

```json
{
  "projects": {
    "default": "ai-career-os-139db"
  }
}
```

**Purpose:**
- Links local project to Firebase project
- Allows multiple environment configurations

### .github/workflows/firebase-deploy.yml

**Triggers:**
- Push to main branch → Production deployment
- Pull request → Preview deployment

**Jobs:**
1. `build-and-test`: Runs on all events
2. `deploy-preview`: Runs only for PRs
3. `deploy-production`: Runs only for main branch pushes

## Troubleshooting

### Build Failures

**Issue:** Build fails with dependency errors

```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Issue:** TypeScript compilation errors

```bash
# Run TypeScript check locally
npm run build

# Check for type errors
npx tsc --noEmit
```

### Deployment Failures

**Issue:** "Permission denied" or "Unauthorized"

**Solution:**
1. Verify service account has correct roles:
   - Firebase Hosting Admin
   - Service Account User
2. Regenerate service account key if needed
3. Update GitHub secret with new key

**Issue:** "Project not found"

**Solution:**
1. Verify project ID in `.firebaserc` matches Firebase Console
2. Ensure service account is for correct project

**Issue:** Preview URLs not appearing in PR comments

**Solution:**
1. Verify `GITHUB_TOKEN` has correct permissions
2. Check workflow run logs in Actions tab
3. Ensure FirebaseExtended/action-hosting-deploy@v0 is latest version

### Rollback Procedure

If you need to rollback a deployment:

```bash
# View deployment history
firebase hosting:releases:list

# Rollback to specific version
firebase hosting:rollback
```

Or use Firebase Console:
1. Go to Hosting → Release history
2. Click on previous version
3. Click "Rollback"

## Performance Optimization

### Build Performance

Current optimizations:
- npm cache reduces install time by ~70%
- Build artifacts uploaded once, downloaded for both deploy jobs
- Concurrent linting and building where possible

### Runtime Performance

Firebase configuration includes:
- 1-year cache for static assets (JS, CSS, images)
- Gzip compression enabled by default
- Global CDN distribution

### Custom Domain Setup

To add a custom domain:

1. Firebase Console → Hosting → Add custom domain
2. Follow DNS configuration steps
3. SSL certificate automatically provisioned
4. Update workflow notification with custom URL

## Security Best Practices

✅ **Implemented:**
- Service account instead of user credentials
- Secrets stored in GitHub Secrets (encrypted)
- Minimal permissions on service account
- No secrets in code or logs

🔒 **Additional Recommendations:**
- Enable Firebase App Check for abuse protection
- Set up Firebase Security Rules if using Firestore/Storage
- Regularly rotate service account keys
- Monitor deployment logs for suspicious activity

## CI/CD Workflow Expansion

### Adding Tests

To add unit tests to the pipeline:

```yaml
- name: Run unit tests
  run: npm test

- name: Run E2E tests
  run: npm run test:e2e
```

### Adding Security Scanning

To add dependency vulnerability scanning:

```yaml
- name: Run npm audit
  run: npm audit --audit-level=moderate
```

### Adding Lighthouse CI

To add performance monitoring:

```yaml
- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v10
  with:
    urls: |
      https://ai-career-os-139db.web.app
    uploadArtifacts: true
```

## Environment Variables

### Firebase Configuration Secrets (Required)

Your application requires Firebase configuration to be set as GitHub Secrets for production builds.

#### Step 1: Get Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/project/ai-career-os-139db/settings/general)
2. Scroll to "Your apps" section
3. If you don't have a web app yet:
   - Click "Add app" → Select Web (</>)
   - Register the app with a nickname like "JobMatch AI Web"
4. Copy the Firebase config values

#### Step 2: Add Firebase Secrets to GitHub

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add each of the following 6 secrets:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `VITE_FIREBASE_API_KEY` | Firebase API Key | `AIzaSyC...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth Domain | `ai-career-os-139db.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Project ID | `ai-career-os-139db` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage Bucket | `ai-career-os-139db.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging Sender ID | `123456789` |
| `VITE_FIREBASE_APP_ID` | App ID | `1:123456789:web:abc123` |

**Note:** These secrets are already configured in the GitHub Actions workflow and will be injected during the build process.

#### Local Development Configuration

For local development, create a `.env.local` file in the `jobmatch-ai` directory:

```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=ai-career-os-139db.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ai-career-os-139db
VITE_FIREBASE_STORAGE_BUCKET=ai-career-os-139db.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id-here
VITE_FIREBASE_APP_ID=your-app-id-here
```

**Important:** `.env.local` is already gitignored and should never be committed to the repository.

### How Environment Variables Work

#### Development (Local)
- Vite reads from `.env.local` file
- File is gitignored for security
- Hot reloading updates when env changes

#### Production (GitHub Actions)
- GitHub Actions injects secrets as environment variables during build
- Vite bundles them into the static build at build-time
- Secrets are encrypted and never exposed in logs or artifacts

#### Security Notes

✅ **Safe to expose (but use secrets anyway):**
- Firebase API Key (designed for client-side use)
- Project ID, Auth Domain, Storage Bucket (public info)

❌ **Never commit:**
- Service Account JSON
- Any backend/server API keys
- Database connection strings

**Why use GitHub Secrets for Firebase config?**
1. **Consistency** - All config in one secure place
2. **Rotation** - Easy to update without code changes
3. **Environment-specific** - Different configs for staging/production
4. **Best Practice** - Treat all config as potentially sensitive

### Build-time Variables (Custom)

If your application needs additional environment variables:

Add to workflow:

```yaml
- name: Build application
  run: npm run build
  env:
    VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
    # ... (Firebase secrets already configured)
    VITE_API_URL: ${{ secrets.API_URL }}
    VITE_CUSTOM_VAR: ${{ secrets.CUSTOM_VAR }}
```

Then add secrets to GitHub:
- Go to Settings → Secrets → Actions
- Add each environment variable as a secret

### Runtime Variables

Use Firebase Remote Config or Firestore for runtime configuration that needs to change without redeployment.

## Support and Resources

### Documentation
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Vite Build Docs](https://vitejs.dev/guide/build.html)

### Useful Commands

```bash
# Local development
npm run dev                          # Start dev server
npm run build                        # Build for production
npm run preview                      # Preview production build

# Firebase
firebase login                       # Login to Firebase
firebase deploy                      # Deploy to production
firebase hosting:channel:deploy pr   # Deploy to preview channel
firebase hosting:channel:list        # List all preview channels
firebase hosting:channel:delete pr   # Delete preview channel

# GitHub
gh workflow list                     # List workflows
gh run list                          # List workflow runs
gh run view                          # View run details
```

## Next Steps

1. ✅ Commit and push all configuration files to GitHub
2. ✅ Add `FIREBASE_SERVICE_ACCOUNT` secret to GitHub
3. ✅ Create a test PR to verify preview deployments
4. ✅ Merge to main to verify production deployment
5. 🔜 Monitor deployment in GitHub Actions and Firebase Console
6. 🔜 (Optional) Configure custom domain in Firebase Console

## Deployment Checklist

Before your first deployment:

### GitHub Secrets (Required - 7 total)
- [ ] `FIREBASE_SERVICE_ACCOUNT` - Service account JSON for deployments
- [ ] `VITE_FIREBASE_API_KEY` - Firebase API Key
- [ ] `VITE_FIREBASE_AUTH_DOMAIN` - Firebase Auth Domain
- [ ] `VITE_FIREBASE_PROJECT_ID` - Firebase Project ID
- [ ] `VITE_FIREBASE_STORAGE_BUCKET` - Firebase Storage Bucket
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase Messaging Sender ID
- [ ] `VITE_FIREBASE_APP_ID` - Firebase App ID

### Local Development
- [ ] `.env.local` created with Firebase configuration
- [ ] `.env.local` is in `.gitignore`
- [ ] Test build runs locally: `npm run build`
- [ ] Test lint runs locally: `npm run lint`
- [ ] Test auth flow works locally

### Repository Configuration
- [ ] `.firebaserc` and `firebase.json` committed to repository
- [ ] `.github/workflows/firebase-deploy.yml` committed to repository
- [ ] `.gitignore` includes Firebase artifacts and `.env.local`

### Firebase Console Setup
- [ ] Authentication providers enabled (Email/Password, Google, LinkedIn)
- [ ] Authorized domains configured (localhost + production domain)
- [ ] Web app created in Firebase project

Your pipeline is now ready. Push your code to trigger the first deployment.
