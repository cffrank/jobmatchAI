# Task 1: Migrate openai.service.ts to R2 Storage

**Priority:** P0 (CRITICAL)
**Estimated Time:** 6 hours
**Dependencies:** R2 buckets configured ✅ (wrangler.toml lines 199-255)
**Status:** Ready to start

---

## Overview

Migrate `workers/api/services/openai.ts` from Supabase Storage to Cloudflare R2 for file operations.

**Current state:**
- ✅ R2 buckets created (RESUMES, AVATARS, EXPORTS in all 3 environments)
- ✅ R2 bindings configured in `wrangler.toml`
- ✅ Storage service exists (`workers/api/services/storage.ts`)
- ❌ openai.service.ts still uses Supabase Storage (4 calls)

**Target state:**
- ✅ All file downloads from R2
- ✅ Presigned URLs generated via R2
- ✅ No Supabase Storage calls

---

## Current Supabase Storage Dependencies

### 1. File Download (Lines 814-825)

**Current code:**
```typescript
const { data: fileData, error: downloadError } = await supabaseAdmin.storage
  .from('files')
  .download(storagePath);

if (downloadError || !fileData) {
  throw new Error(`Failed to download file: ${downloadError?.message}`);
}

const arrayBuffer = await fileData.arrayBuffer();
```

**Target R2 code:**
```typescript
// Use R2 binding (env.RESUMES)
const object = await env.RESUMES.get(storagePath);

if (!object) {
  throw new Error(`File not found in R2: ${storagePath}`);
}

const arrayBuffer = await object.arrayBuffer();
```

**Changes:**
- Replace `supabaseAdmin.storage.from('files').download()` with `env.RESUMES.get()`
- R2 returns `null` if object not found (not an error object)
- R2 object has `.arrayBuffer()`, `.text()`, `.json()`, `.blob()` methods

---

### 2. List Files Verification (Lines 865-878)

**Current code:**
```typescript
const { data: files } = await supabaseAdmin.storage
  .from('files')
  .list(folderPath);

console.log(`Found ${files?.length || 0} files in folder ${folderPath}`);
```

**Target R2 code:**
```typescript
// R2 list() returns paginated results
const listed = await env.RESUMES.list({
  prefix: folderPath,
  limit: 1000
});

console.log(`Found ${listed.objects.length} files in folder ${folderPath}`);
```

**Changes:**
- Replace `supabaseAdmin.storage.from('files').list()` with `env.RESUMES.list()`
- R2 list returns `{ objects: [], truncated: boolean, cursor?: string }`
- Use `prefix` option to filter by folder path

---

### 3. Generate Signed URL (Lines 977-993)

**Current code:**
```typescript
const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
  .from('files')
  .createSignedUrl(storagePath, 3600); // 1 hour expiry

if (signedUrlError || !signedUrlData?.signedUrl) {
  throw new Error(`Failed to create signed URL: ${signedUrlError?.message}`);
}

return signedUrlData.signedUrl;
```

**Target R2 code:**
```typescript
// R2 presigned URL generation
import { generatePresignedUrl } from '../services/storage';

const signedUrl = await generatePresignedUrl(
  env.RESUMES,
  storagePath,
  3600 // 1 hour expiry
);

return signedUrl;
```

**Note:** The `storage.ts` service already has a `generatePresignedUrl()` helper function.

---

## Migration Steps

### Step 1: Review R2 Service Implementation (15 min)

**File:** `workers/api/services/storage.ts`

**Key functions to use:**
```typescript
// Download file from R2
export async function downloadFile(
  bucket: R2Bucket,
  key: string
): Promise<ArrayBuffer>

// Generate presigned download URL
export async function generatePresignedUrl(
  bucket: R2Bucket,
  key: string,
  expiresIn: number = 3600
): Promise<string>

// List files in folder
export async function listFiles(
  bucket: R2Bucket,
  prefix?: string,
  limit?: number
): Promise<R2Object[]>
```

**Action:** Verify these functions exist and understand their signatures.

---

### Step 2: Update File Download Logic (30 min)

**File:** `workers/api/services/openai.ts`

**Location:** Lines 814-825

**Current function:** `downloadFile(storagePath: string)`

**Changes:**
1. Import R2 bucket from env
2. Replace Supabase download with R2 get
3. Update error handling

