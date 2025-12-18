# CI/CD Pipeline - JobMatch AI

Complete automated deployment pipeline for Firebase Hosting using GitHub Actions.

## Quick Links

- **Production URL:** https://ai-career-os-139db.web.app
- **GitHub Actions:** https://github.com/cffrank/jobmatchAI/actions
- **Firebase Console:** https://console.firebase.google.com/project/ai-career-os-139db/hosting
- **Repository:** https://github.com/cffrank/jobmatchAI

## What This Pipeline Does

1. **On Pull Request:**
   - Runs linter and builds your code
   - Deploys to temporary preview URL
   - Posts preview link in PR comments
   - Preview expires after 7 days

2. **On Push to Main:**
   - Runs linter and builds your code
   - Deploys to production automatically
   - Site goes live at https://ai-career-os-139db.web.app

## Setup (One-Time)

### Step 1: Get Firebase Service Account

Visit: https://console.firebase.google.com/project/ai-career-os-139db/settings/serviceaccounts/adminsdk

Click "Generate new private key" → Download JSON file → Copy contents

### Step 2: Add to GitHub Secrets

Visit: https://github.com/cffrank/jobmatchAI/settings/secrets/actions

Create new secret:
- Name: `FIREBASE_SERVICE_ACCOUNT`
- Value: Paste JSON contents from Step 1

### Step 3: Push Configuration

```bash
git add .firebaserc firebase.json .github/workflows/firebase-deploy.yml
git commit -m "Add Firebase CI/CD pipeline"
git push origin main
```

### Step 4: Watch It Deploy

Visit: https://github.com/cffrank/jobmatchAI/actions

After ~3-5 minutes, your app will be live at https://ai-career-os-139db.web.app

## Files Created

| File | Purpose |
|------|---------|
| `.firebaserc` | Firebase project configuration |
| `firebase.json` | Hosting settings (SPA routing, cache headers) |
| `.github/workflows/firebase-deploy.yml` | CI/CD workflow definition |
| `DEPLOYMENT.md` | Complete technical documentation |
| `QUICK-START.md` | Step-by-step setup guide |
| `CI-CD-SUMMARY.md` | Pipeline architecture and features |
| `.github/SETUP-CHECKLIST.md` | Interactive setup checklist |

## Documentation

- **Need setup help?** → Read `QUICK-START.md`
- **Want details?** → Read `DEPLOYMENT.md`
- **Need overview?** → Read `CI-CD-SUMMARY.md`
- **Ready to deploy?** → Follow `.github/SETUP-CHECKLIST.md`

## Pipeline Architecture

```
Push/PR → Build → Lint → Test → Deploy (Preview or Production)
```

### Jobs

1. **build-and-test** - Runs on all pushes and PRs
   - Install dependencies (with cache)
   - Run linter
   - Build application
   - Upload build artifacts

2. **deploy-preview** - Runs only on PRs
   - Download build artifacts
   - Deploy to preview channel
   - Comment with preview URL

3. **deploy-production** - Runs only on main branch
   - Download build artifacts
   - Deploy to live production
   - Notify of successful deployment

## Troubleshooting

**Build fails?**
```bash
npm run build  # Test locally
npm run lint   # Check for errors
```

**Deployment fails?**
- Verify `FIREBASE_SERVICE_ACCOUNT` secret is correct
- Check service account has Firebase Hosting Admin role
- Review workflow logs in Actions tab

**Preview URL not appearing?**
- Wait 2-3 minutes for deployment
- Check workflow run logs
- Verify GITHUB_TOKEN permissions

## Common Commands

```bash
# Local development
npm run dev

# Test build
npm run build
npm run preview

# Manual deployment (if needed)
firebase deploy --only hosting

# View deployment history
firebase hosting:releases:list
```

## Security

- No credentials in code
- Service account with minimal permissions
- All secrets encrypted in GitHub Secrets
- Service account keys excluded from git (.gitignore)

## Performance

- npm cache: ~70% faster installs
- Build artifacts reused across jobs
- 1-year cache for static assets
- Global CDN distribution
- Automatic gzip/brotli compression

## Next Steps

After successful setup:

1. Add custom domain (Firebase Console → Hosting)
2. Enable Firebase Analytics
3. Add environment variables as GitHub secrets
4. Set up deployment notifications

## Support

**Issues with pipeline?**
1. Check GitHub Actions logs
2. Review Firebase Console deployment history
3. See DEPLOYMENT.md troubleshooting section

**Need to rollback?**
Firebase Console → Hosting → Release history → Rollback

## Project Info

- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **CI/CD:** GitHub Actions
- **Hosting:** Firebase Hosting
- **Project ID:** ai-career-os-139db
- **Repository:** cffrank/jobmatchAI

---

**Status:** Ready to deploy  
**Estimated Setup Time:** 10 minutes  
**Created:** 2025-12-18
