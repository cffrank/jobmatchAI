# Deployment Guide - JobMatch AI

This guide covers deploying the JobMatch AI application with Firebase Cloud Functions.

## Prerequisites

1. **Firebase CLI installed**
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase project created**
   - Project ID: `ai-career-os-139db`
   - Firebase Authentication, Firestore, Storage, and Functions enabled

3. **OpenAI API Key**
   - Sign up at https://platform.openai.com/
   - Create an API key
   - Ensure billing is set up (GPT-4 Turbo access required)

## Step 1: Configure Firebase

Login to Firebase:
```bash
firebase login
```

Set the active project:
```bash
firebase use ai-career-os-139db
```

## Step 2: Set Environment Variables

### For Production (Firebase)

Set the OpenAI API key:
```bash
firebase functions:config:set openai.api_key="sk-your-openai-api-key"
```

Verify configuration:
```bash
firebase functions:config:get
```

### For Local Development

Create `.env` file in `functions/` directory:
```bash
cd functions
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

## Step 3: Deploy Cloud Functions

Deploy only functions:
```bash
firebase deploy --only functions
```

Monitor deployment:
```bash
firebase functions:log
```

## Step 4: Test AI Generation

1. Open your deployed app
2. Sign in
3. Browse jobs
4. Click "Apply" on a job
5. Verify AI generation creates 3 tailored variants

## Cost Management

### Estimated Monthly Costs

For 1,000 application generations/month:
- Firebase Functions: ~$0.40
- OpenAI API: ~$30-50
- **Total**: ~$30-50/month

## Monitoring

View function logs:
```bash
firebase functions:log --only generateApplication
```

## Troubleshooting

### "OpenAI API error"

- Check API key is set: `firebase functions:config:get`
- Verify OpenAI billing is active
- Check rate limits in OpenAI dashboard
