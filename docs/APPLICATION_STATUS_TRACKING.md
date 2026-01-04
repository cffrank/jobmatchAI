# Application Status Tracking Implementation

## Overview

This document describes the comprehensive application status tracking system implemented for JobMatch AI. The system allows users to track their job applications through various stages from initial application to final outcome, with automatic history tracking and status transition validation.

## Status Values

### Complete Status List

The system supports the following application statuses:

1. **applied** - Initial status when user submits an application
2. **response_received** - Company has responded to the application
3. **screening** - Application is under initial review/screening
4. **interview_scheduled** - An interview has been scheduled
5. **interview_completed** - Interview round has been completed
6. **offer** - Job offer has been received
7. **offer_accepted** - User has accepted the job offer
8. **offer_declined** - User has declined the job offer
9. **accepted** - Position has been accepted (final state)
10. **rejected** - Application was rejected by company
11. **withdrawn** - User withdrew their application
12. **abandoned** - User gave up on pursuing the application

### Status Categories

Statuses are grouped into four categories:

- **Active**: `applied`, `response_received`, `screening`, `interview_scheduled`, `interview_completed`
- **Success**: `offer`, `offer_accepted`, `accepted`
- **Closed**: `offer_declined`, `withdrawn`, `abandoned`
- **Negative**: `rejected`

## Database Schema

### Table: tracked_applications

```sql
CREATE TABLE tracked_applications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,

  -- Status tracking
  status tracked_application_status NOT NULL DEFAULT 'applied',
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  status_history JSONB DEFAULT '[]'::jsonb,

  -- ... other fields
);
```

### Enum Type: tracked_application_status

```sql
CREATE TYPE tracked_application_status AS ENUM (
  'applied',
  'response_received',
  'screening',
  'interview_scheduled',
  'interview_completed',
  'offer',
  'offer_accepted',
  'offer_declined',
  'accepted',
  'rejected',
  'withdrawn',
  'abandoned'
);
```

### Status History Structure

The `status_history` JSONB column stores an array of status change entries:

```typescript
{
  status: ApplicationStatus,
  date: string,        // ISO 8601 timestamp
  note?: string        // Optional note about the status change
}
```

## Status Transitions

### Transition Rules

The system enforces valid status transitions using a state machine:

```typescript
const ALLOWED_TRANSITIONS = {
  applied: ['response_received', 'screening', 'rejected', 'withdrawn', 'abandoned'],
  response_received: ['screening', 'interview_scheduled', 'rejected', 'withdrawn', 'abandoned'],
  screening: ['interview_scheduled', 'rejected', 'withdrawn', 'abandoned'],
  interview_scheduled: ['interview_completed', 'rejected', 'withdrawn', 'abandoned'],
  interview_completed: ['interview_scheduled', 'offer', 'rejected', 'withdrawn', 'abandoned'],
  offer: ['offer_accepted', 'offer_declined', 'withdrawn'],
  offer_accepted: ['accepted'],
  offer_declined: [],  // Terminal state
  accepted: [],        // Terminal state
  rejected: [],        // Terminal state
  withdrawn: [],       // Terminal state
  abandoned: []        // Terminal state
}
```

### Terminal States

The following statuses are terminal (no further transitions allowed):
- `offer_declined`
- `accepted`
- `rejected`
- `withdrawn`
- `abandoned`

## Automatic Tracking

### Database Triggers

Two database triggers automatically manage status tracking:

1. **update_tracked_application_status_timestamp()** - Updates timestamps when status changes
   - Sets `updated_at` and `last_updated` on any update
   - Updates `status_changed_at` only when status actually changes

2. **track_application_status_change()** - Automatically adds entries to status_history
   - Triggers before UPDATE on tracked_applications
   - Only adds history entry when status changes
   - Automatically populates date field

### Example

When a user updates status from `applied` to `screening`:

