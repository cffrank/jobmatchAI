# Resume Upload 400 Error - Fix Summary

## Root Cause
The backend was attempting to generate a signed URL for a file that may not exist in Supabase Storage, causing a **400 "Object not found"** error.

## Changes Made

### 1. Backend: Enhanced Error Handling (`backend/src/services/openai.service.ts`)

**Added file existence check before generating signed URL:**
- Verifies the file exists in the storage bucket before attempting to create a signed URL
- Lists files in the folder and checks if the expected file name is present
- Provides detailed error messages indicating which folder was checked and what files were found

**Improved logging:**
- Added `[parseResume]` prefixed logs throughout the function
- Logs folder path, file name, and available files when file is not found
- Logs success messages when file is found and signed URL is generated

**Better error messages:**
- Specific error when file doesn't exist: "Resume file not found at path: {path}. Please ensure the file upload completed successfully before parsing."
- Specific error when signed URL fails: "Failed to generate access URL for resume file"
- Error messages include the storage path for easier debugging

### 2. Backend: Enhanced Route Logging (`backend/src/routes/resume.ts`)

**Added detailed request logging:**
- Logs validation failures with error details
- Logs the start of parsing with user ID and storage path
- Logs successful parsing
- Logs parse failures with error details

**All logs prefixed with `[/api/resume/parse]` for easy filtering**

### 3. Frontend: Confirmed Upload Path (`src/hooks/useResumeParser.ts`)

**Now uses the confirmed upload path:**
- Waits for `uploadFile` to complete and returns `uploadResult`
- Verifies `uploadResult.fullPath` exists before proceeding
- Uses the confirmed path from the upload result instead of the constructed path
- Throws error if upload doesn't return a path

**Added logging:**
- Logs the intended upload path
- Logs the confirmed upload path after successful upload
- Logs the path being sent to the backend API

## Files Modified

1. `/home/carl/application-tracking/jobmatch-ai/backend/src/services/openai.service.ts`
   - Added file existence verification
   - Enhanced error messages
   - Added comprehensive logging

2. `/home/carl/application-tracking/jobmatch-ai/backend/src/routes/resume.ts`
   - Added request/response logging
   - Added error logging

3. `/home/carl/application-tracking/jobmatch-ai/src/hooks/useResumeParser.ts`
   - Use confirmed upload path from upload result
   - Added upload verification
   - Added logging

## Testing Instructions

### 1. Check Backend Logs

After deploying the backend, monitor the logs when attempting to upload a resume:

```bash
# If running locally
cd backend && npm run dev

# Look for these log patterns:
# [useResumeParser] Uploading file to: resumes/{userId}/{timestamp}_{filename}
# [useResumeParser] File uploaded successfully to: {confirmedPath}
# [useResumeParser] Sending parse request for path: {confirmedPath}
# [/api/resume/parse] Starting parse for user {userId}, path: {storagePath}
# [parseResume] Starting parse for path: {storagePath}
# [parseResume] Checking folder: resumes/{userId}
# [parseResume] Looking for file: {filename}
# [parseResume] File found, generating signed URL
# [parseResume] Signed URL generated successfully
# [parseResume] Parsing OpenAI response
# [parseResume] Successfully parsed resume
```

### 2. Test Upload Flow

1. Log in to the application
2. Navigate to the resume upload feature
3. Select a resume file (PDF or DOCX)
4. Click upload
5. Monitor browser console and network tab:
   - Should see upload logs in console
   - Should see POST request to `/api/resume/parse`
   - Check request body has `storagePath` field
   - Check response for parsed data or error message

### 3. Verify Supabase Storage

1. Go to Supabase dashboard
2. Navigate to Storage > files bucket
3. Check if the file exists at the path: `resumes/{userId}/{timestamp}_{filename}`
4. Verify the user has permission to upload files

### 4. Check RLS Policies

Verify the RLS policy on the 'files' bucket allows authenticated users to upload:

```sql
-- Check current policies
SELECT * FROM storage.policies WHERE bucket_id = 'files';

-- Required policy for uploads
-- Name: "Authenticated users can upload to their own folder"
-- Operation: INSERT
-- Policy:
-- (bucket_id = 'files' AND
--  (storage.foldername(name))[1] = 'resumes' AND
--  (storage.foldername(name))[2] = auth.uid()::text)
```

## Expected Behavior

### Success Case
1. User selects resume file
2. File uploads to `resumes/{userId}/{timestamp}_{filename}`
3. Frontend receives confirmation with `fullPath`
4. Frontend sends POST to `/api/resume/parse` with `storagePath: "{fullPath}"`
5. Backend verifies file exists in storage
6. Backend generates signed URL
7. Backend sends file to OpenAI for parsing
8. Backend returns parsed resume data
9. Frontend applies parsed data to user profile

### Failure Cases

**File Upload Fails:**
- Frontend shows error: "File upload failed - no path returned"
- User can retry upload

**File Not Found in Storage:**
- Backend logs: `[parseResume] File not found at path: {path}`
- Backend logs: `[parseResume] Available files in folder: {fileList}`
- Backend returns error: "Resume file not found at path: {path}. Please ensure the file upload completed successfully before parsing."
- Frontend shows error message

**Signed URL Generation Fails:**
- Backend logs: `[parseResume] Failed to generate signed URL: {error}`
- Backend returns error: "Failed to generate access URL for resume file"
- Frontend shows error message

**OpenAI Parsing Fails:**
- Backend logs: `[parseResume] Resume parsing failed: {error}`
- Backend returns error with details
- Frontend shows error message

## Monitoring

### Key Metrics to Watch
- Upload success rate
- Parse success rate
- Average time from upload to parsed result
- Error rate by type (upload failed, file not found, parsing failed)

### Log Queries

**Find all resume parse attempts:**
```
[/api/resume/parse]
```

**Find failed uploads:**
```
[useResumeParser] File upload failed
```

**Find files not found:**
```
[parseResume] File not found at path
```

**Find signed URL failures:**
```
[parseResume] Failed to generate signed URL
```

## Potential Issues and Solutions

### Issue: "File not found" but file exists in Supabase
**Cause:** Path mismatch between frontend and backend
**Solution:** Check the logs to compare:
- Path sent by frontend: `[useResumeParser] Sending parse request for path: {path}`
- Path received by backend: `[/api/resume/parse] Starting parse for user {userId}, path: {path}`
- They should match exactly

### Issue: Upload succeeds but parsing fails immediately
**Cause:** RLS policy blocking service role from reading file
**Solution:** Verify service role key has admin privileges and bypasses RLS

### Issue: Timing issues (file not found right after upload)
**Cause:** Supabase replication delay
**Solution:** Add small delay or retry logic if file not found immediately after upload

## Rollback Plan

If issues persist, revert these commits:
1. `backend/src/services/openai.service.ts` - Remove file existence check
2. `backend/src/routes/resume.ts` - Remove enhanced logging
3. `src/hooks/useResumeParser.ts` - Revert to original path handling

## Next Steps

1. Deploy backend changes to Railway
2. Deploy frontend changes
3. Test with real resume upload
4. Monitor logs for any issues
5. Collect metrics on success/failure rates

## Additional Diagnostics

Run the diagnostic script to test Supabase connectivity:

```bash
cd /home/carl/application-tracking/jobmatch-ai/backend
npx ts-node test-resume-endpoint.ts
```

This will test:
- Signed URL generation
- File listing in the bucket
- Bucket accessibility
- Request validation
