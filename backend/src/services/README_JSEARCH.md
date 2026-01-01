# JSearch Service - Multi-Source Job Search Integration

## Overview

The JSearch service integrates with [JSearch API](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) (via RapidAPI) to provide comprehensive job search across 500+ job boards through Google for Jobs aggregation.

**Key advantages over single-source scrapers:**
- Access to LinkedIn, Indeed, Glassdoor, ZipRecruiter, and hundreds more through one API
- Real-time job data from Google for Jobs index
- Rich metadata (salary, skills, qualifications, benefits)
- Reliable uptime (no scraper breakage when sites change)
- Built-in salary normalization and skills extraction

## Quick Start

### 1. Get API Key

```bash
# 1. Visit https://rapidapi.com and create account
# 2. Subscribe to JSearch API (free tier available)
# 3. Copy your RapidAPI key
# 4. Add to backend/.env:

JSEARCH_API_KEY=your-rapidapi-key-here
JSEARCH_API_HOST=jsearch.p.rapidapi.com
```

### 2. Test Integration

```bash
cd backend
npm run test:jsearch
```

### 3. Use in Code

```typescript
import { searchJobs } from './services/jsearch.service';

const jobs = await searchJobs(userId, {
  keywords: 'Software Engineer',
  location: 'San Francisco, CA',
  remote: true,
  employmentType: 'FULLTIME',
  datePosted: 'week',
  maxResults: 20
});
```

## API Reference

### Main Functions

#### `searchJobs(userId, params)`

Search for jobs with caching and rate limiting.

**Parameters:**
```typescript
interface JobSearchParams {
  keywords: string;                // Required: "Frontend Developer"
  location?: string;                // Optional: "New York, NY"
  remote?: boolean;                 // Optional: Filter remote jobs
  employmentType?: 'FULLTIME' | 'PARTTIME' | 'CONTRACTOR' | 'INTERN';
  datePosted?: 'all' | 'today' | '3days' | 'week' | 'month';
  maxResults?: number;              // Default: 20
}
```

**Returns:** `Promise<Job[]>` - Normalized job objects

**Throws:**
- `Error` if API key not configured
- `Error` if rate limit exceeded
- `Error` if API request fails

**Example:**
```typescript
try {
  const jobs = await searchJobs('user-123', {
    keywords: 'React Developer',
    location: 'Austin, TX',
    remote: true,
    datePosted: 'week',
    maxResults: 15
  });

  console.log(`Found ${jobs.length} jobs`);
  jobs.forEach(job => {
    console.log(`${job.title} at ${job.company} - ${job.location}`);
  });
} catch (error) {
  console.error('Search failed:', error.message);
}
```

#### `isJSearchConfigured()`

Check if JSearch API is configured.

**Returns:** `boolean`

**Example:**
```typescript
if (isJSearchConfigured()) {
  // JSearch available
} else {
  // Fall back to other job sources
}
```

#### `getRateLimitStatus()`

Get current rate limit usage.

**Returns:**
```typescript
{
  requestCount: number;      // Requests made in current hour
  limit: number;             // Max requests per hour
  remaining: number;         // Requests remaining
  resetInMs: number;         // MS until reset
  resetInMinutes: number;    // Minutes until reset
}
```

**Example:**
```typescript
const status = getRateLimitStatus();
console.log(`Used ${status.requestCount}/${status.limit} requests`);
console.log(`${status.remaining} remaining, resets in ${status.resetInMinutes}m`);
```

#### `clearCache()`

Clear the result cache (useful for testing).

**Returns:** `void`

**Example:**
```typescript
clearCache(); // Force fresh results on next search
```

## Features

### 1. Multi-Source Aggregation

JSearch aggregates jobs from 500+ sources:
- LinkedIn
- Indeed
- Glassdoor
- ZipRecruiter
- Monster
- CareerBuilder
- SimplyHired
- ...and many more

All through a single API call.

### 2. Rate Limiting

