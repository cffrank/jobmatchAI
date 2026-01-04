# Premium Job Discovery UI - Implementation Guide

This guide provides step-by-step instructions for integrating the premium job discovery components into your JobMatch AI application.

## What's Been Created

### New Components (All Premium Design)
1. **JobFeedbackWidget** - Thumbs up/down, spam reporting with modal UI
2. **EnhancedJobCard** - Premium job card with match insights and feedback
3. **FeedbackFilterControls** - Advanced filtering UI with animations
4. **FeedbackDashboard** - Analytics dashboard for feedback history

### New Type Definitions
- `types-feedback.ts` - All feedback-related TypeScript interfaces

### Demo Pages
- `EnhancedJobListPage.tsx` - Showcase of enhanced cards with filters
- `FeedbackDashboardPage.tsx` - Feedback analytics demo

### Updated Files
- `tailwind.config.js` - Added shimmer, slide, and fade animations
- `components/index.ts` - Exported new components

---

## Quick Start (5 Minutes)

### Step 1: View the Demo
```bash
# Ensure dev server is running
npm run dev

# Navigate to demo pages (after adding routes):
# http://localhost:5173/jobs/enhanced
# http://localhost:5173/jobs/feedback-dashboard
```

### Step 2: Add Routes to Router

Edit `/home/carl/application-tracking/jobmatch-ai/src/lib/router.tsx`:

```tsx
import EnhancedJobListPage from '../sections/job-discovery-matching/EnhancedJobListPage';
import FeedbackDashboardPage from '../sections/job-discovery-matching/FeedbackDashboardPage';

// Add to your routes array:
{
  path: '/jobs/enhanced',
  element: <EnhancedJobListPage />,
},
{
  path: '/jobs/feedback-dashboard',
  element: <FeedbackDashboardPage />,
}
```

### Step 3: Test the Components

Visit the demo pages to see:
- ✅ Premium job cards with match quality visualization
- ✅ Feedback widget with thumbs up/down
- ✅ Spam reporting functionality
- ✅ Advanced filtering with match score slider
- ✅ Feedback analytics dashboard

---

## Full Integration (Backend + Database)

### Phase 1: Database Schema (15 minutes)

Create the feedback table in Supabase:

```sql
-- 1. Create feedback table
CREATE TABLE job_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('interested', 'not_interested', 'spam')),
  reason TEXT CHECK (reason IN ('wrong_location', 'salary_too_low', 'wrong_role_type', 'skill_mismatch', 'company_culture', 'experience_level', 'other')),
  custom_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, user_id) -- One feedback per user per job
);

-- 2. Create indexes for performance
CREATE INDEX idx_job_feedback_job_id ON job_feedback(job_id);
CREATE INDEX idx_job_feedback_user_id ON job_feedback(user_id);
CREATE INDEX idx_job_feedback_type ON job_feedback(feedback_type);
CREATE INDEX idx_job_feedback_created_at ON job_feedback(created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE job_feedback ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Users can view their own feedback"
  ON job_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
  ON job_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback"
  ON job_feedback FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback"
  ON job_feedback FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Add spam_reports column to jobs table (optional but recommended)
ALTER TABLE jobs ADD COLUMN spam_reports INT DEFAULT 0;

-- 6. Create function to update spam count
CREATE OR REPLACE FUNCTION update_job_spam_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.feedback_type = 'spam' THEN
    UPDATE jobs SET spam_reports = spam_reports + 1 WHERE id = NEW.job_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger
CREATE TRIGGER update_spam_count_trigger
  AFTER INSERT ON job_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_job_spam_count();
```

### Phase 2: Backend API Endpoints (30 minutes)

Create `/home/carl/application-tracking/jobmatch-ai/backend/src/routes/feedback.ts`:

