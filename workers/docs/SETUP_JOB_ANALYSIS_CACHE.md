# Quick Setup: Job Analysis Caching

## TL;DR

This document provides step-by-step instructions to set up the hybrid caching system for job compatibility analyses, reducing OpenAI API costs by 60-75%.

## Prerequisites

- Wrangler CLI installed (`npm install -g wrangler`)
- Supabase project configured
- Cloudflare Workers account

## Step 1: Create Cloudflare KV Namespaces

### Development Environment

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers

# Create KV namespace for development
wrangler kv:namespace create JOB_ANALYSIS_CACHE

# Output will look like:
# 🌀 Creating namespace with title "jobmatch-ai-JOB_ANALYSIS_CACHE"
# ✨ Success!
# Add the following to your wrangler.toml:
# { binding = "JOB_ANALYSIS_CACHE", id = "abc123..." }

# Create preview namespace for local development
wrangler kv:namespace create JOB_ANALYSIS_CACHE --preview

# Output:
# { binding = "JOB_ANALYSIS_CACHE", preview_id = "xyz789..." }
```

### Production Environment

```bash
# Create production namespace
wrangler kv:namespace create JOB_ANALYSIS_CACHE --env production

# Output:
# { binding = "JOB_ANALYSIS_CACHE", id = "prod456..." }
```

## Step 2: Update wrangler.toml

Replace the placeholder IDs in `workers/wrangler.toml` with the actual IDs from Step 1:

```toml
# Job Compatibility Analysis Cache
[[kv_namespaces]]
binding = "JOB_ANALYSIS_CACHE"
id = "abc123..."  # ← Replace with your dev namespace ID
preview_id = "xyz789..."  # ← Replace with your preview namespace ID

# Production environment
[env.production.kv_namespaces]
binding = "JOB_ANALYSIS_CACHE"
id = "prod456..."  # ← Replace with your production namespace ID
```

## Step 3: Apply Database Migration

### Option A: Using Supabase CLI

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Apply migration
supabase db push

# Or apply specific migration file
supabase migration up --file supabase/migrations/017_add_job_compatibility_analyses_table.sql
```

### Option B: Using Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor**
4. Open the migration file: `supabase/migrations/017_add_job_compatibility_analyses_table.sql`
5. Copy the entire contents
6. Paste into SQL Editor
7. Click **Run**

### Option C: Using psql

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run migration
\i supabase/migrations/017_add_job_compatibility_analyses_table.sql

# Verify table was created
\d job_compatibility_analyses
```

## Step 4: Verify Database Setup

```sql
-- Check table exists
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'job_compatibility_analyses';

-- Check RLS policies
SELECT policyname, tablename, roles, cmd
FROM pg_policies
WHERE tablename = 'job_compatibility_analyses';

-- Expected output: 4 policies (SELECT, INSERT, UPDATE, DELETE)
```

## Step 5: Deploy Workers

### Deploy to Development

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers

# Deploy to development environment
wrangler deploy --env development

# Output:
# ⛅️ Deployed to https://jobmatch-ai-dev.your-subdomain.workers.dev
```

### Deploy to Production

```bash
# Deploy to production environment
wrangler deploy --env production

# Output:
# ⛅️ Deployed to https://jobmatch-ai-prod.your-subdomain.workers.dev
```

## Step 6: Test the Cache

### Test via API

```bash
# Replace with your worker URL and auth token
WORKER_URL="https://jobmatch-ai-dev.your-subdomain.workers.dev"
AUTH_TOKEN="your-jwt-token"

# First request (cache MISS, will generate new analysis)
curl -X POST "${WORKER_URL}/api/jobs/your-job-id/analyze" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "overallScore": 85,
#   "recommendation": "Strong Match",
#   "cached": false,
#   "cacheSource": "generated",
#   ...
# }

# Second request (cache HIT, should be instant)
curl -X POST "${WORKER_URL}/api/jobs/your-job-id/analyze" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "overallScore": 85,
#   "recommendation": "Strong Match",
#   "cached": true,
#   "cacheSource": "kv",
#   ...
# }
```

### Check KV Cache

```bash
# List all keys in KV namespace
wrangler kv:key list --binding=JOB_ANALYSIS_CACHE

# Get specific key
wrangler kv:key get "job-analysis:user-id:job-id" --binding=JOB_ANALYSIS_CACHE
```

