# Automated Search Services - Quick Reference

## Import Statements

```typescript
import * as searchPreferencesService from './services/searchPreferences.service';
import * as searchHistoryService from './services/searchHistory.service';
import * as searchTemplatesService from './services/searchTemplates.service';
```

## Search Preferences Service

### Get Preferences
```typescript
const prefs = await searchPreferencesService.getUserPreferences(userId);
// Returns: SearchPreferences | null
```

### Create Preferences
```typescript
const prefs = await searchPreferencesService.createPreferences(userId, {
  desiredRoles: ['Software Engineer'],
  locations: ['San Francisco, CA'],
  salaryMin: 120000,
  salaryMax: 180000,
  remotePreference: 'remote',
  autoSearchEnabled: true,
  searchFrequency: 'daily',
});
// Returns: SearchPreferences
```

### Update Preferences
```typescript
const updated = await searchPreferencesService.updatePreferences(userId, {
  salaryMin: 130000,
  autoSearchEnabled: false,
});
// Returns: SearchPreferences
```

### Delete Preferences
```typescript
await searchPreferencesService.deletePreferences(userId);
// Returns: void
```

### Blacklist Management
```typescript
// Add to blacklist
await searchPreferencesService.addToBlacklist(userId, 'company', 'Bad Company Inc');
await searchPreferencesService.addToBlacklist(userId, 'keyword', 'sales');

// Remove from blacklist
await searchPreferencesService.removeFromBlacklist(userId, 'company', 'Bad Company Inc');
// Returns: SearchPreferences
```

### Source Toggle
```typescript
// Enable/disable job sources
await searchPreferencesService.toggleSource(userId, 'linkedin', true);
await searchPreferencesService.toggleSource(userId, 'indeed', false);
// Returns: SearchPreferences
```

## Search History Service

### Record Search
```typescript
await searchHistoryService.recordSearch(userId, {
  searchType: 'manual',
  criteria: { keywords: ['developer'], location: 'SF' },
  jobsFound: 45,
  jobsSaved: 12,
  highMatches: 8,
  sourcesUsed: ['linkedin', 'indeed'],
  durationMs: 3500,
});
// Returns: SearchHistory
```

### Get Search History
```typescript
// With pagination
const history = await searchHistoryService.getSearchHistory(userId, 20, 0);
// Returns: SearchHistory[]
```

### Get Search Statistics
```typescript
// Last 30 days
const stats = await searchHistoryService.getSearchStats(userId, 30);
// Returns: SearchHistoryStats
// {
//   totalSearches: 15,
//   totalJobsFound: 450,
//   totalJobsSaved: 89,
//   averageMatchesPerSearch: 30,
//   mostUsedSources: ['linkedin', 'indeed'],
//   periodStart: '2024-12-01T00:00:00.000Z',
//   periodEnd: '2024-12-30T23:59:59.999Z'
// }
```

### Get Last Search
```typescript
const last = await searchHistoryService.getLastSearch(userId);
// Returns: SearchHistory | null
```

### Check for Duplicate Search
```typescript
const isDuplicate = await searchHistoryService.hasSimilarRecentSearch(
  userId,
  searchCriteria,
  10 // within 10 minutes
);
// Returns: boolean
```

### Cleanup Old History
```typescript
// Delete records older than 365 days
const deleted = await searchHistoryService.deleteOldSearchHistory(365);
// Returns: number (count of deleted records)
```

## Search Templates Service

### Create Template
```typescript
const template = await searchTemplatesService.createTemplate(
  userId,
  'Remote Backend Jobs',
  {
    desiredRoles: ['Backend Engineer'],
    remotePreference: 'remote',
    salaryMin: 130000,
  }
);
// Returns: SearchTemplate
```

### Get All Templates
```typescript
const templates = await searchTemplatesService.getTemplates(userId);
// Returns: SearchTemplate[] (sorted by use_count)
```

### Get Specific Template
```typescript
const template = await searchTemplatesService.getTemplate(userId, templateId);
// Returns: SearchTemplate
```

### Update Template
```typescript
const updated = await searchTemplatesService.updateTemplate(userId, templateId, {
  name: 'Updated Name',
  criteria: { ...newCriteria },
});
// Returns: SearchTemplate
```

