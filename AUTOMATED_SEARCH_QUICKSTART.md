# Automated Job Search - Quick Start Guide

This guide will help you deploy and test the automated job search system for JobMatch AI.

## Prerequisites

- Firebase CLI installed and authenticated
- Firebase project with Blaze (pay-as-you-go) plan
- OpenAI API key with credits
- Apify account with API token
- SendGrid account with API key

## Installation Steps

### 1. Install Dependencies

```bash
cd functions
npm install
```

This will install:
- `apify-client` - For scraping jobs from LinkedIn and Indeed
- `openai` - For AI-powered match scoring
- `@sendgrid/mail` - For email notifications

### 2. Configure Environment Variables

Set up Firebase secrets for sensitive API keys:

```bash
# OpenAI API key
firebase functions:secrets:set OPENAI_API_KEY
# When prompted, paste your OpenAI API key (sk-...)

# Apify API token
firebase functions:secrets:set APIFY_API_TOKEN
# When prompted, paste your Apify API token (apify_api_...)

# SendGrid API key
firebase functions:secrets:set SENDGRID_API_KEY
# When prompted, paste your SendGrid API key (SG....)
```

Set up non-sensitive configuration:

```bash
# App URL (for email links)
firebase functions:config:set app.url="https://YOUR-PROJECT.web.app"

# SendGrid from email
firebase functions:config:set sendgrid.from_email="notifications@YOUR-DOMAIN.com"
```

### 3. Deploy Firestore Rules and Indexes

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

**Important**: Wait for indexes to build before running searches. Check index status:
```bash
firebase firestore:indexes
```

### 4. Deploy Cloud Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy individually
firebase deploy --only functions:searchJobsForAllUsers
firebase deploy --only functions:onUserCreate
```

This will deploy:
- `searchJobsForAllUsers` - Scheduled daily at 2 AM UTC
- `onUserCreate` - Triggered when new user signs up

### 5. Verify Deployment

Check that functions are deployed:

```bash
firebase functions:list
```

You should see:
- `searchJobsForAllUsers` (scheduled)
- `onUserCreate` (triggered by Firestore)
- `generateApplication` (existing)
- Other existing functions

## Testing

### Test 1: Create Test User

Create a test user in Firestore to trigger the initial job search:

```javascript
// In Firebase Console > Firestore > users collection
// Add a new document with ID: test-user-001

{
  firstName: "Test",
  lastName: "User",
  email: "test@example.com",
  phone: "+1234567890",
  location: "San Francisco, CA",
  linkedInUrl: "",
  profileImageUrl: null,
  headline: "Software Engineer",
  summary: "Experienced software engineer looking for new opportunities",
  jobPreferences: {
    desiredRoles: ["Software Engineer", "Backend Developer", "Full Stack Developer"],
    locations: ["San Francisco, CA", "Remote", "New York, NY"],
    salaryMin: 120000,
    salaryMax: 200000,
    remotePreference: "remote",
    employmentTypes: ["full-time"],
    experienceLevel: "mid",
    industries: ["Technology", "Software"],
    companySize: ["startup", "small", "medium"]
  },
  searchSettings: {
    searchFrequency: "daily",
    autoSearchEnabled: true,
    autoApplyEnabled: false,
    notificationPreferences: {
      email: true,
      inApp: true,
      matchScoreThreshold: 70
    }
  }
}
```

Also add some skills and work experience for better matching:

```javascript
// users/test-user-001/skills subcollection
{
  name: "JavaScript",
  endorsements: 50
}
{
  name: "TypeScript",
  endorsements: 45
}
{
  name: "React",
  endorsements: 40
}
{
  name: "Node.js",
  endorsements: 38
}

