# Firebase Storage Testing Guide

This guide provides step-by-step instructions for testing Firebase Storage functionality in the JobMatch AI application.

---

## Prerequisites

Before testing, ensure:
1. Firebase Authentication is working (Phase 1 complete)
2. User can sign in to the application
3. Firebase Storage is enabled in Firebase Console
4. Storage rules are deployed: `firebase deploy --only storage`

---

## Automated Testing

### Run the Test Suite

The automated test suite verifies all storage functionality programmatically.

**Setup:**

1. Create a test user (if not already created):
```bash
npm run create-test-users
```

2. Set environment variables:
```bash
export TEST_USER_EMAIL="test@example.com"
export TEST_USER_PASSWORD="testpassword123"
```

**Run Tests:**

```bash
npm run test:storage
```

**Expected Output:**

```
🚀 Firebase Storage Integration Tests

============================================================
✅ User Authentication (250ms)
✅ Upload Profile Photo (PNG) (1200ms)
   URL: https://firebasestorage.googleapis.com/...
✅ Upload Profile Photo (JPEG) (1100ms)
✅ Upload Resume PDF (1500ms)
✅ Upload Cover Letter PDF (1400ms)
✅ File Size Validation (Should Reject >2MB) (800ms)
✅ Unauthorized Access Prevention (600ms)
✅ Delete Profile Photo (400ms)

============================================================

📊 Test Results: 8/8 passed (100.0%)

✅ All tests passed! Firebase Storage is properly configured.
```

**Test Coverage:**

The automated tests verify:
- ✅ User authentication before storage access
- ✅ Profile photo upload (PNG format)
- ✅ Profile photo upload (JPEG format)
- ✅ Resume PDF upload
- ✅ Cover letter PDF upload
- ✅ File size limits enforced by security rules
- ✅ Unauthorized access blocked by security rules
- ✅ File deletion works correctly

---

## Manual Testing

### Test 1: Profile Photo Upload

**Purpose:** Verify users can upload and update their profile photo.

**Steps:**

1. **Navigate to Profile Page:**
   - Sign in to the application
   - Go to "Profile & Resume" section
   - Locate the profile photo area (top of page)

2. **Upload Valid Photo:**
   - Click the "Change Photo" button
   - Select a JPEG/PNG image file **under 2MB**
   - Expected: Progress bar appears showing upload percentage
   - Expected: Success message "Profile photo updated successfully!"
   - Expected: New photo displays immediately
   - Expected: Photo persists after page refresh

3. **Verify in Firebase Console:**
   - Go to Firebase Console → Storage
   - Navigate to `users/{your-user-id}/profile/`
   - Expected: See `avatar.jpg` or `avatar.png`
   - Click file to preview
   - Verify it's the uploaded image

4. **Verify in Firestore:**
   - Go to Firebase Console → Firestore Database
   - Navigate to `users/{your-user-id}`
   - Check `profileImageUrl` field
   - Expected: Contains Firebase Storage download URL
   - Copy URL and open in browser
   - Expected: Image displays

**Error Cases to Test:**

- **File Too Large:**
  - Select image > 2MB
  - Expected: Error message "File size must be less than 2MB"
  - Expected: Upload does not proceed

- **Invalid File Type:**
  - Select a PDF or text file
  - Expected: Error message "File type must be one of: JPEG, PNG, WEBP, GIF"
  - Expected: Upload does not proceed

- **Network Error Simulation:**
  - Open browser DevTools → Network tab
  - Set throttling to "Offline"
  - Try to upload photo
  - Expected: Error message appears
  - Expected: Previous photo remains unchanged

**Success Criteria:**
- ✅ Valid images upload successfully
- ✅ Progress bar shows during upload
- ✅ Success message displays
- ✅ Photo updates in UI immediately
- ✅ Photo persists after refresh
- ✅ Invalid files rejected with helpful error messages

---

### Test 2: Resume File Upload

