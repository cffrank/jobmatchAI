# Quality Job Listings - Frontend Integration

**Feature 1: Quality Job Listings - Frontend Implementation**

This document describes the frontend integration for spam detection, deduplication, and job quality features.

## Overview

The frontend now fully integrates with the backend spam detection and deduplication APIs, providing users with:

- Visual indicators for spam, duplicates, and quality scores
- User feedback widgets (thumbs up/down, spam reports)
- Advanced filtering (hide duplicates, show only verified jobs)
- Premium UI with smooth animations and accessibility

## New Files Created

### 1. `/src/lib/jobQualityService.ts`

Comprehensive API integration service providing:

**Spam Detection Functions:**
- `analyzeJobForSpam(jobId)` - Analyze single job
- `analyzeBatchForSpam(jobIds)` - Batch analyze multiple jobs
- `getSpamStats()` - Get user's spam statistics

**Deduplication Functions:**
- `deduplicateJobs()` - Run deduplication on user's jobs
- `getJobDuplicates(jobId)` - Get duplicates for a job
- `mergeDuplicateJobs(canonicalId, duplicateIds)` - Merge duplicates
- `removeDuplicateRelationship(canonicalId, duplicateId)` - Unlink duplicates

**Feedback Functions:**
- `submitJobFeedback(jobId, feedback)` - Submit user feedback
- `getUserJobFeedback(jobId)` - Get user's feedback for a job
- `getJobSpamReportCount(jobId)` - Get spam report count

### 2. `/src/sections/job-discovery-matching/components/JobQualityBadges.tsx`

Premium badge component displaying:
- Spam detection status with color-coded risk levels
- Duplicate indicators with link to canonical job
- Quality scores
- Freshness indicators
- User spam report counts

Features:
- Smooth animations and hover effects
- Accessible tooltips
- Responsive design
- Dark mode support

### 3. Updated Components

**EnhancedJobCard.tsx:**
- Integrated `JobQualityBadges` component
- Connected feedback widget to real API
- Added handlers for spam reporting, interested/not interested
- Shows quality indicators inline with job details

**FeedbackFilterControls.tsx:**
- Added "Hide Duplicates" toggle
- Added "Verified Jobs Only" toggle
- Updated reset filters logic

**types-feedback.ts:**
- Added quality/spam fields to `EnhancedJob` interface
- Added `hideDuplicates` and `showOnlyVerified` to filters

**EnhancedJobListPage.tsx:**
- Implements duplicate filtering (default: hide duplicates)
- Implements verified-only filtering
- Updated filter application logic

## API Endpoints Used

### Spam Detection
- `POST /api/spam-detection/analyze/:jobId` - Analyze single job
- `POST /api/spam-detection/batch` - Batch analyze
- `GET /api/spam-detection/stats` - Get statistics

### Deduplication
- `POST /api/jobs/deduplicate` - Run deduplication
- `GET /api/jobs/:id/duplicates` - Get job duplicates
- `POST /api/jobs/merge` - Merge duplicates
- `DELETE /api/jobs/:id/duplicates/:duplicateId` - Remove duplicate link

### Feedback (via Supabase)
- Direct inserts to `job_feedback` table
- Direct inserts to `spam_reports` table

## Database Fields Used

From `jobs` table (Supabase):
```typescript
{
  spam_detected: boolean
  spam_probability: number
  spam_status: 'clean' | 'suspicious' | 'spam' | 'scam' | 'expired' | 'pending_review'
  spam_score: number
  spam_categories: string[]
  spam_analyzed_at: timestamp

  dedup_status: 'canonical' | 'duplicate' | 'merged'
  canonical_job_id: string (FK to jobs)
  dedup_confidence: number

  quality_score: number
  posted_at: timestamp
  last_seen_at: timestamp
}
```

From `job_feedback` table:
```typescript
{
  job_id: string
  user_id: string
  feedback_type: 'interested' | 'not_interested' | 'spam'
  reason: string
  custom_reason: string
}
```

From `spam_reports` table:
```typescript
{
  job_id: string
  user_id: string
  reason: string
  details: json
}
```

## UI/UX Design

### Quality Badges

**Spam Detection:**
- Red badge (70%+ probability): "High Risk" with percentage
- Amber badge (40-70%): "Suspicious" with percentage
- Green badge (<40%): "Verified"
- All clickable with tooltips

**Duplicates:**
- Blue badge: "Duplicate" - clickable to view canonical job
- Purple badge: "Original" - indicates canonical listing

**Quality Score:**
- Green (80+): High quality
- Blue (60-80): Good quality
- Gray (<60): Standard quality

**Spam Reports:**
- Red badge showing count: "X Reports"

### Feedback Widget

**Three actions:**
1. Thumbs up (Interested) - Green hover
2. Thumbs down (Not Interested) - Amber hover, opens reason selector
3. Flag (Report Spam) - Red hover

**Not Interested Reasons:**
- Wrong location
- Salary too low
- Wrong role type
- Skills don't match
- Company culture concerns
- Experience level mismatch
- Other (with custom text field)

**States:**
- Default: 3 icon buttons with hover tooltips
- Active: Shows compact indicator (e.g., "Interested", "Not interested")
- Loading: Disabled with spinner
- Error: Toast notification

### Filter Controls

**New filters:**
- Hide Duplicates (default: ON)
- Verified Jobs Only
- Hide Spam
- Hide Not Interested
- High Quality Only (75%+ match)
- Min Match Score slider

