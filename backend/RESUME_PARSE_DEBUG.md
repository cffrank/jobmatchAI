# Resume Parse 400 Error - Root Cause Analysis

## Problem Summary
The resume upload feature returns a **400 Bad Request** error when trying to parse uploaded files.

## Root Cause
**Supabase Storage returns a 400 "Object not found" error when trying to create a signed URL for a file that doesn't exist.**

The error occurs in `/home/carl/application-tracking/jobmatch-ai/backend/src/services/openai.service.ts` at line 503-505:

```typescript
const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
  .from('files')
  .createSignedUrl(storagePath, 3600); // Returns 400 if file doesn't exist
```

## Test Results

Running the diagnostic test revealed:
- ✓ Supabase admin client is configured correctly
- ✓ "files" bucket exists and is accessible
- ✓ Request validation schema is correct
- ✗ **Signed URL generation fails with 400 error when file doesn't exist**

```
ERROR generating signed URL: StorageApiError: Object not found
  status: 400,
  statusCode: '404'
```

## Possible Causes

### 1. File Upload Failure (Most Likely)
The frontend file upload may be failing silently, so no file exists at the `storagePath` when the backend tries to generate a signed URL.

**Check:**
- RLS policies on 'files' bucket
- User authentication during upload
- Network errors during upload
- Bucket folder structure

### 2. Path Mismatch
The `storagePath` sent by frontend may not match the actual uploaded file path.

**Frontend creates path:** `resumes/{userId}/{timestamp}_{filename}`
**Example:** `resumes/abc-123/1735139200000_resume.pdf`

**Verify:**
- userId is correct
- Timestamp matches upload time
- Filename encoding is correct (spaces, special characters)

### 3. Timing Issue
The backend API is called before the file upload completes.

**Frontend flow:**
1. Upload file to Supabase Storage
2. Immediately call backend API with storagePath
3. Backend tries to access file (race condition?)

### 4. Bucket Permissions
The service role key may not have permission to access files in the bucket, even though it can list the bucket itself.

## Recommended Fixes

### Fix 1: Add File Existence Check (Recommended)
Before generating signed URL, verify the file exists:

```typescript
// In parseResume function
export async function parseResume(storagePath: string): Promise<ParsedResume> {
  try {
    const openai = getOpenAI();

    // First, verify the file exists
    const { data: fileList, error: listError } = await supabaseAdmin.storage
      .from('files')
      .list(storagePath.substring(0, storagePath.lastIndexOf('/')));

    if (listError) {
      console.error('Failed to list files:', listError);
      throw new Error('Failed to access storage bucket');
    }

    const fileName = storagePath.substring(storagePath.lastIndexOf('/') + 1);
    const fileExists = fileList?.some(file => file.name === fileName);

    if (!fileExists) {
      console.error(`File not found at path: ${storagePath}`);
      console.error('Available files:', fileList?.map(f => f.name).join(', '));
      throw new Error(`Resume file not found. Please upload the file again.`);
    }

    // Now generate signed URL
    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from('files')
      .createSignedUrl(storagePath, 3600);

    if (urlError || !signedUrlData) {
      console.error('Failed to generate signed URL:', urlError);
      throw new Error('Failed to access resume file');
    }

    // ... rest of function
  }
}
```

### Fix 2: Better Error Handling
Provide more detailed error messages to help diagnose the issue:

```typescript
if (urlError || !signedUrlData) {
  console.error('Failed to generate signed URL:', urlError);
  console.error('Storage path:', storagePath);

  // Provide user-friendly error message
  if (urlError?.status === 400 || urlError?.statusCode === '404') {
    throw new Error(
      `Resume file not found at ${storagePath}. ` +
      `Please ensure the file upload completed successfully.`
    );
  }

  throw new Error('Failed to access resume file');
}
```

### Fix 3: Frontend Upload Verification
Ensure the frontend waits for successful upload confirmation:

```typescript
// In useResumeParser.ts - uploadAndParseResume function
const storagePath = `resumes/${user.id}/${Date.now()}_${file.name}`

// Wait for upload to complete
const result = await uploadFile(file, storagePath, 'files')

// Verify upload succeeded
if (!result.fullPath) {
  throw new Error('File upload failed - no path returned')
}

console.log('File uploaded successfully to:', result.fullPath)

// Use the confirmed path from the upload result
const confirmedPath = result.fullPath

// Call backend with confirmed path
const response = await fetch(`${backendUrl}/api/resume/parse`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({ storagePath: confirmedPath }), // Use confirmed path
})
```

### Fix 4: Check RLS Policies
Verify the 'files' bucket RLS policies allow the authenticated user to upload files:

```sql
-- Check current policies
SELECT * FROM storage.policies WHERE bucket_id = 'files';

-- Required policy for authenticated uploads
CREATE POLICY "Authenticated users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'files'
  AND (storage.foldername(name))[1] = 'resumes'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Required policy for service role to read all files
-- (Service role should already bypass RLS, but verify)
```

## Next Steps

1. **Add detailed logging** to both frontend and backend to track the upload flow
2. **Implement Fix 1** to check file existence before generating signed URL
3. **Implement Fix 2** to provide better error messages
4. **Test with a real file upload** and monitor the logs
5. **Verify RLS policies** on the 'files' bucket

## Test Command

Run the diagnostic test:
```bash
cd /home/carl/application-tracking/jobmatch-ai/backend
npx ts-node test-resume-endpoint.ts
```