### Delete Template
```typescript
await searchTemplatesService.deleteTemplate(userId, templateId);
// Returns: void
```

### Use Template
```typescript
// Increments use_count and updates last_used_at
const template = await searchTemplatesService.useTemplate(userId, templateId);
// Returns: SearchTemplate

// Then use criteria for search
const jobs = await scrapeJobs(template.criteria);
```

### Get Most Used Templates
```typescript
const popular = await searchTemplatesService.getMostUsedTemplates(userId, 5);
// Returns: SearchTemplate[] (top 5)
```

### Get Recently Used Templates
```typescript
const recent = await searchTemplatesService.getRecentlyUsedTemplates(userId, 5);
// Returns: SearchTemplate[] (5 most recent)
```

### Search Templates by Name
```typescript
const results = await searchTemplatesService.searchTemplatesByName(userId, 'remote');
// Returns: SearchTemplate[]
```

### Validate Template Criteria
```typescript
try {
  searchTemplatesService.validateTemplateCriteria(criteria);
  // Valid
} catch (error) {
  // Invalid criteria
}
// Returns: boolean | throws HttpError
```

## Error Handling

All services throw `HttpError` with consistent structure:

```typescript
try {
  const prefs = await searchPreferencesService.getUserPreferences(userId);
} catch (error) {
  if (error instanceof HttpError) {
    console.error(`Error ${error.statusCode}: ${error.message}`);
    console.error(`Code: ${error.code}`);
    console.error(`Details:`, error.details);
  }
}
```

### Common Error Codes

**Search Preferences:**
- `PREFERENCES_EXIST` (409) - Preferences already exist
- `PREFERENCES_NOT_FOUND` (404) - Preferences don't exist
- `DATABASE_ERROR` (500) - Database operation failed

**Search History:**
- `DUPLICATE_SEARCH` (409) - Identical search performed recently
- `DATABASE_ERROR` (500) - Database operation failed

**Search Templates:**
- `TEMPLATE_NOT_FOUND` (404) - Template doesn't exist
- `DUPLICATE_TEMPLATE_NAME` (409) - Template name already exists
- `TEMPLATE_LIMIT_EXCEEDED` (400) - User has 50+ templates
- `INVALID_TEMPLATE_NAME` (400) - Empty or invalid name
- `INVALID_CRITERIA` (400) - Invalid search criteria
- `DATABASE_ERROR` (500) - Database operation failed

## TypeScript Types

