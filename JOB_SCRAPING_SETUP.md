# Job Scraping Setup Guide

This document explains how to set up and use the job scraping feature for JobMatch AI, which scrapes jobs from LinkedIn and Indeed using Apify.

## Overview

The job scraping system consists of:
- **Cloud Function** (`functions/src/scrapeJobs.ts`) - Backend scraping logic using Apify
- **React Hook** (`src/hooks/useJobScraping.ts`) - Client-side integration
- **UI Component** (`src/sections/job-discovery-matching/components/JobSearchForm.tsx`) - Search interface
- **Firestore** - Storage for scraped jobs and search history

## Prerequisites

1. **Apify Account**: Sign up at [apify.com](https://apify.com)
2. **Firebase Project**: Already configured
3. **Apify API Token**: Get from Apify dashboard

## Setup Instructions

### 1. Get Apify API Token

1. Log in to [Apify](https://console.apify.com)
2. Go to Settings > Integrations
3. Copy your API token

### 2. Configure Firebase Secret

Set the Apify API token as a Firebase secret:

```bash
# Navigate to project root
cd /home/carl/application-tracking/jobmatch-ai

# Set the secret (Firebase CLI v11+)
firebase functions:secrets:set APIFY_API_TOKEN
# When prompted, paste your Apify API token

# Or set via .env for local development
echo "APIFY_API_TOKEN=your-token-here" >> functions/.env
```

### 3. Update Firebase Functions Configuration

The function is already configured in `functions/src/scrapeJobs.ts` with:
- 5-minute timeout (300 seconds)
- 512MB memory allocation
- Secret access to `APIFY_API_TOKEN`

### 4. Compile TypeScript Functions

```bash
cd functions
npm run build
```

This compiles TypeScript to JavaScript in the `lib/` directory.

### 5. Deploy Cloud Function

```bash
# Deploy only the scrapeJobs function
firebase deploy --only functions:scrapeJobs

# Or deploy all functions
firebase deploy --only functions
```

### 6. Update Firestore Security Rules

The security rules have been updated to allow users to:
- Read/write their job searches: `users/{userId}/jobSearches/{searchId}`
- Read/write scraped jobs: `users/{userId}/jobSearches/{searchId}/jobs/{jobId}`
- Read/write saved jobs: `users/{userId}/savedJobs/{jobId}`

Deploy the updated rules:

```bash
firebase deploy --only firestore:rules
```

## Architecture

### Data Flow

1. **User submits search** → JobSearchForm component
2. **Hook calls Cloud Function** → `useJobScraping.scrapeJobs(params)`
3. **Cloud Function**:
   - Validates authentication
   - Checks rate limits (10 searches/hour)
   - Calls Apify actors for LinkedIn and Indeed
   - Normalizes job data
   - Saves to Firestore
4. **Returns results** → Jobs displayed in UI

### Firestore Structure

```
users/{userId}/
  jobSearches/{searchId}/
    - createdAt: Timestamp
    - jobCount: number
    jobs/{jobId}/
      - title: string
      - company: string
      - location: string
      - description: string
      - salaryMin: number
      - salaryMax: number
      - workArrangement: string
      - source: 'linkedin' | 'indeed'
      - url: string
      - scrapedAt: Timestamp
      - isSaved: boolean

  savedJobs/{jobId}/
    - (same structure as above)
    - savedAt: Timestamp
```

### Rate Limiting

To prevent abuse and manage Apify costs:
- **10 searches per hour** per user
- Tracked in `users/{userId}` document:
  - `lastJobSearchTime`: Timestamp
  - `jobSearchCount`: number

## Usage

### In the JobListPage Component

```tsx
import { useJobScraping } from '../../hooks/useJobScraping';
import { JobSearchForm } from './components/JobSearchForm';

function JobListPage() {
  const { scrapeJobs, loading, error } = useJobScraping();

  const handleSearch = async (params: JobSearchParams) => {
    const result = await scrapeJobs(params);

    if (result) {
      // Handle successful search
      console.log(`Found ${result.jobCount} jobs`);
      // Jobs are automatically saved to Firestore
    } else if (error) {
      // Handle error
      console.error('Search failed:', error);
    }
  };

  return (
    <div>
      <JobSearchForm onSearch={handleSearch} loading={loading} />
      {/* Display jobs */}
    </div>
  );
}
```

### Search Parameters

```typescript
interface JobSearchParams {
  keywords: string;              // Required: e.g., "Software Engineer"
  location?: string;             // e.g., "San Francisco, CA"
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship';
  workArrangement?: 'remote' | 'hybrid' | 'on-site';
  salaryMin?: number;            // e.g., 80000
  salaryMax?: number;            // e.g., 150000
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  maxResults?: number;           // Default: 20, Max: 50
  sources?: ('linkedin' | 'indeed')[]; // Default: both
}
```

## Apify Actors Used

### LinkedIn Jobs Scraper
- **Actor ID**: `bebity/linkedin-jobs-scraper`
- **Features**: Keyword search, location filtering, job type
- **Cost**: ~$0.01 - $0.05 per search (20 jobs)

### Indeed Scraper
- **Actor ID**: `misceres/indeed-scraper`
- **Features**: Keyword search, location filtering, salary range
- **Cost**: ~$0.01 - $0.05 per search (20 jobs)

## Error Handling

The system handles errors gracefully:

1. **Authentication errors**: Returns `unauthenticated` error
2. **Rate limit exceeded**: Returns `resource-exhausted` error
3. **Missing API token**: Returns `failed-precondition` error
4. **Scraping failures**:
   - If one source fails, returns jobs from successful source
   - If all sources fail, returns error with details
5. **Partial failures**: Returns jobs with `errors` array

## Testing

### Local Testing with Emulators

```bash
# Start emulators
cd /home/carl/application-tracking/jobmatch-ai
firebase emulators:start

# In another terminal, run the app
npm run dev
```

### Test the Cloud Function Directly

```bash
# Using Firebase CLI
firebase functions:shell

# In the shell
scrapeJobs({
  keywords: "Software Engineer",
  location: "San Francisco",
  maxResults: 5
})
```

## Cost Management

### Apify Pricing
- **Free tier**: $5/month of platform usage
- **Pay-as-you-go**: ~$0.01-$0.05 per job search
- **Estimate**: 100 searches/month = ~$2-$5

### Optimization Tips
1. Set reasonable `maxResults` (default: 20)
2. Implement user rate limiting (already done: 10/hour)
3. Cache results in Firestore to avoid duplicate searches
4. Consider a subscription tier for power users

## Monitoring

### Firebase Console
- Monitor function executions: Firebase Console > Functions
- Check error logs: Cloud Functions logs
- Track costs: Apify dashboard

### Firestore Queries
```javascript
// Get user's search history
const searches = await db
  .collection('users')
  .doc(userId)
  .collection('jobSearches')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get();
```

## Troubleshooting

### "Apify API token is not configured"
- Ensure you've set the `APIFY_API_TOKEN` secret
- Redeploy the function after setting the secret

### "Rate limit exceeded"
- Wait 1 hour before searching again
- Or adjust rate limit in `scrapeJobs.ts` (line 165)

### "All scraping attempts failed"
- Check Apify dashboard for actor status
- Verify actor IDs are correct
- Check if Apify account has sufficient credits

### TypeScript compilation errors
- Ensure all dependencies are installed: `cd functions && npm install`
- Check tsconfig.json excludes problematic files
- Run `npm run build` to see detailed errors

## Future Enhancements

1. **AI-Powered Matching**: Calculate match scores using OpenAI
2. **Scheduled Searches**: Set up automated daily/weekly searches
3. **Job Alerts**: Email/push notifications for new matches
4. **Advanced Filtering**: Industry, company size, benefits
5. **Salary Insights**: Aggregate salary data and trends
6. **Application Tracking**: Direct integration with application generator

## Support

For issues or questions:
1. Check Firebase Functions logs
2. Verify Apify actor status
3. Review Firestore security rules
4. Check browser console for client-side errors

## References

- [Apify Documentation](https://docs.apify.com)
- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Firebase Secrets Management](https://firebase.google.com/docs/functions/config-env#secret-manager)
