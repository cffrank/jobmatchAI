# Job Deduplication System

## Overview

The job deduplication system automatically identifies and manages duplicate job listings across different sources (LinkedIn, Indeed, manual entries). It uses advanced fuzzy matching algorithms to detect similar jobs and selects the highest-quality version as the canonical job.

## Features

### 1. Multi-Algorithm Fuzzy Matching

The system uses multiple string similarity algorithms to accurately detect duplicates:

- **Levenshtein Distance**: Character-level edit distance for precise matching (e.g., company names)
- **Jaccard Similarity**: Token-based set overlap for job titles and descriptions
- **Cosine Similarity**: Semantic similarity using character bigrams
- **Hybrid Approach**: Combines all three algorithms for maximum accuracy

### 2. Quality-Based Canonical Selection

When duplicates are detected, the system automatically selects the "canonical" (best quality) job based on:

- **Completeness Score (50%)**: Number of filled fields (title, company, location, description, salary, etc.)
- **Source Reliability Score (30%)**: Manual entries > LinkedIn > Indeed
- **Freshness Score (20%)**: Recently posted jobs preferred

### 3. Efficient Performance

- **O(n log n) complexity** using blocking strategy (groups jobs by company)
- **Avoids O(n²)** pairwise comparisons through smart blocking
- **Background processing** doesn't block API responses
- **Batch processing** for large datasets
- **PostgreSQL indexes** for fast duplicate lookups

### 4. Confidence Levels

Duplicates are assigned confidence levels based on similarity scores:

- **High (≥85%)**: Highly likely to be duplicates (auto-hidden)
- **Medium (70-85%)**: Probable duplicates (flagged for review)
- **Low (50-70%)**: Possible duplicates (manual review recommended)

## Database Schema

### `job_duplicates` Table

Stores detected duplicate relationships with similarity scores.

