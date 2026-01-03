# Supabase Types Reference

Generated from production database: `lrzhpnsykasqrousgmdh.supabase.co`
File: `/home/carl/application-tracking/jobmatch-ai/src/types/supabase.ts`

## Quick Usage

```typescript
import { Database } from '@/types/supabase'

// Table types
type User = Database['public']['Tables']['users']['Row']
type UserInsert = Database['public']['Tables']['users']['Insert']
type UserUpdate = Database['public']['Tables']['users']['Update']

// Enum types
type ApplicationStatus = Database['public']['Enums']['application_status']
type JobType = Database['public']['Enums']['job_type']

// Supabase client with types
import { createClient } from '@supabase/supabase-js'
const supabase = createClient<Database>(url, key)
```

## Tables (25 total)

### Core User Tables
- `users` - User profiles and authentication data
- `resumes` - Resume documents (master and tailored)
- `work_experience` - Employment history
- `education` - Educational background
- `skills` - User skills and proficiency levels
- `job_preferences` - Job search preferences

### Application Management
- `applications` - Job applications
- `jobs` - Job listings (scraped and saved)
- `tracked_applications` - Application tracking
- `email_history` - Email correspondence

### Subscription & Billing
- `subscriptions` - User subscription plans
- `invoices` - Billing history
- `payment_methods` - Stored payment methods
- `usage_limits` - API and feature usage limits

### Security & Auth
- `sessions` - Active user sessions
- `oauth_states` - OAuth flow state management
- `security_events` - Security audit log
- `account_lockouts` - Failed login tracking
- `failed_login_attempts` - Login attempt records
- `rate_limits` - API rate limiting

### System
- `notifications` - User notifications

## Enums

### `application_status`
```typescript
type ApplicationStatus =
  | "draft"        // Initial state, not ready to submit
  | "ready"        // Ready to submit
  | "submitted"    // Sent to employer
  | "interviewing" // In interview process
  | "offered"      // Received job offer
  | "accepted"     // Accepted offer
  | "rejected"     // Application rejected
  | "withdrawn"    // User withdrew application
```

### `tracked_application_status`
```typescript
type TrackedStatus =
  | "wishlist"     // Saved for later
  | "applied"      // Application submitted
  | "interviewing" // In interview process
  | "offered"      // Received offer
  | "rejected"     // Application rejected
  | "accepted"     // Accepted offer
  | "withdrawn"    // Withdrawn application
```

### `email_status`
```typescript
type EmailStatus =
  | "pending"    // Queued for sending
  | "sent"       // Sent successfully
  | "delivered"  // Confirmed delivered
  | "failed"     // Send failed
  | "bounced"    // Email bounced
```

### `job_type`
```typescript
type JobType =
  | "full-time"
  | "part-time"
  | "contract"
  | "internship"
  | "temporary"
  | "remote"
```

### `experience_level`
```typescript
type ExperienceLevel =
  | "entry"      // Entry level
  | "mid"        // Mid level
  | "senior"     // Senior level
  | "lead"       // Lead/Staff level
  | "executive"  // Executive level
```

### `resume_type`
```typescript
type ResumeType =
  | "master"    // Master resume with all experience
  | "tailored"  // Tailored for specific job
```

### `subscription_tier`
```typescript
type SubscriptionTier =
  | "free"         // Free tier
  | "premium"      // Premium tier
  | "enterprise"   // Enterprise tier
```

### `device_type`
```typescript
type DeviceType =
  | "desktop"
  | "mobile"
  | "tablet"
  | "unknown"
```

## Common Table Structures

### users
```typescript
{
  id: string                    // UUID
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string           // ISO timestamp
  updated_at: string
  last_login: string | null
  subscription_tier: SubscriptionTier
  is_email_verified: boolean
  metadata: Json | null
}
```

### jobs
```typescript
{
  id: string
  user_id: string
  title: string
  company: string
  location: string | null
  description: string | null
  url: string | null
  source: string | null
  salary_range: string | null
  job_type: JobType | null
  scraped_at: string | null
  is_saved: boolean
  saved_at: string | null
  created_at: string
  updated_at: string
}
```

