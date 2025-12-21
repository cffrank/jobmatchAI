# GitHub Secrets Setup for CICD Backend Deployment

This guide walks you through setting up GitHub Secrets for automated Railway backend deployment.

---

## Required GitHub Secrets

You need to configure these secrets in your GitHub repository to enable CICD deployment.

**Navigate to:**
`https://github.com/YOUR_USERNAME/jobmatch-ai/settings/secrets/actions`

---

## 1. Railway Token (REQUIRED)

**Secret Name:** `RAILWAY_TOKEN`

**How to get it:**
1. Login to Railway: `railway login`
2. Generate token: `railway token`
3. Copy the token (starts with `RL_`)

**Example value:**
```
RL_abc123def456ghi789jkl012mno345pqr678stu
```

## 2. Supabase Configuration (REQUIRED - 3 secrets)

### SUPABASE_URL
**How to get it:**
- Go to: https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh/settings/api
- Copy "Project URL"

**Example value:**
```
https://lrzhpnsykasqrousgmdh.supabase.co
```

### SUPABASE_ANON_KEY
**How to get it:**
- Same page as above
- Copy the "anon" "public" key

**Example value:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### SUPABASE_SERVICE_ROLE_KEY ⚠️ KEEP SECRET!
**How to get it:**
- Same page as above
- Click "Reveal" next to "service_role" key
- **WARNING:** This key bypasses Row Level Security - never expose it client-side!

**Example value:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. OpenAI Configuration (REQUIRED)

### OPENAI_API_KEY
**How to get it:**
1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name: `JobMatch AI Backend`
4. Copy the key (starts with `sk-`)

**Example value:**
```
sk-proj-abc123def456...
```

**Cost:** ~$0.01-0.10 per AI-generated application

---

## 4. SendGrid Configuration (REQUIRED - 2 secrets)

### SENDGRID_API_KEY
**How to get it:**
1. Go to: https://app.sendgrid.com/settings/api_keys
2. Click "Create API Key"
3. Name: `JobMatch AI Backend`
4. Permissions: "Full Access" (or "Mail Send")
5. Copy the key (starts with `SG.`)

**Example value:**
```
SG.abc123def456...
```

**Free tier:** 100 emails/day

### SENDGRID_FROM_EMAIL
**How to get it:**
1. Go to: https://app.sendgrid.com/settings/sender_auth
2. Verify your email address
3. Use the verified email

**Example value:**
```
carl.f.frank@gmail.com
```

---

## 5. JWT Secret (REQUIRED)

### JWT_SECRET
**How to generate:**
```bash
openssl rand -base64 32
```

**Example value:**
```
kL9mP2nQ4rS6tU8vW0xY2zA4bC6dE8fG0hI2jK4lM6nO8pQ0rS2tU4vW6xY8zA0b
```

**Minimum length:** 32 characters

---

## 6. Frontend URL (REQUIRED for CORS)

### FRONTEND_URL
**Temporary value (before frontend deployment):**
```
http://localhost:5173
```

**After frontend deployment:**
```
https://your-frontend-url.railway.app
```

**Note:** Update this after deploying frontend to enable proper CORS.

---

## 7. LinkedIn OAuth (OPTIONAL - skip for now)

### LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI
Can be configured later after getting backend URL.

---

## 8. Apify Job Scraping (OPTIONAL - skip for now)

### APIFY_API_TOKEN
Can be configured later.

---

## Setting Secrets in GitHub

### Via Web UI (Recommended)

1. Go to: https://github.com/YOUR_USERNAME/jobmatch-ai/settings/secrets/actions
2. Click "New repository secret"
3. Enter secret name and value
4. Click "Add secret"
5. Repeat for all required secrets

### Via GitHub CLI (Alternative)

```bash
gh secret set RAILWAY_TOKEN
gh secret set SUPABASE_URL
gh secret set SUPABASE_ANON_KEY
gh secret set SUPABASE_SERVICE_ROLE_KEY
gh secret set OPENAI_API_KEY
gh secret set SENDGRID_API_KEY
gh secret set SENDGRID_FROM_EMAIL
gh secret set JWT_SECRET
gh secret set FRONTEND_URL
```

---

## Verification Checklist

- [ ] RAILWAY_TOKEN
- [ ] SUPABASE_URL
- [ ] SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY (keep secret!)
- [ ] OPENAI_API_KEY
- [ ] SENDGRID_API_KEY
- [ ] SENDGRID_FROM_EMAIL (verified in SendGrid)
- [ ] JWT_SECRET (32+ characters)
- [ ] FRONTEND_URL (temporary or final)

---

## Triggering Deployment

Deployment triggers automatically when you push to `main` branch with changes in `backend/` directory, or manually via GitHub Actions tab.

---

## Monitoring Deployment

View logs in GitHub Actions tab → Deploy Backend to Railway workflow.

---

## Security Best Practices

✓ Never commit secrets to code
✓ Keep SUPABASE_SERVICE_ROLE_KEY secret (server-side only)
✓ Rotate secrets periodically
✓ Use separate keys for development/production

---

## Next Steps

1. Set all required GitHub Secrets
2. Push to main or manually trigger workflow
3. Copy backend URL from workflow output
4. Update FRONTEND_URL secret
5. Continue with frontend deployment