```sql
CREATE TABLE job_duplicates (
  id UUID PRIMARY KEY,
  canonical_job_id UUID NOT NULL,  -- The "best quality" job
  duplicate_job_id UUID NOT NULL,  -- The inferior/duplicate job

  -- Similarity scores (0-100)
  title_similarity NUMERIC(5, 2),
  company_similarity NUMERIC(5, 2),
  location_similarity NUMERIC(5, 2),
  description_similarity NUMERIC(5, 2),
  overall_similarity NUMERIC(5, 2),

  confidence_level TEXT,  -- 'high', 'medium', 'low'
  detection_method TEXT,  -- 'fuzzy_match', 'url_match', 'manual'

  -- Manual override support
  manually_confirmed BOOLEAN DEFAULT FALSE,
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `canonical_job_metadata` Table

Stores quality scores for canonical job selection.

```sql
CREATE TABLE canonical_job_metadata (
  job_id UUID PRIMARY KEY,

  -- Quality scores (0-100)
  completeness_score NUMERIC(5, 2),
  source_reliability_score NUMERIC(5, 2),
  freshness_score NUMERIC(5, 2),
  overall_quality_score NUMERIC(5, 2),

  -- Metadata
  field_count INTEGER,
  description_length INTEGER,
  has_salary_range BOOLEAN,
  has_url BOOLEAN,
  source_type TEXT,

  -- Canonical tracking
  is_canonical BOOLEAN DEFAULT FALSE,
  duplicate_count INTEGER DEFAULT 0,

  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### 1. GET /api/jobs (with deduplication)

List jobs with optional duplicate filtering.

**Query Parameters:**
```typescript
{
  page?: number;           // Default: 1
  limit?: number;          // Default: 20, max: 100
  archived?: boolean;      // Default: false
  saved?: boolean;
  source?: 'linkedin' | 'indeed' | 'manual';
  minMatchScore?: number;  // 0-100
  search?: string;
  workArrangement?: 'Remote' | 'Hybrid' | 'On-site';
  excludeDuplicates?: boolean;  // NEW: Hide duplicate jobs (default: false)
}
```

**Example:**
```bash
# Get only canonical jobs (hide duplicates)
GET /api/jobs?excludeDuplicates=true

# Get all jobs including duplicates
GET /api/jobs?excludeDuplicates=false
```

**Response:**
```typescript
{
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

### 2. POST /api/jobs/deduplicate

Manually trigger deduplication for user's jobs.

**Rate Limit:** 5 requests per hour (resource intensive)

**Example:**
```bash
POST /api/jobs/deduplicate
Authorization: Bearer <token>
```

**Response:**
```typescript
{
  success: boolean;
  totalJobsProcessed: number;
  duplicatesFound: number;
  canonicalJobsIdentified: number;
  processingTimeMs: number;
}
```

### 3. GET /api/jobs/:id/duplicates

Get all duplicates for a specific job.

**Example:**
```bash
GET /api/jobs/abc-123/duplicates
Authorization: Bearer <token>
```

**Response:**
```typescript
{
  job: Job;  // The canonical job
  duplicates: Job[];  // All detected duplicates
  duplicateMetadata: JobDuplicate[];  // Similarity scores
  totalDuplicates: number;
}
```

**JobDuplicate type:**
```typescript
{
  id: string;
  canonicalJobId: string;
  duplicateJobId: string;
  titleSimilarity: number;        // 0-100
  companySimilarity: number;      // 0-100
  locationSimilarity: number;     // 0-100
  descriptionSimilarity: number;  // 0-100
  overallSimilarity: number;      // 0-100
  confidenceLevel: 'high' | 'medium' | 'low';
  detectionMethod: 'fuzzy_match' | 'url_match' | 'manual';
  detectionDate: string;
  manuallyConfirmed: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
}
```

### 4. POST /api/jobs/merge

Manually merge two jobs as duplicates.

Allows users to override automatic detection and mark jobs as duplicates.

**Request Body:**
```typescript
{
  canonicalJobId: string;  // UUID of the job to keep
  duplicateJobId: string;  // UUID of the job to mark as duplicate
}
```

**Example:**
```bash
POST /api/jobs/merge
Authorization: Bearer <token>
Content-Type: application/json

{
  "canonicalJobId": "abc-123",
  "duplicateJobId": "def-456"
}
```

**Response:**
```typescript
{
  success: boolean;
  canonicalJobId: string;
  duplicateJobId: string;
  message: string;
}
```

### 5. DELETE /api/jobs/:id/duplicates/:duplicateId

Remove duplicate relationship between two jobs.

Used when user disagrees with automatic duplicate detection.

**Example:**
```bash
DELETE /api/jobs/abc-123/duplicates/def-456
Authorization: Bearer <token>
```

**Response:** 204 No Content

## Automatic Deduplication Flow

Deduplication runs automatically after job scraping:

```typescript
// 1. User scrapes jobs
POST /api/jobs/scrape
{
  "keywords": ["software engineer"],
  "location": "San Francisco",
  "sources": ["linkedin", "indeed"]
}

// 2. Jobs are saved to database
// (Returns immediately to user)

// 3. Background deduplication runs
// - Detects duplicates using fuzzy matching
// - Calculates quality scores
// - Selects canonical jobs
// - Saves duplicate relationships

// 4. User queries jobs with deduplication
GET /api/jobs?excludeDuplicates=true
// Returns only canonical jobs (duplicates hidden)
```

## Similarity Algorithms

### Levenshtein Distance

Calculates minimum number of single-character edits (insertions, deletions, substitutions) needed to change one string into another.

**Best for:** Company names, exact matches

**Example:**
```typescript
levenshteinSimilarity("Google", "Gogle")  // 83.33%
levenshteinSimilarity("Google", "Apple")  // 33.33%
```

**Time Complexity:** O(m × n) where m, n are string lengths

### Jaccard Similarity

Measures overlap between two sets of tokens (words).

**Best for:** Job titles, descriptions where word order matters less

**Example:**
```typescript
jaccardSimilarity(
  "Senior Software Engineer",
  "Software Engineer Senior"
)  // 100% (same tokens, different order)

jaccardSimilarity(
  "Senior Software Engineer",
  "Junior Software Developer"
)  // 33.33% (1 of 3 tokens match)
```

**Formula:** |A ∩ B| / |A ∪ B|

### Cosine Similarity

Measures semantic similarity using character bigram vectors.

**Best for:** Semantic matching regardless of word order

**Example:**
```typescript
cosineSimilarity(
  "Senior Software Engineer in San Francisco",
  "San Francisco Senior Software Engineer"
)  // ~95% (high semantic similarity)
```

**Formula:** cos(θ) = (A · B) / (||A|| × ||B||)

### Hybrid Approach

Combines all three algorithms and uses the maximum score:

```typescript
function hybridSimilarity(str1: string, str2: string): number {
  const lev = levenshteinSimilarity(str1, str2);
  const jaccard = jaccardSimilarity(str1, str2);
  const cosine = cosineSimilarity(str1, str2);

  return Math.max(lev, jaccard, cosine);
}
```

This catches both exact matches and semantic similarity.

## Quality Scoring Algorithm

### Completeness Score (0-100)

Counts number of non-null important fields:

```typescript
const fields = [
  'title',
  'company',
  'location',
  'description (>100 chars)',
  'url',
  'salary_min',
  'salary_max',
  'job_type',
  'experience_level',
  'work_arrangement (not Unknown)'
];

completenessScore = (filledFields / 10) * 100;
```

### Source Reliability Score (0-100)

Based on data source quality:

```typescript
const scores = {
  manual: 100,    // User-entered = highest quality
  linkedin: 90,   // LinkedIn Jobs API
  indeed: 85      // Indeed Scraper API
};
```

### Freshness Score (0-100)

Based on posting date:

```typescript
const daysOld = (now - job.createdAt) / 86400;

if (daysOld <= 7)   return 100;  // Very fresh
if (daysOld <= 30)  return 75;   // Recent
if (daysOld <= 90)  return 50;   // Older
return 25;                       // Stale
```

### Overall Quality Score

Weighted average:

```typescript
overallQualityScore =
  (completenessScore * 0.5) +
  (sourceReliabilityScore * 0.3) +
  (freshnessScore * 0.2);
```

## Performance Optimization

### Blocking Strategy

Instead of comparing every job with every other job (O(n²)), we group jobs by company name:

```typescript
// Group jobs by company
const blocks = new Map<string, Job[]>();
for (const job of jobs) {
  const key = normalizeCompany(job.company);
  blocks.get(key).push(job);
}

// Compare only within blocks
for (const [company, blockJobs] of blocks) {
  for (let i = 0; i < blockJobs.length; i++) {
    for (let j = i + 1; j < blockJobs.length; j++) {
      // Compare blockJobs[i] with blockJobs[j]
    }
  }
}
```

**Complexity:** O(n log n) average case (assumes balanced blocks)

### Database Indexes

Efficient lookups via composite indexes:

```sql
-- Find all duplicates for a canonical job
CREATE INDEX idx_job_duplicates_canonical_similarity
  ON job_duplicates(canonical_job_id, overall_similarity DESC);

-- Find canonical jobs only
CREATE INDEX idx_canonical_metadata_is_canonical
  ON canonical_job_metadata(is_canonical)
  WHERE is_canonical = TRUE;

-- Full-text search for fuzzy matching
CREATE INDEX idx_jobs_title_tsv ON jobs USING GIN(title_tsv);
CREATE INDEX idx_jobs_company_tsv ON jobs USING GIN(company_tsv);
```

### Batch Processing

Processes jobs in batches of 100 to avoid memory issues:

```typescript
const BATCH_SIZE = 100;
for (let i = 0; i < duplicatePairs.length; i += BATCH_SIZE) {
  const batch = duplicatePairs.slice(i, i + BATCH_SIZE);
  await supabaseAdmin.from('job_duplicates').upsert(batch);
}
```

### Background Processing

Deduplication runs asynchronously after scraping:

```typescript
// Don't block API response
setImmediate(() => {
  deduplicateJobsForUser(userId).catch(error => {
    console.error('Background deduplication failed:', error);
  });
});
```

## Testing Deduplication

### Manual Testing

```bash
# 1. Scrape jobs from multiple sources
POST /api/jobs/scrape
{
  "keywords": ["software engineer"],
  "sources": ["linkedin", "indeed"]
}

# 2. Trigger manual deduplication
POST /api/jobs/deduplicate

# 3. Check for duplicates
GET /api/jobs?excludeDuplicates=false  # All jobs
GET /api/jobs?excludeDuplicates=true   # Canonical only

# 4. View duplicates for a specific job
GET /api/jobs/<job-id>/duplicates

# 5. Manually merge two jobs
POST /api/jobs/merge
{
  "canonicalJobId": "<keep-this-one>",
  "duplicateJobId": "<mark-as-duplicate>"
}

# 6. Remove duplicate relationship
DELETE /api/jobs/<canonical-id>/duplicates/<duplicate-id>
```

### Test Cases

**Test Case 1: Exact URL Match**
```typescript
// Same job URL = 100% duplicate
Job A: { url: "https://linkedin.com/jobs/123" }
Job B: { url: "https://linkedin.com/jobs/123" }
// Expected: overallSimilarity = 100%, confidence = 'high'
```

**Test Case 2: High Similarity**
```typescript
// Same company, similar title/location
Job A: { title: "Senior Software Engineer", company: "Google", location: "San Francisco, CA" }
Job B: { title: "Sr Software Engineer", company: "Google Inc", location: "San Francisco" }
// Expected: overallSimilarity > 85%, confidence = 'high'
```

**Test Case 3: Medium Similarity**
```typescript
// Similar but not identical
Job A: { title: "Software Engineer", company: "Apple", location: "Cupertino" }
Job B: { title: "Software Developer", company: "Apple Inc", location: "Cupertino, CA" }
// Expected: overallSimilarity 70-85%, confidence = 'medium'
```

**Test Case 4: Low Similarity**
```typescript
// Different roles, same company
Job A: { title: "Frontend Engineer", company: "Microsoft" }
Job B: { title: "Backend Engineer", company: "Microsoft" }
// Expected: overallSimilarity < 70%, confidence = 'low' or not detected
```

## Best Practices

### For End Users

1. **Use `excludeDuplicates=true`** in production to hide duplicates by default
2. **Review medium/low confidence duplicates** manually before confirming
3. **Manually merge** if automatic detection misses obvious duplicates
4. **Remove relationships** if automatic detection creates false positives
5. **Run deduplication** after bulk importing jobs

### For Developers

1. **Run migration** before deploying deduplication code:
   ```bash
   # Apply migration 018
   npx supabase db push
   ```

2. **Monitor performance** of deduplication:
   ```typescript
   // Check processing time
   const result = await deduplicateJobsForUser(userId);
   console.log(`Processed ${result.totalJobsProcessed} jobs in ${result.processingTimeMs}ms`);
   ```

3. **Adjust thresholds** if needed:
   ```typescript
   // In jobDeduplication.service.ts
   const THRESHOLDS = {
     high: 85,    // Increase for stricter matching
     medium: 70,  // Decrease for looser matching
     low: 50,
   };
   ```

4. **Tune weights** for similarity scoring:
   ```typescript
   // In jobDeduplication.service.ts
   const WEIGHTS = {
     title: 0.35,       // Increase if title is more important
     company: 0.25,     // Increase for same-company duplicates
     location: 0.15,    // Decrease for remote jobs
     description: 0.25,
   };
   ```

## Troubleshooting

### Issue: Too many false positives (non-duplicates marked as duplicates)

**Solution:** Increase similarity thresholds
```typescript
const THRESHOLDS = {
  high: 90,   // Was 85
  medium: 80, // Was 70
  low: 60,    // Was 50
};
```

### Issue: Missing obvious duplicates

**Solution:** Decrease similarity thresholds or adjust weights
```typescript
const THRESHOLDS = {
  high: 80,   // Was 85
  medium: 65, // Was 70
  low: 45,    // Was 50
};

// Or increase company weight for same-company duplicates
const WEIGHTS = {
  title: 0.30,
  company: 0.35,  // Was 0.25
  location: 0.10,
  description: 0.25,
};
```

### Issue: Deduplication is slow

**Solution:** Check blocking strategy and batch size
```typescript
// Increase batch size
const BATCH_SIZE = 200; // Was 100

// Optimize blocking by normalizing company names better
function normalizeCompany(company: string): string {
  return company
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/\b(inc|llc|corp|ltd|co)\b/g, '');
}
```

### Issue: Wrong job selected as canonical

**Solution:** Check quality score calculation
```sql
-- View quality scores
SELECT
  j.id,
  j.title,
  j.company,
  cm.overall_quality_score,
  cm.completeness_score,
  cm.source_reliability_score,
  cm.freshness_score