```typescript
import express from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = express.Router();

// Validation schemas
const feedbackSchema = z.object({
  feedbackType: z.enum(['interested', 'not_interested', 'spam']),
  reason: z.enum([
    'wrong_location',
    'salary_too_low',
    'wrong_role_type',
    'skill_mismatch',
    'company_culture',
    'experience_level',
    'other',
  ]).optional(),
  customReason: z.string().max(500).optional(),
});

// POST /api/jobs/:jobId/feedback
router.post('/:jobId/feedback', authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user!.id;
    const validated = feedbackSchema.parse(req.body);

    // Upsert feedback (update if exists, insert if new)
    const { data, error } = await supabase
      .from('job_feedback')
      .upsert({
        job_id: jobId,
        user_id: userId,
        feedback_type: validated.feedbackType,
        reason: validated.reason,
        custom_reason: validated.customReason,
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, feedback: data });
  } catch (error) {
    console.error('Failed to submit feedback:', error);
    res.status(400).json({ error: 'Failed to submit feedback' });
  }
});

// GET /api/feedback/stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get all user's feedback
    const { data: feedbacks, error } = await supabase
      .from('job_feedback')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate stats
    const stats = {
      totalFeedback: feedbacks.length,
      positiveCount: feedbacks.filter(f => f.feedback_type === 'interested').length,
      negativeCount: feedbacks.filter(f => f.feedback_type === 'not_interested').length,
      spamCount: feedbacks.filter(f => f.feedback_type === 'spam').length,
      topNotInterestedReasons: [],
      matchQualityImprovement: 0, // TODO: Calculate based on match score changes
    };

    // Count reasons
    const reasonCounts = new Map();
    feedbacks
      .filter(f => f.feedback_type === 'not_interested' && f.reason)
      .forEach(f => {
        reasonCounts.set(f.reason, (reasonCounts.get(f.reason) || 0) + 1);
      });

    stats.topNotInterestedReasons = Array.from(reasonCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Failed to get feedback stats:', error);
    res.status(400).json({ error: 'Failed to get feedback stats' });
  }
});

// GET /api/feedback/history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { type } = req.query; // Optional filter: interested, not_interested, spam

    let query = supabase
      .from('job_feedback')
      .select('*')
      .eq('user_id', userId);

    if (type) {
      query = query.eq('feedback_type', type);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, feedbacks: data });
  } catch (error) {
    console.error('Failed to get feedback history:', error);
    res.status(400).json({ error: 'Failed to get feedback history' });
  }
});

// DELETE /api/feedback/:feedbackId
router.delete('/:feedbackId', authMiddleware, async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const userId = req.user!.id;

    const { error } = await supabase
      .from('job_feedback')
      .delete()
      .eq('id', feedbackId)
      .eq('user_id', userId); // Ensure user owns this feedback

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete feedback:', error);
    res.status(400).json({ error: 'Failed to delete feedback' });
  }
});

export default router;
```

### Phase 3: Register Feedback Routes

Edit `/home/carl/application-tracking/jobmatch-ai/backend/src/index.ts`:

```typescript
import feedbackRoutes from './routes/feedback';

// Add to your routes (after auth middleware):
app.use('/api/feedback', feedbackRoutes);
```

### Phase 4: Update Frontend API Client (15 minutes)

Create `/home/carl/application-tracking/jobmatch-ai/src/lib/feedbackApi.ts`:

```typescript
import { supabase } from './supabase';
import type { JobFeedback, FeedbackStats, NotInterestedReason } from '../sections/job-discovery-matching/types-feedback';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function submitFeedback(
  jobId: string,
  feedbackType: 'interested' | 'not_interested' | 'spam',
  reason?: NotInterestedReason,
  customReason?: string
): Promise<JobFeedback> {
  const sessionJson = localStorage.getItem('jobmatch-auth-token');
  if (!sessionJson) throw new Error('Not authenticated');

  const session = JSON.parse(sessionJson);
  const accessToken = session?.access_token;

  const response = await fetch(`${API_URL}/api/jobs/${jobId}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ feedbackType, reason, customReason }),
  });

  if (!response.ok) throw new Error('Failed to submit feedback');

  const data = await response.json();
  return data.feedback;
}

export async function getFeedbackStats(): Promise<FeedbackStats> {
  const sessionJson = localStorage.getItem('jobmatch-auth-token');
  if (!sessionJson) throw new Error('Not authenticated');

  const session = JSON.parse(sessionJson);
  const accessToken = session?.access_token;

  const response = await fetch(`${API_URL}/api/feedback/stats`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) throw new Error('Failed to get feedback stats');

  const data = await response.json();
  return data.stats;
}

export async function getFeedbackHistory(type?: 'interested' | 'not_interested' | 'spam'): Promise<JobFeedback[]> {
  const sessionJson = localStorage.getItem('jobmatch-auth-token');
  if (!sessionJson) throw new Error('Not authenticated');

  const session = JSON.parse(sessionJson);
  const accessToken = session?.access_token;

  const url = type
    ? `${API_URL}/api/feedback/history?type=${type}`
    : `${API_URL}/api/feedback/history`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) throw new Error('Failed to get feedback history');

  const data = await response.json();
  return data.feedbacks;
}

