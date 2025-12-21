# Next Steps for Supabase Migration

## Current Status: 60% Complete ✅

You've successfully migrated the core infrastructure. Here's what to do next.

---

## PHASE 1: Setup & Verification (30 minutes)

### Step 1: Install Dependencies
```bash
cd /home/carl/application-tracking/jobmatch-ai
npm install
```

**Expected Output**:
- `@supabase/supabase-js@2.39.0` installed
- `firebase` packages removed
- No errors

### Step 2: Create Environment File
```bash
cp .env.example .env.local
```

**Edit `.env.local`** with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
VITE_BACKEND_URL=http://localhost:3000
```

Get credentials from: https://app.supabase.com/project/YOUR_PROJECT/settings/api

### Step 3: Verify Database Schema

Ensure your Supabase project has these tables:

1. **users** - User profiles
   ```sql
   CREATE TABLE users (
     id UUID PRIMARY KEY REFERENCES auth.users(id),
     email TEXT NOT NULL,
     first_name TEXT,
     last_name TEXT,
     -- ... other fields from database.types.ts
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **jobs** - Job listings
   ```sql
   CREATE TABLE jobs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     company TEXT NOT NULL,
     -- ... other fields
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE INDEX idx_jobs_user_id ON jobs(user_id);
   CREATE INDEX idx_jobs_match_score ON jobs(match_score DESC NULLS LAST);
   ```

3. **applications, tracked_applications, work_experience, education, skills**
   - See `database.types.ts` for full schema

4. **sessions** - Authentication sessions
5. **security_events** - Audit log

### Step 4: Enable Row Level Security (RLS)

**CRITICAL**: Run these policies for each table:

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE education ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Example: Users table policy
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Example: Jobs table policy
CREATE POLICY "Users can view their own jobs"
  ON jobs FOR ALL
  USING (auth.uid() = user_id);

-- Repeat for all tables...
```

### Step 5: Configure OAuth Providers (if using)

**Google OAuth**:
1. Go to Google Cloud Console
2. Update Authorized redirect URIs:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

**LinkedIn OAuth**:
1. Go to LinkedIn Developer Portal
2. Update redirect URLs:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

3. In Supabase Dashboard → Authentication → Providers:
   - Enable Google and LinkedIn (OIDC)
   - Add client IDs and secrets

### Step 6: Test Basic Setup
```bash
npm run dev
```

**Verify**:
- App starts without errors
- No Firebase import errors
- Supabase client initializes
- Environment variables load correctly

---

## PHASE 2: Migrate Remaining Hooks (2-3 hours)

### Priority 1: Core Data Hooks

#### 1. useApplications (30 min)
**File**: `/src/hooks/useApplications.ts`

**Actions**:
1. Open file in editor
2. Copy template from `MIGRATION_QUICKSTART.md` (line 20-140)
3. Replace entire file content
4. Test with:
   ```typescript
   const { applications, loading, addApplication } = useApplications()
   console.log(applications)
   ```

#### 2. useProfile (15 min)
**File**: `/src/hooks/useProfile.ts`

**Actions**:
1. Copy template from `MIGRATION_QUICKSTART.md` (line 145-205)
2. Replace file content
3. Test profile fetch and update

#### 3. useSkills (20 min)
**File**: `/src/hooks/useSkills.ts`

**Actions**:
1. Copy template from `MIGRATION_QUICKSTART.md` (line 210-280)
2. Replace file content
3. Test CRUD operations

#### 4. useWorkExperience (20 min)
**File**: `/src/hooks/useWorkExperience.ts`

**Actions**:
1. Use collection pattern from `MIGRATION_QUICKSTART.md` (line 285-365)
2. Replace `TABLE_NAME` with `work_experience`
3. Replace `items` with `workExperience`
4. Test CRUD operations

#### 5. useEducation (20 min)
**File**: `/src/hooks/useEducation.ts`

**Actions**:
1. Use same collection pattern
2. Replace `TABLE_NAME` with `education`
3. Replace `items` with `education`
4. Test CRUD operations

### Priority 2: Application Tracking

#### 6. useTrackedApplications (30 min)
**File**: `/src/hooks/useTrackedApplications.ts`

**Actions**:
1. Use collection pattern
2. Add JOIN query for jobs/applications:
   ```typescript
   .select(`
     *,
     jobs (id, title, company),
     applications (id, job_title)
   `)
   ```
3. Test status updates and tracking

### Priority 3: Utilities

#### 7. exportApplication (30 min)
**File**: `/src/lib/exportApplication.ts`

**Actions**:
1. Copy template from `MIGRATION_QUICKSTART.md` (line 370-430)
2. Replace Firebase Functions call with backend API
3. Update auth token passing
4. Test PDF/DOCX export

---

## PHASE 3: Testing (1-2 hours)

### Authentication Tests

Run these tests manually:

**Test 1: Signup**
1. Go to /signup
2. Create account with email/password
3. Check for verification email
4. Verify account created in Supabase Dashboard → Authentication

**Test 2: Login**
1. Go to /login
2. Login with created account
3. Verify redirect to dashboard
4. Check session in localStorage (key: `jobmatch-auth-token`)

**Test 3: Google OAuth**
1. Click "Sign in with Google"
2. Complete OAuth flow
3. Verify redirect and session

**Test 4: Password Reset**
1. Click "Forgot Password"
2. Enter email
3. Check for reset email
4. Complete password reset flow

**Test 5: Session Persistence**
1. Login
2. Refresh page
3. Verify still logged in

**Test 6: Session Expiration**
1. Login
2. Wait 30 minutes (or change timeout to 1 min for testing)
3. Verify logout occurs

### Data Operations Tests

**Test 7: Profile Management**
```javascript
const { profile, updateProfile } = useProfile()

// Fetch
console.log(profile)

// Update
await updateProfile({
  first_name: 'John',
  last_name: 'Doe',
  location: 'San Francisco, CA'
})
```

**Test 8: Jobs Pagination**
```javascript
const { jobs, loading, hasMore, loadMore } = useJobs()

console.log('Jobs:', jobs)
console.log('Has More:', hasMore)

// Load next page
await loadMore()
```

**Test 9: Save/Unsave Job**
```javascript
const { jobs, saveJob, unsaveJob } = useJobs()

const firstJob = jobs[0]
await saveJob(firstJob.id)  // Should update UI
await unsaveJob(firstJob.id)  // Should update UI
```

**Test 10: Application CRUD**
```javascript
const { applications, addApplication, updateApplication, deleteApplication } = useApplications()

// Create
const newApp = await addApplication({
  jobTitle: 'Software Engineer',
  companyName: 'Example Inc.',
  coverLetter: 'Dear Hiring Manager...',
})

// Update
await updateApplication(newApp.id, {
  coverLetter: 'Updated cover letter...'
})

// Delete
await deleteApplication(newApp.id)
```

### Security Tests

**Test 11: RLS Enforcement**
1. Create two test users
2. Login as User A
3. Try to access User B's data via browser console
4. Should return empty results (not errors)

**Test 12: Session Tracking**
```javascript
// Open browser console
const { getActiveSessions } = useSecuritySettings()
const sessions = await getActiveSessions()
console.log(sessions)  // Should show current session
```

---

## PHASE 4: Cleanup (30 min)

### Step 1: Remove Firebase Dependencies

**Check for remaining Firebase imports**:
```bash
grep -r "firebase" src/
```

**Expected**: Only references in:
- Documentation files
- Comments
- No actual imports

### Step 2: Delete Firebase Config
```bash
rm src/lib/firebase.ts
```

### Step 3: Final Build Test
```bash
npm run build
```

**Expected**:
- No errors
- No warnings about Firebase
- Build succeeds

### Step 4: Update .gitignore (if needed)
Ensure `.env.local` is ignored:
```gitignore
.env.local
.env.*.local
```

---

## PHASE 5: Deployment Preparation (1 hour)

### Database Migration (if production data exists)

**If you have existing Firebase data**:

1. Export Firebase data
2. Transform to PostgreSQL format
3. Import to Supabase

**Example script** (create `scripts/migrate-firebase-data.ts`):
```typescript
// Export from Firebase
// Transform format
// Import to Supabase via API or SQL
```

### Environment Variables for Production

**GitHub Secrets** (if using GitHub Actions):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_BACKEND_URL=https://api.yourdomain.com
```

### Pre-Deployment Checklist

- [ ] All hooks migrated
- [ ] All tests passing
- [ ] RLS policies enabled
- [ ] OAuth providers configured
- [ ] Environment variables set
- [ ] Build succeeds
- [ ] No Firebase dependencies
- [ ] Database indexes created
- [ ] Backup plan ready

---

## PHASE 6: Go Live (1 hour)

### Step 1: Deploy Database Changes
1. Run all SQL migrations in Supabase
2. Enable RLS on all tables
3. Create indexes
4. Verify with test queries

### Step 2: Deploy Application
```bash
npm run build
# Deploy build/ to hosting
```

### Step 3: Post-Deployment Verification

1. Test signup flow
2. Test login flow
3. Test OAuth flows
4. Create test job
5. Generate test application
6. Verify emails sent
7. Check error logging

### Step 4: Monitor

Watch for:
- Authentication errors
- Database query errors
- Rate limit errors
- Session issues

**Tools**:
- Supabase Dashboard → Logs
- Browser console
- Application error logging

---

## Troubleshooting Common Issues

### Issue: "Missing Supabase environment variables"
**Solution**: Check `.env.local` exists and has correct values

### Issue: RLS policy error "permission denied"
**Solution**: Check RLS policies are created and enabled

### Issue: OAuth redirect fails
**Solution**: Verify redirect URLs in provider settings match Supabase callback URL

### Issue: Jobs query returns empty
**Solution**:
1. Check RLS policy allows SELECT
2. Verify `user_id` filter is correct
3. Test query in Supabase SQL editor

### Issue: Session not persisting
**Solution**:
1. Check `autoRefreshToken: true` in supabase.ts
2. Verify localStorage not blocked
3. Check session timeout settings

---

## Quick Commands Reference

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run build  # TypeScript check included
```

---

## Support Resources

### Documentation
- **This project**: Read `FIREBASE_TO_SUPABASE_MIGRATION.md`
- **Quick templates**: Read `MIGRATION_QUICKSTART.md`
- **Supabase Docs**: https://supabase.com/docs
- **Supabase Auth**: https://supabase.com/docs/guides/auth
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security

### Community
- **Supabase Discord**: https://discord.supabase.com
- **GitHub Issues**: Create issue in your repo

---

## Success Criteria

You're done when:

- ✅ All hooks migrated
- ✅ All tests passing
- ✅ No Firebase imports remain
- ✅ Production build succeeds
- ✅ Authentication works
- ✅ Data operations work
- ✅ RLS enforces security
- ✅ OAuth providers work
- ✅ Deployed to production

---

## Estimated Time

| Phase | Duration |
|-------|----------|
| Setup & Verification | 30 min |
| Migrate Hooks | 2-3 hours |
| Testing | 1-2 hours |
| Cleanup | 30 min |
| Deployment Prep | 1 hour |
| Go Live | 1 hour |
| **TOTAL** | **6-8 hours** |

---

## Start Here

1. Run `npm install`
2. Create `.env.local` with Supabase credentials
3. Set up database schema
4. Enable RLS policies
5. Migrate hooks using templates

**You've completed 60% - great progress! The remaining work is straightforward following the templates provided.**

Good luck! 🚀
