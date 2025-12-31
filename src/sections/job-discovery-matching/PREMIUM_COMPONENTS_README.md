# Premium Job Discovery UI Components

This directory contains premium, production-ready UI components for the JobMatch AI job discovery and matching feature. These components implement sophisticated user feedback mechanisms, intelligent filtering, and delightful micro-interactions.

## Components Overview

### 1. JobFeedbackWidget
**File:** `components/JobFeedbackWidget.tsx`

A premium feedback widget that allows users to rate jobs and provide detailed feedback.

**Features:**
- Thumbs up/down buttons with smooth hover effects
- "Report Spam" functionality
- Reason selection modal with smooth animations
- Custom reason input for detailed feedback
- Toast notifications for user confirmation
- Premium tooltips with gradient backgrounds
- Smooth transitions and micro-interactions

**Props:**
```typescript
interface JobFeedbackWidgetProps {
  jobId: string;
  currentFeedback?: JobFeedback;
  onThumbsUp?: () => void;
  onThumbsDown?: (reason: NotInterestedReason, customReason?: string) => void;
  onReportSpam?: () => void;
  disabled?: boolean;
}
```

**Usage:**
```tsx
<JobFeedbackWidget
  jobId={job.id}
  currentFeedback={job.userFeedback}
  onThumbsUp={() => handlePositiveFeedback(job.id)}
  onThumbsDown={(reason, customReason) => handleNegativeFeedback(job.id, reason, customReason)}
  onReportSpam={() => handleSpamReport(job.id)}
/>
```

**Premium Design Details:**
- Smooth color transitions (200ms cubic-bezier)
- Hover shadow effects with color-matched glows
- Animated tooltip popups with pointer arrows
- Modal panel with slide-in-from-bottom animation
- Radio button selection with checkmark animation
- Gradient button with scale transform on hover/active

---

### 2. EnhancedJobCard
**File:** `components/EnhancedJobCard.tsx`

A premium job card component with match quality visualization, reasoning insights, and integrated feedback.

**Features:**
- Floating match score badge with subtle shadow
- Animated match quality progress bar with shimmer effect
- Match reasoning cards showing strengths and concerns
- Spam warning and duplicate indicators
- Premium skill badges with conditional styling
- Integrated feedback widget
- Hover effects with gradient overlay and moving shimmer
- Smooth bookmark button with scale animation

**Props:**
```typescript
interface EnhancedJobCardProps {
  job: EnhancedJob;
  onViewDetails?: () => void;
  onSave?: () => void;
  onApply?: () => void;
  onFeedback?: (feedback: JobFeedback) => void;
  showFeedbackWidget?: boolean;
}
```

**Usage:**
```tsx
<EnhancedJobCard
  job={job}
  onViewDetails={() => navigate(`/jobs/${job.id}`)}
  onSave={() => handleSaveJob(job.id)}
  onApply={() => handleApply(job.id)}
  onFeedback={(feedback) => handleFeedback(job.id, feedback)}
  showFeedbackWidget={true}
/>
```

**Premium Design Details:**
- Multi-layered shadow system for depth
- Gradient progress bar with 1000ms smooth fill animation
- Shimmer effect using translateX transform
- Color-coded match scores (emerald/amber/red gradients)
- Insight cards with icon-color coordination
- Hover lift effect (-translate-y-1)
- Border color transitions on hover
- Scale transforms on interactive elements (1.02 on hover, 0.98 on active)

---

### 3. FeedbackFilterControls
**File:** `components/FeedbackFilterControls.tsx`

Intelligent filtering controls for job listings with premium UI.

**Features:**
- Collapsible filter panel with smooth animation
- Quick toggle filters (checkboxes styled as premium buttons)
- Match score range slider with gradient track
- Sort controls with directional indicators
- Active filter count badge
- Job count statistics display
- Clear all filters button

**Props:**
```typescript
interface FeedbackFilterControlsProps {
  filters: FeedbackFilters;
  onFilterChange: (filters: FeedbackFilters) => void;
  jobCount: number;
  filteredJobCount: number;
}
```

**Usage:**
```tsx
<FeedbackFilterControls
  filters={filters}
  onFilterChange={setFilters}
  jobCount={allJobs.length}
  filteredJobCount={filteredJobs.length}
/>
```

**Filter Options:**
- `hideNotInterested` - Hide jobs marked as not interested
- `hideSpam` - Hide reported spam jobs
- `showOnlyHighQuality` - Show only 75%+ match scores
- `minMatchScore` - Slider from 0-100%
- `sortBy` - match_score | date_posted | salary
- `sortOrder` - asc | desc

