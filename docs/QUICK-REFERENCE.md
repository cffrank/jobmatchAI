# CI/CD Quick Reference

## Installation (One-time Setup)

```bash
# 1. Copy workflow files
cp docs/workflows/ci.yml .github/workflows/ci.yml
cp docs/workflows/deploy.yml .github/workflows/deploy.yml
cp docs/workflows/security-scan.yml .github/workflows/security-scan.yml

# 2. Commit and push
git add .github/workflows/ docs/
git commit -m "Add CI/CD pipeline"
git push origin main

# 3. Configure 11 GitHub Secrets at:
# https://github.com/cffrank/jobmatchAI/settings/secrets/actions

# 4. Enable branch protection at:
# https://github.com/cffrank/jobmatchAI/settings/branches
```

## Required GitHub Secrets (11 total)

```
FIREBASE_SERVICE_ACCOUNT          # Service account JSON
FIREBASE_PROJECT_ID               # ai-career-os-139db
FIREBASE_TOKEN                    # From: firebase login:ci

VITE_FIREBASE_API_KEY            # From Firebase Console
VITE_FIREBASE_AUTH_DOMAIN        # ai-career-os-139db.firebaseapp.com
VITE_FIREBASE_PROJECT_ID         # ai-career-os-139db
VITE_FIREBASE_STORAGE_BUCKET     # ai-career-os-139db.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID

OPENAI_API_KEY                   # From OpenAI
SENDGRID_API_KEY                 # From SendGrid
```

## Daily Developer Workflow

```bash
# Create feature
git checkout -b feature/my-feature
# ... make changes ...
git push origin feature/my-feature
gh pr create --title "My feature"
# → CI runs + preview deployment created

# After approval
gh pr merge
# → Production deployment automatic
```

## Quick Commands

```bash
# Check deployment status
firebase hosting:channel:list --project ai-career-os-139db

# Rollback immediately
firebase hosting:rollback --project ai-career-os-139db

# View function logs
firebase functions:log --project ai-career-os-139db --lines 50

# Deploy manually (emergency)
firebase deploy --project ai-career-os-139db
```

## URLs

- **GitHub Actions:** https://github.com/cffrank/jobmatchAI/actions
- **Firebase Console:** https://console.firebase.google.com/project/ai-career-os-139db
- **Production:** https://ai-career-os-139db.web.app
- **Secrets Config:** https://github.com/cffrank/jobmatchAI/settings/secrets/actions

## Troubleshooting

| Issue | Quick Fix |
|-------|-----------|
| CI failing | Check logs, run `npm run lint && npm run build` locally |
| Deployment stuck | Cancel workflow, check Firebase status, retry |
| Preview not created | Verify FIREBASE_SERVICE_ACCOUNT secret |
| Secrets not working | Check all 11 secrets configured, no extra spaces |

## Pipeline Flow

```
PR Created → CI (5-7 min) → Preview (3-5 min) → Review → Merge → Production (8-12 min)
```

## Documentation

- **Full Setup:** `docs/ENVIRONMENT-SETUP.md`
- **Architecture:** `docs/CI-CD-ARCHITECTURE.md`
- **Operations:** `docs/DEPLOYMENT-RUNBOOK.md`
- **Overview:** `docs/CI-CD-README.md`
