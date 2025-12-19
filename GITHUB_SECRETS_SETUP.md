# GitHub Secrets Setup - Quick Reference

This guide shows you exactly how to set up the required GitHub Secrets for JobMatch AI deployment.

## Required Secrets (7 total)

You need to add 7 secrets to your GitHub repository before the CI/CD pipeline will work.

## Step-by-Step Instructions

### Step 1: Get Your Firebase Configuration

1. Open [Firebase Console](https://console.firebase.google.com/project/ai-career-os-139db/settings/general)
2. Scroll down to "Your apps" section
3. **If you see a web app already**: Click the gear icon → Config
4. **If no web app exists**:
   - Click "Add app"
   - Choose Web (</> icon)
   - App nickname: `JobMatch AI Web`
   - Check "Also set up Firebase Hosting" (optional)
   - Click "Register app"
   - Copy the config object

You'll see something like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC_example_key_here",
  authDomain: "ai-career-os-139db.firebaseapp.com",
  projectId: "ai-career-os-139db",
  storageBucket: "ai-career-os-139db.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

**Keep this tab open** - you'll copy these values in the next step.

---

### Step 2: Add Secrets to GitHub

1. Go to your repository: https://github.com/cffrank/jobmatchAI
2. Click **Settings** (top navigation)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click the green **"New repository secret"** button

Now add each secret one by one:

#### Secret 1: VITE_FIREBASE_API_KEY
- Name: `VITE_FIREBASE_API_KEY`
- Value: Copy the `apiKey` from Firebase (starts with "AIza...")
- Click "Add secret"

#### Secret 2: VITE_FIREBASE_AUTH_DOMAIN
- Click "New repository secret" again
- Name: `VITE_FIREBASE_AUTH_DOMAIN`
- Value: Copy the `authDomain` from Firebase (e.g., "ai-career-os-139db.firebaseapp.com")
- Click "Add secret"

#### Secret 3: VITE_FIREBASE_PROJECT_ID
- Click "New repository secret" again
- Name: `VITE_FIREBASE_PROJECT_ID`
- Value: `ai-career-os-139db`
- Click "Add secret"

#### Secret 4: VITE_FIREBASE_STORAGE_BUCKET
- Click "New repository secret" again
- Name: `VITE_FIREBASE_STORAGE_BUCKET`
- Value: Copy the `storageBucket` from Firebase (e.g., "ai-career-os-139db.firebasestorage.app")
- Click "Add secret"

#### Secret 5: VITE_FIREBASE_MESSAGING_SENDER_ID
- Click "New repository secret" again
- Name: `VITE_FIREBASE_MESSAGING_SENDER_ID`
- Value: Copy the `messagingSenderId` from Firebase (numbers only)
- Click "Add secret"

#### Secret 6: VITE_FIREBASE_APP_ID
- Click "New repository secret" again
- Name: `VITE_FIREBASE_APP_ID`
- Value: Copy the `appId` from Firebase (e.g., "1:123456789012:web:abc123")
- Click "Add secret"

#### Secret 7: FIREBASE_SERVICE_ACCOUNT
This one is different - it's for deployment authentication.

1. Go to [Firebase Console → Service Accounts](https://console.firebase.google.com/project/ai-career-os-139db/settings/serviceaccounts/adminsdk)
2. Click **"Generate new private key"**
3. Click **"Generate key"** in the confirmation dialog
4. A JSON file will download to your computer
5. Open the JSON file in a text editor (Notepad, TextEdit, VS Code, etc.)
6. Copy the **entire contents** of the file (all the JSON)
7. Back in GitHub, click "New repository secret"
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Value: Paste the entire JSON contents
   - Click "Add secret"

---

### Step 3: Verify Secrets Are Added

You should now see 7 secrets in the list:

- ✅ FIREBASE_SERVICE_ACCOUNT
- ✅ VITE_FIREBASE_API_KEY
- ✅ VITE_FIREBASE_APP_ID
- ✅ VITE_FIREBASE_AUTH_DOMAIN
- ✅ VITE_FIREBASE_MESSAGING_SENDER_ID
- ✅ VITE_FIREBASE_PROJECT_ID
- ✅ VITE_FIREBASE_STORAGE_BUCKET

**Note:** You won't be able to see the secret values after adding them (GitHub hides them for security). That's normal!

---

### Step 4: Update Local .env.local

For local development, you also need these values in a `.env.local` file.

1. Open your project in your code editor
2. Navigate to `/jobmatch-ai/` directory
3. Create a file named `.env.local` (if it doesn't exist)
4. Add the following content (replace with your actual values):

```env
VITE_FIREBASE_API_KEY=AIzaSyC_your_actual_key_here
VITE_FIREBASE_AUTH_DOMAIN=ai-career-os-139db.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ai-career-os-139db
VITE_FIREBASE_STORAGE_BUCKET=ai-career-os-139db.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
```

5. Save the file

**Important:** Do NOT commit `.env.local` to git! It's already in `.gitignore`.

---

## Testing

### Test Local Development

```bash
cd jobmatch-ai
npm run dev
```

Visit http://localhost:5173 - you should be redirected to the login page. If you see a Firebase error, check your `.env.local` values.

### Test Production Build

```bash
npm run build
```

If the build succeeds, your GitHub Secrets are configured correctly.

### Test GitHub Actions

1. Commit and push any change to a new branch
2. Create a pull request
3. GitHub Actions should automatically:
   - Build your app
   - Deploy a preview URL
   - Comment on the PR with the preview link

If the build fails, check the Actions tab for error messages.

---

## Troubleshooting

### "Firebase configuration is missing"

**Cause:** Environment variables not loading correctly.

**Fix:**
1. Verify `.env.local` file exists in `/jobmatch-ai/` directory
2. Check that variable names are exactly: `VITE_FIREBASE_API_KEY` (not `FIREBASE_API_KEY`)
3. Restart the dev server: `npm run dev`

### GitHub Actions build fails with environment variable error

**Cause:** GitHub Secrets not set correctly.

**Fix:**
1. Go to Settings → Secrets and variables → Actions
2. Verify all 7 secrets are present
3. Check secret names match exactly (case-sensitive)
4. Re-run the failed workflow

### "Permission denied" during deployment

**Cause:** Service account secret is invalid or has wrong permissions.

**Fix:**
1. Generate a new service account key from Firebase Console
2. Update the `FIREBASE_SERVICE_ACCOUNT` secret with the new JSON
3. Re-run the workflow

---

## Quick Copy-Paste Template

Use this template to organize your values before adding them to GitHub:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
FIREBASE_SERVICE_ACCOUNT=
```

---

## Security Notes

✅ **Safe to use in client code:**
- All `VITE_FIREBASE_*` values are bundled into your frontend app
- Firebase API keys are designed to be public
- Access is controlled by Firebase Security Rules, not API key secrecy

❌ **Never commit to git:**
- `.env.local` file
- Service account JSON files
- Any file containing actual secret values

✅ **Always use GitHub Secrets for:**
- CI/CD pipelines
- Production deployments
- Any automated processes

---

## Next Steps

After setting up secrets:

1. ✅ Test local development works
2. ✅ Create a test PR to verify preview deployments
3. ✅ Merge to main to verify production deployment
4. 🔜 Configure Firebase Authentication providers
5. 🔜 Set up Firestore and Storage security rules

---

**Need help?** Check the full [DEPLOYMENT.md](./DEPLOYMENT.md) guide for more details.