**Purpose:** Verify users can upload, view, and download resume files.

**Steps:**

1. **Navigate to Resume Files Section:**
   - Sign in to the application
   - Go to "Profile & Resume" section
   - Scroll to "Resume Files" card
   - If no files exist, you'll see "No files uploaded yet"

2. **Upload Resume File:**
   - Click "Upload New" button
   - Select a PDF, DOCX, or TXT file **under 5MB**
   - Expected: Progress bar appears
   - Expected: File appears in the file list
   - Expected: Shows file name, format, size, and upload timestamp

3. **Verify File Information:**
   - Check displayed metadata:
     - File name (e.g., "resume.pdf")
     - Format badge (e.g., "PDF")
     - File size (e.g., "245 KB")
     - Upload date (e.g., "Dec 19, 2025 2:30 PM")

4. **Download File:**
   - Click the download icon (↓) next to the file
   - Expected: Browser download dialog appears
   - Expected: File downloads with correct name
   - Open downloaded file
   - Expected: Content matches uploaded file

5. **Upload Multiple Formats:**
   - Upload the same resume in PDF format
   - Upload the same resume in DOCX format
   - Expected: Both files appear in list
   - Expected: Each has correct format badge

6. **Delete File:**
   - Click the delete icon (trash) next to a file
   - Expected: Confirmation dialog appears
   - Click "OK" to confirm
   - Expected: Loading spinner shows briefly
   - Expected: File disappears from list
   - Expected: File removed from Firebase Storage

7. **Verify in Firebase Console:**
   - Go to Firebase Console → Storage
   - Navigate to `users/{your-user-id}/resumes/`
   - Expected: See folders for each resume
   - Navigate to `users/{your-user-id}/resumes/{resume-id}/`
   - Expected: See `resume.pdf`, `resume.docx`, etc.
   - Click file to download and verify content

**Error Cases to Test:**

- **File Too Large:**
  - Select resume > 5MB
  - Expected: Error message "File size must be less than 5MB"

- **Invalid File Type:**
  - Select an image or video file
  - Expected: Error message "Invalid file format. Use PDF, DOCX, or TXT"

- **Download Non-Existent File:**
  - Manually call `downloadResume()` with invalid ID
  - Expected: Error message "Resume file not found"

**Success Criteria:**
- ✅ Resume files upload successfully
- ✅ Multiple formats supported (PDF, DOCX, TXT)
- ✅ File list displays all uploaded files
- ✅ Download works correctly
- ✅ Delete removes file from storage and list
- ✅ Error messages are clear and helpful

---

### Test 3: Cover Letter Upload

**Purpose:** Verify cover letter files can be uploaded and managed.

**Steps:**

1. **Navigate to Application:**
   - Go to "Applications" section
   - Click on an existing application (or generate a new one)
   - Locate cover letter section

2. **Upload Cover Letter:**
   - Click "Upload Cover Letter" button
   - Select a PDF file
   - Expected: Upload progress shown
   - Expected: File saved to storage
   - Storage path: `users/{userId}/cover-letters/{applicationId}/cover-letter.pdf`

3. **Download Cover Letter:**
   - Click download button
   - Expected: PDF downloads correctly
   - Verify content matches upload

4. **Verify in Firebase Console:**
   - Go to Firebase Console → Storage
   - Navigate to `users/{your-user-id}/cover-letters/{application-id}/`
   - Expected: See `cover-letter.pdf`

**Success Criteria:**
- ✅ Cover letters upload successfully
- ✅ Organized by application ID
- ✅ Download works correctly

---

### Test 4: Security & Authorization

**Purpose:** Verify storage security rules prevent unauthorized access.

**Steps:**

1. **Test Own Files Access:**
   - Sign in as User A
   - Upload profile photo
   - Expected: Upload succeeds
   - Download photo
   - Expected: Download succeeds