**New code:**
```typescript
import type { Env } from '../types';

// Update function signature to accept env
async function downloadFileFromR2(
  env: Env,
  storagePath: string
): Promise<ArrayBuffer> {
  try {
    // Get file from R2 RESUMES bucket
    const object = await env.RESUMES.get(storagePath);

    if (!object) {
      throw new Error(`File not found in R2: ${storagePath}`);
    }

    console.log(`[R2] Downloaded file: ${storagePath}, size: ${object.size} bytes`);

    return await object.arrayBuffer();
  } catch (error) {
    console.error(`[R2] Failed to download file ${storagePath}:`, error);
    throw new Error(
      `Failed to download file from R2: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
```

**Testing:**
- Unit test: Mock R2 bucket, verify download called
- Integration test: Upload test file to R2, download and verify content

---

### Step 3: Update File List Logic (20 min)

**File:** `workers/api/services/openai.ts`

**Location:** Lines 865-878

**Purpose:** Verification logging (non-critical)

**Changes:**
1. Replace Supabase list with R2 list
2. Update folder path handling

**New code:**
```typescript
async function listFilesInFolder(
  env: Env,
  folderPath: string
): Promise<R2Object[]> {
  try {
    const listed = await env.RESUMES.list({
      prefix: folderPath,
      limit: 1000
    });

    console.log(`[R2] Found ${listed.objects.length} files in folder ${folderPath}`);

    return listed.objects;
  } catch (error) {
    console.error(`[R2] Failed to list files in ${folderPath}:`, error);
    return [];
  }
}
```

**Testing:**
- Integration test: Upload multiple files, verify list returns correct count

---

### Step 4: Update Signed URL Generation (45 min)

**File:** `workers/api/services/openai.ts`

**Location:** Lines 977-993

**Changes:**
1. Use `storage.ts` presigned URL helper
2. Update error handling

**New code:**
```typescript
import { generatePresignedUrl } from './storage';