**Sort options:**
- Match Score (default)
- Date Posted
- Salary

## Design System

**Colors:**
- Success/Safe: Emerald (green)
- Warning/Suspicious: Amber (orange)
- Danger/Spam: Red
- Info/Duplicate: Blue
- Neutral/Quality: Slate

**Animations:**
- Button hover: scale(1.05), duration 200ms
- Badge appear: fade in, slide from top
- Tooltip: opacity transition 200ms
- Progress bar: width transition 1000ms ease-out

**Accessibility:**
- All interactive elements have hover/focus states
- Tooltips with ARIA labels
- Keyboard navigation support
- WCAG AA contrast ratios
- Screen reader friendly

## Usage Examples

### 1. Display Job with Quality Indicators

```tsx
<EnhancedJobCard
  job={{
    id: 'job-123',
    title: 'Senior Engineer',
    // ... other job fields
    spamDetected: false,
    spamStatus: 'clean',
    dedupStatus: 'canonical',
    qualityScore: 85,
    postedAt: '2025-01-15T10:00:00Z',
  }}
  onViewDetails={() => navigate(`/jobs/${job.id}`)}
  onSave={() => toggleSave(job.id)}
  showFeedbackWidget={true}
/>
```

### 2. Filter Jobs

```tsx
const [filters, setFilters] = useState({
  hideDuplicates: true,
  showOnlyVerified: false,
  hideSpam: true,
  minMatchScore: 50,
});

const filteredJobs = jobs.filter(job => {
  if (filters.hideDuplicates && job.dedupStatus === 'duplicate') return false;
  if (filters.showOnlyVerified && job.spamStatus !== 'clean') return false;
  if (filters.hideSpam && job.spamDetected) return false;
  return true;
});
```

### 3. Analyze Job for Spam

```tsx
import { analyzeJobForSpam } from '@/lib/jobQualityService';

const handleAnalyze = async (jobId: string) => {
  try {
    const result = await analyzeJobForSpam(jobId);
    console.log('Spam probability:', result.spamProbability);
    console.log('Recommendation:', result.recommendation);
  } catch (error) {
    toast.error('Failed to analyze job');
  }
};
```

### 4. Run Deduplication

```tsx
import { deduplicateJobs } from '@/lib/jobQualityService';

const handleDeduplicate = async () => {
  try {
    const result = await deduplicateJobs();
    toast.success(`Found ${result.duplicatesFound} duplicates`);
  } catch (error) {
    toast.error('Deduplication failed');
  }
};
```

### 5. Submit User Feedback

```tsx
import { submitJobFeedback } from '@/lib/jobQualityService';

const handleReportSpam = async (jobId: string) => {
  try {
    await submitJobFeedback(jobId, {
      feedbackType: 'spam',
      reason: 'user_reported',
    });
    toast.success('Job reported as spam');
  } catch (error) {
    toast.error('Failed to submit report');
  }
};
```

## Testing Checklist

### Visual Tests
- [ ] Spam badges show correct colors for different probabilities
- [ ] Duplicate badges show and link to canonical job
- [ ] Quality scores display with correct colors
- [ ] Feedback widget shows all three actions
- [ ] Tooltips appear on hover
- [ ] Dark mode looks correct

### Functional Tests
- [ ] Thumbs up saves "interested" feedback
- [ ] Thumbs down shows reason selector
- [ ] Spam report creates spam_reports entry
- [ ] Hide duplicates filter works
- [ ] Verified jobs only filter works
- [ ] Quality score filter works

### Integration Tests
- [ ] API calls succeed with valid auth token
- [ ] Error handling shows appropriate toasts
- [ ] Loading states display correctly
- [ ] Feedback persists after page reload

### Accessibility Tests
- [ ] Keyboard navigation works
- [ ] Screen reader announces actions
- [ ] Focus states visible
- [ ] Color contrast meets WCAG AA

## Next Steps

1. **Real-time Updates:** Use Supabase realtime subscriptions for live spam/duplicate updates
2. **Batch Operations:** Add UI for bulk spam analysis and deduplication
3. **Analytics Dashboard:** Create admin dashboard showing spam/duplicate stats
4. **ML Feedback Loop:** Send user feedback to improve spam detection model
5. **Duplicate Grouping:** Show all duplicates of a canonical job in a expandable section
6. **Spam Details Modal:** Show full spam analysis report when clicking spam badge

## Related Files

- Backend: `/backend/src/routes/spamDetection.ts`
- Backend: `/backend/src/routes/jobs.ts` (deduplication endpoints)
- Backend: `/backend/src/services/spamDetection.service.ts`
- Backend: `/backend/src/services/jobDeduplication.service.ts`
- Database: `/docs/QUALITY_JOBS_BACKEND_IMPLEMENTATION.md`
- Types: `/src/types/supabase.ts` (auto-generated from DB schema)

## Performance Considerations

- Spam analysis is cached (in-memory on backend)
- Batch operations limited to 50 jobs max
- Rate limiting: 30 spam analyses/hour per user
- Deduplication runs on-demand (not automatic)
- Quality badges only render if data exists
- Filters applied client-side for instant feedback

## Security Notes

- All API calls require authentication (Supabase JWT)
- RLS policies prevent users from seeing others' feedback
- Spam reports are rate-limited to prevent abuse
- No PII in spam detection metadata
- Service role key never exposed to frontend