**Premium Design Details:**
- Slide-in animation for filter panel (fade-in + slide-in-from-top)
- Active state highlighting with blue gradient
- Custom range slider with accent color
- Icon-enhanced sort buttons
- Toggle buttons with checkmark animation
- Badge with subtle background for active filter count

---

### 4. FeedbackDashboard
**File:** `components/FeedbackDashboard.tsx`

A comprehensive dashboard for viewing feedback history and analytics.

**Features:**
- Feedback statistics cards with gradient icons
- Match quality improvement metric
- Top reasons chart with animated progress bars
- Filterable feedback history (all/interested/not interested/spam)
- Delete feedback with smooth transitions
- Export to CSV functionality
- Premium stat cards with hover effects

**Props:**
```typescript
interface FeedbackDashboardProps {
  feedbacks: JobFeedback[];
  stats: FeedbackStats;
  onDeleteFeedback?: (feedbackId: string) => void;
  onExportFeedback?: () => void;
}
```

**Usage:**
```tsx
<FeedbackDashboard
  feedbacks={allFeedbacks}
  stats={feedbackStats}
  onDeleteFeedback={(id) => handleDelete(id)}
  onExportFeedback={() => exportToCSV()}
/>
```

**Premium Design Details:**
- Gradient stat cards with shadow elevation
- Animated progress bars (500ms duration)
- Color-coded feedback types (emerald/amber/red)
- Hover effects on list items
- Smooth delete button fade-in on row hover
- Tab-style category filters
- Premium shadow system (shadow-2xl with opacity)

---

## Type Definitions

### Core Types
**File:** `types-feedback.ts`

```typescript
// User feedback on a job
export interface JobFeedback {
  id: string;
  jobId: string;
  userId: string;
  feedbackType: 'interested' | 'not_interested' | 'spam';
  reason?: NotInterestedReason;
  customReason?: string;
  createdAt: string;
}

// Reasons for "not interested"
export type NotInterestedReason =
  | 'wrong_location'
  | 'salary_too_low'
  | 'wrong_role_type'
  | 'skill_mismatch'
  | 'company_culture'
  | 'experience_level'
  | 'other';

// Enhanced job with feedback metadata
export interface EnhancedJob {
  // ... (standard job fields)
  userFeedback?: JobFeedback;
  spamReports?: number;
  duplicateOf?: string;
  matchReasoning?: {
    strengths: string[];
    concerns: string[];
    topSkillMatches: string[];
  };
}

// Feedback analytics
export interface FeedbackStats {
  totalFeedback: number;
  positiveCount: number;
  negativeCount: number;
  spamCount: number;
  topNotInterestedReasons: {
    reason: NotInterestedReason;
    count: number;
  }[];
  matchQualityImprovement: number; // Percentage
}
```

---

## Demo Pages

### EnhancedJobListPage
**File:** `EnhancedJobListPage.tsx`

A complete demo page showcasing the enhanced job cards with filtering and feedback.

**Features:**
- Full job listing with premium cards
- Integrated filter controls
- Mock data with varied match scores
- Feedback widget integration
- Navigation to job details and feedback dashboard

**Route:** `/jobs/enhanced` (configure in your router)

### FeedbackDashboardPage
**File:** `FeedbackDashboardPage.tsx`

Demo page for the feedback analytics dashboard.

**Features:**
- Complete feedback history
- Statistics overview
- CSV export functionality
- Mock analytics data

**Route:** `/jobs/feedback-dashboard` (configure in your router)

---

## Design System

### Color Palette
- **Primary (Blue):** Used for CTAs, links, selected states
- **Success (Emerald):** Positive feedback, high match scores, strengths
- **Warning (Amber):** Moderate match scores, concerns, not interested
- **Danger (Red):** Low match scores, spam, critical issues
- **Neutral (Slate):** Backgrounds, borders, text

### Animation Timings
- **Micro-interactions:** 150-200ms (hover states, icon transitions)
- **UI transitions:** 300-400ms (panel slides, modal openings)
- **Progress animations:** 500-1000ms (bars, score fills)

### Easing Functions
- **Ease-out:** `cubic-bezier(0.16, 1, 0.3, 1)` - Entrances
- **Ease-in-out:** `cubic-bezier(0.4, 0, 0.2, 1)` - Transitions
- **Spring (CSS):** `transition-all duration-200` - Interactive elements

