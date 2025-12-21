# Supabase Database Migrations

This directory contains database migrations for the JobMatch AI project using Supabase.

## Migration Files

Migrations are stored in `migrations/` and are applied in chronological order based on their timestamp prefix.

### Initial Schema (from Firebase migration)
- `001_initial_schema.sql` - Users, work experience, education, skills, jobs, applications, sessions, security events, email history
- `002_resumes_table.sql` - Resume management table
- `003_tracked_applications_table.sql` - Application tracking with status, interviews, and follow-ups

### Applied Migrations (via Supabase MCP)
- `20251220222545_fix_function_search_paths.sql` - Security: Fixed function search_path warnings
- `20251220222624_optimize_rls_policies_auth_uid.sql` - Performance: Optimized RLS policies for auth.uid()

## Migration Tracking

Supabase automatically tracks applied migrations in the `supabase_migrations.schema_migrations` table. You can view applied migrations using the Supabase MCP:

```typescript
// List all migrations
const migrations = await supabase.listMigrations(projectId);
```

## Creating New Migrations

### Via Supabase MCP (Recommended)
```typescript
await supabase.applyMigration({
  project_id: 'your-project-id',
  name: 'descriptive_migration_name',
  query: 'YOUR SQL HERE'
});
```

The migration will be automatically:
1. Applied to the database
2. Tracked with a timestamp
3. Saved to your project history

### Via SQL File (Manual)
1. Create a new file: `migrations/YYYYMMDDHHMMSS_description.sql`
2. Write your migration SQL
3. Apply using Supabase CLI: `npx supabase db push`

## Migration Best Practices

### Security
- Always set `search_path = ''` on functions to prevent search_path hijacking
- Use explicit schema qualification (e.g., `public.tablename`)
- Set `SECURITY DEFINER` carefully and only when needed

### Performance
- Wrap `auth.uid()` in SELECT statements in RLS policies: `(SELECT auth.uid())`
- Create indexes for frequently queried columns
- Use partial indexes for filtered queries

### Structure
- One logical change per migration
- Include rollback instructions in comments
- Add verification queries in comments

## Verification

After applying migrations, verify with:

```sql
-- Check security advisor
SELECT * FROM supabase_advisor.security_lints;

-- Check performance advisor
SELECT * FROM supabase_advisor.performance_lints;

-- List applied migrations
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
```

## Current Database Status

**Tables:** 11 (all with RLS enabled)
- users, work_experience, education, skills
- jobs, applications, resumes, tracked_applications
- sessions, security_events, email_history

**Functions:** 2
- cleanup_expired_sessions
- get_active_session_count

**Security Status:** ✅ All clear
- 0 security warnings
- All functions have immutable search_path

**Performance Status:** ✅ Optimized
- 0 RLS policy warnings (all using SELECT wrapper)
- 57 unused indexes (normal for new database)

## Resources

- [Supabase Migrations Guide](https://supabase.com/docs/guides/database/migrations)
- [RLS Performance Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database Linter Documentation](https://supabase.com/docs/guides/database/database-linter)
