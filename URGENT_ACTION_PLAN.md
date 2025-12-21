# 🚨 URGENT ACTION PLAN - Exposed Credentials

**Date**: 2025-12-19
**Priority**: CRITICAL
**Action Required**: IMMEDIATE

---

## ⏰ Timeline: Complete Within 4 Hours

This is a **CRITICAL SECURITY INCIDENT**. Multiple credentials have been exposed in the repository. Follow this action plan immediately.

---

## 🎯 Phase 1: IMMEDIATE (First Hour)

### Actions You Must Take RIGHT NOW

#### 1. Revoke GitHub Personal Access Token (5 minutes)

**Risk**: Someone could access and modify all your repositories.

**Action**:
1. Go to: https://github.com/settings/tokens
2. Find token: `ghp_YOUR_GITHUB_TOKEN_HERE`
3. Click "Delete"
4. Confirm deletion

✅ **Verification**: Try using the old token - should get 401 Unauthorized

---

#### 2. Revoke OpenAI API Key (5 minutes)

**Risk**: Unlimited API charges on your account (potentially $$$).

**Action**:
1. Go to: https://platform.openai.com/api-keys
2. Find key starting with: `sk-proj-nCxiSVttjKwZlP7teW9lkX`
3. Click delete/revoke
4. Immediately generate NEW key
5. Name it: "JobMatch AI Functions - Production"
6. **COPY IT** (you won't see it again)
7. Save to password manager

✅ **Verification**: Old key should return 401 when tested

---

#### 3. Restrict Firebase API Key (10 minutes)

**Risk**: Unauthorized Firebase Authentication and data access.

**Action**:
1. Go to: https://console.cloud.google.com/apis/credentials?project=ai-career-os-139db
2. Find key: `AIzaSyAaC_RUJUVgJThUOe4GmAChHhd-Du9CvhU`
3. Click to edit
4. Under "Application restrictions":
   - Select "HTTP referrers (websites)"
   - Add: `https://yourdomain.com/*`, `http://localhost:*`
5. Under "API restrictions":
   - Select "Restrict key"
   - Enable ONLY:
     - Identity Toolkit API
     - Firebase Authentication API
     - Cloud Firestore API
     - Cloud Storage API
6. Save

✅ **Verification**: Key should only work from allowed domains

---

#### 4. Enable Firebase App Check (10 minutes)

**Risk**: Unrestricted access to Firebase services.

**Action**:
1. Go to: https://console.firebase.google.com/project/ai-career-os-139db/appcheck
2. Click "Get started"
3. For web app, use reCAPTCHA v3:
   - Get keys from: https://www.google.com/recaptcha/admin
   - Register your domain
   - Save site key
4. Enable enforcement for:
   - Cloud Firestore ✅
   - Cloud Storage ✅
   - Cloud Functions ✅

✅ **Verification**: App Check should be active in Firebase Console

---

#### 5. Set Up SSH for GitHub (15 minutes)

**Action**:
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/id_ed25519_github

# Start agent
eval "$(ssh-agent -s)"

# Add key
ssh-add ~/.ssh/id_ed25519_github

# Copy public key
cat ~/.ssh/id_ed25519_github.pub
```

Then:
1. Go to: https://github.com/settings/keys
2. Click "New SSH key"
3. Paste public key
4. Save

✅ **Verification**: `ssh -T git@github.com` should succeed

---

#### 6. Update Git Remote (5 minutes)

**Action**:
```bash
cd /home/carl/application-tracking/jobmatch-ai

# Remove old remote with embedded token
git remote remove origin

# Add new SSH remote
git remote add origin git@github.com:cffrank/jobmatchAI.git

# Verify
git remote -v
```

✅ **Verification**: Remote URL should use `git@github.com`, not https with token

---

#### 7. Update OpenAI Key in Firebase Functions (10 minutes)

**Action**:
```bash
cd /home/carl/application-tracking/jobmatch-ai/functions

# Set NEW OpenAI key
firebase functions:secrets:set OPENAI_API_KEY
# Paste the NEW key when prompted

# Deploy functions
firebase deploy --only functions
```

✅ **Verification**: Functions should deploy successfully with new secret

---

## 🧹 Phase 2: Clean Git History (30 minutes)

### Remove Sensitive Files from All Commits

**Action**:
```bash
cd /home/carl/application-tracking/jobmatch-ai

# Run the automated cleanup script
./scripts/clean-git-history.sh
```

**What the script does**:
1. Creates backup in `/tmp/`
2. Removes these files from ALL commits:
   - `github-secrets-reference.txt`
   - `.env.local`
   - `functions/.env.backup`
3. Updates git remote to SSH
4. Deletes files from working directory

**After script completes**:

```bash
# Verify files are gone from history
git log --all --full-history -- github-secrets-reference.txt
# Should show: fatal: ambiguous argument

# Force push (COORDINATE WITH TEAM FIRST)
git push --force --all
git push --force --tags
```

⚠️ **CRITICAL**: All team members must then run:
```bash
git fetch origin
git reset --hard origin/main
```

✅ **Verification**: No secrets should appear in `git log --all -p`

---

## ⚙️ Phase 3: Update Configuration (30 minutes)

### Create New Environment Files

**Action**:
```bash
cd /home/carl/application-tracking/jobmatch-ai

# Copy templates
cp .env.example .env.local
cp functions/.env.example functions/.env

# Edit .env.local
nano .env.local
```

**Fill in .env.local**:
```bash
VITE_FIREBASE_API_KEY=AIzaSy...  # Same key (now restricted)
VITE_FIREBASE_AUTH_DOMAIN=ai-career-os-139db.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ai-career-os-139db
VITE_FIREBASE_STORAGE_BUCKET=ai-career-os-139db.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=529057497050
VITE_FIREBASE_APP_ID=1:529057497050:web:69933ebef1c282bacecae3
VITE_FIREBASE_APP_CHECK_SITE_KEY=your_recaptcha_site_key
```

**Fill in functions/.env** (for local dev only):
```bash
OPENAI_API_KEY=sk-proj-YOUR_NEW_KEY_HERE
```

✅ **Verification**: Files exist and are in .gitignore

---

### Update GitHub Repository Secrets

**Action**:
1. Go to: https://github.com/cffrank/jobmatchAI/settings/secrets/actions
2. Update these secrets:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_APP_CHECK_SITE_KEY`
   - `FIREBASE_SERVICE_ACCOUNT` (JSON)

✅ **Verification**: All 8 secrets should be listed in GitHub

---

## 🛡️ Phase 4: Install Security Safeguards (15 minutes)

### Install Pre-commit Hooks

**Action**:
```bash
cd /home/carl/application-tracking/jobmatch-ai

# Install hooks
./scripts/install-pre-commit-hooks.sh
```

**Test the hooks**:
```bash
# Create test file with fake secret
echo "API_KEY=sk-test-fake-key-12345" > test-secret.txt

# Try to commit (should be BLOCKED)
git add test-secret.txt
git commit -m "Test"
# Should see: ❌ POTENTIAL SECRETS DETECTED

# Clean up
rm test-secret.txt
git reset HEAD test-secret.txt
```

✅ **Verification**: Hooks should block commits with secrets

---

## ✅ Phase 5: Verify Everything Works (15 minutes)

### Test Application

**Action**:
```bash
cd /home/carl/application-tracking/jobmatch-ai

# Install dependencies
npm install

# Start dev server
npm run dev
```

**Test**:
- [ ] Application loads without errors
- [ ] Login works
- [ ] Data loads from Firestore
- [ ] No console errors about credentials

✅ **Verification**: Application fully functional

---

### Verify Old Credentials Are Revoked

**Test GitHub Token** (should fail):
```bash
curl -H "Authorization: token ghp_YOUR_GITHUB_TOKEN_HERE" \
  https://api.github.com/user
# Should return: "Bad credentials"
```

**Test OpenAI Key** (should fail):
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-proj-nCxiSVttjKwZlP7teW9lkX..."
# Should return: "Invalid API key"
```

✅ **Verification**: All old credentials should be invalid

---

## 📋 Final Checklist

Before considering this incident resolved:

### Credentials
- [ ] GitHub PAT revoked and SSH configured
- [ ] OpenAI API key revoked and rotated
- [ ] Firebase API key restricted in Cloud Console
- [ ] Firebase App Check enabled
- [ ] Git remote updated (no embedded credentials)

### Git History
- [ ] clean-git-history.sh executed successfully
- [ ] Sensitive files removed from all commits
- [ ] Force push completed
- [ ] Team members updated their repos
- [ ] Verified no secrets in git history

### Configuration
- [ ] .env.local created with new credentials
- [ ] functions/.env created for local dev
- [ ] Firebase Functions secrets updated
- [ ] GitHub repository secrets updated
- [ ] Application works with new configuration

### Security
- [ ] .gitignore updated with comprehensive patterns
- [ ] Pre-commit hooks installed
- [ ] Hooks tested and working
- [ ] All scripts use environment variables
- [ ] No hardcoded credentials remain

### Verification
- [ ] Old credentials tested and confirmed revoked
- [ ] New credentials tested and working
- [ ] Application fully functional
- [ ] No errors in logs
- [ ] Monitoring enabled

### Documentation
- [ ] Team notified of incident
- [ ] Team briefed on new procedures
- [ ] Onboarding docs updated
- [ ] Incident documented

---

## 📞 If You Need Help

### Documentation References
1. **SECURITY_AUDIT_REPORT.md** - Detailed vulnerability findings
2. **CREDENTIAL_ROTATION_GUIDE.md** - Complete rotation instructions
3. **IMPLEMENTATION_GUIDE.md** - Full implementation plan
4. **SECRETS_MANAGEMENT.md** - Ongoing secrets management
5. **SECURITY_REMEDIATION_README.md** - Quick reference

### Common Issues

**Issue**: "git-filter-repo not found"
**Solution**: Already installed at `~/.local/bin/git-filter-repo`. Add to PATH.

**Issue**: "pre-commit hook not running"
**Solution**: Ensure `.husky/pre-commit` is executable: `chmod +x .husky/pre-commit`

**Issue**: "Firebase Functions deploy fails"
**Solution**: Check that OpenAI secret is set: `firebase functions:secrets:access`

**Issue**: "Application won't start"
**Solution**: Verify `.env.local` exists and has all required variables

---

## ⚠️ CRITICAL REMINDERS

1. **DO NOT COMMIT** until all credentials are rotated
2. **COORDINATE** with team before force pushing
3. **TEST** old credentials to verify revocation
4. **BACKUP** before running git history cleanup
5. **DOCUMENT** everything you do

---

## 🎯 Success Criteria

You're done when:
- ✅ All old credentials are revoked and verified
- ✅ New credentials are in place and working
- ✅ Git history contains no secrets
- ✅ Pre-commit hooks block secret commits
- ✅ Application is fully functional
- ✅ Team is informed and trained

---

## ⏱️ Time Allocation

| Phase | Duration | Status |
|-------|----------|--------|
| 1. Credential Rotation | 1 hour | ⬜ |
| 2. Git History Cleanup | 30 min | ⬜ |
| 3. Update Configuration | 30 min | ⬜ |
| 4. Install Safeguards | 15 min | ⬜ |
| 5. Verify Everything | 15 min | ⬜ |
| **TOTAL** | **~2.5 hours** | |

---

**START IMMEDIATELY**

Every minute that exposed credentials remain active increases risk.

**Priority**: CRITICAL
**Status**: Action Required
**Timeline**: Complete today

---

*This is a security incident. Treat it with urgency.*
