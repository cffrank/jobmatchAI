# User-Specific Job Matching Implementation

## Overview

This document describes the implementation of user-specific job matching in the JobMatch AI application. The system ensures that each user sees personalized job recommendations based on their unique profile, skills, experience, and preferences.

## Architecture

### Data Model

```
jobs (Global Collection)
├── job1: { title, company, location, requiredSkills, ... }
├── job2: { title, company, location, requiredSkills, ... }
└── ...

users/{userId}
├── profile: { firstName, lastName, location, headline, ... }
├── skills/{skillId}: { name, endorsements }
├── workExperience/{expId}: { company, position, ... }
└── savedJobs/{jobId}: { jobId, savedAt }
```

**Key Points:**
- Jobs are stored in a **global collection** accessible to all authenticated users
- User profiles, skills, and experience are stored **per-user** in subcollections
- Saved jobs are tracked **per-user** in a subcollection
- Job matching and scoring happens **client-side** based on user profile data

### Components

1. **Job Matching Service** (`src/lib/jobMatching.ts`)
   - Pure functions with no side effects
   - Calculates match scores based on four dimensions
   - Easily testable and maintainable

2. **useJobs Hook** (`src/hooks/useJobs.ts`)
   - Fetches jobs from Firestore
   - Fetches user profile data (profile, skills, experience)
   - Ranks jobs using the matching algorithm
   - Marks saved jobs per user
   - Provides save/unsave functionality

3. **JobListPage** (`src/sections/job-discovery-matching/JobListPage.tsx`)
   - Uses `useJobs` hook instead of mock data
   - Handles loading and error states
   - Filters jobs based on user preferences

4. **JobDetailPage** (`src/sections/job-discovery-matching/JobDetailPage.tsx`)
   - Uses `useJob` hook for single job with matching
   - Calculates match score for the specific job
   - Displays user-specific compatibility breakdown

## Matching Algorithm

The job matching algorithm evaluates four key dimensions:

### 1. Skill Match (40% weight)

Compares user skills against job requirements:
- **Exact matches**: User skill name matches required skill
- **Partial matches**: "React" matches "React.js"
- **Score**: Percentage of required skills the user possesses
- **Missing skills**: Tracked for user recommendations

```typescript
// Example: Job requires [React, TypeScript, Node.js]
// User has [React, JavaScript, CSS]
// Match: 33% (1 out of 3 skills)
```

### 2. Experience Match (30% weight)

Evaluates years of experience vs job requirements:
- Calculates total years from work experience entries
- Estimates required years from job title/description
- **Perfect match**: 0.8x to 1.5x required experience
- **Under-qualified**: < 0.8x (score gradually decreases)
- **Over-qualified**: > 1.5x (slight penalty to avoid mismatches)

```typescript
// Example: Job requires 5 years (Senior role)
// User has 4 years: Score = 80%
// User has 6 years: Score = 100%
// User has 10 years: Score = 85%
```

### 3. Industry Match (20% weight)

Checks for domain/industry experience alignment:
- Extracts industry keywords from job (fintech, healthcare, etc.)
- Searches user's work experience for matching keywords
- **100 points**: Has industry experience
- **60 points**: Different industry (neutral, transferable skills assumed)

### 4. Location Match (10% weight)

Evaluates geographic compatibility:
- **Remote jobs**: 100 points (always match)
- **Exact location match**: 100 points
- **Partial match** (same city or state): 85 points
- **Hybrid jobs, different location**: 60 points
- **On-site jobs, different location**: 30 points

### Final Score Calculation

```typescript
matchScore =
  skillMatch * 0.4 +
  experienceMatch * 0.3 +
  industryMatch * 0.2 +
  locationMatch * 0.1
```

Results in a score from 0-100, where:
- **85-100**: Excellent Match
- **70-84**: Good Match
- **60-69**: Potential Match
- **< 60**: Poor Match

## User-Specific Features

### 1. Personalized Rankings

Each user sees jobs ranked differently based on their profile:

**User A** (React Developer, 5 years, San Francisco)
```
1. Senior Frontend Developer - 92% match
2. Full Stack Developer - 78% match
3. Staff Software Engineer - 71% match
```

**User B** (Python Engineer, 3 years, Remote)
```
1. Python Data Engineer - 89% match
2. Backend Engineer - 82% match
3. DevOps Engineer - 65% match
```

### 2. Missing Skills Detection

For each job, the system identifies skills the user doesn't have:
```typescript
{
  requiredSkills: ['React', 'TypeScript', 'Node.js', 'AWS'],
  missingSkills: ['Node.js', 'AWS'],  // User doesn't have these
}
```

### 3. Personalized Recommendations

Based on the match breakdown, users receive specific advice:
- "Consider highlighting transferable skills for: Node.js, AWS, Docker"
- "Emphasize relevant achievements and impact in your experience"
- "Highlight transferable skills from related industries"
- "Consider mentioning relocation willingness or remote work preference"

### 4. User-Specific Saved Jobs

Saved jobs are tracked per-user in Firestore:
```
users/{userId}/savedJobs/{jobId}
{
  jobId: 'job123',
  savedAt: '2025-01-15T10:30:00Z'
}
```

Different users can save different jobs, and the UI reflects each user's saved state.

## Implementation Details

### Real-time Updates

The system uses Firebase's real-time listeners:
- **Jobs collection**: Updates when new jobs are added/removed
- **User profile**: Updates when profile is edited
- **Skills**: Updates when skills are added/removed
- **Work experience**: Updates when experience is modified
- **Saved jobs**: Updates when jobs are saved/unsaved

