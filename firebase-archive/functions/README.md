# Firebase Cloud Functions

This directory contains the backend Cloud Functions for JobMatch AI.

## Setup

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Configure Environment Variables

**For Local Development:**
Create a `.env` file in the `functions` directory:

```bash
cp .env.example .env
```

Add your OpenAI API key:
```
OPENAI_API_KEY=sk-your-api-key-here
```

**For Production (Firebase):**
Set secrets using Firebase CLI:

```bash
# OpenAI API key
firebase functions:secrets:set OPENAI_API_KEY

# LinkedIn OAuth credentials
firebase functions:secrets:set LINKEDIN_CLIENT_ID
firebase functions:secrets:set LINKEDIN_CLIENT_SECRET
```

View current configuration:
```bash
firebase functions:config:get
firebase functions:secrets:access OPENAI_API_KEY
```

### 3. Test Locally

Start the Firebase emulator:

```bash
npm run serve
# or from project root:
firebase emulators:start --only functions
```

The function will be available at:
```
http://localhost:5001/ai-career-os-139db/us-central1/generateApplication
```

## Available Functions

### `generateApplication` (Callable)

Generates AI-powered tailored resumes and cover letters for job applications.

### `linkedInAuth` (Callable)

Initiates LinkedIn OAuth flow and returns authorization URL.

### `linkedInCallback` (HTTP Request)

Handles LinkedIn OAuth callback, exchanges authorization code for access token, and imports profile data to Firestore.

---

## Function Details

### `generateApplication`

Generates tailored resume and cover letter variants using AI.

**Current Configuration**: GPT-4o-mini (OpenAI)
- Cost: ~$0.001-0.002 per application
- Best value for price

**Alternative Options**:
- GPT-4o: Better quality, ~$0.01/application
- Claude 3.5 Haiku: Best quality, ~$0.008/application (requires switching to `index-claude.js`)

See `AI_MODEL_COMPARISON.md` for detailed comparison and switching instructions.

**Type:** Callable HTTPS function
**Authentication:** Required
**Parameters:**
- `jobId` (string): The ID of the job to apply to

**Returns:**
```typescript
{
  id: string
  jobId: string
  jobTitle: string
  company: string
  status: 'draft'
  createdAt: string
  variants: [
    {
      id: string
      name: string
      resume: {
        summary: string
        experience: Array<{...}>
        skills: string[]
        education: Array<{...}>
      }
      coverLetter: string
      aiRationale: string[]
    }
  ]
  selectedVariantId: string
  editHistory: []
}
```

**Strategies:**
1. **Impact-Focused**: Emphasizes quantifiable achievements and business impact
2. **Keyword-Optimized**: Maximizes ATS keyword matches from job description
3. **Concise**: Streamlined one-page version for senior roles

---

### `linkedInAuth`

**Type:** Callable HTTPS function
**Authentication:** Required
**Parameters:** None

**Returns:**
```typescript
{
  authUrl: string  // LinkedIn authorization URL to redirect user to
  state: string    // CSRF protection state token
}
```

**Usage:**
```typescript
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'

const linkedInAuth = httpsCallable(functions, 'linkedInAuth')
const result = await linkedInAuth()
window.location.href = result.data.authUrl
```

---

### `linkedInCallback`

**Type:** HTTP Request function (onRequest)
**Authentication:** Via OAuth state token
**Triggered by:** LinkedIn OAuth redirect after user authorization

**Flow:**
1. User initiates LinkedIn connection from the app
2. App calls `linkedInAuth` to get authorization URL
3. User is redirected to LinkedIn for authorization
4. LinkedIn redirects to this function with authorization code
5. Function exchanges code for access token
6. Function fetches LinkedIn profile data
7. Function imports data to Firestore under the user's profile
8. User is redirected back to app with success/error status

**Data Imported:**
- Basic profile information (firstName, lastName, email)
- Profile photo URL
- LinkedIn profile headline
- LinkedIn profile URL

**Query Parameters:**
- `code`: Authorization code from LinkedIn
- `state`: CSRF state token for validation
- `error`: Error code if authorization failed

**Redirects:**
- Success: `{APP_URL}/profile?linkedin=success`
- Error: `{APP_URL}/profile?linkedin=error&error={errorCode}`

**Important Notes:**
- Work experience, education, and skills require LinkedIn Partner API access
- Current implementation imports basic profile data only
- Users can manually add work experience or upload resume for parsing

## LinkedIn OAuth Setup

