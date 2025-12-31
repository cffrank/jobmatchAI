# Quality Jobs Feature - Quick Reference Guide

## For Developers

### Displaying Job Quality Indicators

```tsx
import { EnhancedJobCard } from '@/sections/job-discovery-matching/components';

<EnhancedJobCard
  job={{
    // ... standard job fields
    spamDetected: false,
    spamStatus: 'clean',
    spamProbability: 0.1,
    dedupStatus: 'canonical',
    qualityScore: 85,
    postedAt: '2025-01-15T10:00:00Z',
  }}
  showFeedbackWidget={true}
/>
```

### Analyzing a Job for Spam

```tsx
import { analyzeJobForSpam } from '@/lib/jobQualityService';

const result = await analyzeJobForSpam(jobId);
// result.spamProbability: 0.0 - 1.0
// result.recommendation: 'safe' | 'review' | 'spam'
```

### Running Deduplication

```tsx
import { deduplicateJobs } from '@/lib/jobQualityService';

const result = await deduplicateJobs();
// result.duplicatesFound: number
// result.canonicalJobsIdentified: number
```

### Submitting User Feedback

```tsx
import { submitJobFeedback } from '@/lib/jobQualityService';

// Thumbs up
await submitJobFeedback(jobId, {
  feedbackType: 'interested'
});

// Thumbs down
await submitJobFeedback(jobId, {
  feedbackType: 'not_interested',
  reason: 'salary_too_low'
});

// Report spam
await submitJobFeedback(jobId, {
  feedbackType: 'spam'
});
```

### Filtering Jobs

```tsx
const filteredJobs = jobs.filter(job => {
  // Hide duplicates
  if (hideDuplicates && job.dedupStatus === 'duplicate') return false;

  // Show only verified jobs
  if (showOnlyVerified && job.spamStatus !== 'clean') return false;

  // Hide spam
  if (hideSpam && job.spamDetected) return false;

  return true;
});
```

### Quality Badge Component

```tsx
import { JobQualityBadges } from '@/sections/job-discovery-matching/components';

<JobQualityBadges
  spamDetected={job.spamDetected}
  spamProbability={job.spamProbability}
  spamStatus={job.spamStatus}
  dedupStatus={job.dedupStatus}
  canonicalJobId={job.canonicalJobId}
  qualityScore={job.qualityScore}
  postedAt={job.postedAt}
  spamReportCount={job.spamReportCount}
  onViewCanonical={() => navigate(`/jobs/${job.canonicalJobId}`)}
  onViewSpamDetails={() => setShowSpamModal(true)}
/>
```

## API Reference

### jobQualityService Functions

| Function | Description | Rate Limit |
|----------|-------------|------------|
| `analyzeJobForSpam(jobId)` | Analyze single job | 30/hour |
| `analyzeBatchForSpam(jobIds)` | Batch analyze (max 50) | 10/hour |
| `getSpamStats()` | Get user's spam stats | Unlimited |
| `deduplicateJobs()` | Run deduplication | 10/hour |
| `getJobDuplicates(jobId)` | Get job duplicates | Unlimited |
| `mergeDuplicateJobs(canonical, dupes)` | Merge duplicates | 20/hour |
| `submitJobFeedback(jobId, feedback)` | Submit feedback | Unlimited |
| `getUserJobFeedback(jobId)` | Get user feedback | Unlimited |
| `getJobSpamReportCount(jobId)` | Get spam reports | Unlimited |

## Database Schema Quick Reference

### jobs table (relevant fields)

```sql
spam_detected BOOLEAN
spam_probability DECIMAL(5,4)  -- 0.0000 to 1.0000
spam_status spam_status_enum  -- 'clean', 'suspicious', 'spam', etc.
spam_score DECIMAL(5,2)
spam_categories TEXT[]

dedup_status dedup_status_enum  -- 'canonical', 'duplicate', 'merged', 'unique'
canonical_job_id UUID  -- FK to jobs.id

quality_score INTEGER  -- 0 to 100
posted_at TIMESTAMP
last_seen_at TIMESTAMP
```

### job_feedback table

```sql
id UUID PRIMARY KEY
job_id UUID REFERENCES jobs(id)
user_id UUID REFERENCES users(id)
feedback_type job_feedback_type  -- 'thumbs_up', 'not_interested', 'reported_spam', etc.
reasons TEXT[]
comment TEXT
created_at TIMESTAMP
```

### spam_reports table

```sql
id UUID PRIMARY KEY
job_id UUID REFERENCES jobs(id)
reported_by_user_id UUID REFERENCES users(id)
reason TEXT
details JSONB
created_at TIMESTAMP
```

## Spam Status Values

