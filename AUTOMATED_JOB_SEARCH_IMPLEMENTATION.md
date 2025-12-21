# Automated Job Search System - Implementation Documentation

## Overview

The automated job search system for JobMatch AI provides intelligent, scheduled job discovery based on user profiles and preferences. The system combines algorithmic matching with AI-powered semantic analysis to deliver highly relevant job opportunities.

## Architecture

### System Components

1. **Matching Engine** (`functions/lib/matchingEngine.js`)
   - Hybrid scoring: 60% algorithmic + 40% AI
   - Algorithmic scoring based on skills, experience, location, and salary
   - AI scoring using GPT-4o-mini for semantic similarity and cultural fit
   - Batch processing optimized for cost and performance

2. **Search Query Builder** (`functions/lib/buildSearchQuery.js`)
   - Converts user preferences to LinkedIn and Indeed search queries
   - Optimizes queries based on search type (initial, daily, weekly)
   - Handles location formatting and keyword optimization
   - Deduplication to avoid redundant searches

3. **Notification Service** (`functions/lib/notificationService.js`)
   - Email notifications for high-match jobs (score >= 80%)
   - Daily digest emails with top matches
   - Rate limiting: max 1 email per day per notification type
   - In-app notifications

4. **Scheduled Job Search** (`functions/scheduled/searchJobsForAllUsers.js`)
   - Runs daily at 2:00 AM UTC
   - Processes all active users with auto-search enabled
   - Batched processing (10 users at a time)
   - Comprehensive error handling and logging

5. **User Creation Trigger** (`functions/triggers/onUserCreate.js`)
   - Performs initial job search when user signs up
   - Validates profile completeness
   - Fetches up to 30 jobs for initial search
   - Sends welcome notification

6. **Job Preferences UI** (`src/sections/account-billing/components/JobPreferencesTab.tsx`)
   - User-friendly interface for setting job preferences
   - Auto-search configuration
   - Notification preferences
   - Real-time validation

## Data Model

### User Collections

#### users/{userId}
```typescript
{
  // ... existing fields
  jobPreferences: {
    desiredRoles: string[]
    locations: string[]
    salaryMin?: number
    salaryMax?: number
    remotePreference: 'remote' | 'hybrid' | 'on-site' | 'any'
    employmentTypes: ('full-time' | 'part-time' | 'contract' | 'internship')[]
    experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive'
    industries?: string[]
    companySize?: ('startup' | 'small' | 'medium' | 'large' | 'enterprise')[]
    updatedAt?: string
  }
  searchSettings: {
    searchFrequency: 'daily' | 'weekly' | 'manual'
    autoSearchEnabled: boolean
    autoApplyEnabled: boolean
    autoApplyFilters?: {
      minMatchScore: number
      maxApplicationsPerDay: number
    }
    notificationPreferences: {
      email: boolean
      inApp: boolean
      matchScoreThreshold: number
    }
    lastSearchAt?: string
  }
}
```

#### users/{userId}/jobs/{jobId}
```typescript
{
  // Job details
  title: string
  company: string
  location: string
  workArrangement: 'Remote' | 'Hybrid' | 'On-site' | 'Unknown'
  salaryMin: number
  salaryMax: number
  postedDate: string
  description: string
  url: string
  source: 'linkedin' | 'indeed'

  // Match data
  matchScore: number  // 0-100
  algorithmicScore: number
  aiScore: number | null
  breakdown: {
    skills: { score: number, matched: string[], missing: string[] }
    experience: { score: number, explanation: string }
    location: { score: number, explanation: string }
    salary: { score: number, explanation: string }
  }
  aiInsights: {
    explanation: string
    strengths: string[]
    concerns: string[]
  } | null

  // Metadata
  requiredSkills: string[]
  missingSkills: string[]
  recommendations: string[]
  searchId: string
  addedAt: Timestamp
  isSaved: boolean
}
```

#### users/{userId}/jobSearches/{searchId}
```typescript
{
  type: 'automated' | 'initial' | 'manual'
  createdAt: Timestamp
  jobCount: number
  source: string
  fingerprint?: string  // For deduplication
}
```

