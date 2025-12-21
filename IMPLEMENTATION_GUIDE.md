# Security Remediation Implementation Guide

This guide provides step-by-step instructions to implement all security fixes for the exposed credentials vulnerability.

## Executive Summary

**Priority**: CRITICAL
**Time to Complete**: 2-4 hours
**Impact**: Prevents unauthorized access, data breaches, and financial losses

## Prerequisites

Before starting:
- [ ] Backup entire repository
- [ ] Notify team members about upcoming changes
- [ ] Pause CI/CD pipelines temporarily
- [ ] Have access to Firebase Console, OpenAI dashboard, and GitHub settings

---

## Phase 1: Immediate Credential Rotation (1 hour)

### Step 1.1: Revoke Firebase API Key

⚠️ **Note**: Firebase Web API keys are meant to be public but should be restricted.

1. Go to: https://console.cloud.google.com/apis/credentials?project=ai-career-os-139db
2. Find key: `AIzaSyAaC_RUJUVgJThUOe4GmAChHhd-Du9CvhU`
3. Click on the key to edit
4. Under "Application restrictions":
   - Select "HTTP referrers (websites)"
   - Add your domains:
     ```
     https://yourdomain.com/*
     https://*.yourdomain.com/*
     http://localhost:*
     ```
5. Under "API restrictions":
   - Select "Restrict key"
   - Enable ONLY:
     - Identity Toolkit API
     - Firebase Authentication API
     - Cloud Firestore API
     - Firebase Storage API
6. Click "Save"

### Step 1.2: Enable Firebase App Check

1. Go to: https://console.firebase.google.com/project/ai-career-os-139db/appcheck
2. Click "Get started"
3. Register your web app with reCAPTCHA v3:
   - Get keys from: https://www.google.com/recaptcha/admin
   - Save site key for later
4. Enable enforcement for:
   - ✅ Cloud Firestore
   - ✅ Cloud Storage
   - ✅ Cloud Functions

### Step 1.3: Revoke OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Find key starting with: `sk-proj-nCxiSVttjKwZlP7teW9lkX...`
3. Click delete/revoke
4. Confirm deletion

### Step 1.4: Generate New OpenAI API Key