export async function deleteFeedback(feedbackId: string): Promise<void> {
  const sessionJson = localStorage.getItem('jobmatch-auth-token');
  if (!sessionJson) throw new Error('Not authenticated');

  const session = JSON.parse(sessionJson);
  const accessToken = session?.access_token;

  const response = await fetch(`${API_URL}/api/feedback/${feedbackId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) throw new Error('Failed to delete feedback');
}
```

### Phase 5: Wire Up Real Data in Pages (20 minutes)

Update `EnhancedJobListPage.tsx` to use real data:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { submitFeedback } from '../../lib/feedbackApi';
import type { EnhancedJob } from './types-feedback';

export default function EnhancedJobListPage() {
  const [jobs, setJobs] = useState<EnhancedJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    try {
      const sessionJson = localStorage.getItem('jobmatch-auth-token');
      if (!sessionJson) return;

      const session = JSON.parse(sessionJson);
      const userId = session.user.id;

      // Fetch jobs with feedback
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          job_feedback (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setJobs(data as EnhancedJob[]);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFeedback(
    jobId: string,
    feedbackType: 'interested' | 'not_interested' | 'spam',
    reason?: NotInterestedReason,
    customReason?: string
  ) {
    try {
      await submitFeedback(jobId, feedbackType, reason, customReason);
      await loadJobs(); // Reload to get updated feedback
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  }

  // ... rest of component
}
```

Update `FeedbackDashboardPage.tsx` similarly:

```typescript
import { useEffect, useState } from 'react';
import { getFeedbackStats, getFeedbackHistory, deleteFeedback } from '../../lib/feedbackApi';

export default function FeedbackDashboardPage() {
  const [feedbacks, setFeedbacks] = useState<JobFeedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [feedbackHistory, feedbackStats] = await Promise.all([
        getFeedbackHistory(),
        getFeedbackStats(),
      ]);

      setFeedbacks(feedbackHistory);
      setStats(feedbackStats);
    } catch (error) {
      console.error('Failed to load feedback data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(feedbackId: string) {
    try {
      await deleteFeedback(feedbackId);
      await loadData(); // Reload after delete
    } catch (error) {
      console.error('Failed to delete feedback:', error);
    }
  }

  // ... rest of component
}
```

---

## Testing Checklist

### Component Tests
- [ ] JobFeedbackWidget renders correctly
- [ ] Thumbs up/down buttons trigger callbacks
- [ ] Reason selector modal opens and closes smoothly
- [ ] Custom reason textarea appears for "Other" option
- [ ] Toast notifications appear on feedback submission
- [ ] Spam report button works

### EnhancedJobCard Tests
- [ ] Match score badge displays correctly
- [ ] Progress bar animates smoothly
- [ ] Match reasoning cards show strengths/concerns
- [ ] Spam warning appears for flagged jobs
- [ ] Hover effects work (shadow, lift, shimmer)
- [ ] Bookmark button toggles state

### Filter Controls Tests
- [ ] Filter panel expands/collapses with animation
- [ ] Quick filters toggle correctly
- [ ] Match score slider updates in real-time
- [ ] Sort buttons change direction indicator
- [ ] Job count updates when filters change
- [ ] Clear all button resets filters

### Dashboard Tests
- [ ] Stat cards display correct counts
- [ ] Match quality improvement shows percentage
- [ ] Top reasons chart renders with bars
- [ ] Feedback list filters by type
- [ ] Delete button removes feedback
- [ ] Export creates CSV file

### Integration Tests
- [ ] Feedback persists to database
- [ ] RLS policies prevent unauthorized access
- [ ] Spam count updates on jobs table
- [ ] Feedback affects job matching algorithm (future)

---

## Performance Optimization

### Already Implemented
✅ CSS transforms for animations (GPU-accelerated)
✅ Smooth easing functions
✅ No layout thrashing
✅ Optimized re-renders with proper React keys

### Recommended Additions
1. **React Query or SWR** for data fetching
2. **Virtual scrolling** for 100+ job lists
3. **Debounced search/filters** for large datasets
4. **Image lazy loading** for company logos
5. **Code splitting** for dashboard page

---

## Accessibility Checklist

- [x] Keyboard navigation (Tab/Enter/Escape)
- [x] Focus states on all interactive elements
- [x] Color contrast meets WCAG AA (4.5:1)
- [x] Semantic HTML structure
- [ ] Add ARIA labels for screen readers
- [ ] Add `prefers-reduced-motion` support
- [ ] Test with screen reader (NVDA/JAWS)

---

## Next Steps

1. **Immediate:** Add routes and view demo pages
2. **Short-term:** Implement database schema and API endpoints
3. **Medium-term:** Wire up real data and test
4. **Long-term:** Use feedback data to improve matching algorithm

---

## Support & Documentation

- **Main README:** `PREMIUM_COMPONENTS_README.md`
- **Types:** `types-feedback.ts`
- **Demo Pages:** `EnhancedJobListPage.tsx`, `FeedbackDashboardPage.tsx`
- **API Client:** `src/lib/feedbackApi.ts` (to be created)

For questions or issues, refer to the inline code comments and TypeScript interfaces.