**Free tier limits:**
- 1,000 requests per hour
- 500,000 requests per month

**Built-in protection:**
- Automatic request tracking
- Pre-request quota validation
- Friendly error messages with reset time
- Rolling 1-hour window (not fixed)

**Example error:**
```
JSearch API rate limit exceeded. 1000 requests in last hour. Reset in 23 minutes.
```

### 3. Result Caching

**Cache configuration:**
- TTL: 72 hours (job listings change slowly)
- Storage: In-memory (fast, but resets on restart)
- Key: Normalized search params (case-insensitive)

**Performance:**
- First search: ~2000ms (API call)
- Cached search: ~20ms (100x faster)

**Cache behavior:**
```typescript
// First search - hits API
await searchJobs(userId, { keywords: 'Developer', location: 'NYC' });
// [JSearch] Search performed: Developer (10 results)

// Second identical search - hits cache
await searchJobs(userId, { keywords: 'developer', location: 'nyc' });
// [JSearch Cache] Hit for query: developer
```

### 4. Data Normalization

Converts JSearch API format to internal `Job` schema:

**Input (JSearch API):**
```json
{
  "job_id": "xyz123",
  "job_title": "Senior Frontend Engineer",
  "employer_name": "Tech Startup Inc.",
  "job_city": "San Francisco",
  "job_state": "CA",
  "job_is_remote": false,
  "job_min_salary": 140000,
  "job_max_salary": 180000,
  "job_required_skills": ["React", "TypeScript"],
  "job_publisher": "LinkedIn"
}
```

**Output (Internal Job):**
```typescript
{
  id: 'uuid-v4',
  userId: 'user-123',
  title: 'Senior Frontend Engineer',
  company: 'Tech Startup Inc.',
  location: 'San Francisco, CA',
  workArrangement: 'On-site',
  salaryMin: 140000,
  salaryMax: 180000,
  requiredSkills: ['React', 'TypeScript', 'JavaScript', 'CSS'],
  source: 'jsearch',
  metadata: {
    jsearchId: 'xyz123',
    publisher: 'LinkedIn',
    employmentType: 'FULLTIME'
  }
}
```

### 5. Skills Extraction

Multi-source skill extraction:

1. **API-provided skills** (most accurate)
   - `job_required_skills` array from JSearch

2. **Highlights parsing**
   - Extract from `job_highlights.Qualifications`

3. **Description parsing** (fallback)
   - Match against 40+ common tech skills

**Result:** Deduplicated list of top 15 skills per job

### 6. Work Arrangement Detection

Intelligent detection algorithm:

```typescript
Priority:
1. job_is_remote flag (explicit)
2. Title keywords (e.g., "Remote Frontend Developer")
3. Description keywords (e.g., "Work from home")
4. Default to "Unknown" if unclear
```

**Detected values:**
- `Remote` - Fully remote position
- `Hybrid` - Mix of remote/office
- `On-site` - In-office only
- `Unknown` - Cannot determine

### 7. Error Handling & Retry

**Automatic retry with exponential backoff:**
- Max retries: 3
- Delays: 1s, 2s, 3s
- Retry on: 5xx errors, network issues, timeouts
- Don't retry on: 4xx errors (except 429), auth failures

**Error handling:**
```typescript
try {
  const jobs = await searchJobs(userId, params);
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Handle quota exceeded
  } else if (error.message.includes('not configured')) {
    // Handle missing API key
  } else if (error.message.includes('timeout')) {
    // Handle network issues
  } else {
    // Generic error handling
  }
}
```

## Architecture

### Components

