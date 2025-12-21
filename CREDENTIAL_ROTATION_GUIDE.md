# Credential Rotation Guide - URGENT

**CRITICAL**: Follow these steps immediately to revoke exposed credentials.

## Step 1: Revoke Firebase API Key

### 1.1 Access Firebase Console
1. Go to https://console.firebase.google.com/project/ai-career-os-139db/settings/general
2. Click on your web app (1:529057497050:web:69933ebef1c282bacecae3)

### 1.2 Regenerate API Key
Firebase Web API keys are special - they're meant to be public but should be restricted.

**Action Required**:
1. Go to: https://console.cloud.google.com/apis/credentials?project=ai-career-os-139db
2. Find the API key: `AIzaSyAaC_RUJUVgJThUOe4GmAChHhd-Du9CvhU`
3. Click on the key name to edit
4. Under "API restrictions":
   - Select "Restrict key"
   - Enable ONLY these APIs:
     - Identity Toolkit API
     - Firebase Authentication API
     - Cloud Firestore API
     - Firebase Storage API
5. Under "Application restrictions":
   - Select "HTTP referrers (websites)"
   - Add your production domains:
     - `https://yourdomain.com/*`
     - `https://*.yourdomain.com/*`
     - `http://localhost:*` (for development)
6. Save changes

**Note**: Firebase Web API keys don't typically need rotation unless severely compromised. Restrictions are the primary security measure.

### 1.3 Enable Firebase App Check (CRITICAL)
This is the proper security measure for Firebase:

1. Go to: https://console.firebase.google.com/project/ai-career-os-139db/appcheck
2. Click "Get started"
3. For Web app, register with reCAPTCHA v3:
   - Get reCAPTCHA keys from: https://www.google.com/recaptcha/admin
   - Add site key to your app
4. Enable enforcement for:
   - Cloud Firestore
   - Cloud Storage
   - Cloud Functions

---

## Step 2: Revoke OpenAI API Key

### 2.1 Access OpenAI Dashboard
1. Go to: https://platform.openai.com/api-keys
2. Log in to your account

### 2.2 Revoke Exposed Key
1. Find the key starting with `sk-proj-nCxiSVttjKwZlP7teW9lkX...`
2. Click the trash/delete icon
3. Confirm revocation

### 2.3 Generate New Key
1. Click "Create new secret key"
2. Name it: `JobMatch AI Functions - Production`
3. Copy the key IMMEDIATELY (you won't see it again)
4. Save to password manager

### 2.4 Update Firebase Functions
```bash
cd /home/carl/application-tracking/jobmatch-ai/functions
firebase functions:secrets:set OPENAI_API_KEY
# Paste the new key when prompted
```

### 2.5 Deploy Updated Functions
```bash
firebase deploy --only functions
```

---

## Step 3: Revoke GitHub Personal Access Token

### 3.1 Access GitHub Settings
1. Go to: https://github.com/settings/tokens
2. Log in if needed

### 3.2 Revoke Exposed Token
1. Find the token: `ghp_YOUR_GITHUB_TOKEN_HERE`
2. Click "Delete" or "Revoke"
3. Confirm deletion

### 3.3 Set Up SSH Authentication (Recommended)
```bash
# Generate new SSH key
ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/id_ed25519_github

# Start ssh-agent
eval "$(ssh-agent -s)"

# Add key to agent
ssh-add ~/.ssh/id_ed25519_github

# Copy public key
cat ~/.ssh/id_ed25519_github.pub
```

### 3.4 Add SSH Key to GitHub
1. Go to: https://github.com/settings/keys
2. Click "New SSH key"
3. Title: "Development Machine - JobMatch AI"
4. Paste the public key
5. Click "Add SSH key"

### 3.5 Update Git Remote
```bash
cd /home/carl/application-tracking/jobmatch-ai

# Remove old remote with embedded token
git remote remove origin

# Add new remote with SSH
git remote add origin git@github.com:cffrank/jobmatchAI.git

# Verify
git remote -v
```

**Alternative: Use GitHub CLI**
```bash
# Install GitHub CLI if not present
# sudo apt install gh

# Authenticate
gh auth login

# Update remote to use gh protocol
git remote set-url origin https://github.com/cffrank/jobmatchAI.git
```

---

## Step 4: Verify Revocation

### 4.1 Test Firebase API Key
Try to make an unauthenticated request with the OLD key - it should fail or be restricted:
```bash
curl "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyAaC_RUJUVgJThUOe4GmAChHhd-Du9CvhU" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

### 4.2 Test OpenAI Key
The old key should return 401 Unauthorized:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-proj-nCxiSVttjKwZlP7teW9lkX..."
```

### 4.3 Test GitHub Token
Should return 401:
```bash
curl -H "Authorization: token ghp_YOUR_GITHUB_TOKEN_HERE" \
  https://api.github.com/user
```

---

## Step 5: Update Environment Variables

### 5.1 Update .env.local
```bash
# Generate new .env.local with NEW credentials only
cat > /home/carl/application-tracking/jobmatch-ai/.env.local << 'EOF'
# Firebase Configuration
# These are PUBLIC but should be restricted in Firebase Console

# After rotation, if you generated a new API key:
VITE_FIREBASE_API_KEY=<NEW_KEY_IF_GENERATED>

# These values remain the same (they're project identifiers, not secrets):
VITE_FIREBASE_AUTH_DOMAIN=ai-career-os-139db.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ai-career-os-139db
VITE_FIREBASE_STORAGE_BUCKET=ai-career-os-139db.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=529057497050
VITE_FIREBASE_APP_ID=1:529057497050:web:69933ebef1c282bacecae3

# For App Check (add reCAPTCHA site key)
VITE_FIREBASE_APP_CHECK_SITE_KEY=<YOUR_RECAPTCHA_SITE_KEY>
EOF
```

### 5.2 Delete Backup Files
```bash
rm -f /home/carl/application-tracking/jobmatch-ai/functions/.env.backup
rm -f /home/carl/application-tracking/jobmatch-ai/github-secrets-reference.txt
```

---

## Step 6: Update GitHub Secrets

After rotating credentials, update GitHub repository secrets:

1. Go to: https://github.com/cffrank/jobmatchAI/settings/secrets/actions
2. Update these secrets with NEW values:
   - `VITE_FIREBASE_API_KEY` (if you generated a new one)
   - Do NOT store the OpenAI key here (use Firebase Functions secrets)

---

## Post-Rotation Checklist

- [ ] Firebase API key restricted to specific APIs and domains
- [ ] Firebase App Check enabled and enforced
- [ ] OpenAI API key revoked and new key generated
- [ ] OpenAI key stored in Firebase Functions secrets
- [ ] GitHub PAT revoked
- [ ] SSH authentication configured for GitHub
- [ ] Git remote updated (no embedded credentials)
- [ ] All backup files with credentials deleted
- [ ] .env.local updated with new credentials (if applicable)
- [ ] GitHub Actions secrets updated
- [ ] Functions redeployed with new secrets
- [ ] All old credentials tested and confirmed revoked

---

## Monitoring

Set up monitoring to detect unauthorized usage:

### Firebase
1. Enable Firebase Authentication monitoring
2. Set up Cloud Monitoring alerts for unusual API usage
3. Review Firebase Usage dashboard daily for next week

### OpenAI
1. Set spending limits in OpenAI dashboard
2. Enable email alerts for API usage
3. Monitor usage dashboard

### GitHub
1. Review repository access logs
2. Enable security alerts for the repository
3. Set up 2FA if not already enabled

---

**CRITICAL**: Complete Steps 1-3 within the next hour. Do not commit any code until credentials are rotated.
