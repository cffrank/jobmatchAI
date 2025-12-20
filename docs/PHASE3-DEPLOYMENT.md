# Phase 3: Firebase Storage Deployment Guide

This document provides step-by-step instructions for deploying Firebase Storage to production.

---

## Pre-Deployment Checklist

Before deploying, verify all prerequisites are met:

### 1. Code Review ✅

- ✅ `storage.rules` file exists and is properly configured
- ✅ All hooks implemented (`useFileUpload`, `useProfilePhoto`, `useResumeExport`)
- ✅ All components implemented (`ProfilePhotoUpload`, `FileManager`)
- ✅ Components integrated into pages
- ✅ No console errors in development
- ✅ TypeScript compilation succeeds: `npm run build`

### 2. Firebase Configuration ✅

- ✅ Firebase project created: `ai-career-os-139db`
- ✅ Firebase Storage enabled in console
- ✅ Billing enabled (required for storage operations)
- ✅ Firebase CLI installed: `npm install -g firebase-tools`
- ✅ Logged in to Firebase: `firebase login`
- ✅ Correct project selected: `firebase use ai-career-os-139db`

### 3. Environment Variables ✅

Verify all required environment variables are set:

```bash
# .env.local (local development)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=ai-career-os-139db.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ai-career-os-139db
VITE_FIREBASE_STORAGE_BUCKET=ai-career-os-139db.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 4. Testing ✅

Run all tests before deployment:

```bash
# Set test user credentials
export TEST_USER_EMAIL="test@example.com"
export TEST_USER_PASSWORD="testpassword123"

