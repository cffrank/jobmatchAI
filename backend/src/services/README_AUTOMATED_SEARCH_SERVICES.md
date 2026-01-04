# Automated Search Services - Phase 1 Documentation

## Overview

This documentation covers the three core services for the Automated Job Search system (Phase 1):

1. **Search Preferences Service** - User search configuration and automation settings
2. **Search History Service** - Search execution tracking and analytics
3. **Search Templates Service** - Reusable search criteria management

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Automated Search System                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Search           │  │ Search           │  │ Search       │  │
│  │ Preferences      │  │ History          │  │ Templates    │  │
│  │                  │  │                  │  │              │  │
│  │ - User config    │  │ - Execution logs │  │ - Saved      │  │
│  │ - Blacklists     │  │ - Analytics      │  │   searches   │  │
│  │ - Source toggle  │  │ - Deduplication  │  │ - Quick      │  │
│  │ - Notifications  │  │ - Performance    │  │   rerun      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│           │                     │                     │          │
│           └─────────────────────┴─────────────────────┘          │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │  Supabase         │                        │
│                    │  (PostgreSQL)     │                        │
│                    └───────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

## Service Files

### 1. Search Preferences Service

**File:** `searchPreferences.service.ts`

**Purpose:** Manage user job search preferences and automation configuration.

**Key Functions:**

```typescript
// CRUD Operations
getUserPreferences(userId: string): Promise<SearchPreferences | null>
createPreferences(userId: string, data: CreatePreferencesData): Promise<SearchPreferences>
updatePreferences(userId: string, data: UpdatePreferencesData): Promise<SearchPreferences>
deletePreferences(userId: string): Promise<void>

// Blacklist Management
addToBlacklist(userId: string, type: 'company' | 'keyword', value: string): Promise<SearchPreferences>
removeFromBlacklist(userId: string, type: 'company' | 'keyword', value: string): Promise<SearchPreferences>

// Source Management
toggleSource(userId: string, source: string, enabled: boolean): Promise<SearchPreferences>
```

**Data Structure:**

```typescript
interface SearchPreferences {
  id: string;
  userId: string;

  // Search Criteria
  desiredRoles: string[];
  locations: string[];
  salaryMin?: number;
  salaryMax?: number;
  remotePreference: 'remote' | 'hybrid' | 'on-site' | 'any';
  employmentTypes: string[];
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  industries?: string[];
  companySizes?: ('startup' | 'small' | 'medium' | 'large' | 'enterprise')[];

  // Filters
  companyBlacklist: string[];
  keywordBlacklist: string[];
  enabledSources: Record<string, boolean>;

  // Automation
  searchFrequency: 'daily' | 'weekly' | 'manual';
  autoSearchEnabled: boolean;

  // Notifications
  notificationEmail: boolean;
  notificationInApp: boolean;
  matchScoreThreshold: number;

  createdAt: string;
  updatedAt: string;
}
```

**Usage Example:**

```typescript
import * as searchPreferencesService from '../services/searchPreferences.service';

// Create preferences for new user
const preferences = await searchPreferencesService.createPreferences(userId, {
  desiredRoles: ['Software Engineer', 'Backend Developer'],
  locations: ['San Francisco, CA', 'Remote'],
  salaryMin: 120000,
  salaryMax: 180000,
  remotePreference: 'remote',
  employmentTypes: ['full-time'],
  autoSearchEnabled: true,
  searchFrequency: 'daily',
  matchScoreThreshold: 75,
});

// Add company to blacklist
await searchPreferencesService.addToBlacklist(userId, 'company', 'Bad Company Inc');

// Toggle Indeed source off
await searchPreferencesService.toggleSource(userId, 'indeed', false);
```

### 2. Search History Service

**File:** `searchHistory.service.ts`

**Purpose:** Track all search executions for analytics, deduplication, and performance monitoring.

**Key Functions:**