2. **Test Other User's Files (Browser DevTools):**
   - While signed in as User A
   - Open browser DevTools → Console
   - Try to access User B's file:
   ```javascript
   import { getStorage, ref, getDownloadURL } from 'firebase/storage'
   const storage = getStorage()
   const otherUserRef = ref(storage, 'users/other-user-id/profile/avatar.jpg')
   getDownloadURL(otherUserRef)
   ```
   - Expected: Error "User does not have permission to access this object"

3. **Test Unauthenticated Access:**
   - Sign out of the application
   - Try to access any storage URL directly in browser
   - Expected: Access denied or 404 error

4. **Test File Size Limits:**
   - Try to upload 3MB profile photo
   - Expected: Rejected by security rules
   - Error message in console about permission denied

**Success Criteria:**
- ✅ Users can access only their own files
- ✅ Unauthorized access is blocked
- ✅ Unauthenticated users cannot access files
- ✅ File size limits enforced server-side

---

### Test 5: Error Handling

**Purpose:** Verify graceful error handling in all scenarios.

**Steps:**

1. **Network Failure During Upload:**
   - Start uploading a large file
   - In DevTools, switch to "Offline" mode
   - Expected: Error message appears
   - Expected: UI returns to normal state (not stuck in loading)

2. **Delete Non-Existent File:**
   - Manually delete a file from Firebase Console
   - In the app, try to download that file
   - Expected: Error message "File not found"

3. **Concurrent Uploads:**
   - Upload multiple files simultaneously
   - Expected: All uploads shown in UI
   - Expected: Progress tracked independently
   - Expected: All complete successfully or show individual errors

4. **Browser Refresh During Upload:**
   - Start uploading a file
   - Immediately refresh the page
   - Expected: Upload stops gracefully
   - Expected: Partial file not left in storage
   - Expected: Can retry upload after page loads

**Success Criteria:**
- ✅ Network errors handled gracefully
- ✅ Missing files show helpful error messages
- ✅ Concurrent uploads work correctly
- ✅ No corrupt files or stuck states

---

## Performance Testing

### Test Upload Speed

**Purpose:** Verify uploads complete in reasonable time.

**Test Files:**

1. Small profile photo (50 KB):
   - Expected: < 1 second

2. Medium profile photo (500 KB):
   - Expected: < 2 seconds

3. Large profile photo (1.5 MB):
   - Expected: < 5 seconds

4. Resume PDF (1 MB):
   - Expected: < 3 seconds

5. Large resume (4 MB):
   - Expected: < 10 seconds

**Network Conditions:**

Test on:
- Fast WiFi (100+ Mbps)
- Slow WiFi (5 Mbps) - use DevTools throttling
- Mobile 4G (use DevTools throttling)

**Success Criteria:**
- ✅ Uploads complete in acceptable time
- ✅ Progress bar provides feedback
- ✅ UI remains responsive during upload

---

## Accessibility Testing

**Purpose:** Verify file upload is accessible to all users.

**Steps:**

1. **Keyboard Navigation:**
   - Tab to "Change Photo" button
   - Press Enter to trigger file picker
   - Select file using keyboard
   - Expected: Upload proceeds normally

2. **Screen Reader:**
   - Enable screen reader (VoiceOver on Mac, NVDA on Windows)
   - Navigate to profile photo
   - Expected: Hears "Change Photo" button
   - Expected: Upload progress announced
   - Expected: Success/error messages announced

3. **High Contrast Mode:**
   - Enable high contrast mode
   - Verify all upload UI is visible
   - Expected: Progress bars visible
   - Expected: Error messages readable

**Success Criteria:**
- ✅ Keyboard accessible
- ✅ Screen reader friendly
- ✅ Visible in high contrast mode

---

## Cross-Browser Testing

Test on:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

Verify:
- File picker works
- Upload succeeds
- Progress tracking accurate
- Downloads work

---

## Mobile Testing

**Purpose:** Verify storage works on mobile devices.

**Steps:**

