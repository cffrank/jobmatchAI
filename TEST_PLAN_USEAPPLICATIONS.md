# Test Plan: useApplications Refactoring

## Overview
This test plan verifies the refactored `useApplications` hook works correctly with the Workers API.

## Pre-requisites
- Backend Workers API running locally or deployed
- Frontend dev server running
- Valid Supabase credentials configured
- Test user account created

## Environment Setup

### Local Development
```bash
# Terminal 1: Start Workers API
cd workers
npm run dev

# Terminal 2: Start Frontend
cd ..
npm run dev
```

### Environment Variables
Verify these are set:
```bash
# .env.local
VITE_BACKEND_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Test Cases

### 1. Authentication & Token Handling

**Test 1.1: JWT Token Retrieval**
- **Action**: Log in to application
- **Expected**: JWT token retrieved from Supabase auth session
- **Verify**: Network tab shows Authorization header on API calls

**Test 1.2: Unauthenticated Access**
- **Action**: Log out and try to access applications page
- **Expected**: Redirected to login page, no API calls made
- **Verify**: Console shows "Not authenticated" error if attempted

### 2. Fetch Applications (GET /api/applications)

**Test 2.1: Fetch First Page**
- **Action**: Navigate to applications page
- **Expected**:
  - Loading spinner appears
  - GET request to `/api/applications?page=1&limit=20`
  - Applications display in grid
- **Verify**:
  - Network tab shows successful 200 response
  - State: `loading=false`, `error=null`, `applications.length > 0`

**Test 2.2: Pagination**
- **Action**: Scroll to bottom, click "Load More"
- **Expected**:
  - GET request to `/api/applications?page=2&limit=20`
  - More applications appended to list
- **Verify**:
  - `hasMore` state updates correctly
  - No duplicate applications

**Test 2.3: Empty State**
- **Action**: Create new test user with no applications
- **Expected**:
  - GET request returns empty array
  - Empty state UI displays
- **Verify**: `applications.length === 0`, no errors

**Test 2.4: Error Handling**
- **Action**: Stop Workers API, reload page
- **Expected**:
  - Error message displays
  - Retry option available
- **Verify**: `error` state contains Error object

### 3. Create Application (POST /api/applications)

**Test 3.1: Create New Application**
- **Action**: Call `addApplication()` with valid data
- **Expected**:
  - POST request to `/api/applications`
  - Application created in database
  - Real-time subscription updates UI
- **Verify**:
  - Network tab shows 201 Created response
  - New application appears in list immediately

**Test 3.2: Create with Variants**
- **Action**: Create application with multiple variants
- **Expected**:
  - Variants saved to `application_variants` table
  - Variants returned in response
- **Verify**: Variants array contains all submitted variants

**Test 3.3: Validation Errors**
- **Action**: Call `addApplication()` without required fields
- **Expected**:
  - 400 Bad Request response
  - Validation error message
- **Verify**: Error message specifies missing fields

**Test 3.4: Rate Limiting**
- **Action**: Create 10+ applications rapidly
- **Expected**:
  - Rate limit hit (429 response)
  - Error message: "Too many requests"
- **Verify**: Rate limiter middleware active

### 4. Fetch Single Application (GET /api/applications/:id)

**Test 4.1: Fetch by ID**
- **Action**: Call `useApplication(id)` hook
- **Expected**:
  - GET request to `/api/applications/{id}`
  - Application data with variants returned
- **Verify**:
  - `application` state populated
  - Variants array present

**Test 4.2: Not Found**
- **Action**: Fetch with invalid ID
- **Expected**:
  - 404 Not Found response
  - Error state set
- **Verify**: `application=null`, `error` contains "not found"

**Test 4.3: Unauthorized Access**
- **Action**: Try to fetch another user's application
- **Expected**:
  - 404 Not Found (ownership check)
- **Verify**: No data leaked to unauthorized user

### 5. Update Application (PATCH /api/applications/:id)

**Test 5.1: Update Status**
- **Action**: Call `updateApplication(id, { status: 'submitted' })`
- **Expected**:
  - PATCH request to `/api/applications/{id}`
  - Status updated in database
  - Real-time subscription updates UI
- **Verify**:
  - Network tab shows 200 OK
  - Application status changes immediately

**Test 5.2: Update Selected Variant**
- **Action**: Change selected variant
- **Expected**:
  - PATCH with `selectedVariantId`
  - UI reflects new selection
- **Verify**: Selected variant ID updated

**Test 5.3: Update Multiple Fields**
- **Action**: Update status + selectedVariantId together
- **Expected**:
  - Both fields updated in single request
- **Verify**: Database shows both changes

**Test 5.4: Ownership Verification**
- **Action**: Try to update another user's application
- **Expected**:
  - 404 Not Found (ownership check)
- **Verify**: No unauthorized updates allowed

### 6. Delete Application (DELETE /api/applications/:id)

**Test 6.1: Delete Application**
- **Action**: Call `deleteApplication(id)`
- **Expected**:
  - DELETE request to `/api/applications/{id}`
  - Application removed from database
  - Real-time subscription removes from UI
- **Verify**:
  - Network tab shows 204 No Content
  - Application disappears from list

**Test 6.2: Cascading Delete**
- **Action**: Delete application with variants
- **Expected**:
  - Application and variants both deleted
- **Verify**: Check database for orphaned variants (should be none)

**Test 6.3: Delete Non-Existent**
- **Action**: Delete already deleted application
- **Expected**:
  - 404 or graceful handling
- **Verify**: No crash, appropriate error

### 7. Real-Time Subscriptions

**Test 7.1: Insert Subscription**
- **Action**: Create application via API directly (not UI)
- **Expected**:
  - Real-time subscription detects INSERT
  - New application appears in UI without refresh
- **Verify**: Supabase channel receives event

**Test 7.2: Update Subscription**
- **Action**: Update application via API directly
- **Expected**:
  - Real-time subscription detects UPDATE
  - Application updates in UI without refresh
- **Verify**: Changes reflect immediately

**Test 7.3: Delete Subscription**
- **Action**: Delete application via API directly
- **Expected**:
  - Real-time subscription detects DELETE
  - Application removed from UI without refresh
- **Verify**: Application disappears

**Test 7.4: Channel Cleanup**
- **Action**: Navigate away from applications page
- **Expected**:
  - Channel unsubscribed
  - No memory leaks
- **Verify**: Check browser DevTools for subscriptions

### 8. Error Recovery

**Test 8.1: Network Timeout**
- **Action**: Simulate slow network (Chrome DevTools)
- **Expected**:
  - Loading state persists
  - Eventually times out with error
- **Verify**: User can retry

**Test 8.2: Token Expiry**
- **Action**: Manually expire token, make API call
- **Expected**:
  - 401 Unauthorized
  - Redirected to login
- **Verify**: Session refreshes or user re-authenticates

**Test 8.3: Server Error**
- **Action**: Cause 500 error on backend
- **Expected**:
  - Error message displays
  - User can retry
- **Verify**: App doesn't crash

### 9. Performance

**Test 9.1: Large Dataset**
- **Action**: Create 100+ applications, fetch first page
- **Expected**:
  - Fast response (<500ms)
  - Only 20 items fetched
- **Verify**: No N+1 queries, pagination works

**Test 9.2: Rapid Updates**
- **Action**: Update application multiple times quickly
- **Expected**:
  - All updates processed
  - No race conditions
- **Verify**: Final state is correct

**Test 9.3: Memory Leaks**
- **Action**: Navigate to/from applications page 20 times
- **Expected**:
  - No memory growth
  - Subscriptions cleaned up
- **Verify**: Chrome DevTools Memory profiler

### 10. Edge Cases

**Test 10.1: Empty Variants Array**
- **Action**: Create application with `variants: []`
- **Expected**:
  - Application created
  - No errors
- **Verify**: Empty variants handled gracefully

**Test 10.2: Null Fields**
- **Action**: Create application with `jobId: null`
- **Expected**:
  - Application created
  - Null handled correctly
- **Verify**: No null reference errors

**Test 10.3: Special Characters**
- **Action**: Create application with special characters in title
- **Expected**:
  - Characters properly escaped
  - XSS prevented
- **Verify**: No script execution

## Automated Testing

### Unit Tests
```bash
npm run test:unit -- useApplications.test.ts
```

**Test Coverage:**
- ✅ mapApiApplication() - handles snake_case and camelCase
- ✅ mapStatusFromApi() - maps all status values
- ✅ Fetch applications with pagination
- ✅ Error handling
- ✅ Loading states

### Integration Tests
```bash
npm run test:integration -- applications.test.ts
```

**Test Coverage:**
- ✅ Full CRUD flow
- ✅ Authentication required
- ✅ Ownership verification
- ✅ Variant management

### E2E Tests (Playwright)
```bash
npm run test:e2e -- applications.spec.ts
```

**Test Coverage:**
- ✅ Login → Create → Update → Delete flow
- ✅ Pagination and infinite scroll
- ✅ Real-time updates
- ✅ Error states

## Success Criteria

All tests must pass with:
- ✅ No direct Supabase database calls in frontend
- ✅ JWT authentication on all API requests
- ✅ Real-time subscriptions working
- ✅ No TypeScript errors
- ✅ No ESLint warnings
- ✅ All CRUD operations functional
- ✅ Pagination working correctly
- ✅ Error handling graceful
- ✅ No memory leaks

## Regression Testing

Verify these existing features still work:
- [ ] Application generator (AI-powered)
- [ ] Application export (PDF/DOCX)
- [ ] Email sending
- [ ] Job matching integration
- [ ] Dashboard statistics
- [ ] Search and filtering

## Deployment Checklist

- [ ] All tests pass locally
- [ ] Code review completed
- [ ] API endpoints deployed to Workers
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Staging deployment successful
- [ ] Smoke tests on staging
- [ ] Production deployment
- [ ] Monitor error rates
- [ ] Rollback plan ready