#### users/{userId}/notifications/{notificationId}
```typescript
{
  type: 'high_match_job' | 'initial_search_complete'
  title: string
  message: string
  jobId?: string
  matchScore?: number
  read: boolean
  createdAt: Timestamp
}
```

#### users/{userId}/emails/{emailId}
```typescript
{
  type: 'high_match' | 'daily_digest' | 'general'
  jobIds: string[]
  sentAt: Timestamp
}
```

### Global Collections

#### notificationQueue/{notificationId}
```typescript
{
  userId: string
  jobId: string
  matchData: object
  type: 'high_match'
  status: 'pending' | 'completed' | 'failed'
  createdAt: Timestamp
  processedAt: Timestamp | null
  result?: object
  error?: string
}
```

## Matching Algorithm

### Algorithmic Scoring (60% weight)

1. **Skills Match (40% of algorithmic score)**
   - Exact and partial skill matching
   - Compares required skills against user skills
   - Returns matched and missing skills

2. **Experience Match (25% of algorithmic score)**
   - Calculates total years of experience
   - Maps to experience levels (entry, mid, senior, executive)
   - Penalizes under-qualification more than over-qualification

3. **Location Match (20% of algorithmic score)**
   - Perfect match for same location
   - Special handling for remote preferences
   - Considers relocation requirements

4. **Salary Match (15% of algorithmic score)**
   - Compares job salary range with user expectations
   - Neutral score if salary not disclosed
   - Higher score for overlap with preferred range

### AI Scoring (40% weight)

Uses GPT-4o-mini to analyze:
- Career trajectory alignment
- Industry experience and domain knowledge
- Cultural and role fit
- Career goals alignment
- Unique value candidate brings

Only activated for jobs with algorithmic score >= 70% to optimize costs.

### Final Score Calculation

```
finalScore = (algorithmicScore * 0.6) + (aiScore * 0.4)
```

## Scheduled Search Flow

### Daily Search (2:00 AM UTC)

1. **Fetch Active Users**
   ```javascript
   users.where('searchSettings.autoSearchEnabled', '==', true)
        .where('searchSettings.searchFrequency', '==', 'daily')
   ```

2. **For Each User (Batched)**
   - Build LinkedIn and Indeed search queries
   - Scrape jobs from both sources (parallel)
   - Calculate match scores (batch processing)
   - Save jobs to Firestore
   - Send notifications

3. **Notification Logic**
   - Immediate notification for matches >= 80%
   - Daily digest with top 10 matches >= 60%
   - Rate limiting: max 1 email per type per day

4. **Error Handling**
   - Continue processing other users if one fails
   - Log all errors for debugging
   - Retry failed API calls with exponential backoff

## Initial Search Flow

### Triggered on User Signup

1. **Profile Validation**
   - Check required fields (name, email)
   - Verify job preferences exist
   - Ensure at least one desired role or location

2. **Initial Search**
   - Fetch up to 30 jobs per source (LinkedIn + Indeed)
   - Use 'initial' optimization (wider date range)
   - Calculate matches with full AI analysis

3. **User Notification**
   - Welcome notification with job count
   - Email for top match if score >= 80%

## Configuration

### Environment Variables Required

```bash
# Firebase Functions
OPENAI_API_KEY=sk-...
APIFY_API_TOKEN=apify_api_...
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=notifications@jobmatch-ai.com
APP_URL=https://jobmatch-ai.web.app
```

### Cloud Scheduler Configuration

The scheduled function uses Firebase Cloud Scheduler (configured in the function definition):

```javascript
schedule: '0 2 * * *'  // 2 AM daily (cron format)
timeZone: 'UTC'
timeoutSeconds: 540    // 9 minutes
memory: '1GiB'
```

### Rate Limits & Quotas

- **Apify**: Depends on account tier
- **OpenAI**: ~100 AI analyses per user batch (concurrency: 5)
- **SendGrid**: Max 1 email per user per day per type
- **Firebase**: Firestore batch writes (500 operations per batch)

## Firestore Security Rules

