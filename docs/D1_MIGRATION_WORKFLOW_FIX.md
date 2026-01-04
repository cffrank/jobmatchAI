# D1 Migration Workflow Fix

## Problem Summary

**Critical Issue**: The current CI/CD workflow (`.github/workflows/cloudflare-deploy.yml`) silently succeeds even when D1 migrations fail.

**Location**: Lines 285-322 of `cloudflare-deploy.yml`

**Root Cause**: The workflow uses `exit 0` to handle D1 authorization errors, but this also masks real migration failures:

```yaml
npx wrangler d1 migrations apply DB --env "$DEPLOY_ENV" --remote || {
  echo "⚠️  D1 migration failed - checking if authorization issue..."
  echo "⚠️  This is non-critical if D1 is not yet enabled on account"
  exit 0  # ← Masks ALL failures, including syntax errors!
}
```

## Impact

- **SQL syntax errors** in migrations are hidden
- **Schema conflicts** are not caught
- **Database becomes inconsistent** across environments
- **No deployment fails** even with broken migrations
- **Silent data corruption** risk

## Solution

Replace the current D1 migration step with improved error handling that:
1. ✅ Validates migrations before applying
2. ✅ Shows migration preview (what will be applied)
3. ✅ Distinguishes authorization errors from real failures
4. ✅ Fails build on real migration errors
5. ✅ Shows migration history after applying

---

## Replacement Workflow Step

Replace lines 285-322 in `.github/workflows/cloudflare-deploy.yml` with:

```yaml
      - name: Run D1 Migrations
        working-directory: workers
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          DEPLOY_ENV: ${{ steps.env.outputs.environment }}
        run: |
          echo "🗄️  Running D1 Migrations for ${DEPLOY_ENV}..."

          # Check if migrations directory exists
          if [ ! -d "migrations" ]; then
            echo "⚠️  No migrations directory found, skipping..."
            exit 0
          fi

          # Count migration files
          MIGRATION_COUNT=$(find migrations -name "*.sql" 2>/dev/null | wc -l)

          if [ "$MIGRATION_COUNT" -eq 0 ]; then
            echo "⚠️  No migration files found, skipping..."
            exit 0
          fi

          echo "📋 Found $MIGRATION_COUNT migration file(s)"

          # Step 1: Validate migration files (sequential numbering, no gaps)
          echo ""
          echo "🔍 Validating migration files..."
          MIGRATION_FILES=$(find migrations -name "*.sql" | sort)
          EXPECTED_NUM=1
          VALIDATION_FAILED=0

          for file in $MIGRATION_FILES; do
            BASENAME=$(basename "$file")
            # Extract number from filename (e.g., "0001" from "0001_description.sql")
            FILE_NUM=$(echo "$BASENAME" | grep -oP '^\d+' || echo "0")

            if [ "$FILE_NUM" != "$(printf '%04d' $EXPECTED_NUM)" ]; then
              echo "❌ Migration numbering error: Expected $EXPECTED_NUM, found $FILE_NUM in $BASENAME"
              VALIDATION_FAILED=1
            fi

            EXPECTED_NUM=$((EXPECTED_NUM + 1))
          done

          if [ "$VALIDATION_FAILED" -eq 1 ]; then
            echo ""
            echo "❌ Migration validation failed - fix numbering before deploying"
            exit 1
          fi

          echo "✅ Migration files validated successfully"

          # Step 2: Check D1 database connectivity (test if D1 is authorized)
          echo ""
          echo "🔌 Testing D1 database connectivity..."

          # Try a simple query to test connectivity
          TEST_RESULT=$(npx wrangler d1 execute DB \
            --env "$DEPLOY_ENV" \
            --remote \
            --command "SELECT 1 as test;" 2>&1) || {

            # Check if it's an authorization error
            if echo "$TEST_RESULT" | grep -q -E "(not authorized|not entitled|requires|upgrade)"; then
              echo "⚠️  D1 is not authorized on this account"
              echo "⚠️  Skipping migrations - D1 needs to be enabled in Cloudflare dashboard"
              echo ""
              echo "To enable D1:"
              echo "  1. Go to https://dash.cloudflare.com/"
              echo "  2. Select your account"
              echo "  3. Navigate to Workers & Pages → D1"
              echo "  4. Enable D1 if prompted"
              exit 0
            else
              # Real connection error
              echo "❌ D1 connection test failed:"
              echo "$TEST_RESULT"
              echo ""
              echo "This is a real error - failing the build"
              exit 1
            fi
          }

          echo "✅ D1 database connection successful"

          # Step 3: Preview pending migrations
          echo ""
          echo "📋 Migration Preview:"
          echo "===================="

          # List migrations (wrangler doesn't have a preview command, so we'll list files)
          echo "Migrations to apply:"
          for file in $MIGRATION_FILES; do
            echo "  - $(basename $file)"
          done
          echo ""

          # Step 4: Apply migrations
          echo "⚙️  Applying migrations to ${DEPLOY_ENV}..."
          echo ""

          MIGRATION_OUTPUT=$(npx wrangler d1 migrations apply DB \
            --env "$DEPLOY_ENV" \
            --remote 2>&1)

          MIGRATION_EXIT_CODE=$?

          # Show output
          echo "$MIGRATION_OUTPUT"
          echo ""

          # Check exit code
          if [ $MIGRATION_EXIT_CODE -ne 0 ]; then
            # Migration failed - check if it's because migrations already applied
            if echo "$MIGRATION_OUTPUT" | grep -q -E "(already applied|no migrations to apply|up to date)"; then
              echo "ℹ️  Migrations already applied, database is up to date"
            else
              echo "❌ Migration failed with exit code: $MIGRATION_EXIT_CODE"
              echo ""
              echo "Common causes:"
              echo "  - SQL syntax error in migration file"
              echo "  - Foreign key constraint violation"
              echo "  - Duplicate migration (applied manually but not tracked)"
              echo "  - Database lock/timeout"
              echo ""
              echo "Fix the issue and re-run the deployment"
              exit 1
            fi
          fi

          # Step 5: Show migration history
          echo ""
          echo "📜 Migration History:"
          echo "===================="

          # Query migrations table to show what's been applied
          npx wrangler d1 execute DB \
            --env "$DEPLOY_ENV" \
            --remote \
            --command "SELECT name, applied_at FROM d1_migrations ORDER BY id;" 2>&1 || {
            echo "⚠️  Could not retrieve migration history (this is non-critical)"
          }

          echo ""
          echo "✅ D1 migrations completed successfully"
```