```sql
-- User updates status
UPDATE tracked_applications
SET status = 'screening'
WHERE id = '...';

-- Trigger automatically:
-- 1. Sets status_changed_at = NOW()
-- 2. Adds to status_history:
{
  "status": "screening",
  "date": "2025-12-28T10:30:00Z",
  "note": null
}
```

## Frontend Implementation

### Components

#### 1. StatusUpdateDialog

Full-featured modal dialog for updating application status:

```tsx
<StatusUpdateDialog
  currentStatus="applied"
  applicationTitle="Software Engineer at Google"
  onUpdate={async (newStatus, note) => {
    await updateStatus(id, newStatus, note)
  }}
  onClose={() => setShowDialog(false)}
/>
```

Features:
- Shows current status
- Displays only valid transition options
- Allows adding notes to status changes
- Validates transitions client-side
- Shows helpful descriptions for each status

#### 2. StatusDropdown

Lightweight inline dropdown for quick status updates:

```tsx
<StatusDropdown
  currentStatus="applied"
  onUpdate={async (newStatus) => {
    await updateStatus(id, newStatus)
  }}
/>
```

Features:
- Inline status update
- Hover to show available transitions
- Automatically hides if no transitions available
- Visual feedback on update

### Status Helpers

Utility functions in `src/sections/application-tracker/utils/statusHelpers.ts`:

```typescript
// Get status display info
getStatusInfo(status: ApplicationStatus)

// Get human-readable label
getStatusLabel(status: ApplicationStatus)

// Get Tailwind color classes
getStatusColor(status: ApplicationStatus)

// Get allowed next statuses
getAllowedTransitions(currentStatus: ApplicationStatus)

// Validate transition
isValidTransition(from: ApplicationStatus, to: ApplicationStatus)

// Check if terminal status
isTerminalStatus(status: ApplicationStatus)

// Get recommended next steps
getRecommendedNextStatuses(currentStatus: ApplicationStatus)
```

### Visual Indicators

Each status has associated:
- **Color scheme**: Tailwind classes for background, text, and border
- **Icon**: Lucide icon representing the status
- **Description**: Human-readable explanation
- **Category**: Grouping for filtering

Example color schemes:
```typescript
{
  applied: 'bg-slate-100 text-slate-700 border-slate-300',
  offer: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  rejected: 'bg-red-100 text-red-700 border-red-300',
  // ... etc
}
```

## Usage Examples

### Updating Status with Note

```typescript
await updateTrackedApplication(id, {
  status: 'interview_scheduled',
  statusHistory: [
    ...existingHistory,
    {
      status: 'interview_scheduled',
      date: new Date().toISOString(),
      note: 'Phone screen scheduled for next Tuesday at 2pm'
    }
  ]
})
```

### Filtering by Status Category

```typescript
// Get all active applications
const activeApps = applications.filter(app =>
  !['accepted', 'offer_accepted', 'rejected', 'offer_declined', 'withdrawn', 'abandoned']
    .includes(app.status)
)

// Or use helper
import { getStatusCategory } from './utils/statusHelpers'
const activeApps = applications.filter(app =>
  getStatusCategory(app.status) === 'active'
)
```

### Displaying Status History

```tsx
{application.statusHistory.map((entry, idx) => (
  <div key={idx}>
    <div className="font-semibold">
      {getStatusLabel(entry.status)}
    </div>
    <div className="text-sm text-gray-500">
      {formatDate(entry.date)}
    </div>
    {entry.note && (
      <div className="text-sm mt-1">
        {entry.note}
      </div>
    )}
  </div>
))}
```

## Migration Guide

To apply the enhanced status tracking to an existing database:

1. Run the migration:
   ```bash
   psql -d your_database -f supabase/migrations/015_enhance_application_status_tracking.sql
   ```

2. The migration will:
   - Add new status values to the enum
   - Add `status_changed_at` column
   - Create triggers for automatic tracking
   - Backfill `status_changed_at` for existing records

