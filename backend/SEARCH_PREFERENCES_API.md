# Search Preferences API Documentation

## Overview

This document describes the Search Preferences API endpoints for JobMatch AI Phase 1 implementation.

**File:** `/home/carl/application-tracking/jobmatch-ai/backend/src/routes/searchPreferences.ts`

## Implementation Status

### ✅ Fully Implemented (with existing database table)

**Search Preferences** - Uses existing `job_preferences` table from migration `004_backend_required_tables.sql`

- `GET /api/search-preferences` - Get user's search preferences
- `POST /api/search-preferences` - Create/update preferences (upsert)
- `DELETE /api/search-preferences` - Delete preferences (reset to defaults)
- `POST /api/search-preferences/blacklist` - Add item to blacklist
- `DELETE /api/search-preferences/blacklist/:type/:value` - Remove from blacklist
- `PATCH /api/search-preferences/sources` - Enable/disable job sources

### ⚠️ Stub Implementation (requires database migration)

**Search History** - Requires `job_searches` or `search_history` table

- `GET /api/search-history` - Get search history (paginated) - **Returns stub**
- `GET /api/search-history/stats` - Get search statistics - **Returns stub**
- `GET /api/search-history/last` - Get last search details - **Returns stub**

**Search Templates** - Requires `search_templates` table

- `GET /api/search-templates` - List templates - **Returns stub**
- `POST /api/search-templates` - Create template - **Returns stub**
- `GET /api/search-templates/:id` - Get template - **Returns 404**
- `PUT /api/search-templates/:id` - Update template - **Returns 404**
- `DELETE /api/search-templates/:id` - Delete template - **Returns 404**
- `POST /api/search-templates/:id/use` - Use template - **Returns 404**

**Manual Search Trigger** - Requires integration with job scraping service

- `POST /api/jobs/trigger-search` - Manually trigger job search - **Returns stub**

## Endpoints Detail

### Search Preferences

#### GET /api/search-preferences

Get the authenticated user's search preferences.

**Authentication:** Required
**Rate Limit:** Global (100 req/min per IP)

**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "desiredTitles": ["Software Engineer", "Backend Developer"],
  "desiredLocations": ["San Francisco, CA", "Remote"],
  "workArrangement": ["Remote", "Hybrid"],
  "jobTypes": ["full-time"],
  "salaryMin": 100000,
  "salaryMax": 180000,
  "experienceLevels": ["mid", "senior"],
  "industries": ["Technology", "FinTech"],
  "companySizes": ["medium", "large"],
  "benefits": ["Health Insurance", "401k"],
  "keywords": ["TypeScript", "Node.js"],
  "excludeKeywords": ["PHP", "Java"],
  "autoSearchEnabled": true,
  "notificationFrequency": "daily",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

**Note:** If no preferences exist, returns default empty preferences.

#### POST /api/search-preferences

Create or update user's search preferences (upsert operation).

**Authentication:** Required
**Rate Limit:** Global (100 req/min per IP)

**Request Body:**
```json
{
  "desiredTitles": ["Software Engineer"],
  "desiredLocations": ["Remote"],
  "workArrangement": ["Remote"],
  "jobTypes": ["full-time"],
  "salaryMin": 120000,
  "salaryMax": 180000,
  "autoSearchEnabled": true,
  "notificationFrequency": "daily"
}
```

**Validation Rules:**
- `desiredTitles`: Array of strings, max 20 items, each 1-100 chars
- `desiredLocations`: Array of strings, max 20 items, each 1-200 chars
- `workArrangement`: Array of enum ["Remote", "Hybrid", "On-site"]
- `jobTypes`: Array of enum ["full-time", "part-time", "contract", "internship", "temporary"]
- `salaryMin`: Integer 0-1,000,000
- `salaryMax`: Integer 0-10,000,000, must be >= salaryMin
- `experienceLevels`: Array of enum ["entry", "mid", "senior", "lead", "executive"]
- `industries`: Array of strings, max 30 items, each 1-100 chars
- `companySizes`: Array of enum ["startup", "small", "medium", "large", "enterprise"]
- `benefits`: Array of strings, max 20 items, each 1-100 chars
- `keywords`: Array of strings, max 30 items, each 1-100 chars
- `excludeKeywords`: Array of strings, max 30 items, each 1-100 chars
- `autoSearchEnabled`: Boolean
- `notificationFrequency`: Enum ["daily", "weekly", "realtime", "none"]

