# Apify Actor Costs and Alternatives

## Current Actor Status (December 2024)

### LinkedIn Jobs Scraper (`bebity/linkedin-jobs-scraper`)

**Status:** ⚠️ **Free trial expired - requires paid rental**

**Error message:**
```
You must rent a paid Actor in order to run it after its free trial has expired.
```

**Pricing:**
- **Rental cost**: Visit https://console.apify.com/actors/BHzefUZlZRKWxkTck for current pricing
- Typically $0.005-$0.01 per job scraped
- Billed based on compute usage (per second of runtime)

**To activate:**
1. Go to https://console.apify.com/actors/BHzefUZlZRKWxkTck
2. Click "Rent this Actor"
3. Select a pricing plan
4. Add payment method if not already configured

### Indeed Scraper (`misceres/indeed-scraper`)

**Status:** ❓ **Not yet tested** (likely also requires rental)

**Expected pricing:**
- Similar to LinkedIn: $0.005-$0.01 per job
- Billed based on compute usage

## Free Alternatives

Since the initial actors require paid rentals, here are alternative approaches:

### Option 1: Public Job APIs (Recommended for MVP)

**Use free job APIs instead of web scraping:**

1. **Adzuna API** (Free tier: 5,000 calls/month)
   - URL: https://developer.adzuna.com/
   - Coverage: US, UK, and 16 other countries
   - No scraping needed - direct API access
   - Implementation: Replace `scrapeJobs()` with API calls

2. **The Muse API** (Free tier: 500 calls/day)
   - URL: https://www.themuse.com/developers/api/v2
   - Coverage: Tech, startup jobs
   - RESTful JSON API

3. **GitHub Jobs API** (Deprecated but alternatives exist)
   - Remotive API (Free): https://remotive.com/api
   - Remote OK API (Free): https://remoteok.com/api

**Implementation steps:**
1. Create new service: `src/services/jobApiService.ts`
2. Replace Apify actors with API calls
3. Keep existing normalization logic
4. Update frontend to handle API sources

### Option 2: Build Custom Scraper (Free but Complex)

Use Apify's platform to build your own free scraper:

1. **Apify SDK** (Free for personal scrapers)
   - Build custom LinkedIn/Indeed scrapers
   - Run on Apify infrastructure (free tier: $5/month credit)
   - Requires more development effort

2. **Playwright/Puppeteer** (Self-hosted)
   - Run scrapers on your own infrastructure
   - No Apify costs
   - Requires managing browser automation
   - Risk: More likely to be blocked by job sites

### Option 3: Use Free Apify Actors (If Available)

Check Apify Store for free job scraping actors:
1. Go to https://apify.com/store
2. Filter by category: "Jobs"
3. Look for actors with "Free" or "Free trial" tags
4. Test with the test script before integrating

**Known free actors (as of Dec 2024):**
- Check Apify Store regularly - actors change pricing
- Some developers offer limited free versions

## Cost Comparison

### Current Apify Approach (Paid Actors)

**Assumptions:**
- 10 searches per day
- 10 jobs per search
- 100 jobs/day = 3,000 jobs/month

**Cost estimate:**
- LinkedIn: 3,000 jobs × $0.008/job = **$24/month**
- Indeed: 3,000 jobs × $0.008/job = **$24/month**
- **Total: ~$48/month** (plus $5 platform credit)

### Alternative: Free APIs

**Adzuna API (Free tier):**
- 5,000 calls/month = 5,000 jobs/month
- **Cost: $0/month** (within free tier)
- Limitation: 5,000 jobs/month cap

**The Muse API (Free tier):**
- 500 calls/day × 30 days = 15,000 jobs/month
- **Cost: $0/month** (within free tier)
- Limitation: Tech/startup jobs only

### Recommendation for Development

**Phase 1 (Current - MVP):**
1. Use free job APIs (Adzuna + The Muse)
2. Implement API-based scraping in parallel to Apify
3. Test with real users
4. Gather usage patterns

**Phase 2 (Scaling):**
1. Monitor API usage limits
2. If hitting limits, evaluate Apify actor rental
3. Consider hybrid approach: APIs for most jobs, Apify for premium searches

**Phase 3 (Production at Scale):**
1. If > 5,000 jobs/month needed, rent Apify actors
2. Implement caching to reduce redundant scraping
3. Consider building custom scraper infrastructure

## Implementation Guide: Switching to Free APIs

### 1. Create API Service

Create `/home/carl/application-tracking/jobmatch-ai/backend/src/services/jobApiService.ts`:

