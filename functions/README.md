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
Set the API key using Firebase CLI:

```bash
firebase functions:config:set openai.api_key="sk-your-api-key-here"
```

View current configuration:
```bash
firebase functions:config:get
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