**Response:** Same as GET endpoint

#### DELETE /api/search-preferences

Delete user's search preferences (reset to defaults).

**Authentication:** Required
**Rate Limit:** Global (100 req/min per IP)

**Response:** 204 No Content

#### POST /api/search-preferences/blacklist

Add item to blacklist (prevents jobs from appearing in search).

**Authentication:** Required
**Rate Limit:** Global (100 req/min per IP)

**Request Body:**
```json
{
  "type": "company",
  "value": "Bad Company Inc"
}
```

**Types:** `company`, `keyword`, `location`, `title`

**Response:**
```json
{
  "success": true,
  "type": "company",
  "value": "Bad Company Inc",
  "excludeKeywords": ["Bad Company Inc", "Another Blacklisted Item"]
}
```

**Errors:**
- 409 Conflict - Item already blacklisted

#### DELETE /api/search-preferences/blacklist/:type/:value

Remove item from blacklist.

**Authentication:** Required
**Rate Limit:** Global (100 req/min per IP)

**Parameters:**
- `type`: `company` | `keyword` | `location` | `title`
- `value`: String to remove from blacklist

**Response:** 204 No Content

**Errors:**
- 404 Not Found - Blacklist item not found

#### PATCH /api/search-preferences/sources

Enable/disable job sources (LinkedIn, Indeed, manual).

**Authentication:** Required
**Rate Limit:** Global (100 req/min per IP)

**Request Body:**
```json
{
  "linkedin": true,
  "indeed": true,
  "manual": false
}
```

**Response:**
```json
{
  "success": true,
  "sources": {
    "linkedin": true,
    "indeed": true,
    "manual": false
  },
  "message": "Source preferences updated successfully"
}
```

**Note:** Currently logged but not persisted. Requires future migration to add sources configuration.

### Search History (Stub)

All search history endpoints return stub responses with a message indicating database migration is required.

#### GET /api/search-history

**Response:**
```json
{
  "searches": [],
  "total": 0,
  "page": 1,
  "limit": 20,
  "hasMore": false,
  "message": "Search history feature requires database migration"
}
```

#### GET /api/search-history/stats

**Response:**
```json
{
  "totalSearches": 0,
  "automatedSearches": 0,
  "manualSearches": 0,
  "lastSearchAt": null,
  "averageJobsPerSearch": 0,
  "totalJobsFound": 0,
  "message": "Search statistics feature requires database migration"
}
```

#### GET /api/search-history/last

**Response:**
```json
{
  "search": null,
  "message": "Last search feature requires database migration"
}
```

### Search Templates (Stub)

All template endpoints return stub responses or 404 errors.

#### POST /api/jobs/trigger-search

Manually trigger job search now.

**Authentication:** Required
**Rate Limit:** 10 requests/hour per user

**Request Body:**
```json
{
  "templateId": "uuid-optional",
  "maxResults": 20,
  "sources": ["linkedin", "indeed"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Job search triggered successfully",
  "searchId": "stub-search-id",
  "status": "pending",
  "expectedResults": 20,
  "sources": ["linkedin", "indeed"],
  "templateId": null,
  "note": "Manual search trigger requires integration with job scraping service"
}
```

## Database Schema

### Existing Table: `job_preferences`

Located in migration: `/home/carl/application-tracking/jobmatch-ai/supabase/migrations/004_backend_required_tables.sql`

```sql
CREATE TABLE job_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  desired_titles TEXT[] NOT NULL DEFAULT '{}',
  desired_locations TEXT[] DEFAULT '{}',
  work_arrangement TEXT[] DEFAULT '{}',
  job_types TEXT[] DEFAULT '{}',
  salary_min INTEGER CHECK (salary_min >= 0),
  salary_max INTEGER CHECK (salary_max >= 0),
  experience_levels TEXT[] DEFAULT '{}',
  industries TEXT[] DEFAULT '{}',
  company_sizes TEXT[] DEFAULT '{}',
  benefits TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  exclude_keywords TEXT[] DEFAULT '{}',
  auto_search_enabled BOOLEAN DEFAULT FALSE,
  notification_frequency TEXT DEFAULT 'daily',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Required Tables (Not Yet Implemented)

#### `search_history` or `job_searches`

```sql
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('automated', 'initial', 'manual')),
  job_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  fingerprint TEXT,  -- For deduplication
  template_id UUID REFERENCES search_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_search_history_user_id ON search_history(user_id);