# Run automated test suite
npm run test:storage
```

**Expected Result:** All 8 tests should pass (100%)

---

## Deployment Steps

### Step 1: Review Storage Rules

Open and review the security rules one final time:

```bash
cat storage.rules
```

**Key Points to Verify:**

1. **Authentication Required:**
   - All operations require `request.auth != null`

2. **User Isolation:**
   - Users can only access `users/{userId}` where `request.auth.uid == userId`

3. **File Type Validation:**
   - Images: `image/*`
   - Documents: `application/pdf`, `.docx`, `text/plain`

4. **File Size Limits:**
   - Profile photos: 2MB max
   - Resumes/Cover letters: 5MB max
   - Export files: 10MB max

5. **Special Rules:**
   - Invoices: Read-only for users (Cloud Functions can write)
   - Profile photos: Publicly readable but only owner can write

### Step 2: Verify Firebase Project

Confirm you're deploying to the correct project:

```bash
firebase use
```

**Expected Output:**
```
Active Project: ai-career-os-139db
```

If incorrect, switch projects:
```bash
firebase use ai-career-os-139db
```

### Step 3: Dry Run (Optional)

Review what will be deployed without actually deploying:

```bash
firebase deploy --only storage --dry-run
```

### Step 4: Deploy Storage Rules

**Option A: Using Deployment Script (Recommended)**

```bash
npm run deploy:storage
```

This script will:
1. Check Firebase CLI is installed
2. Verify you're logged in
3. Show current project
4. Prompt for confirmation
5. Deploy storage rules
6. Show deployment summary
7. Provide verification links

**Option B: Manual Deployment**

```bash
cd /home/carl/application-tracking/jobmatch-ai
firebase deploy --only storage
```

**Expected Output:**

```
=== Deploying to 'ai-career-os-139db'...

i  deploying storage
i  storage: checking storage.rules for compilation errors...
✔  storage: rules file storage.rules compiled successfully

✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/ai-career-os-139db/overview
```

### Step 5: Verify Deployment

#### A. Firebase Console Verification

1. **Open Firebase Console:**
   ```
   https://console.firebase.google.com/project/ai-career-os-139db/storage/rules
   ```

2. **Verify Rules Tab:**
   - Click on "Rules" tab
   - Check that rules show the latest timestamp
   - Verify rule content matches your `storage.rules` file

3. **Check Files Tab:**
   - Click on "Files" tab
   - You should see a `users/` folder if any files have been uploaded
   - Folder structure should match: `users/{userId}/profile/`, etc.

#### B. Application Testing

1. **Sign in to Production App:**
   - Go to your deployed app URL
   - Sign in with a test account

2. **Test Profile Photo Upload:**
   - Navigate to Profile & Resume page
   - Click "Change Photo"
   - Upload a test image
   - Verify upload succeeds
   - Verify photo displays

3. **Test Resume File Upload:**
   - Navigate to Resume Files section
   - Upload a PDF file
   - Verify upload succeeds
   - Download the file
   - Verify download works

4. **Test Security:**
   - Open browser console
   - Try to access another user's file path
   - Should receive permission denied error

#### C. Monitor Firebase Console

Monitor for errors in real-time:

1. **Go to Firebase Console → Storage → Usage**
   - Check upload/download activity
   - Verify no unusual spikes or errors

2. **Go to Firebase Console → Storage → Files**
   - Verify files are organized correctly
   - Check file permissions

---

## Post-Deployment Verification

### 1. Functional Tests

Run through all test scenarios from `STORAGE-TESTING-GUIDE.md`:

- ✅ Profile photo upload (valid file)
- ✅ Profile photo upload (invalid file - should fail)
- ✅ Profile photo upload (oversized - should fail)
- ✅ Resume file upload (PDF)
- ✅ Resume file upload (DOCX)
- ✅ Resume file download
- ✅ Resume file delete
- ✅ Unauthorized access (should fail)

### 2. Performance Checks

Monitor upload speeds:

- Small file (50KB): Should complete in < 1 second
- Medium file (500KB): Should complete in < 2 seconds
- Large file (2MB): Should complete in < 5 seconds

### 3. Error Monitoring

Check for errors in:

1. **Browser Console:**
   - No 403 (permission denied) errors for authorized operations
   - Proper error messages for unauthorized operations

2. **Firebase Console → Storage → Usage:**
   - No unusual error rates
   - Operations completing successfully

3. **Application Error Logs:**
   - No storage-related errors reported by users

---

## Rollback Plan

If issues occur after deployment, you can rollback:

### View Deployment History

```bash
firebase deploy:list
```

**Output:**
```
Deployment 1: storage (2025-12-19 14:30:00)
Deployment 2: storage (2025-12-18 10:15:00)
```

### Rollback to Previous Version

```bash
firebase deploy --only storage --version <previous-version-id>
```

Or manually restore previous rules:

1. Go to Firebase Console → Storage → Rules
2. Click "Version History"
3. Select previous version
4. Click "Restore"

---

## Monitoring & Maintenance

### Daily Monitoring

Check these metrics in Firebase Console:

1. **Storage Usage:**
   - Total storage consumed
   - Growth rate
   - Quota remaining

2. **Operations:**
   - Upload count
   - Download count
   - Error rate

3. **Bandwidth:**
   - Egress (download) bandwidth
   - Ingress (upload) bandwidth

### Weekly Tasks

- Review storage costs
- Check for orphaned files (files with no Firestore reference)
- Verify backup strategy
- Review access logs for suspicious activity

### Monthly Tasks

- Review and optimize storage rules
- Check for outdated/unused files
- Analyze storage costs vs. budget
- Update documentation if rules change

---

## Troubleshooting

### Issue: Deployment Fails

**Error:** `storage.rules compilation errors`

**Solution:**
1. Check syntax in `storage.rules`
2. Verify all helper functions are defined
3. Run local validation: `firebase deploy --only storage --dry-run`

---

**Error:** `Permission denied: not logged in`

**Solution:**
```bash
firebase login
firebase use ai-career-os-139db
firebase deploy --only storage
```

---

**Error:** `No project active`

**Solution:**
```bash
firebase use ai-career-os-139db
```

---

### Issue: Files Not Uploading After Deployment

**Symptoms:** Users get "permission denied" errors

**Diagnosis:**
1. Check if rules were actually deployed
2. Verify user is authenticated
3. Check file path matches rules

**Solution:**
1. Re-deploy rules: `firebase deploy --only storage`
2. Check Firebase Console → Rules for latest timestamp
3. Verify user authentication token is valid
4. Check browser console for detailed error

---

### Issue: High Storage Costs

**Symptoms:** Unexpected charges for storage

**Diagnosis:**
1. Check total storage size
2. Check download/upload bandwidth
3. Look for orphaned files

**Solutions:**
1. Implement file cleanup Cloud Function
2. Add file retention policies
3. Compress images before upload
4. Use CDN for frequently accessed files

---

## Security Best Practices

### 1. Regular Rule Reviews

- Review storage rules quarterly
- Check for overly permissive rules
- Verify no hardcoded user IDs
- Test unauthorized access attempts

### 2. File Validation

Current validation:
- File type checking (client + server)
- File size limits (client + server)
- User authentication required
- Owner-only access

Additional recommendations:
- Virus scanning (Cloud Functions)
- Content moderation for profile photos
- Rate limiting for uploads

### 3. Monitoring

Set up alerts for:
- Unusual upload volumes
- Large files (> 5MB)
- High bandwidth usage
- Repeated permission denials

### 4. Backup Strategy

Firebase Storage doesn't auto-backup:

**Recommendation:**
1. Critical files should reference Firestore documents
2. Implement Cloud Function to backup important files
3. Consider Google Cloud Storage for archival

---

## Cost Optimization

### Current Pricing (Firebase Spark Plan - Free Tier)

- Storage: 5 GB free
- Downloads: 1 GB/day free
- Uploads: 20,000/day free

**Beyond Free Tier (Blaze Plan):**
- Storage: $0.026/GB/month
- Downloads: $0.12/GB
- Uploads: $0.05/GB

### Optimization Strategies

1. **Image Compression:**
   - Use Cloud Functions to auto-compress profile photos
   - Target: < 200KB per profile photo

2. **File Cleanup:**
   - Delete old resume versions after 90 days
   - Remove files when user deletes account

3. **CDN Caching:**
   - Cache frequently accessed files
   - Reduce download bandwidth costs

4. **Lifecycle Policies:**
   - Archive old files to Google Cloud Storage (cheaper)
   - Delete temp/export files after 7 days

---

## Documentation Updates

After deployment, update:

1. **README.md:**
   - Add storage deployment status
   - Update feature checklist

2. **CHANGELOG.md:**
   - Document Phase 3 completion
   - List storage features deployed

3. **API Documentation:**
   - Document storage hooks
   - Add usage examples

4. **User Guide:**
   - How to upload profile photo
   - How to manage resume files

---

## Success Criteria

Phase 3 deployment is successful when:

- ✅ Storage rules deployed without errors
- ✅ Rules visible in Firebase Console
- ✅ Test uploads succeed in production
- ✅ Test downloads succeed in production
- ✅ Security rules block unauthorized access
- ✅ No console errors reported
- ✅ Performance meets targets
- ✅ All manual tests pass
- ✅ Monitoring shows healthy metrics

---

## Next Steps

After successful Phase 3 deployment:

### Immediate (Same Day)
1. Monitor Firebase Console for errors
2. Test with real users (beta testers)
3. Collect feedback on upload experience

### Short Term (1 Week)
1. Review storage usage patterns
2. Optimize based on user behavior
3. Address any reported issues

### Phase 4 Preparation
1. Plan Cloud Functions implementation
2. Design AI resume generation
3. Set up LinkedIn OAuth
4. Configure Stripe webhooks

**See:** `/home/carl/.claude/plans/majestic-wobbling-cook.md` (Phase 4)

---

## Deployment Checklist

Use this checklist when deploying:

```
□ Code review completed
□ All tests passing locally
□ TypeScript compilation succeeds
□ Firebase project verified
□ Logged in to Firebase CLI
□ Correct project selected
□ storage.rules reviewed
□ Backup of current rules (if any)
□ Deploy command executed
□ Deployment succeeded
□ Rules visible in Firebase Console
□ Test upload in production
□ Test download in production
□ Test delete in production
□ Test unauthorized access blocked
□ Monitor for 1 hour post-deployment
□ Document deployment time/version
□ Update team/stakeholders
□ Phase 3 marked complete
```

---

## Support Contacts

**Firebase Support:**
- Documentation: https://firebase.google.com/docs/storage
- Community: https://stackoverflow.com/questions/tagged/firebase-storage
- Console: https://console.firebase.google.com/

**Internal Team:**
- Phase 3 Owner: [Your Name]
- Firebase Admin: [Admin Contact]
- Deployment Date: [Date]
- Version: 1.0.0

---

## Deployment Log Template

```
Date: 2025-12-19
Time: 14:30 UTC
Deployed By: [Your Name]
Project: ai-career-os-139db
Component: Firebase Storage (Phase 3)

Files Deployed:
- storage.rules

Deployment Command:
firebase deploy --only storage

Status: ✅ SUCCESS

Test Results:
- Profile photo upload: ✅ PASS
- Resume file upload: ✅ PASS
- File download: ✅ PASS
- File delete: ✅ PASS
- Unauthorized access: ✅ BLOCKED (as expected)

Monitoring:
- Storage usage: 0.05 GB
- Upload count: 12
- Download count: 8
- Error rate: 0%

Issues: None
Notes: First deployment of storage rules. All tests passing.

Next Deployment: Phase 4 (Cloud Functions)
```

---

**🎉 You're ready to deploy Phase 3! Good luck!**
