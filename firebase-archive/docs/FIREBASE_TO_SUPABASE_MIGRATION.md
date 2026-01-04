# Firebase to Supabase Migration Guide

## Migration Status: IN PROGRESS

This document tracks the migration of JobMatch AI frontend from Firebase to Supabase.

## Completed Tasks ✅

### 1. Core Infrastructure
- **✅ Supabase Client** (`src/lib/supabase.ts`)
  - Initialized Supabase client with TypeScript types
  - Added auto-refresh, session persistence, and real-time support
  - Included helper functions for error handling and query execution

- **✅ Database Types** (`src/lib/database.types.ts`)
  - Generated TypeScript types for all 9 database tables:
    - `users`, `jobs`, `applications`, `tracked_applications`
    - `work_experience`, `education`, `skills`
    - `sessions`, `security_events`
  - Complete type safety for Row, Insert, and Update operations

### 2. Authentication System
- **✅ AuthContext** (`src/contexts/AuthContext.tsx`)
  - Migrated from Firebase Auth to Supabase Auth
  - Converted auth methods:
    - `signUp()` - Email/password signup with email verification
    - `signIn()` - Email/password signin
    - `signInWithGoogle()` - OAuth with Google
    - `signInWithLinkedIn()` - OAuth with LinkedIn (linkedin_oidc)
    - `logOut()` - Sign out
    - `resetPassword()` - Password reset email
    - `verifyEmail()` - Resend verification email
    - `updateUserProfile()` - Update user metadata
  - Maintained existing session management integration
  - Preserved rate limiting with exponential backoff

- **✅ Session Management** (`src/lib/sessionManagement.ts`)
  - Updated to use Supabase `refreshSession()` instead of Firebase token refresh
  - Maintained all existing session tracking functionality
  - Integrated with Supabase security service

- **✅ Security Service** (`src/lib/securityService.ts`)
  - Converted all Firestore operations to Supabase queries
  - Session tracking: `sessions` table with upsert logic
  - Security events: `security_events` table for audit logging
  - Active sessions: Query non-expired sessions with ordering
  - Session revocation: Delete sessions from `sessions` table
  - 2FA settings: Query from `users` table
  - Maintained IP geolocation and user agent parsing

### 3. Data Access Layer
- **✅ useJobs Hook** (`src/hooks/useJobs.ts`)
  - **Migration Type**: Cursor-based → Offset-based pagination
  - **Key Changes**:
    - Replaced Firestore `startAfter()` with Supabase `range(offset, offset + limit)`
    - Added `totalCount` tracking with `count: 'exact'`
    - Converted `saved` jobs from subcollection to boolean column
    - Updated job data mapping from Firestore documents to PostgreSQL rows
  - **Performance**: Same 20-item pagination, maintained efficiency
  - Functions migrated:
    - `useJobs()` - List jobs with pagination
    - `useJob(jobId)` - Fetch single job
    - `useSavedJobs()` - Query saved jobs
    - `saveJob(jobId)` - Update saved status
    - `unsaveJob(jobId)` - Update saved status

### 4. Configuration
- **✅ package.json**
  - **Removed**:
    - `firebase` (^10.14.1)
    - `react-firebase-hooks` (^5.1.1)
    - `firebase-admin` (devDependency)
  - **Added**:
    - `@supabase/supabase-js` (^2.39.0)

- **✅ .env.example**
  - Replaced Firebase config with Supabase:
    - `VITE_SUPABASE_URL` - Project URL
    - `VITE_SUPABASE_ANON_KEY` - Public/anon key
    - `VITE_BACKEND_URL` - Backend API endpoint
  - Added comprehensive security notes

## Pending Tasks 🚧

### Critical Hooks (High Priority)
These hooks are actively used and need immediate migration:

1. **useApplications Hook** (`src/hooks/useApplications.ts`)
   - Convert cursor-based to offset-based pagination
   - Replace `collection()`, `addDoc()`, `updateDoc()`, `deleteDoc()`
   - Map Firestore documents to PostgreSQL rows

2. **useProfile Hook** (`src/hooks/useProfile.ts`)
   - Convert Firestore user document queries to Supabase
   - Replace `doc()`, `getDoc()`, `setDoc()`, `updateDoc()`
   - Query from `users` table

3. **useSkills Hook** (`src/hooks/useSkills.ts`)
   - Convert Firestore subcollection to Supabase table
   - Replace collection queries with `eq('user_id', userId)`
   - Map to `skills` table

4. **useWorkExperience Hook** (`src/hooks/useWorkExperience.ts`)
   - Convert Firestore subcollection to Supabase table
   - Map to `work_experience` table

5. **useEducation Hook** (`src/hooks/useEducation.ts`)
   - Convert Firestore subcollection to Supabase table
   - Map to `education` table

### Additional Hooks (Medium Priority)
6. **useTrackedApplications Hook** (`src/hooks/useTrackedApplications.ts`)
   - Map to `tracked_applications` table
   - Include JOIN queries for related jobs/applications

7. **useSecuritySettings Hook** (`src/hooks/useSecuritySettings.ts`)
   - Already uses `securityService.ts` (migrated)
   - May need minor updates for Supabase-specific features

8. **useFileUpload Hook** (`src/hooks/useFileUpload.ts`)
   - Replace Firebase Storage with Supabase Storage
   - Update `getStorage()`, `ref()`, `uploadBytes()`, `getDownloadURL()`