3. Existing status values remain valid:
   - `applied` → `applied`
   - `screening` → `screening`
   - `interview_scheduled` → `interview_scheduled`
   - `interview_completed` → `interview_completed`
   - `offer` → `offer`
   - `accepted` → can transition to `accepted` or use `offer_accepted`
   - `rejected` → `rejected`
   - `withdrawn` → `withdrawn`

## Testing

### Unit Tests

Test status transition validation:

```typescript
import { isValidTransition, getAllowedTransitions } from './statusHelpers'

describe('Status Transitions', () => {
  it('allows valid transitions', () => {
    expect(isValidTransition('applied', 'screening')).toBe(true)
    expect(isValidTransition('offer', 'offer_accepted')).toBe(true)
  })

  it('rejects invalid transitions', () => {
    expect(isValidTransition('applied', 'offer')).toBe(false)
    expect(isValidTransition('accepted', 'rejected')).toBe(false)
  })

  it('prevents transitions from terminal states', () => {
    expect(getAllowedTransitions('accepted')).toEqual([])
    expect(getAllowedTransitions('rejected')).toEqual([])
  })
})
```

### Integration Tests

Test database triggers:

```sql
-- Test automatic status history
BEGIN;
  UPDATE tracked_applications
  SET status = 'screening'
  WHERE id = 'test-id';

  SELECT status_history
  FROM tracked_applications
  WHERE id = 'test-id';
  -- Should contain entry with status='screening'
ROLLBACK;
```

## Performance Considerations

1. **Indexes**:
   - `idx_tracked_applications_status_changed` on `status_changed_at DESC`
   - Existing status index supports filtering

2. **JSONB Queries**:
   - Use GIN index for complex status_history queries
   - Simple array append is fast

3. **Trigger Performance**:
   - Triggers only fire on actual changes
   - Minimal overhead (< 1ms per update)

## Best Practices

1. **Always use status helpers** for transitions
   ```typescript
   // Good
   if (isValidTransition(currentStatus, newStatus)) {
     updateStatus(newStatus)
   }

   // Bad
   updateStatus(newStatus) // No validation
   ```

2. **Include notes for important transitions**
   ```typescript
   updateStatus('rejected', 'Feedback: Looking for more experience')
   ```

3. **Display status history** to users
   - Shows application progress
   - Helps track timeline
   - Provides context

4. **Filter by category** for better UX
   ```typescript
   const activeApps = getStatusesByCategory().active
   ```

## Future Enhancements

Potential improvements:

1. **Email notifications** on status changes
2. **Status-based reminders** (e.g., "Follow up after 1 week")
3. **Analytics** on status progression times
4. **Bulk status updates** for multiple applications
5. **Status presets** for common workflows
6. **Custom status notes templates**

## Troubleshooting

### Status not updating

Check:
1. Database triggers are installed: `\df track_application_status_change`
2. User has UPDATE permission on tracked_applications
3. Status transition is valid: use `isValidTransition()`

### History not populating

Check:
1. Trigger is enabled: `SELECT * FROM pg_trigger WHERE tgname = 'track_status_changes'`
2. JSONB column is valid: `SELECT jsonb_typeof(status_history) FROM tracked_applications`
3. Status actually changed (trigger only fires on change)

### UI not showing transitions

Check:
1. StatusUpdateDialog is receiving correct currentStatus
2. getAllowedTransitions() returns expected array
3. Frontend and backend enum values match

## References

- Migration file: `/supabase/migrations/015_enhance_application_status_tracking.sql`
- TypeScript types: `/src/sections/application-tracker/types.ts`
- Status helpers: `/src/sections/application-tracker/utils/statusHelpers.ts`
- UI components: `/src/sections/application-tracker/components/StatusUpdateDialog.tsx`
- Database hook: `/src/hooks/useTrackedApplications.ts`
