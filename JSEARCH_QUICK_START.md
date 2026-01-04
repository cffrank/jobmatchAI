# JSearch API - Quick Start Guide

**5-minute setup for multi-source job searching**

## Step 1: Sign Up for RapidAPI (2 minutes)

1. Visit **https://rapidapi.com** → Click "Sign Up"
2. Create account (email + password or social login)
3. Verify your email address

## Step 2: Subscribe to JSearch API (1 minute)

1. Go to **https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch**
2. Click "**Subscribe to Test**" or "**Pricing**"
3. Select **FREE tier** (1000 requests/hour, no credit card)
4. Click "Subscribe"

## Step 3: Get Your API Key (30 seconds)

1. After subscribing, you'll see the API dashboard
2. Look for **"X-RapidAPI-Key"** header (long alphanumeric string)
3. Click to copy your API key

## Step 4: Configure Backend (30 seconds)

Add to `backend/.env`:

```bash
# JSearch API Configuration
JSEARCH_API_KEY=your-rapidapi-key-here
JSEARCH_API_HOST=jsearch.p.rapidapi.com
```

**Replace** `your-rapidapi-key-here` with your actual key from Step 3.

## Step 5: Test Integration (1 minute)

```bash
cd backend
npm run test:jsearch
```

**Expected output:**
```
✅ JSearch API is configured
✅ Search completed in 1847ms
   Found 5 jobs
✅ All tests passed!
```

## Done! 🎉

You can now search 500+ job boards through JSearch API.

---

## Quick Usage

### Basic Search

```typescript
import { searchJobs } from './services/jsearch.service';

const jobs = await searchJobs('user-id', {
  keywords: 'Software Engineer',
  location: 'San Francisco, CA',
  maxResults: 20
});

console.log(`Found ${jobs.length} jobs`);
```

### Remote Jobs Only

```typescript
const remoteJobs = await searchJobs('user-id', {
  keywords: 'React Developer',
  remote: true,
  datePosted: 'week',
  maxResults: 15
});
```

### Full-Time Recent Postings

```typescript
const recentJobs = await searchJobs('user-id', {
  keywords: 'Backend Engineer',
  location: 'Austin, TX',
  employmentType: 'FULLTIME',
  datePosted: '3days',
  maxResults: 25
});
```

---

## Troubleshooting

### "API key not configured"

**Solution:** Check that `JSEARCH_API_KEY` is in `backend/.env` and restart server.

### "Rate limit exceeded"

**Solution:** Free tier = 1000 requests/hour. Wait for reset or upgrade tier.

### No results

**Solution:** Try broader search terms (e.g., "Developer" instead of "Senior React TypeScript Developer").

---

## Next Steps

- 📖 **Full Documentation:** `docs/JSEARCH_API_INTEGRATION.md`
- 📋 **Quick Reference:** `backend/src/services/README_JSEARCH.md`
- 🧪 **Test Script:** `backend/test-jsearch.ts`

## Support

- **RapidAPI Support:** https://rapidapi.com/support
- **JSearch API Page:** https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
- **API Dashboard:** https://rapidapi.com/developer/dashboard
