# Apify Job Scraping Setup Guide

This guide explains how to set up and use Apify for job scraping in JobMatch AI.

## ⚠️ Important Discovery (December 2024)

**The LinkedIn and Indeed actors currently configured require paid rental after their free trial expires.**

- LinkedIn Jobs Scraper: Free trial expired, requires paid rental (~$0.008/job)
- Indeed Scraper: Likely requires rental (not yet tested)

**See [APIFY_ACTOR_COSTS.md](./APIFY_ACTOR_COSTS.md) for:**
- Detailed cost analysis
- Free API alternatives (Adzuna, The Muse)
- Implementation guides for free alternatives
- Recommendations for different use cases

**Quick Recommendation:**
- For MVP/Development: Use free job APIs (Adzuna, The Muse) instead
- For Production at Scale: Rent Apify actors if budget allows ($50-100/month for typical usage)

## Table of Contents

- [Overview](#overview)
- [Getting Your Apify API Token](#getting-your-apify-api-token)
- [Configuration](#configuration)
- [Testing the Integration](#testing-the-integration)
- [Supported Job Sources](#supported-job-sources)
- [Rate Limits](#rate-limits)
- [Cost Analysis](#cost-analysis)
- [Troubleshooting](#troubleshooting)

## Overview

JobMatch AI uses [Apify](https://apify.com/) to scrape job listings from LinkedIn and Indeed. Apify provides pre-built actors (web scraping tools) that handle the complex logic of extracting job data from these platforms.

**Current Status:**
- ✅ Apify integration is fully implemented and tested
- ✅ API token configuration working correctly
- ⚠️ **LinkedIn actor requires paid rental** after free trial
- ❓ Indeed actor status unknown (likely also requires rental)

**Key Features:**
- Scrapes job listings from LinkedIn and Indeed
- Normalizes job data to a consistent format
- Automatic spam detection on scraped jobs
- Automatic deduplication across searches
- Rate-limited to prevent API abuse (10 scrapes per hour)

## Getting Your Apify API Token

### 1. Create an Apify Account

1. Go to [https://apify.com/](https://apify.com/)
2. Click "Sign up" or "Get started for free"
3. Create an account using email or GitHub

### 2. Get Your API Token

1. Log in to your Apify account
2. Click on your profile icon (top right)
3. Select "Settings" from the dropdown
4. Navigate to "Integrations" in the left sidebar
5. Under "Personal API tokens," you'll see your default token
6. Click "Copy" to copy your API token

**Security Note:** Keep your API token secret. Never commit it to version control or expose it in client-side code.

### 3. Free Tier Limits

Apify offers a free tier with generous limits for development:
- $5 free monthly usage credit
- No credit card required for signup
- Sufficient for testing and small-scale production use

**What $5 gets you (approximate):**
- LinkedIn scraping: ~500-1000 jobs (varies by job count per search)
- Indeed scraping: ~500-1000 jobs
- Recommended: Monitor usage in Apify console to avoid overages

## Configuration

### Backend Configuration

Add your Apify API token to `/home/carl/application-tracking/jobmatch-ai/backend/.env`:

```bash
# Apify Configuration
APIFY_API_TOKEN=apify_api_your_token_here
```

**Environment Variable Details:**
- `APIFY_API_TOKEN` - Your Apify API token (required)
- Format: `apify_api_[40 character alphanumeric string]`

### Verification

After adding the token, verify the configuration:

```bash
cd /home/carl/application-tracking/jobmatch-ai/backend
npm run test:apify
```

This will run the comprehensive Apify integration test script.

## Testing the Integration

### Automated Test Script

The automated test script validates:
- ✓ Apify API token configuration
- ✓ Supabase database connection
- ✓ LinkedIn Jobs Scraper functionality
- ✓ Indeed Scraper functionality
- ✓ Job data normalization
- ✓ Database storage
- ✓ Background process triggering (spam detection, deduplication)

**Run the test:**

```bash
cd /home/carl/application-tracking/jobmatch-ai/backend
npm run test:apify
```

**Expected output:**

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                   Apify Job Scraping Integration Test                    ║
╚═══════════════════════════════════════════════════════════════════════════╝

================================================================================
Test 1: Apify Configuration
================================================================================
✓ APIFY_API_TOKEN is set (apify_api_tcri...)
✓ isApifyConfigured() returned true

================================================================================
Test 2: Supabase Connection
================================================================================
✓ Supabase connection successful

================================================================================
Test 3: Single Scrape - Software Engineer
================================================================================
✓ Scraping completed in 12.45s
✓ Found 5 jobs
✓ Search ID: abc-123-def-456

================================================================================
Test Results
================================================================================
Total tests: 6
✓ Passed: 6
✗ Failed: 0

✓ All tests passed! Apify integration is working correctly.
```

### Manual Testing via API

You can also test scraping via the API endpoint:

```bash
# 1. Get an authentication token (requires a real user account)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'

# 2. Scrape jobs (replace YOUR_TOKEN with the token from step 1)
curl -X POST http://localhost:3000/api/jobs/scrape \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "keywords": ["Software Engineer"],
    "location": "San Francisco, CA",
    "maxResults": 5,
    "sources": ["linkedin"]
  }'
```

## Supported Job Sources

### LinkedIn Jobs Scraper

**Actor ID:** `bebity/linkedin-jobs-scraper`

**Supported Parameters:**
- `keywords` (required) - Job search keywords (e.g., "Software Engineer")
- `location` - Location filter (e.g., "San Francisco, CA")
- `maxItems` - Maximum number of jobs to scrape (default: 20, max: 50)
- `jobType` - Job type filter (e.g., "Full-time", "Contract")
- `experienceLevel` - Experience level (e.g., "Entry level", "Mid-Senior level")

**Data Returned:**
- Job title
- Company name
- Location
- Job description
- Salary (if available)
- Posted date
- Job URL
- Job type and experience level

**Average Scraping Time:** 10-20 seconds for 5 jobs

### Indeed Scraper

**Actor ID:** `misceres/indeed-scraper`

**Supported Parameters:**
- `position` (required) - Job search keywords
- `location` - Location filter
- `maxItems` - Maximum number of jobs to scrape (default: 20, max: 50)
- `salaryMin` - Minimum salary filter

**Data Returned:**
- Job title
- Company name
- Location
- Job description
- Salary (if available)
- Posted date
- Job URL
- Work arrangement (if available)

**Average Scraping Time:** 15-25 seconds for 5 jobs

## Rate Limits

### Application-Level Rate Limits

To prevent API abuse and control costs, the backend enforces rate limits:

**Job Scraping Endpoint (`POST /api/jobs/scrape`):**
- **10 requests per hour** per user
- Applies to authenticated users only
- PostgreSQL-backed (persists across server restarts)

**Why rate limiting?**
- Apify charges per compute time
- Prevents accidental API abuse
- Ensures fair usage across all users

### Apify Platform Limits

**Free Tier:**
- $5 monthly credit
- No hard request limits (usage-based billing)
- Monitor usage in Apify console: https://console.apify.com/

**Paid Plans:**
- Usage-based pricing (pay for what you use)
- Volume discounts available
- No rate limits beyond fair usage

## Cost Analysis

### Scraping Costs (Estimates)

**LinkedIn Jobs Scraper:**
- ~$0.005 - $0.01 per job scraped
- $5 free tier = ~500-1000 jobs/month
- Factors: Job description length, search complexity

**Indeed Scraper:**
- ~$0.005 - $0.01 per job scraped
- $5 free tier = ~500-1000 jobs/month
- Factors: Job description length, search complexity

### Real-World Usage Example

**Typical user (development):**
- 5 job searches per day
- 10 jobs per search
- 150 searches/month = 1,500 jobs
- Estimated cost: ~$7.50 - $15/month

**Production recommendations:**
- Monitor Apify usage dashboard regularly
- Set up billing alerts in Apify console
- Consider caching scraped jobs for 24-48 hours
- Implement user-facing rate limits (already done: 10/hour)

### Cost Optimization Tips

1. **Cache aggressively**: Scraped jobs are stored in Supabase and automatically expire after 48 hours unless saved
2. **Encourage saving**: Users should save jobs they're interested in to prevent re-scraping
3. **Use deduplication**: Automatic deduplication prevents storing duplicate jobs
4. **Monitor usage**: Check Apify console weekly for unexpected usage spikes

## Troubleshooting

### Common Issues

#### 1. "APIFY_API_TOKEN environment variable is not set"

**Cause:** API token not configured in `.env` file

**Solution:**
```bash
# Add to backend/.env
APIFY_API_TOKEN=apify_api_your_token_here
```

Then restart the backend:
```bash
cd /home/carl/application-tracking/jobmatch-ai/backend
npm run dev
```

#### 2. "All scraping attempts failed"

**Possible causes:**
- Invalid API token
- Network connectivity issues
- Apify actor is down or changed

**Debug steps:**

1. Verify API token:
   ```bash
   # Check token format (should start with "apify_api_")
   echo $APIFY_API_TOKEN
   ```

2. Test Apify connection manually:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.apify.com/v2/acts
   ```

3. Check Apify status page: https://status.apify.com/

4. Review backend logs for detailed error messages:
   ```bash
   # Backend logs show scraping errors
   cd /home/carl/application-tracking/jobmatch-ai/backend
   npm run dev
   ```

#### 3. "Rate limit exceeded"

**Cause:** User exceeded 10 scrapes per hour

**Solution:**
- Wait until the rate limit window resets (1 hour)
- Or adjust rate limits in `/home/carl/application-tracking/jobmatch-ai/backend/src/routes/jobs.ts`:
  ```typescript
  rateLimiter({ maxRequests: 20, windowMs: 60 * 60 * 1000 }), // 20 per hour
  ```

#### 4. Jobs scraped but not appearing

**Debug steps:**

1. Check if jobs were saved:
   ```bash
   cd /home/carl/application-tracking/jobmatch-ai/backend
   npm run test:apify
   ```

2. Query database directly:
   ```sql
   -- In Supabase SQL editor
   SELECT COUNT(*) FROM jobs WHERE user_id = 'your-user-id';
   ```

3. Check for spam filtering:
   ```sql
   -- Jobs with high spam scores may be filtered out
   SELECT spam_score, spam_indicators FROM jobs
   WHERE user_id = 'your-user-id'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

#### 5. Scraping times out

**Cause:** Apify actor taking too long (>180 seconds)

**Solutions:**
- Reduce `maxResults` parameter (try 10 instead of 50)
- Check Apify console for actor performance issues
- Increase timeout in `/home/carl/application-tracking/jobmatch-ai/backend/src/services/jobScraper.service.ts`:
  ```typescript
  const SCRAPE_TIMEOUT_SECONDS = 300; // Increase to 5 minutes
  ```

### Getting Help

**Apify Support:**
- Documentation: https://docs.apify.com/
- Support: https://apify.com/support
- Status page: https://status.apify.com/

**JobMatch AI Issues:**
- Check backend logs for detailed error messages
- Run `npm run test:apify` for comprehensive diagnostics
- Review `/home/carl/application-tracking/jobmatch-ai/backend/src/services/jobScraper.service.ts` for scraping logic

## Advanced Configuration

### Custom Actor Parameters

You can customize the Apify actors by modifying the parameters in `/home/carl/application-tracking/jobmatch-ai/backend/src/services/jobScraper.service.ts`:

```typescript
// LinkedIn scraping (lines 150-164)
const input = {
  keywords: params.keywords,
  location: params.location || 'United States',
  maxItems: params.maxResults,
  // Add custom parameters here:
  datePosted: 'past_week', // Only jobs from past week
  // sortBy: 'date', // Sort by date posted
};

// Indeed scraping (lines 202-211)
const input = {
  position: params.keywords,
  location: params.location || 'United States',
  maxItems: params.maxResults,
  // Add custom parameters here:
  // fromage: 7, // Jobs from last 7 days
};
```

### Extending Job Normalization

To extract additional data or improve normalization, edit the functions in `/home/carl/application-tracking/jobmatch-ai/backend/src/services/jobScraper.service.ts`:

- `parseSalary()` (line 271) - Salary parsing logic
- `normalizeWorkArrangement()` (line 296) - Work arrangement detection
- `extractRequiredSkills()` (line 309) - Skills extraction

## Next Steps

After successfully setting up Apify:

1. **Test in development**: Use `npm run test:apify` to verify everything works
2. **Monitor usage**: Check Apify console regularly for usage and costs
3. **Configure production**: Add `APIFY_API_TOKEN` to your production environment variables (Railway secrets)
4. **Set up alerts**: Configure billing alerts in Apify console
5. **Optimize costs**: Review the cost optimization tips above

## Related Documentation

- [Job Deduplication Guide](./JOB_DEDUPLICATION_GUIDE.md)
- [Spam Detection Guide](./SPAM_DETECTION_GUIDE.md)
- [API Documentation](./API.md)
- [Deployment Guide](./DEPLOYMENT-WORKFLOW-EXPLAINED.md)