async function generateImagePresignedUrl(
  env: Env,
  storagePath: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    // Verify file exists in R2
    const object = await env.RESUMES.head(storagePath);

    if (!object) {
      throw new Error(`File not found in R2: ${storagePath}`);
    }

    // Generate presigned URL
    const signedUrl = await generatePresignedUrl(
      env.RESUMES,
      storagePath,
      expiresIn
    );

    console.log(`[R2] Generated presigned URL for ${storagePath}, expires in ${expiresIn}s`);

    return signedUrl;
  } catch (error) {
    console.error(`[R2] Failed to generate presigned URL for ${storagePath}:`, error);
    throw new Error(
      `Failed to generate presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
```

**Note:** R2's `head()` method checks if object exists without downloading the full file.

**Testing:**
- Unit test: Verify presigned URL generated
- Integration test: Generate URL, fetch from URL, verify content matches

---

### Step 5: Update All Callers (1 hour)

**Search for all usages:**
```bash
grep -n "downloadFile\|createSignedUrl\|storage\.from('files')" workers/api/services/openai.ts
```

**Update function signatures:**
- All functions that use file operations need `env: Env` parameter
- Update callers to pass `env`

**Example:**
```typescript
// Before
async function parseResume(storagePath: string): Promise<ParsedResume> {
  const fileData = await downloadFile(storagePath);
  // ...
}

// After
async function parseResume(env: Env, storagePath: string): Promise<ParsedResume> {
  const fileData = await downloadFileFromR2(env, storagePath);
  // ...
}
```

**Files to update:**
1. `openai.ts` - Update internal function calls
2. `routes/resume.ts` - Update `parseResume()` calls
3. Any other routes that call openai.service functions

---

### Step 6: Remove Supabase Storage Imports (10 min)

**File:** `workers/api/services/openai.ts`

**Remove:**
```typescript
import { createSupabaseAdmin } from './supabase';
// OR
import { supabaseAdmin } from './supabase';
```

**Verify:**
- No more `supabaseAdmin.storage` calls
- No more imports from `./supabase` (unless for other purposes)

**Command:**
```bash
grep -n "supabaseAdmin\|createSupabase" workers/api/services/openai.ts
```

Should return 0 results after migration.

---

### Step 7: Write Unit Tests (1.5 hours)

**File:** `workers/api/services/__tests__/openai.test.ts`

**Test cases:**

1. **Test R2 file download:**
```typescript
describe('downloadFileFromR2', () => {
  it('should download file from R2 successfully', async () => {
    const mockEnv = createMockEnv();
    const mockArrayBuffer = new ArrayBuffer(100);

    mockEnv.RESUMES.get = vi.fn().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      size: 100
    });

    const result = await downloadFileFromR2(mockEnv, 'test-file.pdf');

    expect(result).toBe(mockArrayBuffer);
    expect(mockEnv.RESUMES.get).toHaveBeenCalledWith('test-file.pdf');
  });

  it('should throw error if file not found', async () => {
    const mockEnv = createMockEnv();
    mockEnv.RESUMES.get = vi.fn().mockResolvedValue(null);

    await expect(
      downloadFileFromR2(mockEnv, 'nonexistent.pdf')
    ).rejects.toThrow('File not found in R2');
  });
});
```

2. **Test presigned URL generation:**
```typescript
describe('generateImagePresignedUrl', () => {
  it('should generate presigned URL for existing file', async () => {
    const mockEnv = createMockEnv();

    mockEnv.RESUMES.head = vi.fn().mockResolvedValue({ size: 100 });

    // Mock generatePresignedUrl from storage.ts
    vi.mock('./storage', () => ({
      generatePresignedUrl: vi.fn().mockResolvedValue('https://r2-signed-url.com')
    }));

    const url = await generateImagePresignedUrl(mockEnv, 'image.jpg', 3600);

    expect(url).toBe('https://r2-signed-url.com');
    expect(mockEnv.RESUMES.head).toHaveBeenCalledWith('image.jpg');
  });
});
```

3. **Test file listing:**
```typescript
describe('listFilesInFolder', () => {
  it('should list files in R2 folder', async () => {
    const mockEnv = createMockEnv();

    mockEnv.RESUMES.list = vi.fn().mockResolvedValue({
      objects: [
        { key: 'folder/file1.pdf', size: 100 },
        { key: 'folder/file2.pdf', size: 200 }
      ],
      truncated: false
    });

    const files = await listFilesInFolder(mockEnv, 'folder/');

    expect(files).toHaveLength(2);
    expect(mockEnv.RESUMES.list).toHaveBeenCalledWith({
      prefix: 'folder/',
      limit: 1000
    });
  });
});
```

**Run tests:**
```bash
cd workers
npm run test -- openai.test.ts
```

---

### Step 8: Integration Testing (1.5 hours)

**Test scenario: Resume PDF parsing with R2**

1. **Setup test environment:**
   - Deploy to development environment
   - Upload test PDF resume to R2 RESUMES bucket
   - Note the file key

2. **Test PDF parsing:**
```bash
# Use curl or Postman
curl -X POST https://jobmatch-ai-dev.carl-f-frank.workers.dev/api/resume/parse \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storagePath": "test-resumes/sample-resume.pdf"
  }'
```

Expected response:
```json
{
  "personalInfo": { ... },
  "workExperience": [ ... ],
  "education": [ ... ],
  "skills": [ ... ]
}
```

3. **Test image resume parsing with presigned URLs:**
```bash
curl -X POST https://jobmatch-ai-dev.carl-f-frank.workers.dev/api/resume/parse \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storagePath": "test-resumes/resume-screenshot.png"
  }'
```

4. **Verify R2 operations in logs:**
```bash
wrangler tail --env development
# Look for:
# [R2] Downloaded file: ..., size: XXX bytes
# [R2] Generated presigned URL for ...
```

---

### Step 9: Performance Testing (30 min)

**Compare R2 vs Supabase Storage performance:**

**Metrics to measure:**
1. File download latency (PDF files)
2. Presigned URL generation time
3. Total resume parsing time

**Test with:**
- Small files (< 100KB)
- Medium files (100KB - 1MB)
- Large files (1MB - 10MB)

**Expected results:**
- R2 should be **faster or equal** to Supabase Storage
- Edge location benefits (R2 is closer to Workers)
- Target: < 200ms for file downloads

**Logging:**
```typescript
const startTime = Date.now();
const fileData = await downloadFileFromR2(env, storagePath);
const downloadTime = Date.now() - startTime;
console.log(`[Performance] R2 download took ${downloadTime}ms for ${storagePath}`);
```

---

### Step 10: Update Documentation (15 min)

**Files to update:**

1. **workers/api/services/README.md** (if exists)
   - Document R2 file operations
   - Add migration notes

2. **docs/CLOUDFLARE_MIGRATION_STATUS.md**
   - Update service layer migration status
   - Mark openai.service.ts as migrated

3. **Add code comments:**
```typescript
/**
 * Download file from Cloudflare R2 storage
 *
 * Migrated from Supabase Storage on 2026-01-02
 * Uses R2 RESUMES bucket for all file operations
 *
 * @param env - Cloudflare Workers environment bindings
 * @param storagePath - Path to file in R2 bucket
 * @returns ArrayBuffer of file contents
 * @throws Error if file not found or download fails
 */
async function downloadFileFromR2(env: Env, storagePath: string): Promise<ArrayBuffer>
```

---

## Acceptance Criteria

**All checkboxes must be checked before marking task complete:**

### Code Changes
- [ ] Replaced `supabaseAdmin.storage.from('files').download()` with R2 `get()`
- [ ] Replaced `supabaseAdmin.storage.from('files').list()` with R2 `list()`
- [ ] Replaced `supabaseAdmin.storage.from('files').createSignedUrl()` with R2 presigned URLs
- [ ] Removed all Supabase Storage imports from `openai.ts`
- [ ] Updated all function signatures to accept `env: Env`
- [ ] Updated all callers (routes) to pass `env`

### Testing
- [ ] Unit tests written for R2 file operations
- [ ] Unit tests passing (100% coverage for new functions)
- [ ] Integration test: PDF parsing works with R2
- [ ] Integration test: Image parsing works with R2 presigned URLs
- [ ] Integration test: File listing works
- [ ] No errors in Workers logs

### Performance
- [ ] R2 file download latency < 200ms (p95)
- [ ] Presigned URL generation < 50ms
- [ ] Resume parsing time unchanged or improved

### Security
- [ ] Presigned URLs expire correctly (test with expired URL)
- [ ] File access requires authentication
- [ ] No public R2 bucket access (buckets remain private)

### Deployment
- [ ] Deployed to development environment
- [ ] Manual testing complete
- [ ] No regression in resume parsing feature
- [ ] Logs show R2 operations (not Supabase)

### Documentation
- [ ] Code comments added
- [ ] Migration status document updated
- [ ] README updated (if applicable)

---

## Rollback Plan

**If R2 migration fails:**

1. **Revert code changes:**
   ```bash
   git revert <commit-hash>
   git push origin develop
   ```

2. **Redeploy previous version:**
   ```bash
   cd workers
   wrangler deploy --env development
   ```

3. **Verify Supabase Storage working:**
   - Test resume parsing with Supabase
   - Check error logs

4. **Root cause analysis:**
   - Review R2 errors
   - Check R2 bucket permissions
   - Verify file paths

---

## Common Issues & Solutions

### Issue 1: R2 file not found

**Symptom:** `env.RESUMES.get()` returns `null`

**Causes:**
- File not uploaded to R2 yet
- Incorrect file path/key
- Wrong bucket used

**Solution:**
1. Verify file exists in R2:
   ```bash
   wrangler r2 object get jobmatch-ai-dev-resumes <file-key> --env development
   ```
2. Check file path matches exactly (case-sensitive)
3. Ensure using correct bucket (RESUMES for resumes, AVATARS for avatars)

---

### Issue 2: Presigned URL not working

**Symptom:** Presigned URL returns 403 Forbidden

**Causes:**
- URL expired
- Bucket not configured for presigned URLs
- CORS issues

**Solution:**
1. Verify URL not expired:
   ```typescript
   console.log('Presigned URL expires in:', expiresIn, 'seconds');
   ```
2. Test URL immediately after generation
3. Check R2 bucket CORS settings (if needed for browser access)

---

### Issue 3: Large file download timeout

**Symptom:** Workers timeout for files > 5MB

**Causes:**
- Workers have 30s execution limit (free tier) or 300s (paid)
- Large files take too long to download

**Solution:**
1. Use streaming for large files:
   ```typescript
   const stream = object.body; // ReadableStream
   // Process stream instead of loading entire file
   ```
2. Increase Workers timeout (paid plan)
3. Consider CDN for very large files

---

## Timeline

**Total estimated time: 6 hours**

| Step | Activity | Time |
|------|----------|------|
| 1 | Review R2 service implementation | 15 min |
| 2 | Update file download logic | 30 min |
| 3 | Update file list logic | 20 min |
| 4 | Update signed URL generation | 45 min |
| 5 | Update all callers | 1 hour |
| 6 | Remove Supabase imports | 10 min |
| 7 | Write unit tests | 1.5 hours |
| 8 | Integration testing | 1.5 hours |
| 9 | Performance testing | 30 min |
| 10 | Update documentation | 15 min |

**Recommended schedule:**
- **Morning (3h):** Steps 1-6 (code changes)
- **Afternoon (3h):** Steps 7-10 (testing + docs)

---

## Next Steps After Completion

Once Task 1 is complete:
1. Mark todo item as complete
2. Update migration status document
3. Notify team in Slack
4. **Start Task 2:** Migrate `jobDeduplication.service.ts`

---

**Task Owner:** Backend Developer
**Reviewer:** Tech Lead
**Status:** Ready to start ⏰