```typescript
// Recording & Retrieval
recordSearch(userId: string, searchData: RecordSearchData): Promise<SearchHistory>
getSearchHistory(userId: string, limit?: number, offset?: number): Promise<SearchHistory[]>
getLastSearch(userId: string): Promise<SearchHistory | null>

// Analytics
getSearchStats(userId: string, days?: number): Promise<SearchHistoryStats>

// Deduplication
hasSimilarRecentSearch(userId: string, criteria: Record<string, unknown>, withinMinutes?: number): Promise<boolean>

// Cleanup
deleteOldSearchHistory(olderThanDays: number): Promise<number>
```

**Data Structure:**

```typescript
interface SearchHistory {
  id: string;
  userId: string;
  searchType: 'automated' | 'manual' | 'template';
  templateId?: string;
  criteria: Record<string, unknown>;
  jobsFound: number;
  jobsSaved: number;
  highMatches: number;
  sourcesUsed: string[];
  searchFingerprint?: string; // MD5 hash for deduplication
  durationMs?: number;
  errors?: Record<string, unknown>;
  createdAt: string;
}

interface SearchHistoryStats {
  totalSearches: number;
  totalJobsFound: number;
  totalJobsSaved: number;
  averageMatchesPerSearch: number;
  mostUsedSources: string[];
  periodStart: string;
  periodEnd: string;
}
```

**Usage Example:**

```typescript
import * as searchHistoryService from '../services/searchHistory.service';

// Check for duplicate search before executing
const isDuplicate = await searchHistoryService.hasSimilarRecentSearch(
  userId,
  searchCriteria,
  10 // within 10 minutes
);

if (isDuplicate) {
  throw new Error('Identical search performed recently');
}

// Record search execution
const startTime = Date.now();
const jobs = await executeJobSearch(searchCriteria);
const durationMs = Date.now() - startTime;

await searchHistoryService.recordSearch(userId, {
  searchType: 'manual',
  criteria: searchCriteria,
  jobsFound: jobs.length,
  jobsSaved: jobs.filter(j => j.isSaved).length,
  highMatches: jobs.filter(j => j.matchScore >= 80).length,
  sourcesUsed: ['linkedin', 'indeed'],
  durationMs,
});

// Get search statistics
const stats = await searchHistoryService.getSearchStats(userId, 30); // last 30 days
console.log(`Total searches: ${stats.totalSearches}`);
console.log(`Total jobs found: ${stats.totalJobsFound}`);
console.log(`Average jobs per search: ${stats.averageMatchesPerSearch}`);
console.log(`Most used sources: ${stats.mostUsedSources.join(', ')}`);
```

### 3. Search Templates Service

**File:** `searchTemplates.service.ts`

**Purpose:** Allow users to save and reuse common search criteria as templates.

**Key Functions:**

```typescript
// CRUD Operations
createTemplate(userId: string, name: string, criteria: Record<string, unknown>): Promise<SearchTemplate>
getTemplates(userId: string): Promise<SearchTemplate[]>
getTemplate(userId: string, templateId: string): Promise<SearchTemplate>
updateTemplate(userId: string, templateId: string, data: UpdateTemplateData): Promise<SearchTemplate>
deleteTemplate(userId: string, templateId: string): Promise<void>

// Usage Tracking
useTemplate(userId: string, templateId: string): Promise<SearchTemplate>
getMostUsedTemplates(userId: string, limit?: number): Promise<SearchTemplate[]>
getRecentlyUsedTemplates(userId: string, limit?: number): Promise<SearchTemplate[]>

// Search
searchTemplatesByName(userId: string, query: string): Promise<SearchTemplate[]>

// Validation
validateTemplateCriteria(criteria: Record<string, unknown>): boolean
```

**Data Structure:**

```typescript
interface SearchTemplate {
  id: string;
  userId: string;
  name: string;
  description?: string;
  criteria: Record<string, unknown>;
  useCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

**Usage Example:**

```typescript
import * as searchTemplatesService from '../services/searchTemplates.service';

