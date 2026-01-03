# useFileUpload.ts - Supabase Storage to Workers R2 Migration

## Summary

Successfully refactored all Supabase Storage calls in `/home/carl/application-tracking/jobmatch-ai/src/hooks/useFileUpload.ts` to use Cloudflare Workers R2 API.

## Changes Made

### 1. Workers API - New Endpoints Added

**File:** `/home/carl/application-tracking/jobmatch-ai/workers/api/routes/files.ts`

#### DELETE /api/files/:key
- Deletes files from R2 storage
- Authentication required (JWT)
- Validates file ownership (users can only delete their own files)
- Auto-detects bucket from file path (avatars/resumes/exports)
- Returns 200 on success, 403 for access denied, 404 for not found

#### GET /api/files/:key/signed-url
- Generates temporary signed URL for file access
- Authentication required (JWT)
- Validates file ownership
- Query parameter: `expiresIn` (default: 3600s, max: 86400s)
- Returns signed URL with expiration metadata
- Note: Currently returns authenticated download URL (R2 doesn't have native presigned URLs like S3)

### 2. Frontend Hook Refactoring

**File:** `/home/carl/application-tracking/jobmatch-ai/src/hooks/useFileUpload.ts`

#### deleteFile() - Lines 181-219
**Before:**
```typescript
const { error: deleteError } = await supabase.storage
  .from(bucket)
  .remove([storagePath])
```

**After:**
```typescript
const response = await fetch(`${backendUrl}/api/files/${encodeURIComponent(storagePath)}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
  },
})
```

**Changes:**
- Replaced Supabase Storage SDK call with Workers API fetch
- Uses JWT authentication from `supabase.auth.getSession()` (allowed)
- Maintains backward-compatible function signature
- Added error handling for network failures
- Added console logging for debugging

#### getSignedUrl() - Lines 221-276
**Before:**
```typescript
const { data, error: signError } = await supabase.storage
  .from(bucket)
  .createSignedUrl(storagePath, expiresIn)
```

**After:**
```typescript
const response = await fetch(
  `${backendUrl}/api/files/${encodeURIComponent(storagePath)}/signed-url?expiresIn=${expiresIn}`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  }
)
```

**Changes:**
- Replaced Supabase Storage SDK call with Workers API fetch
- Uses JWT authentication from `supabase.auth.getSession()` (allowed)
- Maintains backward-compatible function signature
- Returns signed URL with expiration metadata
- Added console logging with expiration timestamp

### 3. Backward Compatibility

Both `deleteFile()` and `getSignedUrl()` maintain the same function signatures:
- `storagePath: string` - File path in storage
- `bucket: string = 'files'` - Kept for compatibility but prefixed with `_` (unused)
- `expiresIn: number = 3600` - For signed URLs only

The `bucket` parameter is now unused because the Workers API determines the bucket from the file path automatically.

## Authentication Flow

All file operations now follow the same pattern:

1. Get JWT token from `supabase.auth.getSession()` (auth-only, allowed)
2. Include token in `Authorization: Bearer {token}` header
3. Workers API validates JWT and extracts user ID
4. API verifies file ownership (file must start with `users/{userId}/`)
5. API performs operation on appropriate R2 bucket

## Verification

✅ All Supabase Storage calls removed
✅ Only `supabase.auth.getSession()` remains (3 instances, all allowed)
✅ TypeScript compilation passes (no type errors)
✅ Backward-compatible function signatures
✅ Error handling maintained
✅ Console logging added for debugging

## Testing Recommendations

1. **Upload then Delete:**
   - Upload a file via `uploadFile()`
   - Delete it via `deleteFile()`
   - Verify file is removed from R2

2. **Signed URLs:**
   - Upload a file
   - Get signed URL via `getSignedUrl()`
   - Access the URL and verify file downloads

3. **Access Control:**
   - Try to delete another user's file (should fail with 403)
   - Try to get signed URL for another user's file (should fail with 403)

4. **Error Handling:**
   - Test with invalid file paths
   - Test with expired JWT tokens
   - Test with non-existent files

## Files Modified

1. `/home/carl/application-tracking/jobmatch-ai/workers/api/routes/files.ts` - Added DELETE and signed-url endpoints
2. `/home/carl/application-tracking/jobmatch-ai/src/hooks/useFileUpload.ts` - Refactored deleteFile() and getSignedUrl()

## Migration Status

**Complete!** All Supabase Storage calls in `useFileUpload.ts` have been successfully migrated to Workers R2 API.