All changes trigger automatic re-ranking of jobs for that user.

### Performance Optimization

1. **Memoization**: Match calculations are memoized to avoid unnecessary recomputation
2. **Client-side ranking**: Jobs are ranked in the browser, reducing server load
3. **Efficient queries**: Only fetches necessary data using Firestore queries
4. **Debounced recalculation**: Ranking only updates when dependencies change

### Security

Firestore security rules ensure:
- All authenticated users can read the global jobs collection
- Users can only read/write their own profile data
- Users can only read/write their own saved jobs
- Job writes are restricted to Cloud Functions (in production)

```javascript
// firestore.rules
match /jobs/{jobId} {
  allow read: if isAuthenticated();
  allow write: if false; // Only Cloud Functions in production
}

match /users/{userId}/savedJobs/{jobId} {
  allow read, write: if isAuthenticated() && isOwner(userId);
}
```

## Testing

### Manual Testing Steps

1. **Create Test User A**
   - Profile: Frontend Developer in San Francisco
   - Skills: React, TypeScript, JavaScript, CSS, HTML
   - Experience: 5 years in web development

2. **Create Test User B**
   - Profile: Backend Developer, Remote
   - Skills: Python, Node.js, SQL, Docker, AWS
   - Experience: 3 years in backend systems

3. **Seed Sample Jobs**
   ```bash
   bun run scripts/seed-jobs.ts
   ```

4. **Verify Different Rankings**
   - Log in as User A → Should see React/Frontend jobs ranked highest
   - Log in as User B → Should see Python/Backend jobs ranked highest
   - Verify match scores are different for the same jobs

5. **Test Saved Jobs**
   - Save jobs as User A
   - Log in as User B → Verify User A's saved jobs are not marked as saved
   - Save different jobs as User B
   - Verify each user's saved jobs are independent

### Automated Testing

```typescript
// Example test for job matching
describe('Job Matching Algorithm', () => {
  it('should rank React jobs higher for React developers', () => {
    const user = {
      user: { location: 'San Francisco, CA', ... },
      skills: [{ name: 'React' }, { name: 'TypeScript' }],
      workExperience: [/* 5 years */]
    }

    const jobs = [
      { title: 'React Developer', requiredSkills: ['React', 'TypeScript'] },
      { title: 'Python Developer', requiredSkills: ['Python', 'Django'] }
    ]

    const ranked = rankJobs(jobs, user)

    expect(ranked[0].title).toBe('React Developer')
    expect(ranked[0].matchScore).toBeGreaterThan(ranked[1].matchScore)
  })
})
```

## Migration from Mock Data

The following changes were made to remove mock data:

### Before (Mock Data)
```typescript
// JobListPage.tsx
import data from './data.json'
const [jobs, setJobs] = useState<Job[]>(data.jobs)

// Jobs were static and same for all users
```

### After (Real Firestore Data)
```typescript
// JobListPage.tsx
import { useJobs } from '../../hooks/useJobs'
const { jobs, loading, error, saveJob, unsaveJob } = useJobs()

// Jobs are fetched from Firestore and ranked per-user
```

### Removed Files
- No files removed (data.json kept for reference/exports)

### Updated Files
1. `src/hooks/useJobs.ts` - Added user profile fetching and ranking
2. `src/sections/job-discovery-matching/JobListPage.tsx` - Uses hooks instead of mock data
3. `src/sections/job-discovery-matching/JobDetailPage.tsx` - Uses hooks instead of mock data
4. `src/sections/job-discovery-matching/types.ts` - Added `loading` prop

### New Files
1. `src/lib/jobMatching.ts` - Job matching algorithm
2. `scripts/seed-jobs.ts` - Test data seeding script
3. `docs/USER_SPECIFIC_JOB_MATCHING.md` - This documentation

## Future Enhancements

1. **Machine Learning**: Train ML models on user interactions to improve matching
2. **Collaborative Filtering**: "Users with similar profiles also viewed..."
3. **Job Preferences**: Allow users to set explicit preferences (salary, remote, etc.)
4. **Match Explanation**: Show why a job scored a certain percentage
5. **Application Success Tracking**: Factor in user's historical success rates
6. **Skills Gap Analysis**: Recommend learning paths for missing skills
7. **Company Preferences**: Factor in company size, culture, benefits preferences
8. **Advanced Filters**: More granular filtering options (company size, funding stage, etc.)

## Troubleshooting

### Jobs not appearing
- Check Firestore security rules allow authenticated read access
- Verify jobs collection exists in Firestore
- Run seed script: `bun run scripts/seed-jobs.ts`

### Match scores are zero
- Verify user has profile data (skills, experience)
- Check browser console for errors
- Ensure profile data is properly saved in Firestore

### Saved jobs not persisting
- Verify Firestore security rules allow write to savedJobs subcollection
- Check user is authenticated
- Look for errors in browser console

### Different users seeing same rankings
- Verify user profile data is different between users
- Check that useJobs hook is fetching correct user ID
- Ensure matching algorithm is using user-specific data

## Conclusion

The user-specific job matching system provides personalized job recommendations by:
- Storing jobs globally in Firestore
- Calculating match scores client-side based on user profile
- Tracking saved jobs per-user
- Providing real-time updates as profile data changes

This architecture ensures scalability, security, and a personalized experience for each user.