// users/test-user-001/workExperience subcollection
{
  company: "Tech Corp",
  position: "Senior Software Engineer",
  location: "San Francisco, CA",
  startDate: "2020-01-01",
  endDate: null,
  current: true,
  description: "Building scalable web applications",
  accomplishments: []
}
```

### Test 2: Monitor Initial Search

Watch the function logs to see the initial search execute:

```bash
# Watch logs in real-time
firebase functions:log --only onUserCreate --follow

# Or view recent logs
firebase functions:log --only onUserCreate --limit 100
```

Expected output:
```
User created: test-user-001
Starting initial job search for user test-user-001...
Scraping jobs for user test-user-001...
Found 45 jobs for user test-user-001 (LinkedIn: 23, Indeed: 22)
Calculating match scores for 45 jobs...
Saved 45 jobs for user test-user-001 (12 high matches)
Initial job search completed for user test-user-001
```

### Test 3: Verify Jobs in Firestore

Check that jobs were saved:

```bash
# In Firebase Console
# Navigate to: Firestore > users > test-user-001 > jobs
```

You should see:
- Multiple job documents with match scores
- `matchScore`, `algorithmicScore`, and `aiScore` fields
- `breakdown` with skills, experience, location, salary scores
- `recommendations` array

### Test 4: Check Notifications

Verify notifications were created:

```bash
# In Firebase Console
# Navigate to: Firestore > users > test-user-001 > notifications
```

You should see a welcome notification with the job count.

### Test 5: Test Email Notifications

If you used a real email address, check for:
- Welcome email with top job match (if match score >= 80%)
- Check spam folder if not in inbox

### Test 6: Manual Scheduled Function Test

Test the daily scheduled search manually:

```bash
# Using Firebase CLI
firebase functions:shell

# In the shell, run:
searchJobsForAllUsers()
```

Or use curl with Firebase emulators:

```bash
# Start emulators
firebase emulators:start --only functions

# In another terminal, trigger the function
curl -X POST http://localhost:5001/YOUR-PROJECT/us-central1/searchJobsForAllUsers
```

### Test 7: Verify Daily Schedule

The scheduled function should automatically run daily at 2 AM UTC. Check Cloud Scheduler:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to: Cloud Scheduler
3. Find: `firebase-schedule-searchJobsForAllUsers-us-central1`
4. Verify schedule: `0 2 * * *` (daily at 2 AM)
5. Click "Run Now" to test immediately

## Monitoring

### Check Function Execution

```bash
# View all function logs
firebase functions:log

# View specific function logs
firebase functions:log --only searchJobsForAllUsers
firebase functions:log --only onUserCreate