---

## Testing Procedure

### 1. Test in Development First

```bash
# Navigate to project root
cd /home/carl/application-tracking/jobmatch-ai

# Checkout a new branch
git checkout -b fix/d1-migration-workflow

# Copy the improved workflow step into the file
# (Manually edit .github/workflows/cloudflare-deploy.yml)

# Commit the change
git add .github/workflows/cloudflare-deploy.yml
git commit -m "fix: improve D1 migration error handling in CI/CD

- Add migration file validation (sequential numbering)
- Test D1 connectivity before applying migrations
- Distinguish authorization errors from real failures
- Show migration preview and history
- Fail build on real migration errors (not on auth issues)
- Add detailed error messages for common failure scenarios

Fixes silent migration failures identified in D1_MIGRATION_CICD_ANALYSIS.md"

# Push to remote
git push origin fix/d1-migration-workflow

# Create PR to develop branch
gh pr create --base develop --title "fix: improve D1 migration error handling" --body "Fixes critical issue where migration failures are silently ignored. See docs/D1_MIGRATION_CICD_ANALYSIS.md for details."
```

### 2. Test Migration Failure Scenarios

Create a test branch with intentional errors to verify error handling:

```bash
# Test 1: SQL syntax error
echo "CREATE INVALID SQL;" > workers/migrations/0002_test_error.sql
git add workers/migrations/0002_test_error.sql
git commit -m "test: trigger migration syntax error"
git push
# ✅ Expected: Build should FAIL with clear error message

# Test 2: Migration numbering gap
mv workers/migrations/0002_test_error.sql workers/migrations/0005_test_error.sql
git add .
git commit -m "test: trigger migration numbering error"
git push
# ✅ Expected: Build should FAIL with "Expected 0002, found 0005" error

# Clean up test branch
git checkout develop
git branch -D test/migration-errors
```

### 3. Verify in All Environments

Once merged to `develop`:
1. ✅ Development deployment should show migration validation
2. ✅ Migration preview should display pending migrations
3. ✅ Migration history should show applied migrations