1. Click "Create new secret key"
2. Name: "JobMatch AI Functions - Production"
3. **Copy immediately** (you won't see it again)
4. Save to password manager

### Step 1.5: Revoke GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Find token: `ghp_YOUR_GITHUB_TOKEN_HERE`
3. Click "Delete"
4. Confirm deletion

### Step 1.6: Set Up SSH Authentication

```bash
# Generate new SSH key
ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/id_ed25519_github

# Start ssh-agent
eval "$(ssh-agent -s)"

# Add key
ssh-add ~/.ssh/id_ed25519_github

# Copy public key
cat ~/.ssh/id_ed25519_github.pub
```

Add to GitHub:
1. Go to: https://github.com/settings/keys
2. Click "New SSH key"
3. Paste public key
4. Save

---

## Phase 2: Clean Git History (30 minutes)

### Step 2.1: Verify Backup Exists

```bash
ls -la /tmp/jobmatch-ai-backup-* 2>/dev/null || echo "No backup found - create one first!"
```

### Step 2.2: Run Git History Cleanup

```bash
cd /home/carl/application-tracking/jobmatch-ai
./scripts/clean-git-history.sh
```

This script will:
- Create a backup
- Remove sensitive files from all commits
- Update remote URL to use SSH
- Delete sensitive files from working directory

### Step 2.3: Verify Cleanup

```bash
# Check that sensitive files are gone from history
git log --all --full-history --source -- github-secrets-reference.txt
# Should show: fatal: ambiguous argument 'github-secrets-reference.txt': unknown revision

git log --all --full-history --source -- .env.local
# Should show: fatal: ambiguous argument '.env.local': unknown revision

git log --all --full-history --source -- functions/.env.backup
# Should show: fatal: ambiguous argument 'functions/.env.backup': unknown revision
```

### Step 2.4: Force Push (Coordinate with Team)

⚠️ **CRITICAL**: Notify all team members before force pushing.

```bash
# Push rewritten history
git push --force --all
git push --force --tags
```

**Team members must then**:
```bash
git fetch origin
git reset --hard origin/main
```

---

## Phase 3: Update Configuration (30 minutes)

### Step 3.1: Update .env.local

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Create new .env.local from example
cp .env.example .env.local

# Edit with your editor and fill in Firebase values
nano .env.local  # or vim, code, etc.
```

Fill in:
```bash
VITE_FIREBASE_API_KEY=AIzaSy...  # Same key (now restricted)
VITE_FIREBASE_AUTH_DOMAIN=ai-career-os-139db.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ai-career-os-139db
VITE_FIREBASE_STORAGE_BUCKET=ai-career-os-139db.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=529057497050
VITE_FIREBASE_APP_ID=1:529057497050:web:69933ebef1c282bacecae3
VITE_FIREBASE_APP_CHECK_SITE_KEY=your_recaptcha_site_key
```

### Step 3.2: Update Firebase Functions Secrets

```bash
cd /home/carl/application-tracking/jobmatch-ai/functions

# Set new OpenAI API key
firebase functions:secrets:set OPENAI_API_KEY
# Paste the NEW key when prompted

# Verify
firebase functions:secrets:access
```

### Step 3.3: Update GitHub Repository Secrets

1. Go to: https://github.com/cffrank/jobmatchAI/settings/secrets/actions
2. Update or create:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_APP_CHECK_SITE_KEY`
   - `FIREBASE_SERVICE_ACCOUNT` (service account JSON)

### Step 3.4: Deploy Updated Functions

```bash
cd /home/carl/application-tracking/jobmatch-ai/functions
firebase deploy --only functions
```

---

## Phase 4: Install Security Safeguards (30 minutes)

### Step 4.1: Install Pre-commit Hooks

```bash
cd /home/carl/application-tracking/jobmatch-ai
./scripts/install-pre-commit-hooks.sh
```

### Step 4.2: Test Pre-commit Hooks

```bash
# Create a test file with fake secret
echo "API_KEY=sk-test-fake-key" > test-secret.txt

# Try to commit (should be blocked)
git add test-secret.txt
git commit -m "Test secret detection"
# Should see: ❌ POTENTIAL SECRETS DETECTED

# Clean up
rm test-secret.txt
git reset HEAD test-secret.txt
```

### Step 4.3: Verify .gitignore

```bash
# Test that .env.local is ignored
touch .env.local
git add .env.local
# Should see: The following paths are ignored by one of your .gitignore files

# Test that backup files are ignored
touch functions/.env.backup
git add functions/.env.backup
# Should see: The following paths are ignored
```

---

## Phase 5: Remove Hardcoded Credentials (30 minutes)

### Step 5.1: Update All Script Files

All scripts have been updated to use the new secure Firebase configuration utility.

Verify the following files no longer contain hardcoded credentials:

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Check for any remaining hardcoded credentials
grep -r "AIzaSyAaC_RUJUVgJThUOe4GmAChHhd-Du9CvhU" scripts/ || echo "✓ No hardcoded Firebase keys found"
grep -r "sk-proj-nCxiSVttjKwZlP7teW9lkX" . || echo "✓ No hardcoded OpenAI keys found"
```

### Step 5.2: Update Script Imports

For scripts that use Firebase, update to use the secure config utility:

```typescript
// Old (INSECURE)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'hardcoded-key',
  // ...
};

// New (SECURE)
import { getFirebaseConfig } from './lib/firebase-config';
const firebaseConfig = getFirebaseConfig();
```

---

## Phase 6: Verification & Testing (30 minutes)

### Step 6.1: Verify Old Credentials Are Revoked

```bash
# Test old Firebase API key (should be restricted now)
curl "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyAaC_RUJUVgJThUOe4GmAChHhd-Du9CvhU" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
# Should fail or be restricted

# Test old OpenAI key (should return 401)
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-proj-nCxiSVttjKwZlP7teW9lkX..." \
  | grep -q "Invalid API key" && echo "✓ Old key revoked"

# Test old GitHub token (should return 401)
curl -H "Authorization: token ghp_YOUR_GITHUB_TOKEN_HERE" \
  https://api.github.com/user \
  | grep -q "Bad credentials" && echo "✓ Old token revoked"
```

### Step 6.2: Test Application

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Install dependencies
npm install

# Run development server
npm run dev
```

Open http://localhost:5173 and test:
- [ ] Login works
- [ ] Data loads from Firestore
- [ ] No console errors about missing credentials

### Step 6.3: Test Firebase Functions

```bash
cd /home/carl/application-tracking/jobmatch-ai/functions

# Test locally
npm run serve

# Test deployed functions
firebase functions:log
# Check for any errors about missing secrets
```

### Step 6.4: Verify Git History

```bash
# Check history size (should be smaller)
du -sh .git

# Verify no secrets in any commit
git log --all --source -p | grep -i "apikey\|api_key\|secret" || echo "✓ No secrets in history"
```

