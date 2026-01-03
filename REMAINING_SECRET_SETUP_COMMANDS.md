# Remaining GitHub Secrets Setup Commands

This file contains the exact commands needed to complete the GitHub secrets configuration.

---

## 1. Add SENDGRID_API_KEY (All Environments)

**Action:** Obtain your SendGrid API key from https://app.sendgrid.com/settings/api_keys

**Commands:**
```bash
# Replace YOUR_SENDGRID_API_KEY with the actual key from SendGrid
gh secret set SENDGRID_API_KEY --env development --body "SG.YOUR_SENDGRID_API_KEY" --repo cffrank/jobmatchAI
gh secret set SENDGRID_API_KEY --env staging --body "SG.YOUR_SENDGRID_API_KEY" --repo cffrank/jobmatchAI
gh secret set SENDGRID_API_KEY --env production --body "SG.YOUR_SENDGRID_API_KEY" --repo cffrank/jobmatchAI
```

**Note:** Use the same SendGrid key for all environments, or create separate keys per environment for better tracking.

---

## 2. Update Development SUPABASE_SERVICE_ROLE_KEY

**Action:** Get the service role key for the development Supabase project

**Steps:**
1. Go to https://supabase.com/dashboard
2. Select your development branch project (ID: wpupbucinufbaiphwogc)
3. Navigate to: Settings → API
4. Copy the "service_role" key (starts with `sb_secret_` or is a JWT)

**Command:**
```bash
# Replace YOUR_DEV_SERVICE_ROLE_KEY with the key from Supabase dashboard
gh secret set SUPABASE_SERVICE_ROLE_KEY --env development --body "YOUR_DEV_SERVICE_ROLE_KEY" --repo cffrank/jobmatchAI
```

---

## 3. (Optional) Create Separate Staging Supabase Project

**Current State:** Staging uses production Supabase project

**Recommendation:** Create a dedicated staging project to isolate staging data from production

**If you create a staging project, update these secrets:**
```bash
# Get these values from your new staging Supabase project dashboard
gh secret set SUPABASE_URL --env staging --body "https://YOUR_STAGING_PROJECT_ID.supabase.co" --repo cffrank/jobmatchAI
gh secret set SUPABASE_ANON_KEY --env staging --body "YOUR_STAGING_ANON_KEY" --repo cffrank/jobmatchAI
gh secret set SUPABASE_SERVICE_ROLE_KEY --env staging --body "YOUR_STAGING_SERVICE_ROLE_KEY" --repo cffrank/jobmatchAI
```

---

## Verification After Setup

After adding the secrets, verify they were set correctly:

```bash
# Check all environments have SENDGRID_API_KEY
gh secret list --env development --repo cffrank/jobmatchAI | grep SENDGRID
gh secret list --env staging --repo cffrank/jobmatchAI | grep SENDGRID
gh secret list --env production --repo cffrank/jobmatchAI | grep SENDGRID

# Verify development SUPABASE_SERVICE_ROLE_KEY was updated
gh secret list --env development --repo cffrank/jobmatchAI | grep SUPABASE_SERVICE_ROLE_KEY
```

---

## Complete Secrets Checklist

After completing the above, each environment should have:

### Development Environment
- [x] SUPABASE_URL
- [x] SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY (needs update)
- [x] OPENAI_API_KEY
- [x] APIFY_API_TOKEN
- [x] APP_URL
- [ ] SENDGRID_API_KEY (needs adding)

### Staging Environment
- [x] SUPABASE_URL
- [x] SUPABASE_ANON_KEY
- [x] SUPABASE_SERVICE_ROLE_KEY
- [x] OPENAI_API_KEY
- [x] APIFY_API_TOKEN
- [x] APP_URL
- [ ] SENDGRID_API_KEY (needs adding)

### Production Environment
- [x] SUPABASE_URL
- [x] SUPABASE_ANON_KEY
- [x] SUPABASE_SERVICE_ROLE_KEY
- [x] OPENAI_API_KEY
- [x] APIFY_API_TOKEN
- [x] APP_URL
- [ ] SENDGRID_API_KEY (needs adding)

### Repository Secrets
- [x] CLOUDFLARE_ACCOUNT_ID
- [x] CLOUDFLARE_API_TOKEN
- [x] SUPABASE_URL (legacy/fallback)
- [x] SUPABASE_ANON_KEY (legacy/fallback)
- [x] SUPABASE_SERVICE_ROLE_KEY (legacy/fallback)

---

## Important Notes

1. **SendGrid is optional** for basic functionality but required for:
   - Password reset emails
   - Email notifications
   - User verification emails

2. **Service role keys** are sensitive - they bypass Row Level Security (RLS):
   - Never commit them to git
   - Never expose them in frontend code
   - Only use in backend/server-side code

3. **Supabase URLs** differ per environment:
   - Development: `wpupbucinufbaiphwogc.supabase.co`
   - Staging: Currently uses production (`lrzhpnsykasqrousgmdh.supabase.co`)
   - Production: `lrzhpnsykasqrousgmdh.supabase.co`

4. **Credential rotation**: Follow the schedule in `docs/CREDENTIAL_ROTATION_POLICY.md`:
   - Critical secrets: Every 90 days
   - Standard secrets: Every 180 days
