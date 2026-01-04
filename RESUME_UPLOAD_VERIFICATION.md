# Resume Upload Feature - Verification Checklist

## Pre-Deployment Verification

### Backend Tests
- [x] Diagnostic test passes (`npx ts-node test-resume-endpoint.ts`)
- [x] Upload flow test passes (`npx ts-node test-file-upload-flow.ts`)
- [x] File existence check implemented in `parseResume()`
- [x] Enhanced logging added to backend routes and services
- [x] Error messages are user-friendly and informative

### Frontend Tests
- [x] Frontend uses confirmed upload path from `uploadResult.fullPath`
- [x] Frontend verifies upload succeeded before calling backend API
- [x] Frontend logging added for debugging

### Code Review
- [x] TypeScript compilation passes
- [x] No unused imports or variables
- [x] Error handling covers all failure cases
- [x] Logging is consistent and helpful

## Deployment Steps

### 1. Backend Deployment
```bash
# Ensure all changes are committed
git status

# Deploy to Railway (if using git-based deployment)
git add .
git commit -m "fix: enhance resume upload error handling and logging"
git push origin main

# Or use Railway CLI
railway up
```

### 2. Frontend Deployment
```bash
# Build frontend
npm run build

# Deploy to your hosting platform
# (Vercel, Netlify, etc.)
```

## Post-Deployment Verification

### 1. Check Backend Health
- [ ] Backend is running without errors
- [ ] Can access `/api/health` endpoint (if available)
- [ ] Environment variables are set correctly
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `OPENAI_API_KEY`

### 2. Test Resume Upload Flow

#### Test Case 1: Successful Upload
**Steps:**
1. Log in to the application
2. Navigate to profile/resume upload page
3. Select a valid PDF resume
4. Click upload
5. Wait for parsing to complete

**Expected Result:**
- Upload progress indicator shows progress
- Parse progress indicator shows progress
- Resume data is extracted and displayed
- Success message shown
- Data is saved to profile

**Logs to Check:**
```
Browser Console:
- [useResumeParser] Uploading file to: resumes/{userId}/{timestamp}_{filename}
- [useResumeParser] File uploaded successfully to: {path}
- [useResumeParser] Sending parse request for path: {path}

Backend Logs:
- [/api/resume/parse] Starting parse for user {userId}
- [parseResume] Starting parse for path: {path}
- [parseResume] File found, generating signed URL
- [parseResume] Successfully parsed resume
```

#### Test Case 2: Invalid File Type
**Steps:**
1. Try to upload a .txt file or image file

**Expected Result:**
- Error message: "File type must be one of: PDF, DOCX"
- Upload is rejected before sending to backend

#### Test Case 3: File Too Large
**Steps:**
1. Try to upload a file larger than 10MB

**Expected Result:**
- Error message: "File size must be less than 10MB"
- Upload is rejected before sending to backend

#### Test Case 4: Network Error During Upload
**Steps:**
1. Start upload
2. Disconnect network mid-upload

**Expected Result:**
- Error message about network failure
- User can retry upload

### 3. Monitor Logs

#### Backend Logs (Railway)
```bash
# View live logs
railway logs

# Or via Railway dashboard
# https://railway.app -> Your Project -> Deployments -> Logs
```

**Look for:**
- Any error messages
- Successful parse operations
- Failed parse operations with clear error messages
- File not found errors (should be rare)

#### Frontend Logs (Browser Console)
**Look for:**
- Upload progress logs
- Confirmed upload path
- Parse request logs
- Any error messages

### 4. Verify Supabase Storage

**Check via Supabase Dashboard:**
1. Go to Supabase project
2. Navigate to Storage > files bucket
3. Open resumes folder
4. Check for uploaded files organized by user ID
5. Verify files are accessible

**Sample structure:**
```
files/
└── resumes/
    ├── user-abc-123/
    │   ├── 1766719000000_resume.pdf
    │   └── 1766720000000_updated-resume.pdf
    └── user-def-456/
        └── 1766719100000_resume.docx
```