---

## Phase 7: Documentation & Team Communication

### Step 7.1: Update Team Documentation

Ensure all team members have access to:
- [ ] SECRETS_MANAGEMENT.md
- [ ] CREDENTIAL_ROTATION_GUIDE.md
- [ ] SECURITY_AUDIT_REPORT.md
- [ ] This implementation guide

### Step 7.2: Team Meeting

Schedule a team meeting to:
1. Explain what happened
2. Review new security procedures
3. Demonstrate pre-commit hooks
4. Answer questions
5. Get commitment to security practices

### Step 7.3: Update Onboarding

Update new developer onboarding to include:
- Security best practices training
- Pre-commit hook setup
- Secrets management procedures
- Incident response protocol

---

## Verification Checklist

Before considering remediation complete:

### Credentials
- [ ] All exposed Firebase keys restricted
- [ ] Firebase App Check enabled
- [ ] OpenAI API key revoked and rotated
- [ ] GitHub PAT revoked and SSH configured
- [ ] Git remote updated (no embedded credentials)

### Git History
- [ ] Sensitive files removed from all commits
- [ ] Force push completed
- [ ] Team members updated their local repos
- [ ] No secrets found in `git log --all -p`

### Configuration
- [ ] .env.local created and not in git
- [ ] functions/.env.local created and not in git
- [ ] Firebase Functions secrets updated
- [ ] GitHub Actions secrets updated
- [ ] Application works with new credentials

### Security Safeguards
- [ ] .gitignore updated with comprehensive patterns
- [ ] Pre-commit hooks installed and working
- [ ] Hooks tested with fake secrets (blocks correctly)
- [ ] All scripts use environment variables only
- [ ] No hardcoded credentials in codebase

### Documentation
- [ ] SECRETS_MANAGEMENT.md available
- [ ] Team trained on new procedures
- [ ] Onboarding documentation updated
- [ ] Incident documented for future reference

### Monitoring
- [ ] Firebase usage monitoring enabled
- [ ] OpenAI spending limits set
- [ ] GitHub security alerts enabled
- [ ] Alert contacts configured

---

## Rollback Plan

If issues occur during implementation:

### Restore from Backup

```bash
# If git history cleanup fails
cd /tmp
cp -r jobmatch-ai-backup-* /home/carl/application-tracking/jobmatch-ai-restored

cd /home/carl/application-tracking/jobmatch-ai-restored
git remote add origin git@github.com:cffrank/jobmatchAI.git
```

### Restore Old Credentials (Emergency Only)

If new credentials don't work:
1. Re-enable old Firebase API key restrictions (don't use unrestricted)
2. Use new OpenAI key (old one should stay revoked)
3. Debug configuration issues
4. Fix and retry rotation

---

## Post-Implementation Monitoring

### Week 1: Daily Checks

Monitor for:
- Authentication failures
- API usage anomalies
- Cost spikes
- Error rates

### Month 1: Weekly Reviews

Review:
- Access logs
- API usage patterns
- Security alerts
- Team compliance

### Ongoing: Monthly Audits

Audit:
- Who has access to Firebase project
- GitHub repository collaborators
- API key usage
- Secret rotation schedule

---

## Success Criteria

Remediation is successful when:

1. ✅ All exposed credentials are revoked
2. ✅ No secrets exist in git history
3. ✅ Pre-commit hooks prevent future leaks
4. ✅ Application works with new credentials
5. ✅ Team understands new procedures
6. ✅ Monitoring is in place

---

## Support & Questions

If you encounter issues:

1. Check SECURITY_AUDIT_REPORT.md
2. Review SECRETS_MANAGEMENT.md
3. Check Firebase logs for errors
4. Review GitHub Actions run logs
5. Reach out to security team

---

## Timeline Summary

| Phase | Duration | Critical |
|-------|----------|----------|
| 1. Credential Rotation | 1 hour | YES |
| 2. Git History Cleanup | 30 min | YES |
| 3. Update Configuration | 30 min | YES |
| 4. Install Safeguards | 30 min | YES |
| 5. Remove Hardcoded Credentials | 30 min | YES |
| 6. Verification | 30 min | YES |
| 7. Documentation | 30 min | NO |
| **TOTAL** | **4 hours** | |

**Priority**: Complete Phases 1-6 within 4 hours. Phase 7 can be completed within 24 hours.

---

**Remember**: Security is a continuous process, not a one-time fix. Stay vigilant!