// Create a template
const template = await searchTemplatesService.createTemplate(
  userId,
  'Remote Software Engineer Jobs',
  {
    desiredRoles: ['Software Engineer', 'Senior Software Engineer'],
    locations: ['Remote'],
    salaryMin: 120000,
    remotePreference: 'remote',
    employmentTypes: ['full-time'],
  }
);

// Use template for search
const templateData = await searchTemplatesService.useTemplate(userId, template.id);
// This increments use_count and updates last_used_at

const jobs = await executeJobSearch(templateData.criteria);

// Get user's most used templates
const popularTemplates = await searchTemplatesService.getMostUsedTemplates(userId, 5);

// Search templates by name
const results = await searchTemplatesService.searchTemplatesByName(userId, 'remote');
```

## Database Schema

### search_preferences Table

```sql
CREATE TABLE public.search_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core search criteria
  desired_roles TEXT[] NOT NULL DEFAULT '{}',
  locations TEXT[] NOT NULL DEFAULT '{}',
  salary_min INTEGER,
  salary_max INTEGER,
  remote_preference TEXT CHECK (remote_preference IN ('remote', 'hybrid', 'on-site', 'any')),
  employment_types TEXT[] NOT NULL DEFAULT ARRAY['full-time']::TEXT[],
  experience_level TEXT CHECK (experience_level IN ('entry', 'mid', 'senior', 'executive')),

  -- Advanced filters
  industries TEXT[],
  company_sizes TEXT[],
  company_blacklist TEXT[] NOT NULL DEFAULT '{}',
  keyword_blacklist TEXT[] NOT NULL DEFAULT '{}',
  enabled_sources JSONB NOT NULL DEFAULT '{"linkedin": true, "indeed": true}'::JSONB,

  -- Automation
  search_frequency TEXT NOT NULL DEFAULT 'daily',
  auto_search_enabled BOOLEAN NOT NULL DEFAULT false,

  -- Notifications
  notification_email BOOLEAN NOT NULL DEFAULT true,
  notification_in_app BOOLEAN NOT NULL DEFAULT true,
  match_score_threshold INTEGER NOT NULL DEFAULT 70,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);
```

### search_history Table

```sql
CREATE TABLE public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  search_type TEXT NOT NULL CHECK (search_type IN ('automated', 'manual', 'template')),
  template_id UUID REFERENCES public.search_templates(id) ON DELETE SET NULL,

  criteria JSONB NOT NULL,
  jobs_found INTEGER NOT NULL DEFAULT 0,
  jobs_saved INTEGER NOT NULL DEFAULT 0,
  high_matches INTEGER NOT NULL DEFAULT 0,
  sources_used TEXT[] NOT NULL DEFAULT '{}',
  search_fingerprint TEXT,
  duration_ms INTEGER,
  errors JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, search_fingerprint, created_at) DEFERRABLE INITIALLY DEFERRED
);
```

### search_templates Table

```sql
CREATE TABLE public.search_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, name)
);
```

## Error Handling

All services use the `HttpError` class for consistent error handling:

```typescript
import { HttpError } from '../types';

// Example: Not found
throw new HttpError(404, 'Search preferences not found', 'PREFERENCES_NOT_FOUND');

// Example: Duplicate
throw new HttpError(409, 'Template name already exists', 'DUPLICATE_TEMPLATE_NAME');

// Example: Validation error
throw new HttpError(400, 'Invalid search criteria', 'INVALID_CRITERIA');

// Example: Database error
throw new HttpError(500, 'Database operation failed', 'DATABASE_ERROR', { error: err.message });
```

## Security

### Row Level Security (RLS)

All tables have RLS policies enforcing user data isolation:

```sql
-- Users can only access their own data
CREATE POLICY "Users can view own search preferences"
  ON public.search_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Similar policies exist for INSERT, UPDATE, DELETE
```

### Service Role vs. User Client

Services use `supabaseAdmin` (service role) to bypass RLS for server-side operations. Always validate `userId` matches authenticated user when called from API routes.

## Performance Considerations

### Indexes

```sql
-- search_preferences
CREATE INDEX idx_search_preferences_user_id ON search_preferences(user_id);
CREATE INDEX idx_search_preferences_auto_search ON search_preferences(auto_search_enabled)
  WHERE auto_search_enabled = true;