# Filter by severity
firebase functions:log --severity ERROR
```

### Monitor Costs

Track API usage to manage costs:

1. **OpenAI**
   - Dashboard: https://platform.openai.com/usage
   - Monitor token usage and costs

2. **Apify**
   - Dashboard: https://console.apify.com/billing
   - Monitor actor runs and usage

3. **SendGrid**
   - Dashboard: https://app.sendgrid.com/statistics
   - Monitor email sends

4. **Firebase**
   - Console: Firebase Console > Usage and Billing
   - Monitor Firestore, Functions, and Scheduler costs

### Key Metrics to Track

- Jobs scraped per search
- Average match scores
- High-match job count (>= 80%)
- Email notifications sent
- Function execution time
- API costs per user

## Troubleshooting

### Jobs Not Being Scraped

**Problem**: Initial search completes but jobCount = 0

**Solutions**:
1. Check Apify account has credits
2. Verify API token is correct: `firebase functions:secrets:access APIFY_API_TOKEN`
3. Review logs for Apify errors
4. Try broader search criteria

### AI Scoring Not Working

**Problem**: All jobs have `aiScore: null`

**Solutions**:
1. Check OpenAI API key: `firebase functions:secrets:access OPENAI_API_KEY`
2. Verify OpenAI account has credits
3. Check quota limits in OpenAI dashboard
4. Review error logs for details

### Emails Not Sending

**Problem**: No email notifications received

**Solutions**:
1. Verify SendGrid API key: `firebase functions:secrets:access SENDGRID_API_KEY`
2. Check SendGrid sender verification
3. Review rate limiting (1 email/day/type)
4. Check spam folder
5. Verify `app.url` config is correct

### Scheduled Function Not Running

**Problem**: No daily searches happening

**Solutions**:
1. Verify Cloud Scheduler is enabled in GCP Console
2. Check billing is enabled (required for Cloud Scheduler)
3. Review function logs for errors
4. Manually trigger to test: Cloud Console > Cloud Scheduler > Run Now

### High Costs

**Problem**: Unexpected high API costs

**Solutions**:
1. Reduce AI threshold in matching engine (current: 70%)
2. Limit number of users processed per batch
3. Reduce search frequency to weekly
4. Disable AI scoring for lower-scoring jobs
5. Set cost alerts in GCP Console

## Production Deployment Checklist

Before going live with real users:

- [ ] All environment variables configured
- [ ] Firestore indexes built (check status)
- [ ] Test user flow end-to-end
- [ ] Email notifications working
- [ ] SendGrid sender domain verified
- [ ] Cost monitoring alerts set up
- [ ] Error logging configured
- [ ] User preferences UI integrated
- [ ] Privacy policy updated (automated searches)
- [ ] Terms of service updated (data usage)

## Configuration Tuning

### Adjust Match Score Weights

Edit `functions/lib/matchingEngine.js`:

```javascript
// Current: 60% algorithmic, 40% AI
finalScore = (algorithmicScore * 0.6) + (aiScore * 0.4)

// More conservative (cheaper): 80% algorithmic, 20% AI
finalScore = (algorithmicScore * 0.8) + (aiScore * 0.2)

// AI threshold (only use AI for scores >= X)
aiThreshold: 70  // Current: only use AI if algorithmic >= 70%
```

### Adjust Notification Thresholds

Edit `functions/scheduled/searchJobsForAllUsers.js`:

```javascript
// Current thresholds
const HIGH_MATCH_THRESHOLD = 80;  // Immediate notification
const DIGEST_MATCH_THRESHOLD = 60; // Include in daily digest

// More selective
const HIGH_MATCH_THRESHOLD = 85;
const DIGEST_MATCH_THRESHOLD = 70;
```

### Adjust Search Frequency

Users can configure in UI, but you can set defaults in user creation:

```javascript
searchSettings: {
  searchFrequency: "daily",  // "daily" | "weekly" | "manual"
  autoSearchEnabled: true,
  // ...
}
```

## Support

For issues:
1. Check function logs: `firebase functions:log`
2. Review Firestore data in console
3. Check API dashboards for errors
4. Review this documentation
5. Contact development team with error messages

## Next Steps

After successful deployment:

1. **Integrate UI**: Add Job Preferences tab to Settings page
2. **User Onboarding**: Guide users to set preferences
3. **Analytics**: Track user engagement with job matches
4. **Feedback Loop**: Collect user feedback on match quality
5. **A/B Testing**: Test different match algorithms
6. **Expand Sources**: Add more job boards (Glassdoor, etc.)

## Useful Commands

```bash
# View all functions
firebase functions:list

# Delete a function
firebase functions:delete FUNCTION_NAME

# View function details
firebase functions:get FUNCTION_NAME

# View secrets
firebase functions:secrets:list

# Update a secret
firebase functions:secrets:set SECRET_NAME

# View config
firebase functions:config:get

# Deploy specific function
firebase deploy --only functions:FUNCTION_NAME

# View Firestore indexes
firebase firestore:indexes

# Validate Firestore rules
firebase firestore:rules
```

## Additional Resources

- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Cloud Scheduler Documentation](https://cloud.google.com/scheduler/docs)
- [Apify Documentation](https://docs.apify.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [SendGrid Documentation](https://docs.sendgrid.com/)

---

**Last Updated**: December 19, 2024
**Version**: 1.0.0