### Shadow System
- **sm:** `shadow-sm` - Subtle elevation (cards at rest)
- **md:** `shadow-md` - Medium elevation (hover states)
- **lg:** `shadow-lg` - High elevation (modals, floating elements)
- **xl:** `shadow-xl` - Maximum elevation (active CTAs)
- **Colored:** `shadow-blue-500/10` - Tinted shadows for depth

### Spacing Grid
- Base unit: 4px (Tailwind default)
- Card padding: 24px (p-6)
- Section spacing: 32px (space-y-8)
- Component gaps: 12-16px (gap-3, gap-4)

---

## Integration Guide

### 1. Add Types to Database Schema

Update your Supabase schema to include feedback tables:

```sql
-- Job feedback table
CREATE TABLE job_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('interested', 'not_interested', 'spam')),
  reason TEXT CHECK (reason IN ('wrong_location', 'salary_too_low', 'wrong_role_type', 'skill_mismatch', 'company_culture', 'experience_level', 'other')),
  custom_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, user_id)
);

-- Add RLS policies
ALTER TABLE job_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feedback"
  ON job_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
  ON job_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### 2. Create API Endpoints

Add backend routes for feedback operations:

```typescript
// POST /api/jobs/:jobId/feedback
app.post('/api/jobs/:jobId/feedback', authMiddleware, async (req, res) => {
  const { feedbackType, reason, customReason } = req.body;
  // Insert feedback into database
});

// GET /api/feedback/stats
app.get('/api/feedback/stats', authMiddleware, async (req, res) => {
  // Calculate and return feedback statistics
});

// DELETE /api/feedback/:feedbackId
app.delete('/api/feedback/:feedbackId', authMiddleware, async (req, res) => {
  // Delete feedback
});
```

### 3. Update Router Configuration

Add routes in `src/lib/router.tsx`:

```tsx
{
  path: '/jobs/enhanced',
  element: <EnhancedJobListPage />,
},
{
  path: '/jobs/feedback-dashboard',
  element: <FeedbackDashboardPage />,
}
```

### 4. Wire Up Real Data

Replace mock data with API calls:

```typescript
// In EnhancedJobListPage.tsx
const { data: jobs } = await supabase
  .from('jobs')
  .select(`
    *,
    job_feedback (*)
  `)
  .eq('user_id', userId);
```

---

## Performance Considerations

### Optimization Techniques Used

1. **CSS Transforms over Position:**
   - All animations use `transform: translateY()`, `scale()` for GPU acceleration
   - No layout thrashing from `top`, `left`, `width`, `height` changes

2. **Smooth Repaints:**
   - `will-change` not used (modern browsers optimize automatically)
   - Opacity transitions on pseudo-elements for shadows

3. **Lazy Rendering:**
   - Consider virtualizing long job lists with `react-window` for 100+ items

4. **Image Optimization:**
   - Company logos with fallback to gradient initials
   - `onError` handler prevents broken image icons

5. **Debounced Filters:**
   - Consider debouncing search/filter changes for large datasets

---

## Accessibility

All components follow WCAG 2.1 AA standards:

- **Keyboard Navigation:** All interactive elements accessible via Tab/Enter
- **Focus States:** Visible focus rings on all buttons and inputs
- **Color Contrast:** Text meets 4.5:1 minimum contrast ratio
- **Screen Readers:** Proper ARIA labels and semantic HTML
- **Reduced Motion:** Respect `prefers-reduced-motion` media query (recommended addition)

### Recommended Addition:

Add to your global CSS:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Browser Support

- **Modern Browsers:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **CSS Features Used:**
  - CSS Grid
  - Flexbox
  - CSS Gradients
  - CSS Transforms
  - CSS Transitions
  - Custom Properties (Tailwind)

---

## Future Enhancements

Potential improvements for version 2.0:

1. **Machine Learning Integration:**
   - Use feedback data to train job matching model
   - Predictive "you might like" recommendations

2. **Advanced Animations:**
   - Spring physics for modal openings
   - Parallax effects on scroll
   - Lottie animations for success states

3. **Collaborative Filtering:**
   - "Users with similar profiles liked these jobs"
   - Aggregate spam detection across users

4. **A/B Testing:**
   - Test different feedback widget placements
   - Optimize match score thresholds

5. **Real-time Updates:**
   - WebSocket integration for live job additions
   - Real-time spam detection alerts

---

## Credits

**Design System:** Tailwind CSS v3 + shadcn/ui components
**Icons:** Lucide React
**Notifications:** Sonner toast library
**Animations:** CSS transforms + transitions (no external libraries)

Built with premium design principles focusing on:
- Subtle motion design
- Sophisticated visual hierarchy
- Luxe micro-interactions
- Buttery smooth performance