-- search_history
CREATE INDEX idx_search_history_user_id ON search_history(user_id);
CREATE INDEX idx_search_history_created_at ON search_history(created_at DESC);
CREATE INDEX idx_search_history_user_created ON search_history(user_id, created_at DESC);
CREATE INDEX idx_search_history_fingerprint ON search_history(user_id, search_fingerprint)
  WHERE search_fingerprint IS NOT NULL;

-- search_templates
CREATE INDEX idx_search_templates_user_id ON search_templates(user_id);
CREATE INDEX idx_search_templates_use_count ON search_templates(use_count DESC);
```

### Deduplication

Search fingerprints use MD5 hashing of normalized criteria to prevent redundant searches within a 10-minute window.

### Batch Operations

For automated searches processing many users, use batch processing (e.g., 10 users at a time) to avoid overwhelming the system.

## Integration with Existing System

### Job Scraper Integration

```typescript
import * as searchPreferencesService from './searchPreferences.service';
import * as searchHistoryService from './searchHistory.service';
import { scrapeJobs } from './jobScraper.service';

async function automatedJobSearch(userId: string) {
  // Get user preferences
  const prefs = await searchPreferencesService.getUserPreferences(userId);
  if (!prefs || !prefs.autoSearchEnabled) {
    return;
  }

  // Build search criteria from preferences
  const criteria = {
    keywords: prefs.desiredRoles,
    locations: prefs.locations,
    salaryMin: prefs.salaryMin,
    salaryMax: prefs.salaryMax,
    remotePreference: prefs.remotePreference,
  };

  // Check for duplicate search
  const isDuplicate = await searchHistoryService.hasSimilarRecentSearch(userId, criteria);
  if (isDuplicate) {
    console.log('Skipping duplicate search');
    return;
  }

  // Execute search
  const startTime = Date.now();
  const jobs = await scrapeJobs(userId, criteria);
  const durationMs = Date.now() - startTime;

  // Record search
  await searchHistoryService.recordSearch(userId, {
    searchType: 'automated',
    criteria,
    jobsFound: jobs.length,
    jobsSaved: jobs.filter(j => j.isSaved).length,
    highMatches: jobs.filter(j => j.matchScore >= prefs.matchScoreThreshold).length,
    sourcesUsed: Object.keys(prefs.enabledSources).filter(s => prefs.enabledSources[s]),
    durationMs,
  });
}
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import * as searchPreferencesService from './searchPreferences.service';

describe('Search Preferences Service', () => {
  let userId: string;

  beforeEach(() => {
    userId = 'test-user-123';
  });

  it('should create preferences with defaults', async () => {
    const prefs = await searchPreferencesService.createPreferences(userId);
    expect(prefs.searchFrequency).toBe('daily');
    expect(prefs.autoSearchEnabled).toBe(false);
    expect(prefs.matchScoreThreshold).toBe(70);
  });

  it('should add company to blacklist', async () => {
    await searchPreferencesService.createPreferences(userId);
    const updated = await searchPreferencesService.addToBlacklist(
      userId,
      'company',
      'Bad Company'
    );
    expect(updated.companyBlacklist).toContain('Bad Company');
  });
});
```

## Migration Guide

To apply the database schema:

```bash
# Apply migration
psql $DATABASE_URL -f supabase/migrations/024_add_automated_search_tables.sql

# Or use Supabase CLI
supabase db push
```

## Next Steps (Phase 2)

- Add API routes for search preferences, history, and templates
- Implement scheduled job search automation
- Add email notifications for high-match jobs
- Build frontend UI for preference management
- Add search analytics dashboard

## Support

For questions or issues:
- Review service code in `backend/src/services/`
- Check migration file: `supabase/migrations/024_add_automated_search_tables.sql`
- See types: `backend/src/types/index.ts`
- Refer to CLAUDE.md for project conventions