Once merged to `staging`:
1. ✅ Staging should apply same migrations
2. ✅ Should show "already applied" if migrations exist

Once merged to `main`:
1. ✅ Production should apply migrations safely
2. ✅ Should fail loudly on any errors

---

## Rollback Plan

If the improved workflow causes issues:

```bash
git revert <commit-sha>
git push origin develop
```

The old behavior (silent failures with `exit 0`) will be restored immediately.

---

## Migration Numbering Conflict - FIXED ✅

**Previous Issue**: Two migrations numbered `0001_`:
- `0001_initial_schema.sql` (27,676 bytes, contains full schema including tracked_applications)
- `0001_create_tracked_applications.sql` (2,408 bytes, redundant)

**Resolution**: Deleted `0001_create_tracked_applications.sql` as it was redundant. The complete schema is in `0001_initial_schema.sql`.

**Current State**: Only one migration exists:
- `0001_initial_schema.sql` - Complete D1 schema (26 tables, 3 FTS5 virtual tables)

---

## Next Steps

1. **Review this document** - Understand the changes and why they're needed
2. **Test locally** - Verify migration validation logic works
3. **Create PR** - Follow testing procedure above
4. **Merge to develop** - Test in development environment
5. **Monitor deployments** - Watch for any issues
6. **Merge to staging** - Test in staging environment
7. **Merge to production** - Deploy to production with confidence

---

## Additional Improvements (Optional)

### Add npm Scripts for Easier Migration Management

Add to `workers/package.json`:

```json
{
  "scripts": {
    "migrate:local": "wrangler d1 migrations apply DB --env development --local",
    "migrate:dev": "wrangler d1 migrations apply DB --env development --remote",
    "migrate:staging": "wrangler d1 migrations apply DB --env staging --remote",
    "migrate:prod": "wrangler d1 migrations apply DB --env production --remote",
    "migrate:status": "wrangler d1 execute DB --env development --remote --command 'SELECT * FROM d1_migrations ORDER BY id;'",
    "migrate:create": "echo 'Creating migration...' && node scripts/create-migration.js"
  }
}
```

### Create Migration Template Script

Create `workers/scripts/create-migration.js`:

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Get migration name from command line
const migrationName = process.argv[2];

if (!migrationName) {
  console.error('❌ Usage: npm run migrate:create <migration-name>');
  console.error('   Example: npm run migrate:create add_salary_field');
  process.exit(1);
}

// Find next migration number
const migrationsDir = path.join(__dirname, '..', 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

let nextNumber = 1;
if (files.length > 0) {
  const numbers = files.map(f => parseInt(f.match(/^(\d+)_/)?.[1] || '0'));
  nextNumber = Math.max(...numbers) + 1;
}

const paddedNumber = String(nextNumber).padStart(4, '0');
const fileName = `${paddedNumber}_${migrationName}.sql`;
const filePath = path.join(migrationsDir, fileName);

// Create migration file with template
const template = `-- Migration: ${migrationName}
-- Created: ${new Date().toISOString().split('T')[0]}
-- Purpose: [Describe what this migration does]

-- Add your SQL here:


-- Rollback instructions:
-- [Describe how to rollback this migration if needed]
`;

fs.writeFileSync(filePath, template);

console.log(`✅ Created migration: ${fileName}`);
console.log(`   Path: ${filePath}`);
console.log('');
console.log('Next steps:');
console.log('  1. Edit the migration file and add your SQL');
console.log('  2. Test locally: npm run migrate:local');
console.log('  3. Apply to dev: npm run migrate:dev');
console.log('  4. Commit and push to trigger CI/CD');
```

Make it executable:
```bash
chmod +x workers/scripts/create-migration.js
```

---

## References

- Original issue documented in: `docs/D1_MIGRATION_CICD_ANALYSIS.md`
- Migration documentation: `workers/migrations/README.md`
- Wrangler D1 docs: https://developers.cloudflare.com/d1/
- GitHub Actions docs: https://docs.github.com/en/actions

---

**Status**: Ready for implementation
**Priority**: High (prevents database inconsistency)
**Risk**: Low (includes rollback plan, tested incrementally)
**Estimated Time**: 30 minutes to implement, 1 hour to test across all environments
