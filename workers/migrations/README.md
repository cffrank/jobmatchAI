# Cloudflare D1 Database Migrations

This directory contains SQL migration files for the Cloudflare D1 (SQLite) database used by Workers.

## Architecture Note

**IMPORTANT:** We use D1 (SQLite) for the Workers database, NOT Supabase PostgreSQL.
- Supabase is ONLY used for authentication (`supabase.auth`)
- All application data is stored in D1
- All database operations go through Workers API endpoints

## How to Apply Migrations

### Option 1: Wrangler CLI (Recommended)

Apply migrations to development:
```bash
cd workers
wrangler d1 migrations apply DB --local  # Local development
wrangler d1 migrations apply DB          # Remote development
```

Apply to production:
```bash
wrangler d1 migrations apply DB --env production
```

### Option 2: Wrangler Execute (Single query)

For testing individual queries:
```bash
wrangler d1 execute DB --local --command "SELECT * FROM tracked_applications LIMIT 5"
wrangler d1 execute DB --command "SELECT * FROM tracked_applications LIMIT 5"
```

### Option 3: Cloudflare Dashboard

1. Go to Workers & Pages → D1
2. Select your database
3. Navigate to "Console" tab
4. Paste and execute migration SQL

## Migration Naming Convention

Migrations follow this pattern:
```
NNNN_descriptive_name.sql
```

Examples:
- `0001_create_tracked_applications.sql`
- `0002_add_salary_field.sql`

## Current Migrations

| # | Migration | Description |
|---|-----------|-------------|
| 0001 | `initial_schema.sql` | Complete D1 schema migration from PostgreSQL (26 tables, 3 FTS5 virtual tables, 60+ indexes) |

## SQLite vs PostgreSQL Differences

Key differences from Supabase (PostgreSQL):

1. **No ENUM types** - Use TEXT with CHECK constraints
2. **No UUID type** - Store as TEXT
3. **No TIMESTAMPTZ** - Use TEXT with ISO 8601 format
4. **BOOLEAN is INTEGER** - Use 0/1 with CHECK constraint
5. **No JSONB** - Store JSON as TEXT
6. **No Row Level Security** - Implement in Workers middleware
7. **Triggers syntax differs** - SQLite uses BEGIN...END blocks

## Testing Migrations

Before applying to production:

1. **Test locally first:**
   ```bash
   wrangler d1 migrations apply DB --local
   ```

2. **Verify schema:**
   ```bash
   wrangler d1 execute DB --local --command ".schema tracked_applications"
   ```

3. **Test data operations:**
   ```bash
   wrangler d1 execute DB --local --file test-data.sql
   ```

4. **Apply to remote development:**
   ```bash
   wrangler d1 migrations apply DB
   ```

## Rollback Strategy

D1 doesn't support automatic rollbacks. To rollback:

1. Create a new migration that reverses changes
2. Name it with next sequential number
3. Apply the rollback migration

Example rollback for tracked_applications:
```sql
-- 0002_rollback_tracked_applications.sql
DROP TRIGGER IF EXISTS set_tracked_applications_updated_at;
DROP INDEX IF EXISTS idx_tracked_applications_next_action_date;
DROP INDEX IF EXISTS idx_tracked_applications_applied_date;
DROP INDEX IF EXISTS idx_tracked_applications_user_archived;
DROP INDEX IF EXISTS idx_tracked_applications_user_status;
DROP INDEX IF EXISTS idx_tracked_applications_user_id;
DROP TABLE IF EXISTS tracked_applications;
```

## Important Notes

- **Always test migrations locally first**
- **Never edit applied migrations** - create new ones instead
- **Security is enforced in Workers** - no RLS in SQLite
- **Use transactions** for complex migrations
- **JSON is stored as TEXT** - parse in application code
- **Dates are ISO 8601 strings** - format: YYYY-MM-DD HH:MM:SS

## Wrangler Configuration

Ensure your `wrangler.toml` has D1 bindings:

```toml
[[d1_databases]]
binding = "DB"
database_name = "jobmatch-ai-db"
database_id = "your-database-id"
migrations_dir = "migrations"
```

## Migration Workflow

1. Create migration file: `workers/migrations/NNNN_description.sql`
2. Test locally: `wrangler d1 migrations apply DB --local`
3. Verify: `wrangler d1 execute DB --local --command "SELECT ..."`
4. Apply to dev: `wrangler d1 migrations apply DB`
5. Test in dev environment
6. Apply to staging: `wrangler d1 migrations apply DB --env staging`
7. Apply to production: `wrangler d1 migrations apply DB --env production`
