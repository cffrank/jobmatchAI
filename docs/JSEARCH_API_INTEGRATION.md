# JSearch API Integration Guide

Complete documentation for JSearch API integration in JobMatch AI.

## Overview

**JSearch** is a comprehensive job search API available through RapidAPI that aggregates job listings from Google for Jobs. It provides access to job postings from multiple sources including LinkedIn, Indeed, Glassdoor, ZipRecruiter, and many others.

### Key Features

- **Multi-source aggregation** - Access 500+ job boards through a single API
- **Real-time data** - Job listings updated in real-time from Google for Jobs
- **Rich job details** - Comprehensive job data including salary, skills, highlights, requirements
- **Advanced filtering** - Filter by location, date posted, remote status, employment type
- **Salary data** - Normalized salary ranges with currency support
- **Skills extraction** - API-provided required skills and qualifications
- **Publisher tracking** - Know which job board (LinkedIn, Indeed, etc.) posted each job

## Table of Contents

1. [Getting Started](#getting-started)
2. [API Configuration](#api-configuration)
3. [Service Architecture](#service-architecture)
4. [Usage Examples](#usage-examples)
5. [Rate Limiting](#rate-limiting)
6. [Caching Strategy](#caching-strategy)
7. [Data Normalization](#data-normalization)
8. [Error Handling](#error-handling)
9. [Testing](#testing)
10. [Cost & Pricing](#cost--pricing)
11. [Best Practices](#best-practices)

## Getting Started

### 1. Sign Up for RapidAPI

**Step-by-step registration:**

1. **Create RapidAPI Account**
   - Visit [https://rapidapi.com](https://rapidapi.com)
   - Click "Sign Up" (free account)
   - Verify your email address

2. **Subscribe to JSearch API**
   - Navigate to [JSearch API page](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch)
   - Click "Subscribe to Test" or "Pricing"
   - Select a pricing tier (see [Pricing](#cost--pricing) section)
   - For development, start with **Free Tier** (1000 requests/hour)

3. **Get Your API Key**
   - After subscribing, go to [RapidAPI Dashboard](https://rapidapi.com/developer/dashboard)
   - Navigate to "My Apps" or "Default Application"
   - Copy your **X-RapidAPI-Key** (starts with a long alphanumeric string)

4. **Test API in RapidAPI Console**
   - On the JSearch API page, click "Test Endpoint"
   - Try the `/search` endpoint with a sample query
   - Verify you receive job results (status 200)

### 2. Configure Environment Variables

Add your JSearch API credentials to `backend/.env`:

```bash
# JSearch Configuration (RapidAPI)
JSEARCH_API_KEY=your-rapidapi-key-here
JSEARCH_API_HOST=jsearch.p.rapidapi.com
```

**Important:**
- Never commit `.env` files to version control
- Keep your API key secure (it's sensitive)
- Rotate keys periodically for security

### 3. Verify Installation

Run the test script to verify integration:

```bash
cd backend
npm run test:jsearch
# or
tsx test-jsearch.ts
```

Expected output:
```
✅ JSearch API is configured
✅ Search completed in 1234ms
   Found 10 jobs
✅ All jobs properly normalized
✅ Caching is working
All Tests Passed! ✅
```

## API Configuration

### Required Headers

JSearch API requires two headers for all requests:

```typescript
{
  'X-RapidAPI-Key': process.env.JSEARCH_API_KEY,
  'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
  'Content-Type': 'application/json'
}
```

### Available Endpoints

#### 1. Search Endpoint (`/search`)

Primary endpoint for job searching.

**Parameters:**
- `query` (string, required) - Search query (e.g., "Software Engineer in San Francisco")
- `num_pages` (string) - Number of pages (1-20, default 1)
- `page` (string) - Page number (starts at 1)
- `date_posted` (string) - Filter by date: `all`, `today`, `3days`, `week`, `month`
- `remote_jobs_only` (boolean) - Filter for remote positions only
- `employment_types` (string) - Filter: `FULLTIME`, `PARTTIME`, `CONTRACTOR`, `INTERN`
- `job_requirements` (string) - Experience filter: `under_3_years_experience`, `more_than_3_years_experience`, `no_experience`, `no_degree`
- `exclude_job_publishers` (string) - Comma-separated publishers to exclude
- `categories` (string) - Comma-separated job category IDs

**Example Request:**
```typescript
GET https://jsearch.p.rapidapi.com/search
  ?query=Frontend Developer in New York
  &num_pages=1
  &page=1
  &date_posted=week
  &remote_jobs_only=false
  &employment_types=FULLTIME
```

**Response Structure:**
```json
{
  "status": "OK",
  "request_id": "abc123...",
  "parameters": {
    "query": "Frontend Developer in New York",
    "page": 1,
    "num_pages": 1
  },
  "data": [
    {
      "job_id": "xyz789...",
      "job_title": "Frontend Developer",
      "employer_name": "Tech Company Inc.",
      "employer_logo": "https://...",
      "job_employment_type": "FULLTIME",
      "job_description": "We are looking for...",
      "job_apply_link": "https://...",
      "job_city": "New York",
      "job_state": "NY",
      "job_country": "US",
      "job_is_remote": false,
      "job_posted_at_timestamp": 1234567890,
      "job_min_salary": 100000,
      "job_max_salary": 150000,
      "job_salary_currency": "USD",
      "job_salary_period": "YEAR",
      "job_required_skills": ["React", "TypeScript", "CSS"],
      "job_highlights": {
        "Qualifications": ["5+ years experience", "Bachelor's degree"],
        "Responsibilities": ["Build UI components", "Collaborate with designers"],
        "Benefits": ["Health insurance", "401k matching"]
      }
    }
  ]
}
```

#### 2. Job Details Endpoint (`/job-details`)

Get full details for a specific job by ID.

**Parameters:**
- `job_id` (string, required) - JSearch job ID from search results

## Service Architecture

### File Structure

```
backend/src/services/jsearch.service.ts    # Main service implementation
backend/src/types/index.ts                  # Type definitions (updated)
backend/test-jsearch.ts                     # Test script
backend/.env                                # Configuration (not committed)
```

### Core Components

#### 1. HTTP Client (`createJSearchClient`)

Configured Axios instance with:
- Base URL: `https://jsearch.p.rapidapi.com`
- 30-second timeout
- Required RapidAPI headers
- Error handling for rate limits and API errors

#### 2. Rate Limiter (`RateLimiter` class)

In-memory rate limiting to avoid exceeding API quota:
- Tracks requests in sliding 1-hour window
- Prevents requests when limit reached
- Provides reset time and usage statistics

**Methods:**
- `canMakeRequest()` - Check if request allowed
- `recordRequest()` - Record a new request
- `getRequestCount()` - Current requests in window
- `getTimeUntilReset()` - Time until quota resets (ms)

#### 3. Result Cache (`ResultCache` class)

72-hour TTL cache for search results:
- Reduces API usage for repeated searches
- Cache key based on normalized search params
- Automatic expiration cleanup

**Methods:**
- `get(params)` - Retrieve cached results
- `set(params, results)` - Store results
- `clear()` - Clear all cache
- `cleanExpired()` - Remove expired entries

#### 4. Normalization Functions

Convert JSearch API format to internal Job schema:
- `normalizeJSearchResults()` - Batch normalization
- `normalizeJSearchJob()` - Single job conversion
- `buildLocationString()` - Combine city/state/country
- `detectWorkArrangement()` - Detect remote/hybrid/onsite
- `normalizePostedDate()` - Convert to ISO string
- `extractSkills()` - Combine API skills + description parsing
- `stripHtml()` - Remove HTML from descriptions

## Usage Examples

### Basic Search

```typescript
import { searchJobs } from './services/jsearch.service';

const jobs = await searchJobs(userId, {
  keywords: 'Software Engineer',
  location: 'San Francisco, CA',
  maxResults: 10
});

console.log(`Found ${jobs.length} jobs`);
```

### Advanced Search with Filters

```typescript
const jobs = await searchJobs(userId, {
  keywords: 'Backend Developer',
  location: 'Austin, TX',
  remote: true,                    // Remote only
  employmentType: 'FULLTIME',      // Full-time only
  datePosted: 'week',              // Posted in last week
  maxResults: 20
});
```

### Remote-Only Search

```typescript
const remoteJobs = await searchJobs(userId, {
  keywords: 'React Developer',
  remote: true,
  datePosted: 'month',
  maxResults: 15
});
```

### Check Configuration

```typescript
import { isJSearchConfigured } from './services/jsearch.service';

if (!isJSearchConfigured()) {
  console.error('JSearch API not configured!');
  // Show setup instructions
}
```

### Monitor Rate Limits

```typescript
import { getRateLimitStatus } from './services/jsearch.service';

const status = getRateLimitStatus();
console.log(`Used: ${status.requestCount}/${status.limit}`);
console.log(`Remaining: ${status.remaining}`);
console.log(`Resets in: ${status.resetInMinutes} minutes`);
```

### Clear Cache Manually

```typescript
import { clearCache } from './services/jsearch.service';

clearCache(); // Useful for testing or when forcing fresh results
```

## Rate Limiting

### Default Limits (Free Tier)

- **1,000 requests per hour**
- **500,000 requests per month**
- Rate limit window: Rolling 60-minute window

### How It Works

1. **Pre-request Check**
   - Before API call, `canMakeRequest()` validates quota
   - Throws error if limit exceeded

2. **Request Recording**
   - Each successful request recorded with timestamp
   - Old requests (>1 hour) automatically cleaned

3. **Reset Behavior**
   - Rate limit resets on a rolling window (not at fixed times)
   - Each request "expires" 1 hour after it was made

### Rate Limit Errors

**Error when limit exceeded:**
```
JSearch API rate limit exceeded. 1000 requests in last hour. Reset in 23 minutes.
```

**Handling rate limits:**
```typescript
try {
  const jobs = await searchJobs(userId, params);
} catch (error) {
  if (error.message.includes('rate limit exceeded')) {
    // Show user: "Job search quota exceeded. Try again in X minutes."
    // Or queue request for later
  }
}
```

## Caching Strategy

### Cache Configuration

- **TTL:** 72 hours (job listings change slowly)
- **Storage:** In-memory (resets on server restart)
- **Key:** Normalized search parameters (case-insensitive)

### When Cache is Used

Cache hit occurs when searching with identical parameters:
- Same keywords (case-insensitive)
- Same location (case-insensitive)
- Same filters (remote, employment type, date posted)

### Cache Benefits

1. **Reduced API costs** - Avoid duplicate API calls
2. **Faster responses** - Cache ~100x faster than API
3. **Better UX** - Instant results for repeated searches

### Cache Invalidation

Cache entries expire after 72 hours. Manual clearing:

```typescript
import { clearCache } from './services/jsearch.service';

clearCache(); // Clears all cached results
```

### Cache Miss Example

```typescript
// First search - API call
await searchJobs(userId, { keywords: 'Developer', location: 'NYC' });
// Duration: ~2000ms

// Second search (same params) - Cache hit
await searchJobs(userId, { keywords: 'Developer', location: 'NYC' });
// Duration: ~20ms (100x faster)
```

## Data Normalization

JSearch API returns comprehensive job data that must be normalized to our internal `Job` schema.

### Field Mapping

| JSearch Field | Internal Field | Transformation |
|--------------|----------------|----------------|
| `job_id` | `metadata.jsearchId` | Direct mapping |
| `job_title` | `title` | Direct mapping |
| `employer_name` | `company` | Direct mapping |
| `employer_logo` | `companyLogo` | Optional field |
| `job_city`, `job_state`, `job_country` | `location` | Combined string |
| `job_is_remote` | `workArrangement` | Detect remote/hybrid/onsite |
| `job_min_salary` | `salaryMin` | Direct mapping (number) |
| `job_max_salary` | `salaryMax` | Direct mapping (number) |
| `job_posted_at_timestamp` | `postedDate` | Convert to ISO string |
| `job_description` | `description` | Strip HTML tags |
| `job_apply_link` | `url` | Direct mapping |
| `job_required_skills` | `requiredSkills` | Array + description parsing |
| `job_employment_type` | `metadata.employmentType` | Store in metadata |
| `job_publisher` | `metadata.publisher` | Track source (LinkedIn, Indeed) |
| `job_highlights` | `metadata.highlights` | Store qualifications/benefits |

### Work Arrangement Detection

Algorithm priority:
1. Check `job_is_remote` flag (most reliable)
2. Search title for "remote", "hybrid"
3. Search description for work arrangement keywords
4. Default to "Unknown" if unclear

```typescript
function detectWorkArrangement(job: JSearchJob): 'Remote' | 'Hybrid' | 'On-site' | 'Unknown' {
  if (job.job_is_remote) return 'Remote';

  const text = `${job.job_title} ${job.job_description}`.toLowerCase();
  if (text.includes('remote')) return 'Remote';
  if (text.includes('hybrid')) return 'Hybrid';
  if (text.includes('on-site') || text.includes('office')) return 'On-site';

  return 'Unknown';
}
```

### Skills Extraction

Multi-source skill extraction:
1. Use `job_required_skills` from API (most accurate)
2. Extract from `job_highlights.Qualifications`
3. Parse description for common tech skills
4. Deduplicate and limit to top 15 skills

```typescript
function extractSkills(job: JSearchJob): string[] {
  const skills = new Set<string>();

  // API-provided skills (most accurate)
  job.job_required_skills?.forEach(skill => skills.add(skill));

  // Extract from highlights
  job.job_highlights?.Qualifications?.forEach(qual => {
    extractSkillsFromText(qual).forEach(skill => skills.add(skill));
  });

  // Parse description if needed
  if (skills.size < 5) {
    extractSkillsFromText(job.job_description).forEach(skill => skills.add(skill));
  }

  return Array.from(skills).slice(0, 15);
}
```

### Experience Level Inference

Extract from `job_required_experience` field:

```typescript
function extractExperienceLevel(job: JSearchJob): string | undefined {
  const exp = job.job_required_experience;
  if (!exp) return undefined;

  if (exp.no_experience_required) return 'Entry Level';

  if (exp.required_experience_in_months) {
    const years = exp.required_experience_in_months / 12;
    if (years < 2) return 'Entry Level';
    if (years < 5) return 'Mid Level';
    if (years < 10) return 'Senior Level';
    return 'Executive';
  }

  return undefined;
}
```

### HTML Stripping

JSearch descriptions may contain HTML formatting. We strip tags for clean text:

```typescript
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')       // Remove HTML tags
    .replace(/&nbsp;/g, ' ')       // HTML entities
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')          // Collapse whitespace
    .trim();
}
```

## Error Handling

### Common Errors

#### 1. Missing API Key

```
Error: JSEARCH_API_KEY environment variable is not set.
```

**Solution:** Add API key to `backend/.env`

#### 2. Rate Limit Exceeded

```
Error: JSearch API rate limit exceeded. 1000 requests in last hour. Reset in 45 minutes.
```

**Solution:** Wait for rate limit reset or upgrade API tier

#### 3. Invalid Query

```
Error: JSearch API client error (400): Invalid query parameter
```

**Solution:** Validate search parameters before calling API

#### 4. Network Timeout

```
Error: JSearch API request failed after 3 attempts: timeout of 30000ms exceeded
```

**Solution:** Check network connectivity, increase timeout if needed

### Retry Logic

The service implements automatic retry with exponential backoff:

```typescript
async function executeSearchWithRetry(query: JSearchQuery): Promise<JSearchJob[]> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await makeRequest(query);
    } catch (error) {
      if (isNonRetryableError(error)) throw error;

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt; // Exponential backoff
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }
}
```

**Retry policy:**
- Max retries: 3
- Delay: 1s, 2s, 3s (exponential backoff)
- Don't retry on: 4xx errors (except 429), authentication failures
- Do retry on: 5xx errors, network errors, timeouts

## Testing

### Run Test Suite

```bash
cd backend
npm run test:jsearch
```

### Test Coverage

The test script (`test-jsearch.ts`) verifies:

1. ✅ API configuration (key present)
2. ✅ Rate limit tracking
3. ✅ Search functionality (multiple queries)
4. ✅ Result normalization (all required fields)
5. ✅ Caching (speed improvement on repeat searches)
6. ✅ Error handling (graceful failures)

### Sample Test Output

```
╔════════════════════════════════════════════════════════════════╗
║          JSearch API Integration Test Suite                   ║
╚════════════════════════════════════════════════════════════════╝

=== Configuration Test ===
✅ JSearch API is configured
   API Host: jsearch.p.rapidapi.com

=== Rate Limit Status ===
Current requests: 0/1000
Remaining: 1000

=== Search Test: Software Engineer ===
Parameters: {
  "keywords": "Software Engineer",
  "location": "San Francisco, CA",
  "remote": false,
  "employmentType": "FULLTIME",
  "datePosted": "week",
  "maxResults": 5
}
✅ Search completed in 1847ms
   Found 5 jobs

Sample Result:
   Title: Senior Software Engineer
   Company: Tech Startup Inc.
   Location: San Francisco, CA, US
   Work Arrangement: On-site
   Source: jsearch
   URL: https://www.linkedin.com/jobs/view/1234567890...
   Salary: $140,000 - $180,000
   Skills: JavaScript, React, Node.js, AWS, Docker
   Publisher: LinkedIn
   Employment Type: FULLTIME

✅ Normalization checks:
   All jobs properly normalized ✅

=== Cache Test ===
Performing first search (should hit API)...
First search: 1856ms, 5 results

Performing identical search (should hit cache)...
[JSearch Cache] Hit for query: Software Engineer
Second search: 18ms, 5 results
✅ Caching is working (second search much faster)
✅ Cache returned same number of results

=== Final Rate Limit Status ===
Total requests made: 3
Remaining in this hour: 997
Limit: 1000 requests/hour
Usage: 0.3% of hourly quota

╔════════════════════════════════════════════════════════════════╗
║                  All Tests Passed! ✅                          ║
╚════════════════════════════════════════════════════════════════╝
```

## Cost & Pricing

### Free Tier (Development)

**Included:**
- 1,000 requests per hour
- 500,000 requests per month
- No credit card required

**Best for:**
- Development and testing
- Low-traffic applications
- MVP development

### Basic Tier (~$10/month)

**Included:**
- 10,000 requests per hour
- 5,000,000 requests per month
- Email support

**Best for:**
- Production applications
- Medium-traffic job boards
- Regular job scraping

### Pro & Ultra Tiers

Higher limits available for enterprise use. See [JSearch Pricing](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch/pricing).

### Cost Optimization

1. **Use caching** - 72-hour cache reduces API calls by ~80%
2. **Batch searches** - Combine related searches when possible
3. **Smart pagination** - Only fetch additional pages when needed
4. **Monitor usage** - Track with `getRateLimitStatus()`
5. **User-specific searches** - Don't search same query for all users

### Estimated Usage

For a typical job search app:
- **Average user:** 5-10 searches/day
- **100 active users:** 500-1,000 searches/day = 15,000-30,000/month
- **Recommended tier:** Free tier sufficient for MVP, Basic for production

## Best Practices

### 1. Always Check Configuration on Startup

```typescript
if (!isJSearchConfigured()) {
  console.warn('JSearch API not configured. Job search will be limited.');
  // Fall back to other sources (LinkedIn, Indeed via Apify)
}
```

### 2. Monitor Rate Limits

```typescript
const status = getRateLimitStatus();
if (status.remaining < 100) {
  console.warn(`Low on JSearch quota: ${status.remaining} requests remaining`);
  // Consider rate limiting user searches or showing warning
}
```

### 3. Cache Aggressively

The 72-hour cache is intentional - job listings change slowly. Don't bypass it unless user explicitly requests fresh results.

### 4. Handle Errors Gracefully

```typescript
try {
  const jobs = await searchJobs(userId, params);
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Show friendly message: "Job search quota reached. Try again later."
  } else if (error.message.includes('not configured')) {
    // Fall back to other job sources
  } else {
    // Generic error: "Job search temporarily unavailable."
  }
}
```

### 5. Combine with Other Sources

JSearch is one of multiple job sources. Use it alongside:
- Apify LinkedIn scraper (existing)
- Apify Indeed scraper (existing)
- Manual job entry

Diversification improves results and reduces dependency on single API.

### 6. Track Metadata

JSearch provides valuable metadata (publisher, employment type, highlights):

```typescript
const job = normalizedJobs[0];
const meta = job.metadata as any;

console.log(`Originally posted on: ${meta.publisher}`); // "LinkedIn", "Indeed"
console.log(`Employment type: ${meta.employmentType}`); // "FULLTIME"
console.log(`Qualifications:`, meta.highlights?.Qualifications);
```

### 7. Log API Usage

Monitor API usage in production:

```typescript
console.log(`[JSearch] Search performed: ${params.keywords} (${results.length} results)`);
console.log(`[JSearch] Rate limit: ${status.requestCount}/${status.limit}`);
```

### 8. Respect API Terms of Service

- Don't cache results longer than 72 hours
- Don't resell JSearch data
- Don't exceed rate limits intentionally
- Attribute job sources properly

## Integration with Existing Job Routes

### Add JSearch to Job Scraping

Update `backend/src/routes/jobs.ts` to include JSearch:

```typescript
import { searchJobs as searchJSearchJobs, isJSearchConfigured } from '../services/jsearch.service';
import { scrapeJobs as scrapeApifyJobs, isApifyConfigured } from '../services/jobScraper.service';

router.post('/scrape', authMiddleware, async (req: Request, res: Response) => {
  const { keywords, location, maxResults } = req.body;
  const userId = (req as AuthenticatedRequest).userId;

  const sources = [];

  // JSearch (multi-source via Google for Jobs)
  if (isJSearchConfigured()) {
    sources.push(
      searchJSearchJobs(userId, {
        keywords: keywords.join(' '),
        location,
        maxResults: Math.ceil(maxResults / 3) // Split quota
      })
    );
  }

  // Apify (LinkedIn + Indeed)
  if (isApifyConfigured()) {
    sources.push(
      scrapeApifyJobs(userId, {
        keywords,
        location,
        maxResults: Math.ceil(maxResults / 3),
        sources: ['linkedin', 'indeed']
      })
    );
  }

  const results = await Promise.allSettled(sources);
  const allJobs = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  res.json({ jobs: allJobs });
});
```

## Troubleshooting

### Problem: "API key not configured"

**Cause:** Missing or incorrect `JSEARCH_API_KEY` in `.env`

**Solution:**
1. Check `backend/.env` exists
2. Verify `JSEARCH_API_KEY` is set
3. Ensure no typos in key
4. Restart backend server after adding key

### Problem: Rate limit reached immediately

**Cause:** Shared API key across multiple environments

**Solution:**
- Use separate keys for dev/staging/production
- Monitor usage with `getRateLimitStatus()`
- Clear cache to reduce API calls

### Problem: No results returned

**Cause:** Too specific search query or location

**Solution:**
- Broaden search terms (e.g., "Developer" instead of "Senior React TypeScript Developer")
- Try more general locations (e.g., "California" instead of "Palo Alto, CA")
- Check `date_posted` filter (older postings may have more results)

### Problem: Slow search responses

**Cause:** API latency or network issues

**Solution:**
- Verify cache is working (`[JSearch Cache] Hit` in logs)
- Check network connectivity
- Increase timeout if needed (default 30s)
- Consider pagination for large result sets

## References

- **JSearch API Page:** [https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch)
- **RapidAPI Dashboard:** [https://rapidapi.com/developer/dashboard](https://rapidapi.com/developer/dashboard)
- **Pricing:** [https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch/pricing](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch/pricing)
- **API Documentation:** Available on JSearch API page (after subscribing)
- **Support:** RapidAPI support or JSearch API discussion forum

## Related Documentation

- `APIFY_INTEGRATION.md` - Apify LinkedIn/Indeed scraping
- `JOB_SCRAPING_ARCHITECTURE.md` - Overall job scraping design
- `TESTING_STRATEGY.md` - Integration testing approach