### File Upload & Export
9. **exportApplication.ts** (`src/lib/exportApplication.ts`)
   - Replace Firebase Functions call with backend API endpoint
   - Use `fetch()` to call backend `/api/export` endpoint
   - Maintain error handling and download logic

### Cleanup
10. **Delete Firebase files**
    - Delete `src/lib/firebase.ts`
    - Remove Firebase initialization code
    - Clean up any remaining Firebase imports

## Migration Patterns Reference

### Pattern 1: Simple Query
```typescript
// Firebase
const snapshot = await getDocs(collection(db, 'users', userId, 'skills'))
const skills = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

// Supabase
const { data: skills, error } = await supabase
  .from('skills')
  .select('*')
  .eq('user_id', userId)
```

### Pattern 2: Pagination
```typescript
// Firebase (cursor-based)
const q = query(
  collection(...),
  orderBy('createdAt', 'desc'),
  limit(20),
  startAfter(lastDoc)
)

// Supabase (offset-based)
const { data, count } = await supabase
  .from('table')
  .select('*', { count: 'exact' })
  .order('created_at', { ascending: false })
  .range(offset, offset + 19)
```

### Pattern 3: Insert/Update
```typescript
// Firebase
await setDoc(doc(db, 'users', userId, 'skills', skillId), data, { merge: true })

// Supabase
await supabase
  .from('skills')
  .upsert({ id: skillId, user_id: userId, ...data })
```

### Pattern 4: Delete
```typescript
// Firebase
await deleteDoc(doc(db, 'users', userId, 'skills', skillId))

// Supabase
await supabase
  .from('skills')
  .delete()
  .eq('id', skillId)
  .eq('user_id', userId)
```

### Pattern 5: Real-time Subscriptions
```typescript
// Firebase
const unsubscribe = onSnapshot(query(...), (snapshot) => {
  setData(snapshot.docs.map(doc => doc.data()))
})

// Supabase
const channel = supabase
  .channel('table_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'skills',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // Handle change
  })
  .subscribe()

return () => { channel.unsubscribe() }
```

## Testing Checklist

After completing migration, test:

### Authentication
- [ ] Email/password signup
- [ ] Email verification
- [ ] Email/password signin
- [ ] Google OAuth signin
- [ ] LinkedIn OAuth signin
- [ ] Password reset
- [ ] Sign out
- [ ] Session persistence across page reloads
- [ ] Session expiration (30 min inactivity)

### Data Operations
- [ ] Fetch user profile
- [ ] Update user profile
- [ ] Fetch jobs with pagination
- [ ] Save/unsave jobs
- [ ] Fetch single job
- [ ] Generate application
- [ ] Update application
- [ ] Delete application
- [ ] Track application status
- [ ] Manage work experience
- [ ] Manage education
- [ ] Manage skills

### Security
- [ ] Session tracking works
- [ ] Security events logged
- [ ] Active sessions displayed
- [ ] Session revocation works
- [ ] RLS policies prevent unauthorized access

## Environment Setup

### Development
1. Copy `.env.example` to `.env.local`
2. Fill in Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_BACKEND_URL=http://localhost:3000
   ```

### Installation
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

## Database Schema Requirements

Ensure PostgreSQL schema includes:

### Tables
- `users` (auth.users + profile data)
- `jobs` (user-specific job listings)
- `applications` (generated materials)
- `tracked_applications` (application tracking)
- `work_experience` (work history)
- `education` (education history)
- `skills` (user skills)
- `sessions` (authentication sessions)
- `security_events` (audit log)

### Row Level Security (RLS)
All tables must have RLS policies:
```sql
-- Example for jobs table
CREATE POLICY "Users can only access their own jobs"
  ON jobs
  FOR ALL
  USING (auth.uid() = user_id);
```

### Indexes
```sql
-- Performance indexes
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_match_score ON jobs(match_score DESC);
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
```

## Key Differences: Firebase vs Supabase

| Feature | Firebase | Supabase |
|---------|----------|----------|
| **Database** | Firestore (NoSQL) | PostgreSQL (SQL) |
| **Auth** | Firebase Auth | Supabase Auth (GoTrue) |
| **Pagination** | Cursor-based (`startAfter`) | Offset-based (`range`) |
| **Security** | Security Rules | Row Level Security (RLS) |
| **Subcollections** | Native support | Use `user_id` FK |
| **Real-time** | `onSnapshot` | `postgres_changes` |
| **Storage** | Firebase Storage | Supabase Storage |
| **Functions** | Cloud Functions | Edge Functions (Deno) |

## Migration Benefits

1. **Better TypeScript Support**: Full type generation from schema
2. **SQL Power**: Complex queries, JOINs, aggregations
3. **Standard PostgreSQL**: Familiar, portable, open-source
4. **Better Performance**: Indexed queries, connection pooling
5. **Lower Cost**: More predictable pricing
6. **Easier Development**: Local development with Docker

## Next Steps

1. Run `npm install` to install Supabase SDK
2. Migrate remaining hooks (useApplications, useProfile, etc.)
3. Update exportApplication to use backend API
4. Delete `src/lib/firebase.ts`
5. Test all features thoroughly
6. Deploy to production

## Support

For questions or issues during migration:
- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- GitHub Issues: Create issue in repo
