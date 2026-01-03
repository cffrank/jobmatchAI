# RemoteOK API - Quick Start Guide

> **TL;DR**: Free remote job API. No API key needed. Just import and use.

## 30-Second Setup

### 1. Add Environment Variable (Optional)

```bash
# backend/.env
REMOTEOK_USER_AGENT=JobMatchAI/1.0 (https://yoursite.com)
```

### 2. Use the Service

```typescript
import { searchRemoteJobs, normalizeRemoteOKResults } from './services/remoteok.service';

// Search for jobs
const jobs = await searchRemoteJobs({
  keywords: ['typescript', 'backend'],
  tags: ['dev'],
  location: 'United States',
  salaryMin: 100000,
  maxResults: 20,
});

// Normalize to internal format
const normalizedJobs = normalizeRemoteOKResults(jobs);

console.log(`Found ${normalizedJobs.length} remote jobs`);
```

That's it! No API key, no registration, no cost.

## Quick Examples

### Basic Search

```typescript
// Find Python jobs
const pythonJobs = await searchRemoteJobs({
  keywords: ['python'],
  maxResults: 10,
});
```

### Full-Stack Developer Search

```typescript
// Find full-stack positions
const fullStackJobs = await searchRemoteJobs({
  tags: ['full-stack', 'dev'],
  keywords: ['react', 'node'],
  maxResults: 20,
});
```

### Senior Engineer with Salary

```typescript
// Find senior positions paying $150k+
const seniorJobs = await searchRemoteJobs({
  keywords: ['senior', 'engineer'],
  salaryMin: 150000,
  maxResults: 15,
});
```

## Popular Tags

Use these tags for better filtering:

**Roles:**
`dev`, `backend`, `frontend`, `full-stack`, `design`, `marketing`, `devops`

**Technologies:**
`javascript`, `typescript`, `python`, `react`, `node`, `aws`, `docker`

Get full list:
```typescript
import { getPopularTags } from './services/remoteok.service';
const tags = getPopularTags();
```

## Testing

```bash
# Run test script
npx tsx backend/test-remoteok.ts
```

Expected: All 10 tests pass in ~30-60 seconds.

## Key Features

✅ **FREE** - No cost, no API key
✅ **30,000+ jobs** - All remote positions
✅ **Cached** - 72-hour TTL for fast responses
✅ **Rate limited** - 1 req/sec automatically
✅ **Normalized** - Auto-converts to internal Job format

## Important Rules

### Attribution Required

When displaying jobs, you MUST:

```jsx
// ✅ CORRECT - Attribution link
<a href={job.url} target="_blank">
  View on Remote OK
</a>

// ❌ WRONG - No attribution
<a href={job.url}>Apply Now</a>
```

### Direct Links Only

```jsx
// ✅ CORRECT - Direct link
href="https://remoteok.com/remote-jobs/123456"

// ❌ WRONG - Redirect
href="https://yoursite.com/redirect?to=remoteok.com/job/123456"
```

## Common Patterns

### Combine with Other Sources

```typescript
// Scrape from multiple sources
const linkedInJobs = await scrapeLinkedIn(params);
const indeedJobs = await scrapeIndeed(params);
const remoteOKJobs = await searchRemoteJobs({
  keywords: params.keywords,
  location: params.location,
  salaryMin: params.salaryMin,
  maxResults: params.maxResults,
});

const allJobs = [
  ...linkedInJobs,
  ...indeedJobs,
  ...normalizeRemoteOKResults(remoteOKJobs),
];
```

### Filter by Experience

```typescript
// Find entry-level jobs
const entryJobs = await searchRemoteJobs({
  tags: ['junior', 'entry'],
  keywords: ['developer'],
});

// Find senior jobs
const seniorJobs = await searchRemoteJobs({
  tags: ['senior', 'lead'],
  keywords: ['engineer'],
});
```

### Get All Remote Jobs

```typescript
// Get all available remote jobs (no filters)
const allJobs = await searchRemoteJobs({
  maxResults: 100, // or more
});
```

## Performance Tips

### First Request (Slow)
```typescript
const jobs = await searchRemoteJobs({ keywords: ['python'] });
// Takes: ~5-10 seconds (downloads all jobs from API)
```

### Cached Request (Fast)
```typescript
const jobs = await searchRemoteJobs({ keywords: ['python'] });
// Takes: <10ms (returns cached data)
```

### Cache Lasts 72 Hours
After 72 hours, cache expires and next request fetches fresh data.

## Troubleshooting

### No Jobs Found

```typescript
// ❌ Too restrictive
const jobs = await searchRemoteJobs({
  keywords: ['very-specific-niche-tech'],
  tags: ['ultra-rare-tag'],
  salaryMin: 500000,
});
// Result: []

// ✅ Broader search
const jobs = await searchRemoteJobs({
  keywords: ['developer'],
  maxResults: 50,
});
// Result: 50 jobs
```

### Slow First Request

**This is normal!** RemoteOK returns all jobs (~2-5 MB).
Subsequent requests use cache and are <10ms.

### Rate Limiting Too Slow

Rate limiting (1 req/sec) only applies to **different** searches.
Same search hits cache instantly.

```typescript
// First call: ~10 seconds
await searchRemoteJobs({ keywords: ['python'] });

// Second call (same params): <10ms (cache)
await searchRemoteJobs({ keywords: ['python'] });

// Third call (different params): ~1 second delay + ~10 seconds (new API call)
await searchRemoteJobs({ keywords: ['javascript'] });
```

## Cost Comparison

| Service | Monthly Cost |
|---------|--------------|
| RemoteOK | **$0** ✅ |
| JSearch Free | $0 (limited) |
| Apify LinkedIn | ~$50 |
| JSearch Premium | $200 |

## Documentation

- **Full Guide**: `/docs/REMOTEOK_API_INTEGRATION.md`
- **Implementation Summary**: `/backend/REMOTEOK_IMPLEMENTATION_SUMMARY.md`
- **Service Code**: `/backend/src/services/remoteok.service.ts`
- **Test Script**: `/backend/test-remoteok.ts`

## Need Help?

1. Check [Full Documentation](/docs/REMOTEOK_API_INTEGRATION.md)
2. Run test script: `npx tsx backend/test-remoteok.ts`
3. Review [RemoteOK API](https://remoteok.com/api)

---

**Ready to use!** No setup required beyond optional User-Agent.