```
jsearch.service.ts
├── HTTP Client (createJSearchClient)
│   └── Axios with RapidAPI headers
├── Rate Limiter (RateLimiter class)
│   ├── canMakeRequest()
│   ├── recordRequest()
│   ├── getRequestCount()
│   └── getTimeUntilReset()
├── Result Cache (ResultCache class)
│   ├── get(params)
│   ├── set(params, results)
│   ├── clear()
│   └── cleanExpired()
├── Search Functions
│   ├── searchJobs() - Main entry point
│   ├── buildQueryString() - Build search query
│   └── executeSearchWithRetry() - API call with retry
└── Normalization
    ├── normalizeJSearchResults() - Batch normalize
    ├── normalizeJSearchJob() - Single job
    ├── detectWorkArrangement() - Remote/hybrid/onsite
    ├── extractSkills() - Multi-source skills
    ├── normalizePostedDate() - ISO date
    └── stripHtml() - Clean descriptions
```

### Data Flow

```
User Request
    ↓
searchJobs(userId, params)
    ↓
Check Cache → Cache Hit? → Return Cached Results
    ↓ (miss)
Check Rate Limit → Exceeded? → Throw Error
    ↓ (OK)
Build Query String
    ↓
Execute API Request (with retry)
    ↓
Normalize Results (JSearch → Job)
    ↓
Store in Cache (72h TTL)
    ↓
Record Request (rate limiting)
    ↓
Return Normalized Jobs
```

## Integration Examples

### Use Alongside Apify

Combine JSearch with existing Apify scrapers for maximum coverage:

```typescript
import { searchJobs as searchJSearch } from './services/jsearch.service';
import { scrapeJobs as scrapeApify } from './services/jobScraper.service';

// Parallel search across all sources
const [jsearchResults, apifyResults] = await Promise.allSettled([
  searchJSearch(userId, { keywords, location, maxResults: 20 }),
  scrapeApify(userId, { keywords: [keywords], location, maxResults: 20 })
]);

const allJobs = [
  ...(jsearchResults.status === 'fulfilled' ? jsearchResults.value : []),
  ...(apifyResults.status === 'fulfilled' ? apifyResults.value : [])
];

console.log(`Total jobs from all sources: ${allJobs.length}`);
```

### Add to Job Routes

```typescript
// backend/src/routes/jobs.ts
import { searchJobs, isJSearchConfigured } from '../services/jsearch.service';

router.post('/search', authMiddleware, async (req, res) => {
  const { keywords, location, remote } = req.body;
  const userId = (req as AuthenticatedRequest).userId;

  if (!isJSearchConfigured()) {
    return res.status(503).json({
      error: 'Job search temporarily unavailable'
    });
  }

  try {
    const jobs = await searchJobs(userId, {
      keywords,
      location,
      remote,
      datePosted: 'month',
      maxResults: 50
    });

    res.json({ jobs, total: jobs.length });
  } catch (error) {
    if (error.message.includes('rate limit')) {
      return res.status(429).json({
        error: 'Job search quota exceeded. Try again later.',
        retryAfter: extractRetryTime(error.message)
      });
    }
    throw error;
  }
});
```

### Monitor Usage

```typescript
import { getRateLimitStatus } from './services/jsearch.service';

// Scheduled job to monitor API usage
setInterval(() => {
  const status = getRateLimitStatus();

  if (status.remaining < 100) {
    console.warn(`[JSearch] Low quota: ${status.remaining} requests remaining`);
    // Alert admins or throttle user searches
  }

  console.log(`[JSearch] Usage: ${status.requestCount}/${status.limit} (${((status.requestCount / status.limit) * 100).toFixed(1)}%)`);
}, 60 * 60 * 1000); // Check every hour
```

## Best Practices

### ✅ DO

1. **Check configuration on startup**
   ```typescript
   if (!isJSearchConfigured()) {
     console.warn('JSearch not configured, falling back to Apify');
   }
   ```

2. **Monitor rate limits**
   ```typescript
   const status = getRateLimitStatus();
   if (status.remaining < 50) {
     // Alert or throttle
   }
   ```

3. **Handle errors gracefully**
   ```typescript
   try {
     return await searchJobs(userId, params);
   } catch (error) {
     // Fall back to cached results or other sources
     return fallbackSearch(params);
   }
   ```

