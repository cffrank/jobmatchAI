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

---

## backfill-job-embeddings.ts

Generate embeddings for all jobs that don't have one yet.

### Prerequisites

1. Set environment variables:
   ```bash
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

2. Install dependencies (from project root):
   ```bash
   npm install
   ```

### Usage

**Dry Run (recommended first):**
```bash
# Test without making changes
DRY_RUN=true npx tsx workers/scripts/backfill-job-embeddings.ts
```

**Production Run:**
```bash
# Apply changes to database
npx tsx workers/scripts/backfill-job-embeddings.ts
```

### Features

- **Parallel Batch Processing**: Processes 10 jobs in parallel per batch to maximize throughput
- **Error Handling**: Continues processing even if individual jobs fail
- **Progress Tracking**: Shows detailed progress for each job
- **Graceful Skipping**: Skips jobs with incomplete data instead of failing
- **Dry Run Mode**: Test the script without making database changes

### Output

The script provides detailed output including:
- Total jobs without embeddings
- Per-job processing status (success/skipped/failed)
- Final summary with counts

Example output:
```
================================================================================
Job Embeddings Backfill Script
================================================================================

Configuration:
  Batch Size: 10
  Dry Run: NO
  Supabase URL: https://your-project.supabase.co

[1/3] Fetching jobs without embeddings...
Found 150 jobs without embeddings

[2/3] Processing jobs in batches...

Batch 1/15 (10 jobs):
  [1/150] Software Engineer at Google: SUCCESS (768D embedding)
  [2/150] Product Manager at Amazon: SUCCESS (768D embedding)
  [3/150] Data Scientist at Meta: SKIPPED (no job data)
  ...

[3/3] Summary:

  Total Jobs: 150
  Processed: 150
  Success: 145
  Skipped (no data): 3
  Failed: 2

Backfill complete!
```

### Notes

- **Local Testing**: The script uses mock embeddings when run locally (not in Workers environment)
- **Production**: In a Workers environment, it would use the actual Cloudflare Workers AI binding
- **Service Role Key**: Uses Supabase service role key to bypass RLS policies
- **Non-Blocking**: Handles incomplete job data gracefully by skipping them
- **Parallel Processing**: Unlike the user embeddings script, this processes jobs in parallel within each batch for better performance

### Troubleshooting

**Missing environment variables:**
```
ERROR: Missing required environment variables:
  SUPABASE_URL: MISSING
  SUPABASE_SERVICE_ROLE_KEY: MISSING
```
Solution: Set the required environment variables before running the script.

**Failed to fetch jobs:**
```
ERROR: Failed to fetch jobs: [error message]
```
Solution: Check your Supabase credentials and network connection.

**Individual job failures:**
Jobs may fail for various reasons:
- Missing required fields (title, company)
- Database update failures
- Network errors

The script will continue processing other jobs and report failures in the summary.

### Integration with Job Creation

When new jobs are created (via scraping or manual entry), embeddings are automatically generated asynchronously using `c.executionCtx.waitUntil()` in the API routes. This backfill script is only needed for:
1. Existing jobs created before embedding generation was implemented
2. Jobs where embedding generation failed initially
3. Re-generating embeddings after model changes

---

## backfill-user-embeddings.ts

Generate resume embeddings for all users who don't have one yet.

### Prerequisites

1. Set environment variables:
   ```bash
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

2. Install dependencies (from project root):
   ```bash
   npm install
   ```

### Usage

**Dry Run (recommended first):**
```bash
# Test without making changes
DRY_RUN=true npx tsx workers/scripts/backfill-user-embeddings.ts
```

**Production Run:**
```bash
# Apply changes to database
npx tsx workers/scripts/backfill-user-embeddings.ts
```

### Features

- **Batch Processing**: Processes users in batches of 10 to avoid overwhelming the system
- **Error Handling**: Continues processing even if individual users fail
- **Progress Tracking**: Shows detailed progress for each user
- **Graceful Skipping**: Skips users with incomplete profiles instead of failing
- **Dry Run Mode**: Test the script without making database changes

### Output

The script provides detailed output including:
- Total users without embeddings
- Per-user processing status (success/skipped/failed)
- Final summary with counts

Example output:
```
================================================================================
User Resume Embedding Backfill Script
================================================================================

Configuration:
  Batch Size: 10
  Dry Run: NO
  Supabase URL: https://your-project.supabase.co

[1/3] Fetching users without embeddings...
Found 25 users without embeddings

[2/3] Processing users in batches...

Batch 1/3 (10 users):
  [1/25] user1@example.com: SUCCESS (768D embedding)
  [2/25] user2@example.com: SKIPPED (no profile data)
  [3/25] user3@example.com: SUCCESS (768D embedding)
  ...

[3/3] Summary:

  Total Users: 25
  Processed: 25
  Success: 20
  Skipped (no data): 3
  Failed: 2

Backfill complete!
```

### Notes

- **Local Testing**: The script uses mock embeddings when run locally (not in Workers environment)
- **Production**: In a Workers environment, it would use the actual Cloudflare Workers AI binding
- **Service Role Key**: Uses Supabase service role key to bypass RLS policies
- **Non-Blocking**: Handles incomplete profiles gracefully by skipping them

### Troubleshooting

**Missing environment variables:**
```
ERROR: Missing required environment variables:
  SUPABASE_URL: MISSING
  SUPABASE_SERVICE_ROLE_KEY: MISSING
```
Solution: Set the required environment variables before running the script.

**Failed to fetch users:**
```
ERROR: Failed to fetch users: [error message]
```
Solution: Check your Supabase credentials and network connection.

**Individual user failures:**
Users may fail for various reasons:
- Missing work experience data (permission errors)
- Missing skills data (permission errors)
- Database update failures

The script will continue processing other users and report failures in the summary.

### Future Enhancements

When deployed to Cloudflare Workers, this script could:
1. Use the actual Workers AI binding for real embeddings
2. Be triggered via a scheduled cron job
3. Process larger batches more efficiently
4. Include retry logic for failed users
5. Send notifications on completion