### 5. Verify RLS Policies

**Run in Supabase SQL Editor:**
```sql
-- Check policies on files bucket
SELECT
  policyname,
  operation,
  qual,
  with_check
FROM storage.policies
WHERE bucket_id = 'files';
```

**Expected Policies:**
- INSERT policy: Allows authenticated users to upload to their own folder
- SELECT policy: Allows users to read their own files
- DELETE policy: Allows users to delete their own files

**Verify policy:**
```sql
-- Should allow user to upload to resumes/{their-user-id}/
-- Policy check condition should be:
-- (storage.foldername(name))[1] = 'resumes'
-- AND (storage.foldername(name))[2] = auth.uid()::text
```

## Troubleshooting

### Issue: Upload succeeds but parse returns 400

**Diagnosis:**
1. Check backend logs for `[parseResume] File not found at path`
2. Check what files are in the folder: `[parseResume] Available files in folder:`
3. Compare uploaded path with requested path

**Common Causes:**
- Path mismatch between frontend and backend
- RLS policy blocking service role from reading file
- File was deleted between upload and parse

**Solution:**
- Verify `uploadResult.fullPath` matches path sent to backend
- Check RLS policies allow service role to read files
- Add retry logic if needed

### Issue: Upload fails silently

**Diagnosis:**
1. Check browser console for upload errors
2. Check network tab for failed requests
3. Check Supabase Storage for uploaded files

**Common Causes:**
- RLS policy blocking user from uploading
- Invalid authentication token
- Network connectivity issues

**Solution:**
- Verify user is authenticated
- Check RLS INSERT policy on files bucket
- Check network connectivity

### Issue: Parse fails with OpenAI error

**Diagnosis:**
1. Check backend logs for OpenAI API errors
2. Verify OpenAI API key is set
3. Check if file format is supported

**Common Causes:**
- Invalid or expired OpenAI API key
- File format not supported by GPT-4 Vision
- OpenAI API rate limit exceeded

**Solution:**
- Verify `OPENAI_API_KEY` environment variable
- Ensure file is PDF or DOCX
- Check OpenAI API usage and rate limits

## Success Criteria

- [ ] Can successfully upload and parse PDF resumes
- [ ] Can successfully upload and parse DOCX resumes
- [ ] Error messages are clear and actionable
- [ ] Logs provide enough detail for debugging
- [ ] No 400 errors for valid uploads
- [ ] No silent failures
- [ ] Files are stored correctly in Supabase Storage
- [ ] Parsed data is accurate and complete

## Metrics to Monitor

### Key Performance Indicators
- **Upload Success Rate:** Should be > 95%
- **Parse Success Rate:** Should be > 90%
- **Average Upload Time:** Should be < 5 seconds
- **Average Parse Time:** Should be < 15 seconds
- **Error Rate:** Should be < 5%

### Error Tracking
- Track "File not found" errors (should be rare)
- Track "Upload failed" errors
- Track "Parse failed" errors
- Track OpenAI API errors

### User Experience
- Time from file selection to parsed data displayed
- Number of retries needed
- User satisfaction with accuracy of parsed data

## Rollback Triggers

Consider rolling back if:
- Upload success rate drops below 80%
- More than 10% of users experiencing errors
- Critical bug discovered that blocks resume upload entirely
- Performance degrades significantly

## Post-Deployment Actions

1. **Monitor for 24 hours:**
   - Watch error rates
   - Review user feedback
   - Check support tickets

2. **Collect metrics:**
   - Upload success rate
   - Parse success rate
   - Average processing time

3. **Optimize if needed:**
   - Adjust timeout values
   - Add retry logic
   - Optimize file size limits

4. **Document lessons learned:**
   - Update this checklist
   - Add any new edge cases discovered
   - Improve error messages based on user feedback