### 1. Create LinkedIn Application

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Click "Create app"
3. Fill in the required information:
   - **App name**: JobMatch AI
   - **LinkedIn Page**: Your company page (or create one)
   - **Privacy policy URL**: Your privacy policy URL
   - **App logo**: Upload your application logo
4. Click "Create app"

### 2. Configure OAuth Settings

1. Navigate to the **Auth** tab in your LinkedIn app
2. Under **OAuth 2.0 settings**, add **Authorized redirect URLs**:
   - Development: `https://us-central1-ai-career-os-139db.cloudfunctions.net/linkedInCallback`
   - Production: Replace `ai-career-os-139db` with your Firebase project ID
3. Request **OAuth 2.0 scopes**:
   - `openid` - Required for authentication
   - `profile` - Access to basic profile data
   - `email` - Access to email address

### 3. Get Client Credentials

1. Go to the **Auth** tab
2. Copy the **Client ID**
3. Copy the **Client Secret** (click "Show" to reveal it)
4. Set these as Firebase secrets:
   ```bash
   firebase functions:secrets:set LINKEDIN_CLIENT_ID
   # Paste your Client ID when prompted

   firebase functions:secrets:set LINKEDIN_CLIENT_SECRET
   # Paste your Client Secret when prompted
   ```

### 4. Set Application URL

Set the application URL for OAuth redirects:

```bash
# For development
firebase functions:config:set app.url="http://localhost:5173"

# For production
firebase functions:config:set app.url="https://ai-career-os-139db.web.app"
```

Or add to `.env` file:
```env
APP_URL=http://localhost:5173
```

### 5. Test OAuth Flow

1. Deploy the functions: `firebase deploy --only functions`
2. In your app, navigate to `/linkedin/import`
3. Click "Connect with LinkedIn"
4. Authorize the app on LinkedIn
5. You should be redirected back to `/profile?linkedin=success`
6. Check your Firestore console to verify the profile data was imported

### Troubleshooting LinkedIn OAuth

**Error: `invalid_redirect_uri`**
- Ensure the redirect URL in LinkedIn app matches exactly: `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/linkedInCallback`
- No trailing slashes
- Must use HTTPS (not HTTP)

**Error: `invalid_state`**
- State token expired (10-minute timeout)
- Try the OAuth flow again

**Error: `token_exchange_failed`**
- Verify LinkedIn Client ID and Client Secret are set correctly
- Check function logs: `firebase functions:log --only linkedInCallback`

---

## Deployment

Deploy all functions:
```bash
npm run deploy
# or from project root:
firebase deploy --only functions
```

Deploy specific function:
```bash
firebase deploy --only functions:generateApplication
firebase deploy --only functions:linkedInAuth
firebase deploy --only functions:linkedInCallback
```

## Monitoring

View function logs:
```bash
npm run logs
# or:
firebase functions:log
```

View logs for specific function:
```bash
firebase functions:log --only generateApplication
```

## Cost Optimization

The `generateApplication` function is configured with:
- **Timeout:** 120 seconds (2 minutes)
- **Memory:** 512MB
- **Runtime:** Node.js 18

**Estimated costs per application (3 variants):**
- Firebase Functions: ~$0.0001 per invocation
- **GPT-4o-mini** (current): ~$0.001-0.002 ✅ **RECOMMENDED**
- GPT-4o: ~$0.01-0.015
- Claude 3.5 Haiku: ~$0.005-0.01 (best quality)

**Monthly costs for 1,000 applications:**
- GPT-4o-mini: ~$1-2 ✅
- Claude 3.5 Haiku: ~$5-10
- GPT-4o: ~$10-15

See `AI_MODEL_COMPARISON.md` for detailed cost analysis.

## Error Handling

The function includes comprehensive error handling:
- **unauthenticated**: User must be signed in
- **not-found**: Job or profile doesn't exist
- **failed-precondition**: User profile incomplete
- **internal**: OpenAI API errors or other failures

Fallback: If OpenAI API fails, a simplified variant is generated using template-based logic.

## Security

- All functions require Firebase Authentication
- User can only generate applications for their own profile
- Firestore security rules enforce user data isolation
- API keys stored securely in Firebase Functions config

## Development Tips

1. Use Firebase emulator for local testing
2. Check function logs for debugging
3. Monitor OpenAI API usage in your OpenAI dashboard
4. Set up billing alerts in Firebase Console
5. Use fallback logic for reliability
