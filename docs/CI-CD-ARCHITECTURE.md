# CI/CD Architecture for JobMatch AI

## Overview

This document describes the complete Continuous Integration and Continuous Deployment (CI/CD) architecture for JobMatch AI, a Firebase + React application.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          GITHUB REPOSITORY                               │
│                      https://github.com/cffrank/jobmatchAI               │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
            ┌───────▼────────┐    ┌──────▼──────┐
            │   Push to Main │    │ Pull Request │
            └───────┬────────┘    └──────┬───────┘
                    │                    │
        ┌───────────┴────────────────────┴──────────┐
        │                                            │
┌───────▼─────────┐                     ┌───────────▼──────────┐
│   CI PIPELINE   │                     │    CI PIPELINE        │
│   (ci.yml)      │                     │    (ci.yml)           │
└───────┬─────────┘                     └───────────┬───────────┘
        │                                           │
        │  ┌─────────────────────────┐             │
        │  │ 1. Frontend Build       │             │
        │  │ 2. Functions Build      │             │
        │  │ 3. Security Scan        │             │
        │  │ 4. Rules Validation     │             │
        │  │ 5. Code Quality         │             │
        │  └─────────────────────────┘             │
        │                                           │
        ├─── All Checks Pass ✓ ────────────────────┤
        │                                           │
┌───────▼──────────┐                   ┌────────────▼──────────┐
│ DEPLOY PIPELINE  │                   │  DEPLOY PIPELINE       │
│  (deploy.yml)    │                   │   (deploy.yml)         │
└───────┬──────────┘                   └────────────┬───────────┘
        │                                           │
┌───────▼──────────┐                   ┌────────────▼──────────┐
│   PRODUCTION     │                   │  STAGING (Preview)     │
│   ENVIRONMENT    │                   │    ENVIRONMENT         │
└───────┬──────────┘                   └────────────┬───────────┘
        │                                           │
┌───────▼─────────────────────┐        ┌───────────▼────────────────────┐
│ Firebase Project            │        │ Firebase Preview Channel       │
│ - Hosting (Live)            │        │ - Hosting (pr-{number})        │
│ - Functions                 │        │ - Expires in 7 days            │
│ - Firestore Rules           │        │ - Comment on PR with URL       │
│ - Storage Rules             │        └────────────────────────────────┘
│ - Firestore Indexes         │
│                             │
│ Health Check ✓              │
│ Deployment Notification     │
└─────────────────────────────┘
```

## Pipeline Components

### 1. CI Pipeline (`ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`

**Jobs:**

#### 1.1 Frontend Build & Test
- Checkout code
- Setup Node.js 20
- Cache npm dependencies
- Install dependencies (`npm ci`)
- Run ESLint
- Run TypeScript type checking
- Build frontend application
- Upload build artifacts

#### 1.2 Functions Build & Test
- Checkout code
- Setup Node.js 20
- Cache functions dependencies
- Install functions dependencies
- Validate functions code
- Run functions tests (if available)

#### 1.3 Security Scanning
- Secret scanning with Gitleaks
- Frontend dependency vulnerability scan (`npm audit`)
- Functions dependency vulnerability scan (`npm audit`)

#### 1.4 Firebase Rules Validation
- Validate Firestore security rules syntax
- Validate Storage security rules syntax
- Check for dangerous patterns (`if true`)
- Ensure authentication checks exist

#### 1.5 Code Quality Report
- Count TypeScript/JavaScript files
- Calculate lines of code
- Generate quality metrics

#### 1.6 CI Success Summary
- Requires all previous jobs to pass
- Displays success summary

### 2. Deployment Pipeline (`deploy.yml`)

**Triggers:**
- Push to `main` branch (Production)
- Pull requests to `main` (Staging)
- Manual workflow dispatch

**Jobs:**

#### 2.1 Build
- Checkout code
- Install and cache dependencies
- Run linter
- TypeScript type checking
- Build frontend with environment variables
- Install functions dependencies
- Upload all build artifacts

#### 2.2 Deploy to Staging (Preview)
- **Condition:** Pull requests only
- **Environment:** staging
- Download build artifacts
- Deploy to Firebase Preview Channel
- Channel ID: `pr-{pr_number}`
- Expires: 7 days
- Comment on PR with preview URL

#### 2.3 Deploy to Production
- **Condition:** Push to main branch only
- **Environment:** production
- Download build artifacts
- Deploy Firestore rules
- Deploy Storage rules
- Deploy Firestore indexes
- Deploy Firebase Functions
- Deploy to Firebase Hosting (live channel)
- Verify deployment health (HTTP 200 check)
- Create deployment summary
- Notify success or trigger rollback guidance

### 3. Security Workflow (`security-scan.yml`)

**Triggers:**
- Weekly scheduled scan (Mondays at 00:00 UTC)
- Manual workflow dispatch

**Jobs:**

#### 3.1 Dependency Security Audit
- Run comprehensive npm audit
- Check for high/critical vulnerabilities
- Generate vulnerability report

#### 3.2 Secret Scanning
- Scan entire repository for leaked secrets
- Check for API keys, tokens, credentials
- Fail if secrets detected

#### 3.3 Code Security Analysis
- Static code analysis
- Check for common security anti-patterns
- Validate environment variable usage

## Environment Configuration

### Development (Local)
- **Purpose:** Local development and testing
- **Firebase Project:** Use emulators
- **Configuration:** `.env.local`

### Staging (Preview Channels)
- **Purpose:** PR testing and validation
- **Firebase Project:** Same as production (preview channels)
- **URL Pattern:** `https://PROJECT_ID--pr-{number}-HASH.web.app`
- **Lifetime:** 7 days
- **Configuration:** Secrets in GitHub