```typescript
interface SearchPreferences {
  id: string;
  userId: string;
  desiredRoles: string[];
  locations: string[];
  salaryMin?: number;
  salaryMax?: number;
  remotePreference: 'remote' | 'hybrid' | 'on-site' | 'any';
  employmentTypes: string[];
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  industries?: string[];
  companySizes?: ('startup' | 'small' | 'medium' | 'large' | 'enterprise')[];
  companyBlacklist: string[];
  keywordBlacklist: string[];
  enabledSources: Record<string, boolean>;
  searchFrequency: 'daily' | 'weekly' | 'manual';
  autoSearchEnabled: boolean;
  notificationEmail: boolean;
  notificationInApp: boolean;
  matchScoreThreshold: number;
  createdAt: string;
  updatedAt: string;
}

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
  searchFingerprint?: string;
  durationMs?: number;
  errors?: Record<string, unknown>;
  createdAt: string;
}

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

## Common Patterns

### Complete Automated Search Flow

```typescript
async function automatedJobSearch(userId: string) {
  // 1. Get user preferences
  const prefs = await searchPreferencesService.getUserPreferences(userId);
  if (!prefs || !prefs.autoSearchEnabled) {
    return;
  }

  // 2. Build search criteria
  const criteria = {
    keywords: prefs.desiredRoles,
    locations: prefs.locations,
    salaryMin: prefs.salaryMin,
    salaryMax: prefs.salaryMax,
    remotePreference: prefs.remotePreference,
  };

  // 3. Check for duplicate search
  const isDuplicate = await searchHistoryService.hasSimilarRecentSearch(
    userId,
    criteria,
    10
  );
  if (isDuplicate) {
    console.log('Skipping duplicate search');
    return;
  }

  // 4. Execute search
  const startTime = Date.now();
  const jobs = await scrapeJobs(criteria);
  const durationMs = Date.now() - startTime;

  // 5. Record search
  await searchHistoryService.recordSearch(userId, {
    searchType: 'automated',
    criteria,
    jobsFound: jobs.length,
    jobsSaved: jobs.filter(j => j.isSaved).length,
    highMatches: jobs.filter(j => j.matchScore >= prefs.matchScoreThreshold).length,
    sourcesUsed: Object.keys(prefs.enabledSources).filter(s => prefs.enabledSources[s]),
    durationMs,
  });

  // 6. Send notifications if high matches found
  const highMatches = jobs.filter(j => j.matchScore >= prefs.matchScoreThreshold);
  if (highMatches.length > 0 && prefs.notificationEmail) {
    await sendEmailNotification(userId, highMatches);
  }
}
```

### Template-Based Search

```typescript
async function searchUsingTemplate(userId: string, templateId: string) {
  // 1. Use template (increments counter)
  const template = await searchTemplatesService.useTemplate(userId, templateId);

  // 2. Execute search with template criteria
  const startTime = Date.now();
  const jobs = await scrapeJobs(template.criteria);
  const durationMs = Date.now() - startTime;

  // 3. Record search
  await searchHistoryService.recordSearch(userId, {
    searchType: 'template',
    templateId: template.id,
    criteria: template.criteria,
    jobsFound: jobs.length,
    jobsSaved: 0,
    highMatches: 0,
    sourcesUsed: ['linkedin', 'indeed'],
    durationMs,
  });

  return jobs;
}
```

### Preference Setup for New User

```typescript
async function setupUserPreferences(userId: string, onboardingData: any) {
  // Create preferences with defaults
  const prefs = await searchPreferencesService.createPreferences(userId, {
    desiredRoles: onboardingData.roles,
    locations: onboardingData.locations,
    salaryMin: onboardingData.salaryMin,
    salaryMax: onboardingData.salaryMax,
    remotePreference: onboardingData.remotePreference,
    employmentTypes: ['full-time'],
    autoSearchEnabled: false, // Start disabled
    searchFrequency: 'daily',
    matchScoreThreshold: 70,
  });

  // Create initial templates
  if (onboardingData.commonSearches) {
    for (const search of onboardingData.commonSearches) {
      await searchTemplatesService.createTemplate(
        userId,
        search.name,
        search.criteria
      );
    }
  }

  return prefs;
}
```

## Performance Tips

1. **Use pagination for search history:**
   ```typescript
   // Good: Load 20 at a time
   const history = await searchHistoryService.getSearchHistory(userId, 20, 0);

   // Bad: Load all history
   const allHistory = await searchHistoryService.getSearchHistory(userId, 1000, 0);
   ```

2. **Check for duplicates before expensive searches:**
   ```typescript
   const isDuplicate = await searchHistoryService.hasSimilarRecentSearch(userId, criteria);
   if (isDuplicate) return;
   // Expensive search only if not duplicate
   ```

3. **Cache user preferences:**
   ```typescript
   // Cache preferences for session
   let cachedPrefs: SearchPreferences | null = null;

   async function getPreferences(userId: string) {
     if (!cachedPrefs) {
       cachedPrefs = await searchPreferencesService.getUserPreferences(userId);
     }
     return cachedPrefs;
   }
   ```

4. **Batch template operations:**
   ```typescript
   // Good: Load all at once
   const templates = await searchTemplatesService.getTemplates(userId);

   // Bad: Load one by one
   for (const id of templateIds) {
     const template = await searchTemplatesService.getTemplate(userId, id);
   }
   ```

## Security Notes

- Always validate `userId` matches authenticated user in API routes
- Services use `supabaseAdmin` (bypasses RLS) - enforce authorization in routes
- Never expose service role key to frontend
- RLS policies automatically filter by user_id in database
- Input validation happens in services but should also be done in routes

---

For complete documentation, see: `README_AUTOMATED_SEARCH_SERVICES.md`