### applications
```typescript
{
  id: string
  user_id: string
  job_id: string | null
  status: ApplicationStatus | null
  cover_letter: string | null
  custom_resume: string | null
  variants: Json | null
  created_at: string
  updated_at: string
}
```

### subscriptions
```typescript
{
  id: string
  user_id: string
  tier: SubscriptionTier
  status: string
  stripe_subscription_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}
```

## Database Functions (9 total)

The types also include these database functions:
- `cleanup_expired_lockouts` - Remove expired account lockouts
- `cleanup_expired_sessions` - Remove expired user sessions
- `cleanup_old_failed_logins` - Remove old failed login attempts
- `clear_failed_login_attempts` - Clear failed login records for a user
- `get_active_session_count` - Count active sessions for a user
- `initialize_user_limits` - Set up initial usage limits for new users
- `is_account_locked` - Check if an account is currently locked
- `record_failed_login` - Log a failed login attempt
- `unlock_account` - Manually unlock a locked account (admin only)

## Regenerating Types

When the database schema changes:

```bash
# 1. Set your Supabase access token
export SUPABASE_ACCESS_TOKEN=your_token_here

# 2. Generate types
npx supabase gen types typescript \
  --project-id lrzhpnsykasqrousgmdh \
  > src/types/supabase.ts

# 3. Verify the build
npm run build
```

## Type-Safe Queries

### Select Query
```typescript
const { data, error } = await supabase
  .from('applications')
  .select('id, status, user_id')
  .eq('user_id', userId)
  .in('status', ['submitted', 'interviewing'])

// data is typed as:
// Array<{ id: string; status: ApplicationStatus | null; user_id: string }>
```

### Insert Query
```typescript
const newJob: Database['public']['Tables']['jobs']['Insert'] = {
  user_id: userId,
  title: 'Software Engineer',
  company: 'Tech Corp',
  is_saved: true,
  // created_at and updated_at are auto-generated
}

const { data, error } = await supabase
  .from('jobs')
  .insert(newJob)
  .select()
```

### Update Query
```typescript
const update: Database['public']['Tables']['applications']['Update'] = {
  status: 'interviewing',
  updated_at: new Date().toISOString(),
}

const { error } = await supabase
  .from('applications')
  .update(update)
  .eq('id', applicationId)
```

## Real-time Subscriptions

```typescript
const channel = supabase
  .channel('jobs_changes')
  .on(
    'postgres_changes',
    {
      event: '*', // 'INSERT' | 'UPDATE' | 'DELETE' | '*'
      schema: 'public',
      table: 'jobs',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      console.log('Change received!', payload)
      // payload.new is typed as Table Row
      // payload.old is typed as Table Row
    }
  )
  .subscribe()

// Cleanup
await supabase.removeChannel(channel)
```

## Best Practices

1. **Always use the generated types** - Don't manually type database objects
2. **Use Row/Insert/Update appropriately**:
   - `Row`: Data coming from the database
   - `Insert`: Data being inserted (auto-generated fields optional)
   - `Update`: Data being updated (all fields optional)
3. **Enum safety**: Use enum types instead of string literals
4. **Null handling**: Most fields are nullable, handle them appropriately
5. **Timestamps**: All timestamps are ISO strings, convert with `new Date()`

## Troubleshooting

### Type errors after schema change
```bash
# Regenerate types
npx supabase gen types typescript --project-id lrzhpnsykasqrousgmdh > src/types/supabase.ts
```

### Column name mismatches
- Database uses snake_case: `created_at`, `user_id`
- TypeScript may use camelCase: convert when mapping
- Use the exact column names from the types file

### Missing enum values
- Check the Enums section in the types file
- Enums are defined at: `Database['public']['Enums']['enum_name']`

## File Location

**Types File**: `/home/carl/application-tracking/jobmatch-ai/src/types/supabase.ts`
**Size**: 1,292 lines
**Last Generated**: 2024-12-24