FROM jobs j
JOIN canonical_job_metadata cm ON j.id = cm.job_id
WHERE j.user_id = '<user-id>'
ORDER BY cm.overall_quality_score DESC;
```

## Migration Path

### Step 1: Apply Database Migration

```bash
cd backend
npx supabase db push
```

This creates:
- `job_duplicates` table
- `canonical_job_metadata` table
- Helper functions
- Indexes

### Step 2: Deploy Backend Code

```bash
# Deploy deduplication service
git add backend/src/services/jobDeduplication.service.ts
git add backend/src/routes/jobs.ts
git add backend/src/types/index.ts

git commit -m "feat: implement job deduplication system"
git push origin develop
```

### Step 3: Backfill Existing Jobs

Run deduplication for existing users:

```bash
# Via API endpoint
POST /api/jobs/deduplicate
Authorization: Bearer <admin-token>

# Or via SQL function
SELECT deduplicateJobsForUser('<user-id>');
```

### Step 4: Enable in Frontend

Update frontend to use `excludeDuplicates` parameter:

```typescript
// Default to hiding duplicates in production
const { data } = await fetch('/api/jobs?excludeDuplicates=true');

// Show duplicates in settings/debug view
const { data } = await fetch('/api/jobs?excludeDuplicates=false');
```

## Future Enhancements

1. **Machine Learning**: Train ML model on user feedback (manual merges/removals)
2. **Cross-User Deduplication**: Identify popular jobs across all users
3. **Real-Time Deduplication**: Run during scraping instead of background
4. **Semantic Search**: Use embeddings (OpenAI) for better semantic matching
5. **Job Clustering**: Group similar jobs even if not exact duplicates
6. **Merge Suggestions**: Proactively suggest merges to users
7. **Duplicate Badges**: Show "X duplicates" badge on canonical jobs
8. **Quality Indicators**: Show quality score to help users choose canonical job

## References

- [Levenshtein Distance](https://en.wikipedia.org/wiki/Levenshtein_distance)
- [Jaccard Similarity](https://en.wikipedia.org/wiki/Jaccard_index)
- [Cosine Similarity](https://en.wikipedia.org/wiki/Cosine_similarity)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Blocking for Record Linkage](https://en.wikipedia.org/wiki/Record_linkage#Blocking)
