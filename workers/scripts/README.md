# Worker Scripts

Utility scripts for managing Cloudflare Workers deployment and configuration.

## configure-secrets.sh

Interactive script to configure all required Worker secrets for the development environment.

### Usage

```bash
cd workers
./scripts/configure-secrets.sh
```

### What it does

1. Verifies Wrangler authentication
2. Prompts for each required secret:
   - `OPENAI_API_KEY` - **Critical**: Required for AI features
   - `SUPABASE_URL` - Database connection
   - `SUPABASE_ANON_KEY` - Public database key
   - `SUPABASE_SERVICE_ROLE_KEY` - Admin database key
   - `APP_URL` - Frontend application URL
3. Optionally prompts for:
   - `SENDGRID_API_KEY` - Email functionality
   - `LINKEDIN_CLIENT_ID/SECRET` - LinkedIn OAuth
   - `APIFY_API_TOKEN` - Job scraping
   - `CLOUDFLARE_ACCOUNT_ID` - AI Gateway account
   - `AI_GATEWAY_SLUG` - AI Gateway identifier
4. Sets secrets using `wrangler secret put`
5. Provides next steps for AI Gateway setup

### Prerequisites

- Authenticated with Wrangler: `npx wrangler login`
- Access to all required API keys and credentials

### Security Notes

- Secrets are encrypted at rest in Cloudflare
- Never commit secrets to git
- Use different keys for dev/staging/production environments
- Rotate secrets regularly (see `/docs/CREDENTIAL_ROTATION_POLICY.md`)

### Troubleshooting

**"Not authenticated with Wrangler"**
```bash
npx wrangler login
```

**"Failed to set secret"**
- Check you're in the `workers/` directory
- Verify you have write access to the Worker
- Ensure the secret value is valid (no special characters that need escaping)

**Worker still returns 500 errors after setting secrets**
- Verify AI Gateway is created in Cloudflare Dashboard
- Check `wrangler.toml` has correct `CLOUDFLARE_ACCOUNT_ID` and `AI_GATEWAY_SLUG`
- Test with: `curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health`