1. **Mobile Upload (Camera):**
   - On mobile device, go to profile page
   - Click "Change Photo"
   - Expected: Options include "Take Photo" and "Choose from Library"
   - Take new photo with camera
   - Expected: Photo uploads successfully

2. **Mobile Upload (Gallery):**
   - Click "Change Photo"
   - Choose photo from gallery
   - Expected: Upload works
   - Expected: Progress shown
   - Expected: Photo displays

3. **Mobile Download:**
   - Click download icon on resume
   - Expected: File downloads to device
   - Expected: Can open in PDF viewer

**Success Criteria:**
- ✅ Camera integration works
- ✅ Gallery picker works
- ✅ Uploads succeed on mobile
- ✅ Downloads work on mobile

---

## Troubleshooting

### Common Issues

**Issue: "Permission denied" error**
- Cause: Storage rules not deployed
- Solution: Run `firebase deploy --only storage`

**Issue: "User not authenticated" error**
- Cause: Auth token expired or invalid
- Solution: Sign out and sign back in

**Issue: "File size must be less than XMB" error**
- Cause: File exceeds size limit
- Solution: Compress file or choose smaller file

**Issue: Upload hangs at 99%**
- Cause: Network timeout or large file
- Solution: Check network, try smaller file

**Issue: Photo not displaying after upload**
- Cause: Firestore update failed
- Solution: Check Firestore rules, verify profile update hook

---

## Test Environment Setup

### Local Development

1. **Firebase Emulators (Optional):**
```bash
# Start storage emulator
firebase emulators:start --only storage

# Update src/lib/firebase.ts to connect to emulator
connectStorageEmulator(storage, 'localhost', 9199)
```

2. **Test Data:**
   - Create test images (use online generators)
   - Create test PDFs (use Google Docs → Download as PDF)
   - Keep files under size limits

### Production Testing

1. Use test account (not production data)
2. Upload test files only
3. Delete test files after testing
4. Monitor Firebase Console → Storage → Usage

---

## Reporting Issues

If you find bugs, report with:

1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Browser/device info**
5. **Console errors (screenshot)**
6. **Network tab (screenshot)**

Example:
```
Title: Profile photo upload fails on Safari

Steps:
1. Sign in to app on Safari 17
2. Click "Change Photo"
3. Select JPEG file (500 KB)
4. Click upload

Expected: Photo uploads successfully
Actual: Error "Upload failed: Network error"

Console: [screenshot]
Network: [screenshot]
Browser: Safari 17.1 on macOS 14
```

---

## Success Checklist

Before marking Phase 3 complete, verify:

- ✅ All automated tests pass (8/8)
- ✅ Profile photo upload works
- ✅ Profile photo download works
- ✅ Resume file upload works
- ✅ Resume file download works
- ✅ Resume file delete works
- ✅ Cover letter upload works
- ✅ File size limits enforced
- ✅ File type validation works
- ✅ Unauthorized access blocked
- ✅ Error messages are helpful
- ✅ Progress tracking accurate
- ✅ Works on Chrome, Firefox, Safari, Edge
- ✅ Works on mobile devices
- ✅ Accessible via keyboard
- ✅ Screen reader compatible

---

## Next Phase

After completing Phase 3 testing, proceed to:

**Phase 4: Cloud Functions**
- AI resume generation
- LinkedIn OAuth callback
- Stripe webhooks
- Scheduled job scraping

See: `/home/carl/.claude/plans/majestic-wobbling-cook.md`

---

## Resources

- **Firebase Storage Docs:** https://firebase.google.com/docs/storage
- **React Firebase Hooks:** https://github.com/CSFrequency/react-firebase-hooks
- **Security Rules Reference:** https://firebase.google.com/docs/storage/security
- **Test Script:** `/jobmatch-ai/scripts/test-storage.ts`
- **Deployment Script:** `/jobmatch-ai/scripts/deploy-storage.sh`
- **Verification Doc:** `/jobmatch-ai/PHASE3-STORAGE-VERIFICATION.md`