### Check Database Cache

```sql
-- List all cached analyses
SELECT
  user_id,
  job_id,
  analysis->>'recommendation' as recommendation,
  analysis->>'overallScore' as score,
  created_at
FROM job_compatibility_analyses
ORDER BY created_at DESC
LIMIT 10;
```

## Step 7: Monitor Performance

### Watch Worker Logs

```bash
# Tail logs in development
wrangler tail --env development

# Look for these log messages:
# [JobAnalysisCache] ✓ KV cache HIT for job-analysis:user-123:job-456
# [Cost Savings] Avoided OpenAI API call (~$0.03-0.05 saved)
# [Cache MISS] Generating new analysis...
```

### Check Cloudflare Analytics

1. Go to Cloudflare Dashboard
2. Select **Workers & Pages**
3. Click on your worker
4. Navigate to **Metrics**
5. Check:
   - KV read operations (should be high)
   - KV write operations (should be lower)
   - Request duration (should decrease over time as cache fills)

### Database Analytics

```sql
-- Cache hit rate (approximation)
SELECT
  COUNT(*) as total_cached_analyses,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) / COUNT(DISTINCT user_id) as avg_analyses_per_user
FROM job_compatibility_analyses;

-- Recommendation distribution
SELECT
  analysis->>'recommendation' as recommendation,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM job_compatibility_analyses
GROUP BY recommendation
ORDER BY count DESC;
```

## Troubleshooting

### Issue: "KV namespace not found"

**Solution**: Verify namespace IDs in `wrangler.toml` match the IDs from `wrangler kv:namespace create`.

```bash
# List all namespaces
wrangler kv:namespace list

# Update wrangler.toml with correct IDs
```

### Issue: "Table does not exist"

**Solution**: Migration wasn't applied correctly.

```bash
# Check if table exists
psql -c "SELECT * FROM job_compatibility_analyses LIMIT 1;"

# If not, re-apply migration (see Step 3)
```

### Issue: "Cache always returns MISS"

**Possible causes**:
1. KV binding not configured correctly
2. User ID or Job ID format mismatch
3. KV namespace is empty

**Debug**:
```bash
# Check worker logs
wrangler tail --env development

# Manually set a test key
wrangler kv:key put "job-analysis:test-user:test-job" '{"test": true}' --binding=JOB_ANALYSIS_CACHE

# Try to retrieve it
wrangler kv:key get "job-analysis:test-user:test-job" --binding=JOB_ANALYSIS_CACHE
```

### Issue: "Database insert fails"

**Possible causes**:
1. RLS policies blocking insert
2. Invalid user_id or job_id (foreign key constraint)

**Debug**:
```sql
-- Check if user and job exist
SELECT id FROM users WHERE id = 'your-user-id';
SELECT id FROM jobs WHERE id = 'your-job-id';

-- Try manual insert (as postgres user)
INSERT INTO job_compatibility_analyses (user_id, job_id, analysis)
VALUES (
  'your-user-id',
  'your-job-id',
  '{"overallScore": 85, "recommendation": "Test"}'::jsonb
);
```

## Cost Tracking

### Estimate Monthly Savings

```sql
-- Cached analyses this month
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as cached_analyses,
  COUNT(*) * 0.04 as avoided_api_cost
FROM job_compatibility_analyses
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY month;
```

### Monitor OpenAI API Usage

Check your OpenAI dashboard:
1. Go to https://platform.openai.com/usage
2. Compare API usage before and after cache deployment
3. Expected reduction: 60-75% in `chat.completions` calls for `gpt-4o-mini` model

## Next Steps

1. **Enable monitoring**: Set up alerts for cache miss rate >30%
2. **Tune TTL**: If hit rate is low, consider increasing KV TTL to 14 days
3. **Analytics**: Track cache performance weekly, aim for 75%+ hit rate by Day 7
4. **Optimize**: Implement smarter cache invalidation (see `/workers/docs/JOB_ANALYSIS_CACHING_STRATEGY.md`)

## Support

- **Documentation**: `/workers/docs/JOB_ANALYSIS_CACHING_STRATEGY.md`
- **Tests**: `/workers/api/services/__tests__/jobAnalysisCache.test.ts`
- **Service Code**: `/workers/api/services/jobAnalysisCache.ts`
- **Endpoint Code**: `/workers/api/routes/jobs.ts` (line 357-494)