4. **Leverage caching**
   - Don't bypass cache unless user explicitly requests fresh results
   - 72-hour cache is intentional (job listings change slowly)

5. **Combine with other sources**
   - Use JSearch + Apify for maximum coverage
   - Diversify to reduce single-point-of-failure

### ❌ DON'T

1. **Don't bypass rate limiting**
   - Respecting limits avoids API suspension
   - Use cache to reduce API calls

2. **Don't ignore errors**
   - Always handle rate limit errors gracefully
   - Provide user-friendly error messages

3. **Don't cache forever**
   - 72 hours is the maximum (job listings change)
   - Respect JSearch terms of service

4. **Don't log API keys**
   - Never log `JSEARCH_API_KEY` in code
   - Redact from error messages

5. **Don't resell data**
   - JSearch data is for your app only
   - Cannot resell or redistribute job listings

## Troubleshooting

### "API key not configured"

**Problem:** Service throws error on first use

**Solution:**
1. Add `JSEARCH_API_KEY` to `backend/.env`
2. Restart backend server
3. Run `npm run test:jsearch` to verify

### Rate limit reached

**Problem:** `Error: JSearch API rate limit exceeded`

**Solution:**
1. Wait for rate limit reset (check `getRateLimitStatus()`)
2. Upgrade to higher tier if consistently hitting limit
3. Optimize searches (use cache, reduce redundant queries)
4. Implement user-level throttling

### No results returned

**Problem:** Search returns empty array

**Solution:**
1. Broaden search terms (too specific = no matches)
2. Try different locations
3. Check `date_posted` filter (try 'all' instead of 'today')
4. Verify API key is valid

### Slow responses

**Problem:** Searches take >5 seconds

**Solution:**
1. Verify cache is working (check logs for `[JSearch Cache] Hit`)
2. Check network latency
3. Consider reducing `maxResults`
4. Ensure rate limiter isn't blocking unnecessarily

## Testing

### Manual Test

```bash
cd backend
npm run test:jsearch
```

### Unit Tests

```typescript
import { normalizeJSearchJob, extractSkills } from './jsearch.service';

describe('JSearch Service', () => {
  it('should normalize JSearch job correctly', () => {
    const jsearchJob = { /* ... */ };
    const normalized = normalizeJSearchJob(jsearchJob, 'user-123');

    expect(normalized.source).toBe('jsearch');
    expect(normalized.title).toBeDefined();
    expect(normalized.company).toBeDefined();
  });

  it('should extract skills from multiple sources', () => {
    const job = {
      job_required_skills: ['React', 'TypeScript'],
      job_description: 'Looking for a JavaScript and Node.js developer'
    };

    const skills = extractSkills(job);
    expect(skills).toContain('React');
    expect(skills).toContain('TypeScript');
    expect(skills).toContain('JavaScript');
    expect(skills).toContain('Node.js');
  });
});
```

## Cost Optimization

### Reduce API Usage

1. **Enable caching** (already enabled by default)
   - 72-hour cache reduces calls by ~80%

2. **Batch user searches**
   - Search once, show to multiple users
   - User-agnostic caching

3. **Smart pagination**
   - Only fetch page 2+ when user requests it
   - Don't preload all pages

4. **Deduplicate searches**
   - Track recent searches to avoid duplicates
   - Show "recent searches" instead of re-querying

### Monitor Costs

```typescript
// Track API usage
let monthlyRequests = 0;

setInterval(() => {
  console.log(`[JSearch] Monthly requests: ${monthlyRequests}`);

  if (monthlyRequests > 400000) {
    console.warn('Approaching monthly limit (500K)');
  }
}, 24 * 60 * 60 * 1000); // Daily check
```

## References

- **JSearch API:** https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
- **RapidAPI Docs:** https://docs.rapidapi.com/
- **Full Documentation:** `/docs/JSEARCH_API_INTEGRATION.md`
- **Service Code:** `/backend/src/services/jsearch.service.ts`
- **Test Script:** `/backend/test-jsearch.ts`