```javascript
// Jobs collection
match /users/{userId}/jobs/{jobId} {
  allow read: if isAuthenticated() && isOwner(userId);
  allow update: if isAuthenticated() && isOwner(userId);
  allow create, delete: if false;  // Only Cloud Functions
}

// Job searches
match /users/{userId}/jobSearches/{searchId} {
  allow read: if isAuthenticated() && isOwner(userId);
  allow write: if false;  // Only Cloud Functions
}

// Notifications
match /users/{userId}/notifications/{notificationId} {
  allow read: if isAuthenticated() && isOwner(userId);
  allow write: if false;  // Only Cloud Functions
}

// Email history (rate limiting)
match /users/{userId}/emails/{emailId} {
  allow read: if isAuthenticated() && isOwner(userId);
  allow write: if false;  // Only Cloud Functions
}

// Notification queue (global)
match /notificationQueue/{notificationId} {
  allow read, write: if false;  // Only Cloud Functions
}
```

## Firestore Indexes

All required indexes are defined in `firestore.indexes.json`:

1. **jobs by matchScore and addedAt** - For showing newest high-match jobs
2. **jobs by isSaved and matchScore** - For filtering saved jobs
3. **jobs by workArrangement and matchScore** - For filtering by work type
4. **jobSearches by createdAt and type** - For search history
5. **jobSearches by fingerprint and createdAt** - For deduplication
6. **notificationQueue by status and createdAt** - For queue processing
7. **emails by type and sentAt** - For rate limiting

## Deployment

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Set Environment Variables

```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set APIFY_API_TOKEN
firebase functions:secrets:set SENDGRID_API_KEY
firebase functions:config:set app.url="https://jobmatch-ai.web.app"
firebase functions:config:set sendgrid.from_email="notifications@jobmatch-ai.com"
```

### 3. Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific functions
firebase deploy --only functions:searchJobsForAllUsers
firebase deploy --only functions:onUserCreate
```

### 4. Deploy Firestore Rules and Indexes

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 5. Verify Scheduled Function

```bash
# Check scheduled functions
firebase functions:list

# View logs
firebase functions:log --only searchJobsForAllUsers
```

## Testing

### Testing Checklist

#### Unit Testing
- [ ] Matching engine algorithmic scoring
- [ ] Matching engine AI scoring
- [ ] Search query builder for LinkedIn
- [ ] Search query builder for Indeed
- [ ] Notification service rate limiting
- [ ] Email template generation

#### Integration Testing
- [ ] Create test user with job preferences
- [ ] Trigger initial search manually
- [ ] Verify jobs saved to Firestore
- [ ] Check match scores are calculated
- [ ] Verify notifications are sent
- [ ] Test daily digest generation

#### End-to-End Testing
- [ ] Full user signup flow
- [ ] Wait for scheduled search to run
- [ ] Verify new jobs are discovered
- [ ] Check email notifications received
- [ ] Test UI job preferences update
- [ ] Verify search settings changes take effect

### Manual Testing

#### Test Initial Search

```javascript
// In Firebase Console or Functions Emulator
const testUserId = 'test-user-id';

// Create test user with preferences
await admin.firestore().collection('users').doc(testUserId).set({
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  location: 'San Francisco, CA',
  jobPreferences: {
    desiredRoles: ['Software Engineer', 'Backend Developer'],
    locations: ['San Francisco, CA', 'Remote'],
    remotePreference: 'remote',
    employmentTypes: ['full-time'],
    salaryMin: 100000,
    salaryMax: 180000
  },
  searchSettings: {
    searchFrequency: 'daily',
    autoSearchEnabled: true,
    notificationPreferences: {
      email: true,
      inApp: true,
      matchScoreThreshold: 70
    }
  }
});

// Trigger should run automatically
// Or call manually: onUserCreate({ params: { userId: testUserId } })
```

#### Test Scheduled Search

```bash
# Run locally with emulators
firebase emulators:start --only functions