| Value | Meaning | UI Treatment |
|-------|---------|--------------|
| `clean` | Verified legitimate | Green badge "Verified" |
| `suspicious` | Needs review | Amber badge "Suspicious" |
| `spam` | Confirmed spam | Red badge "High Risk" |
| `scam` | Confirmed scam | Red badge "High Risk" |
| `expired` | Expired listing | Gray badge "Expired" |
| `pending_review` | Awaiting analysis | No badge |

## Dedup Status Values

| Value | Meaning | UI Treatment |
|-------|---------|--------------|
| `canonical` | Original/master job | Purple badge "Original" |
| `duplicate` | Duplicate of another | Blue badge "Duplicate" |
| `merged` | Merged into another | No badge (filtered out) |
| `unique` | No duplicates found | No badge |
| `null` | Not analyzed yet | No badge |

## Feedback Type Mapping

Our Interface → Database Enum:

| Frontend | Backend |
|----------|---------|
| `'interested'` | `'thumbs_up'` |
| `'not_interested'` | `'not_interested'` |
| `'spam'` | `'reported_spam'` |

## Common Patterns

### Pattern 1: Show Job with All Quality Indicators

```tsx
const JobCard = ({ job }) => (
  <div>
    <JobQualityBadges
      spamDetected={job.spam_detected}
      spamProbability={job.spam_probability}
      spamStatus={job.spam_status}
      dedupStatus={job.dedup_status}
      canonicalJobId={job.canonical_job_id}
      qualityScore={job.quality_score}
      postedAt={job.posted_at}
    />
    {/* Rest of job card */}
  </div>
);
```

### Pattern 2: Conditionally Analyze Spam

```tsx
const analyzeIfNeeded = async (job) => {
  // Only analyze if not already analyzed
  if (!job.spam_analyzed_at) {
    const result = await analyzeJobForSpam(job.id);
    // Update job with results
  }
};
```

### Pattern 3: Handle Duplicate Jobs

```tsx
const showJob = (job) => {
  // If duplicate, navigate to canonical
  if (job.dedupStatus === 'duplicate' && job.canonicalJobId) {
    navigate(`/jobs/${job.canonicalJobId}`);
  } else {
    navigate(`/jobs/${job.id}`);
  }
};
```

### Pattern 4: Batch Spam Analysis

```tsx
const analyzeAllJobs = async (jobs) => {
  const jobIds = jobs.map(j => j.id);

  // Process in batches of 50
  for (let i = 0; i < jobIds.length; i += 50) {
    const batch = jobIds.slice(i, i + 50);
    const result = await analyzeBatchForSpam(batch);
    console.log(`Analyzed ${result.analyzed}, found ${result.spamDetected} spam`);
  }
};
```

## Error Handling

```tsx
try {
  await submitJobFeedback(jobId, { feedbackType: 'spam' });
  toast.success('Job reported as spam');
} catch (error) {
  if (error.message.includes('Not authenticated')) {
    toast.error('Please sign in to report jobs');
  } else if (error.message.includes('rate limit')) {
    toast.error('Too many requests. Please wait.');
  } else {
    toast.error('Failed to report job');
  }
}
```

## Testing Tips

### Unit Test Example

```tsx
import { render, screen } from '@testing-library/react';
import { JobQualityBadges } from './JobQualityBadges';

test('shows spam badge for high probability', () => {
  render(
    <JobQualityBadges
      spamDetected={true}
      spamProbability={0.8}
    />
  );

  expect(screen.getByText(/High Risk/i)).toBeInTheDocument();
});
```

### Integration Test Example

```tsx
test('submitting spam report creates database entry', async () => {
  await submitJobFeedback('job-123', {
    feedbackType: 'spam'
  });

  const { data } = await supabase
    .from('job_feedback')
    .select()
    .eq('job_id', 'job-123')
    .single();

  expect(data.feedback_type).toBe('reported_spam');
});
```

## Performance Tips

1. **Use batch operations** for analyzing multiple jobs
2. **Cache quality badges** - they rarely change
3. **Lazy load spam analysis** - only when user requests
4. **Filter client-side** for instant feedback
5. **Debounce feedback submissions** to prevent double-clicks

## Security Reminders

- Never expose service role key to frontend
- Always verify user authentication before API calls
- Use RLS policies for all database operations
- Rate limit expensive operations (spam analysis)
- Validate all user input before submission

## Common Issues

### Issue: "Not authenticated" errors

**Solution:** Ensure Supabase session is valid:
```tsx
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  // Redirect to login
}
```

### Issue: Feedback not saving

**Solution:** Check RLS policies on `job_feedback` table:
```sql
-- Allow users to insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON job_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Issue: Spam badges not showing

**Solution:** Verify spam fields are selected in query:
```tsx
const { data } = await supabase
  .from('jobs')
  .select('*, spam_detected, spam_probability, spam_status')
  .eq('id', jobId);
```