CREATE INDEX idx_search_history_created_at ON search_history(created_at DESC);
CREATE INDEX idx_search_history_fingerprint ON search_history(fingerprint);
```

#### `search_templates`

```sql
CREATE TABLE search_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  preferences JSONB NOT NULL,  -- Stores search preferences as JSON
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_search_templates_user_id ON search_templates(user_id);
CREATE INDEX idx_search_templates_usage_count ON search_templates(usage_count DESC);
```

## Security

All endpoints:
- ✅ Require authentication (Supabase JWT)
- ✅ Use Row Level Security (RLS) policies
- ✅ Validate all inputs with Zod schemas
- ✅ Rate limited (global + endpoint-specific)
- ✅ Use `asyncHandler` for error handling
- ✅ Sanitize user inputs (array validation, string length limits)

## Next Steps (Phase 2)

1. **Create Database Migrations:**
   - Create `search_history` table migration
   - Create `search_templates` table migration
   - Add RLS policies for both tables

2. **Implement Search History:**
   - Replace stub endpoints with real queries
   - Add pagination support
   - Calculate statistics from search_history table
   - Track search fingerprints for deduplication

3. **Implement Search Templates:**
   - CRUD operations for templates
   - Store preferences as JSONB
   - Implement usage counter increment
   - Integrate with manual search trigger

4. **Integrate Manual Search Trigger:**
   - Connect to existing job scraping service (`jobScraper.service.ts`)
   - Apply template preferences when triggering search
   - Record search in search_history table
   - Return actual search results instead of stub

5. **Add Source Configuration:**
   - Add `enabled_sources` JSONB column to `job_preferences`
   - Persist source enable/disable state
   - Use source preferences in job scraping

## Testing

### Manual Testing

```bash
# Start backend
cd backend
npm run dev

# Test preferences
curl -X GET http://localhost:3000/api/search-preferences \
  -H "Authorization: Bearer YOUR_TOKEN"

curl -X POST http://localhost:3000/api/search-preferences \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "desiredTitles": ["Software Engineer"],
    "autoSearchEnabled": true
  }'

# Test blacklist
curl -X POST http://localhost:3000/api/search-preferences/blacklist \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "company",
    "value": "Bad Company Inc"
  }'

# Test search history (stub)
curl -X GET http://localhost:3000/api/search-history \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test manual trigger (stub)
curl -X POST http://localhost:3000/api/jobs/trigger-search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "maxResults": 20,
    "sources": ["linkedin", "indeed"]
  }'
```

### Integration Tests

Add to `/home/carl/application-tracking/jobmatch-ai/backend/tests/integration/searchPreferences.test.ts`:

```typescript
describe('Search Preferences API', () => {
  test('GET /api/search-preferences returns empty preferences for new user');
  test('POST /api/search-preferences creates preferences');
  test('POST /api/search-preferences updates existing preferences');
  test('DELETE /api/search-preferences removes preferences');
  test('POST /api/search-preferences/blacklist adds item');
  test('DELETE /api/search-preferences/blacklist/:type/:value removes item');
  test('POST validates salary range (max >= min)');
  test('POST validates array length limits');
});
```

## API Documentation

View all endpoints at `http://localhost:3000/api` when running in development mode.

## File Locations

- **Routes:** `/home/carl/application-tracking/jobmatch-ai/backend/src/routes/searchPreferences.ts`
- **Index:** `/home/carl/application-tracking/jobmatch-ai/backend/src/index.ts` (registered at line 208)
- **Migration:** `/home/carl/application-tracking/jobmatch-ai/supabase/migrations/004_backend_required_tables.sql`
- **Config:** `/home/carl/application-tracking/jobmatch-ai/backend/src/config/supabase.ts` (TABLES.JOB_PREFERENCES)