# Invoke scheduled function manually
curl -X POST http://localhost:5001/PROJECT_ID/us-central1/searchJobsForAllUsers
```

### Monitoring

#### Key Metrics to Monitor

1. **Search Success Rate**
   - Percentage of successful searches vs. failures
   - Track in Cloud Functions logs

2. **Match Score Distribution**
   - Average match scores per user
   - Number of high-match jobs (>= 80%)

3. **API Costs**
   - Apify API usage
   - OpenAI API calls and tokens
   - SendGrid email sends

4. **User Engagement**
   - Email open rates
   - Jobs saved/applied to
   - Notification click-through rates

5. **Performance**
   - Function execution time
   - Firestore read/write operations
   - Queue processing delays

## Troubleshooting

### Common Issues

#### 1. Scheduled Function Not Running

**Symptoms**: No jobs being added daily

**Diagnosis**:
```bash
# Check if scheduled function is deployed
firebase functions:list | grep searchJobsForAllUsers

# View recent logs
firebase functions:log --only searchJobsForAllUsers --limit 50
```

**Solutions**:
- Verify Cloud Scheduler job exists in GCP Console
- Check function secrets are set correctly
- Ensure billing is enabled for Firebase project

#### 2. No Jobs Found for User

**Symptoms**: Initial search completes but jobCount = 0

**Diagnosis**:
- Check user's job preferences are valid
- Verify Apify API token has sufficient credits
- Review Apify actor response in logs

**Solutions**:
- Broaden search criteria (more roles, locations)
- Check Apify account status
- Try different search keywords

#### 3. Match Scores Always Low

**Symptoms**: All jobs have scores < 50%

**Diagnosis**:
- Review user profile completeness
- Check skills collection is populated
- Verify job preferences match user profile

**Solutions**:
- Ensure user has added skills and work experience
- Update job preferences to be more realistic
- Check matching algorithm weights

#### 4. Emails Not Sending

**Symptoms**: No email notifications received

**Diagnosis**:
```bash
# Check email logs
firebase firestore:get users/USER_ID/emails
```

**Solutions**:
- Verify SendGrid API key is valid
- Check rate limiting (max 1 per day)
- Review notification preferences
- Check spam folder

#### 5. AI Scoring Errors

**Symptoms**: Jobs have aiScore = null, errors in logs

**Diagnosis**:
- Check OpenAI API key is valid
- Review OpenAI API quota
- Check error messages in logs

**Solutions**:
- Verify OpenAI API key has credits
- Reduce AI threshold to limit calls
- Use algorithmic-only scoring as fallback

## Performance Optimization

### Cost Optimization

1. **AI Scoring Threshold**
   - Only use AI for jobs with algorithmic score >= 70%
   - Reduces OpenAI API costs by ~40%

2. **Batch Processing**
   - Process 5 AI requests concurrently
   - Process users in batches of 10

3. **Query Optimization**
   - Use date filters to reduce scraping
   - Cache job listings to deduplicate across users

4. **Rate Limiting**
   - Max 1 email per user per day
   - Prevents excessive SendGrid costs

### Performance Improvements

1. **Parallel Processing**
   - Scrape LinkedIn and Indeed simultaneously
   - Calculate matches in batches

2. **Firestore Batch Writes**
   - Combine multiple writes into batches
   - Reduces transaction costs

3. **Caching**
   - Cache user profile data during batch processing
   - Reuse Apify client instances

4. **Error Recovery**
   - Continue processing other users if one fails
   - Retry failed operations with exponential backoff

## Future Enhancements

### Planned Features

1. **Advanced Filtering**
   - Company culture preferences
   - Benefits and perks matching
   - Interview process preferences

2. **Smart Recommendations**
   - Learn from user interactions (saves, applications)
   - Adjust match algorithm weights per user
   - Suggest related job titles

3. **Auto-Apply**
   - Automatically apply to high-match jobs (>= 90%)
   - Generate custom cover letters
   - Track application status

4. **Job Alerts**
   - Real-time alerts for perfect matches (>= 95%)
   - SMS notifications option
   - Push notifications

5. **Analytics Dashboard**
   - Job search analytics
   - Match score trends
   - Market insights

6. **Multi-Source Integration**
   - Add Glassdoor, AngelList, etc.
   - Aggregate company reviews
   - Salary data from multiple sources

## Support

For issues or questions:
- Check logs: `firebase functions:log`
- Review Firestore data in Firebase Console
- Monitor Cloud Scheduler in GCP Console
- Contact support with error messages and user IDs

## License

Proprietary - JobMatch AI
