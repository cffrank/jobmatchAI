# RemoteOK API Integration Guide

This guide provides comprehensive documentation for integrating RemoteOK's public API into JobMatch AI for remote job searching.

## Table of Contents

- [Overview](#overview)
- [API Features](#api-features)
- [Setup & Configuration](#setup--configuration)
- [Authentication](#authentication)
- [Rate Limits & Pricing](#rate-limits--pricing)
- [API Usage](#api-usage)
- [Job Normalization](#job-normalization)
- [Caching Strategy](#caching-strategy)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Compliance & Attribution](#compliance--attribution)
- [Troubleshooting](#troubleshooting)

---

## Overview

**RemoteOK** is a curated remote job board featuring 30,000+ remote job listings. The platform provides a free, public JSON API that requires no authentication.

### Key Information

- **API Endpoint**: `https://remoteok.com/api`
- **Authentication**: None required (public API)
- **Cost**: **FREE** (no API key needed)
- **Rate Limits**: 1 request per second (best practice, self-enforced)
- **Data Freshness**: Jobs appear in API 24 hours after posting on web
- **Data Retention**: Default response includes jobs from last 30 days
- **Response Format**: JSON array of job objects

### Official Resources

- **API Documentation**: [https://remoteok.com/api](https://remoteok.com/api)
- **API Tracker**: [API Tracker - RemoteOK](https://apitracker.io/a/remoteok-io)
- **GitHub Examples**: [RemoteOK API Repositories](https://github.com/topics/remoteok-api)

---

## API Features

### What RemoteOK Provides

✅ **Curated remote jobs** across multiple categories
✅ **Rich job metadata** (title, company, description, tags, salary)
✅ **Company logos** (direct image URLs)
✅ **Flexible filtering** via tags (e.g., `dev`, `backend`, `typescript`)
✅ **Salary information** (when disclosed by employers)
✅ **Geographic preferences** (though all jobs are remote)
✅ **Experience level indicators** via tags (`senior`, `junior`, etc.)

### Limitations

❌ No advanced search filters (client-side filtering required)
❌ No pagination (returns all jobs in single response)
❌ No authentication (can't track usage)
❌ 24-hour delay between web posting and API availability
❌ Salary data is optional (many jobs don't include it)

---

## Setup & Configuration

### 1. Environment Variables

Add the following to your `backend/.env` file:

```bash
# RemoteOK Configuration
REMOTEOK_USER_AGENT=JobMatchAI/1.0 (https://github.com/yourorg/jobmatch-ai)
```

**Important**: While RemoteOK doesn't require authentication, setting a User-Agent is considered best practice and helps RemoteOK track API usage.

### 2. User-Agent Format

Follow this format for your User-Agent:

```
AppName/Version (Contact URL or Email)
```

**Examples**:
- `JobMatchAI/1.0 (https://jobmatch-ai.com)`
- `JobMatchAI/1.0 (support@jobmatch-ai.com)`
- `JobMatchAI/1.0 (https://github.com/yourorg/jobmatch-ai)`

### 3. Service Installation

The RemoteOK service is located at:

```
backend/src/services/remoteok.service.ts
```

No npm packages or external dependencies are required beyond `axios` (already in project).

---

## Authentication

**RemoteOK API requires NO authentication.**

- ✅ No API key
- ✅ No OAuth
- ✅ No registration
- ✅ No account required

Simply make HTTP GET requests to `https://remoteok.com/api` with a User-Agent header.

---

## Rate Limits & Pricing

### Rate Limits

**Official Limits**: Not publicly documented
**Recommended Best Practice**: **1 request per second**

Our implementation automatically enforces 1 request/second rate limiting to be respectful of RemoteOK's infrastructure.

### Pricing

**Cost**: **$0.00/month** (completely free)

| Feature | Free Tier |
|---------|-----------|
| API Requests | Unlimited* |
| Jobs Available | 30,000+ |
| Data Retention | 30 days |
| Response Size | ~2-5 MB (all jobs) |
| Authentication | Not required |
| Support | Community-based |

*Subject to reasonable use (hence our 1 req/sec limit)

### Cost Comparison

| Service | Monthly Cost | Rate Limit | Authentication |
|---------|--------------|------------|----------------|
| **RemoteOK** | **$0** | 1/sec (self-enforced) | None |
| JSearch (RapidAPI) | $0 (500K/month) | 1000/hour | API Key required |
| Apify LinkedIn | ~$50 | Pay-per-use | API Token required |
| Indeed API | Not public | N/A | Partner-only |

---

## API Usage

### Basic Request

```typescript
import { searchRemoteJobs } from './services/remoteok.service';

// Search for TypeScript jobs
const jobs = await searchRemoteJobs({
  keywords: ['typescript'],
  maxResults: 20,
});
```

### Advanced Filtering

```typescript
// Search with multiple criteria
const jobs = await searchRemoteJobs({
  keywords: ['backend', 'typescript'],
  tags: ['dev', 'full-stack'],
  location: 'United States',
  salaryMin: 100000,
  maxResults: 50,
});
```

### Available Search Parameters

```typescript
interface RemoteOKSearchParams {
  keywords?: string[];      // Search in title, company, description, tags
  tags?: string[];          // Filter by RemoteOK tags (e.g., 'dev', 'backend')
  location?: string;        // Filter by location (partial match)
  salaryMin?: number;       // Minimum salary (only filters jobs with salary data)
  maxResults?: number;      // Limit number of results (default: 50)
}
```

### Popular Tags

Use these common tags for filtering:

**Role Types**:
- `dev`, `backend`, `frontend`, `full-stack`
- `design`, `marketing`, `sales`, `customer-support`
- `devops`, `data`, `mobile`

**Technologies**:
- `javascript`, `typescript`, `python`, `ruby`, `go`, `rust`
- `react`, `vue`, `angular`, `node`
- `aws`, `docker`, `kubernetes`

Get full list programmatically:

```typescript
import { getPopularTags } from './services/remoteok.service';

const tags = getPopularTags();
// Returns: ['dev', 'backend', 'frontend', 'full-stack', ...]
```

---

## Job Normalization

RemoteOK jobs are automatically normalized to our internal `Job` format:

### RemoteOK Format → Internal Format

```typescript
RemoteOK Job {
  id: "123456",
  slug: "senior-backend-engineer-acme",
  position: "Senior Backend Engineer",
  company: "Acme Corp",
  company_logo: "https://remoteok.com/assets/logo.png",
  tags: ["backend", "typescript", "senior"],
  description: "...",
  location: "United States",
  url: "https://remoteok.com/remote-jobs/123456",
  date: "2025-01-15T10:00:00Z",
  salary_min: 120000,
  salary_max: 160000,
  expired: false
}

↓ normalizeRemoteOKJob()

Internal Job {
  id: "uuid-v4",
  title: "Senior Backend Engineer",
  company: "Acme Corp",
  companyLogo: "https://remoteok.com/assets/logo.png",
  location: "United States",
  workArrangement: "Remote",           // Always "Remote"
  salaryMin: 120000,
  salaryMax: 160000,
  postedDate: "2025-01-15T10:00:00Z",
  description: "...",
  url: "https://remoteok.com/remote-jobs/123456",
  source: "remoteok",                   // Source tracking
  requiredSkills: ["TypeScript"],       // Extracted from tags
  experienceLevel: "Senior",            // Inferred from tags
  isSaved: false,
  isArchived: false,
  scrapedAt: "2025-01-16T14:30:00Z",
  createdAt: "2025-01-16T14:30:00Z",
  updatedAt: "2025-01-16T14:30:00Z"
}
```

### Skill Extraction

Skills are automatically extracted from tags using a comprehensive mapping:

```typescript
Tags: ["typescript", "react", "node", "aws", "docker"]
  ↓
RequiredSkills: ["TypeScript", "React", "Node.js", "AWS", "Docker"]
```

### Experience Level Inference

Experience levels are inferred from tags:

| Tags | Experience Level |
|------|------------------|
| `senior`, `lead`, `principal`, `staff` | `Senior` |
| `junior`, `entry`, `intern` | `Entry Level` |
| `mid`, `intermediate` | `Mid Level` |
| None matched | `undefined` |

---

## Caching Strategy

To minimize API calls and respect RemoteOK's infrastructure, we implement **in-memory caching**:

### Cache Configuration

```typescript
Cache TTL: 72 hours
Cache Key: JSON.stringify(searchParams)
Cache Storage: In-memory Map
Cache Cleanup: Automatic (hourly)
```

### How It Works

1. **First request**: Fetches from RemoteOK API → Stores in cache
2. **Subsequent requests** (same params, within 72h): Returns cached data
3. **After 72 hours**: Cache expires → Re-fetches from API

### Cache Benefits

✅ **Faster response times** (no network latency)
✅ **Reduced API load** (respects RemoteOK infrastructure)
✅ **Better user experience** (instant results for popular searches)

### Cache Invalidation

Cache entries expire automatically after 72 hours. To manually clear cache (for development):

```typescript
// Cache is internal to service, restart server to clear:
npm run dev  # Stop and restart
```

---

## Error Handling

The service implements comprehensive error handling:

### Common Errors

#### 1. Network Error

```typescript
Error: RemoteOK API: No response received (network error)
```

**Cause**: Internet connection issue, RemoteOK server down, firewall blocking
**Solution**: Check network connectivity, retry after a few minutes

#### 2. API Response Error

```typescript
Error: RemoteOK API error: 429 - Too Many Requests
```

**Cause**: Rate limit exceeded (too many requests too quickly)
**Solution**: Our rate limiter should prevent this, but wait 1-2 seconds and retry

#### 3. Invalid Response

```typescript
Error: Invalid API response: expected array
```

**Cause**: RemoteOK API returned unexpected data format
**Solution**: Check API status, report to RemoteOK if persistent

### Error Handling Pattern

```typescript
try {
  const jobs = await searchRemoteJobs({ keywords: ['python'] });
  console.log(`Found ${jobs.length} jobs`);
} catch (error) {
  if (error instanceof Error) {
    console.error('RemoteOK search failed:', error.message);
    // Fallback to other job sources or show user-friendly message
  }
}
```

---

## Testing

### Run Test Script

```bash
# Using npx (recommended)
npx tsx backend/test-remoteok.ts

# Or using ts-node
npm run ts-node backend/test-remoteok.ts
```

### Test Coverage

The test script (`backend/test-remoteok.ts`) covers:

1. ✅ Configuration verification
2. ✅ Basic keyword search
3. ✅ Multi-keyword filtering
4. ✅ Tag-based filtering
5. ✅ Location filtering
6. ✅ Salary filtering
7. ✅ Job normalization
8. ✅ Cache behavior
9. ✅ Popular tags retrieval
10. ✅ Rate limiting enforcement

### Expected Output

```
🚀 RemoteOK API Integration Tests

================================================================================
  Test 1: Configuration Check
================================================================================

✅ RemoteOK service is configured
ℹ️  User-Agent: JobMatchAI/1.0 (https://github.com/yourorg/jobmatch-ai)

================================================================================
  Test 2: Basic Search (TypeScript jobs)
================================================================================

✅ Found 47 TypeScript jobs

Sample job:
  Position: Senior TypeScript Engineer
  Company: TechCorp
  Location: Worldwide
  Tags: backend, typescript, senior, dev
  URL: https://remoteok.com/remote-jobs/123456
  Salary: $120000 - $160000

... (more tests) ...
```

---

## Compliance & Attribution

### Legal Requirements

By using RemoteOK's API, you **legally agree** to:

1. **Mention Remote OK as a source** in your UI
2. **Link back to the job listing** on Remote OK
3. **Use DIRECT links** (no redirects)

### How to Comply

#### ✅ Correct Attribution

```jsx
<div className="job-source">
  Source: <a href={job.url} target="_blank">Remote OK</a>
</div>
```

#### ❌ Incorrect (Missing Attribution)

```jsx
<a href={job.url}>Apply Now</a>
<!-- No mention of Remote OK -->
```

#### ❌ Incorrect (Redirect Link)

```jsx
<a href="https://yoursite.com/redirect?to=remoteok.com/job/123">
  View on Remote OK
</a>
<!-- Redirects are NOT allowed -->
```

### UI Implementation Example

```jsx
import { ExternalLink } from 'lucide-react';

function JobCard({ job }) {
  return (
    <Card>
      <CardHeader>
        <h3>{job.title}</h3>
        <p>{job.company}</p>
      </CardHeader>
      <CardContent>
        <p>{job.description}</p>
      </CardContent>
      <CardFooter>
        {/* ✅ Correct: Direct link with attribution */}
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          View on Remote OK
        </a>
      </CardFooter>
    </Card>
  );
}
```

---

## Troubleshooting

### Issue: No jobs returned

**Symptoms**: `searchRemoteJobs()` returns empty array

**Possible Causes**:
1. Filters too restrictive (no jobs match)
2. Network error (check error logs)
3. RemoteOK API temporarily down

**Solutions**:
```typescript
// Try broader search
const jobs = await searchRemoteJobs({ maxResults: 50 });

// Check if any jobs exist
if (jobs.length === 0) {
  console.log('No jobs found - try broader search criteria');
}
```

### Issue: Slow response times

**Symptoms**: First request takes 5-10 seconds

**Cause**: RemoteOK API returns ~2-5 MB JSON (all jobs)

**Solution**: This is expected. Caching makes subsequent requests instant.

```typescript
// First call: ~5-10 seconds (API fetch)
const jobs1 = await searchRemoteJobs({ keywords: ['python'] });

// Second call: <10ms (cached)
const jobs2 = await searchRemoteJobs({ keywords: ['python'] });
```

### Issue: Cache not working

**Symptoms**: Every request takes 5-10 seconds

**Cause**: Search parameters are different (even slightly)

**Solution**: Ensure exact same parameters for cache hit

```typescript
// These are DIFFERENT cache keys (won't hit cache):
await searchRemoteJobs({ keywords: ['python'] });
await searchRemoteJobs({ keywords: ['Python'] }); // Capital P

// These are SAME (will hit cache):
await searchRemoteJobs({ keywords: ['python'], maxResults: 50 });
await searchRemoteJobs({ keywords: ['python'], maxResults: 50 });
```

### Issue: Rate limiting too aggressive

**Symptoms**: Search feels sluggish

**Cause**: 1 second delay between requests

**Solution**: This is intentional to respect RemoteOK. Use caching for frequently-searched terms.

---

## Integration Checklist

Before deploying RemoteOK integration to production:

- [ ] Set `REMOTEOK_USER_AGENT` in production `.env`
- [ ] Test all search scenarios (keywords, tags, location, salary)
- [ ] Verify job normalization produces valid `Job` objects
- [ ] Confirm caching is working (check logs for "Cache hit")
- [ ] Add Remote OK attribution in job listings UI
- [ ] Use direct links (no redirects) to Remote OK
- [ ] Monitor error rates in production logs
- [ ] Set up fallback to other job sources if RemoteOK fails
- [ ] Document RemoteOK as a data source in privacy policy
- [ ] Add RemoteOK to job source filters in UI

---

## Support & Resources

### Official RemoteOK

- **Website**: [https://remoteok.com](https://remoteok.com)
- **API Endpoint**: [https://remoteok.com/api](https://remoteok.com/api)
- **Creator**: [@levelsio](https://twitter.com/levelsio) on Twitter

### Community Resources

- [RemoteOK API on API Tracker](https://apitracker.io/a/remoteok-io)
- [GitHub Topic: remoteok-api](https://github.com/topics/remoteok-api)
- [Free Public APIs - RemoteOK](https://www.freepublicapis.com/remote-ok-jobs-api)

### JobMatch AI Documentation

- [API Migration Checklist](/home/carl/application-tracking/jobmatch-ai/cloudflare-migration/API_MIGRATION_CHECKLIST.md)
- [Job Scraper Service](/home/carl/application-tracking/jobmatch-ai/backend/src/services/jobScraper.service.ts)
- [Testing Strategy](/home/carl/application-tracking/jobmatch-ai/docs/TESTING_STRATEGY.md)

---

## Changelog

### Version 1.0 (2025-01-16)

- ✅ Initial RemoteOK API integration
- ✅ Keyword, tag, location, and salary filtering
- ✅ 72-hour result caching
- ✅ 1 request/second rate limiting
- ✅ Comprehensive test script
- ✅ Job normalization to internal format
- ✅ Skill extraction from tags
- ✅ Experience level inference
- ✅ Full documentation

---

## License & Terms

RemoteOK API is provided free of charge. By using it, you agree to:

1. Attribute Remote OK as source
2. Link directly to job listings (no redirects)
3. Use the API responsibly (respect rate limits)
4. Comply with RemoteOK's terms of service

See [https://remoteok.com/api](https://remoteok.com/api) for official terms.

---

**Need help?** Check the troubleshooting section or review the test script for working examples.