### Production (Live)
- **Purpose:** Production application
- **Firebase Project:** ai-career-os-139db
- **URL:** `https://ai-career-os-139db.web.app`
- **Configuration:** Secrets in GitHub

## Required GitHub Secrets

### Firebase Configuration
- `FIREBASE_SERVICE_ACCOUNT` - Service account JSON for GitHub Actions
- `FIREBASE_PROJECT_ID` - Firebase project ID (ai-career-os-139db)
- `FIREBASE_TOKEN` - Firebase CI token (for CLI commands)

### Frontend Environment Variables
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### Functions Environment Variables
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `SENDGRID_API_KEY` - SendGrid API key for email notifications

## Deployment Strategy

### Zero-Downtime Deployment
Firebase Hosting automatically provides zero-downtime deployments:
1. New version is uploaded to Firebase
2. Firebase activates new version atomically
3. Old version remains accessible during transition
4. Instant rollback capability via Firebase Console

### Rollback Procedures

#### Automatic Rollback Triggers
- Health check failure (HTTP non-200 response)
- Functions deployment failure
- Rules deployment failure

#### Manual Rollback
If automatic rollback fails or manual intervention is needed:

```bash
# View hosting release history
firebase hosting:releases:list --project ai-career-os-139db

# Rollback to previous version
firebase hosting:rollback --project ai-career-os-139db

# Clone a previous hosting version to live
firebase hosting:clone SOURCE_SITE_ID:SOURCE_CHANNEL_ID ai-career-os-139db:live
```

## Health Checks

### Post-Deployment Health Checks
1. **HTTP Status Check:** Verify production URL returns 200
2. **Wait Period:** 10 seconds for propagation
3. **Failure Action:** Exit with error code, trigger rollback guidance

### Monitoring Integration
- Firebase Performance Monitoring (automatic)
- Firebase Analytics (automatic)
- Custom monitoring should be added for:
  - API endpoint health
  - Function execution success rates
  - Database query performance

## Security Measures

### 1. Secret Management
- All secrets stored in GitHub Secrets (encrypted at rest)
- No secrets in code or configuration files
- Environment variables injected at build/deploy time
- Functions secrets configured via Firebase environment

### 2. Secret Scanning
- Gitleaks scans for leaked credentials
- Runs on every push and PR
- Fails pipeline if secrets detected

### 3. Dependency Scanning
- npm audit runs on every CI build
- Checks for known vulnerabilities
- Separate scans for frontend and functions

### 4. Firebase Rules Validation
- Syntax validation before deployment
- Pattern checking for dangerous rules
- Authentication verification

### 5. Access Controls
- GitHub branch protection on `main`
- Required status checks before merge
- GitHub Environments for production deployments
- Service account with least-privilege permissions

## Performance Optimizations

### 1. Caching Strategy
- **npm dependencies:** Cached between builds
- **Functions dependencies:** Separate cache
- **Build artifacts:** Uploaded once, reused in deploy jobs

### 2. Parallel Execution
- Frontend and Functions builds run in parallel
- Security scans run independently
- Reduces total pipeline time

### 3. Smart Triggers
- Concurrency control prevents duplicate runs
- Cancel in-progress runs for new commits (CI only)
- Deployment runs sequentially (no cancellation)

## Notifications

### Pull Request Comments
- Preview URL automatically commented on PR
- Deployment status and components
- Expiration notice

### Deployment Summaries
- GitHub Actions summary page
- Deployed components checklist
- Deployment timestamp and URL

### Failure Notifications
- Job failures visible in GitHub Actions UI
- Optional: Configure Slack/Email notifications
- Rollback guidance displayed in logs

## Best Practices

### 1. Never Skip CI
- All code changes must pass CI before merge
- No direct commits to main branch
- Use branch protection rules

### 2. Review Security Scans
- Address high/critical vulnerabilities promptly
- Review dependency updates regularly
- Never commit secrets to repository

### 3. Test Before Production
- Always test in preview environment
- Review preview deployments on PRs
- Validate functionality before merging

### 4. Monitor Deployments
- Watch deployment logs in GitHub Actions
- Check Firebase Console after deployment
- Verify health checks pass

### 5. Regular Maintenance
- Update dependencies monthly
- Review and update Firebase rules
- Rotate secrets periodically
- Monitor Firebase usage and quotas

## Troubleshooting

See [DEPLOYMENT-RUNBOOK.md](./DEPLOYMENT-RUNBOOK.md) for detailed troubleshooting procedures.

## Future Enhancements

### Recommended Additions
1. **E2E Testing:** Playwright/Cypress tests in CI
2. **Performance Testing:** Lighthouse CI integration
3. **Code Coverage:** Track test coverage metrics
4. **Slack Integration:** Deployment notifications to team channel
5. **Staging Environment:** Dedicated staging Firebase project
6. **Feature Flags:** Gradual rollout capabilities
7. **Monitoring Alerts:** PagerDuty/Opsgenie integration
8. **Database Migrations:** Automated Firestore schema updates
9. **Cost Monitoring:** Firebase usage alerts
10. **Documentation Generation:** Auto-generate API docs

## Compliance & Governance

### Audit Trail
- All deployments logged in GitHub Actions
- Firebase deployment history available
- Git commit history provides full audit trail

### Compliance Considerations
- Secrets encrypted at rest and in transit
- Access controls via GitHub permissions
- Deployment approvals for production (optional)
- Automated security scanning

## Support & Contact

For issues with the CI/CD pipeline:
1. Check GitHub Actions logs
2. Review [DEPLOYMENT-RUNBOOK.md](./DEPLOYMENT-RUNBOOK.md)
3. Consult [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
4. Contact DevOps team

---

**Last Updated:** 2025-12-19
**Version:** 1.0
**Owner:** DevOps Team