```typescript
import type { Job, ScrapeJobsRequest } from '../types';

export async function scrapeJobsViaAPI(
  userId: string,
  params: ScrapeJobsRequest
): Promise<Job[]> {
  const jobs: Job[] = [];

  // Adzuna API integration
  if (params.sources.includes('adzuna')) {
    const adzunaJobs = await fetchFromAdzuna(params);
    jobs.push(...adzunaJobs);
  }

  // The Muse API integration
  if (params.sources.includes('themuse')) {
    const museJobs = await fetchFromTheMuse(params);
    jobs.push(...museJobs);
  }

  return jobs;
}

async function fetchFromAdzuna(params: ScrapeJobsRequest): Promise<Job[]> {
  const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
  const ADZUNA_API_KEY = process.env.ADZUNA_API_KEY;

  const url = `https://api.adzuna.com/v1/api/jobs/us/search/1`;
  const response = await fetch(url + `?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_API_KEY}&what=${params.keywords.join(' ')}&where=${params.location}`);

  const data = await response.json();

  return data.results.map((job: any) => ({
    // Map Adzuna response to Job interface
    title: job.title,
    company: job.company.display_name,
    location: job.location.display_name,
    // ... more mapping
  }));
}

async function fetchFromTheMuse(params: ScrapeJobsRequest): Promise<Job[]> {
  // Similar implementation for The Muse API
  return [];
}
```

### 2. Update Environment Variables

Add to `/home/carl/application-tracking/jobmatch-ai/backend/.env`:

```bash
# Adzuna API (Free tier: 5,000/month)
ADZUNA_APP_ID=your_app_id
ADZUNA_API_KEY=your_api_key

# The Muse API (Free tier: 500/day)
THEMUSE_API_KEY=your_api_key
```

### 3. Update Routes

Modify `/home/carl/application-tracking/jobmatch-ai/backend/src/routes/jobs.ts`:

```typescript
// Add new source options
const scrapeJobsSchema = z.object({
  // ...
  sources: z.array(z.enum(['linkedin', 'indeed', 'adzuna', 'themuse'])).default(['adzuna', 'themuse']),
});

// In the scrape endpoint
router.post('/scrape', async (req, res) => {
  // Check which approach to use
  const hasApifySources = params.sources.some(s => ['linkedin', 'indeed'].includes(s));
  const hasApiSources = params.sources.some(s => ['adzuna', 'themuse'].includes(s));

  if (hasApifySources) {
    // Use Apify (paid)
    result = await scrapeJobs(userId, params);
  } else if (hasApiSources) {
    // Use free APIs
    result = await scrapeJobsViaAPI(userId, params);
  }
});
```

## Monitoring Costs

### Apify Console

1. Go to https://console.apify.com/billing
2. View current month usage
3. Set up billing alerts
4. Monitor per-actor costs

### Setting Up Alerts

1. Click "Billing" in Apify console
2. Click "Set up billing alerts"
3. Configure threshold (e.g., alert at $10, $20, $40)
4. Add email for notifications

## Next Steps

**Immediate (This Week):**
1. ✅ Identify that LinkedIn actor requires paid rental
2. ⏳ **Decision needed**: Rent actors OR implement free APIs
3. ⏳ If renting: Add payment method to Apify account
4. ⏳ If using APIs: Implement API-based scraping

**Short-term (This Month):**
1. Test chosen approach thoroughly
2. Monitor usage and costs
3. Implement caching to reduce API calls
4. Optimize rate limits based on actual usage

**Long-term (Next Quarter):**
1. Evaluate cost vs. value of different sources
2. Consider building custom scraper if costs > $100/month
3. Implement hybrid approach for cost optimization

## Questions to Consider

1. **Budget**: What's the acceptable monthly cost for job scraping?
   - < $10/month → Use free APIs only
   - $10-$50/month → Rent 1-2 Apify actors
   - > $50/month → Build custom infrastructure

2. **Job Volume**: How many jobs do you need per month?
   - < 5,000 → Free APIs sufficient
   - 5,000-50,000 → Apify actors cost-effective
   - > 50,000 → Custom infrastructure recommended

3. **Job Sources**: Which sources matter most?
   - LinkedIn critical → Rent LinkedIn actor
   - General job search → Free APIs work great
   - Remote-only → Use Remotive API (free)

4. **User Experience**: What's acceptable latency?
   - Real-time required → Use APIs (faster)
   - Background ok → Apify actors work (slower but more comprehensive)

## Contact & Support

**Apify Support:**
- Documentation: https://docs.apify.com/
- Support: https://apify.com/support
- Pricing calculator: https://apify.com/pricing/actors

**Free API Documentation:**
- Adzuna: https://developer.adzuna.com/
- The Muse: https://www.themuse.com/developers
- Remotive: https://remotive.com/api
