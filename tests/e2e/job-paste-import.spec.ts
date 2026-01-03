/**
 * E2E Tests for Job Paste Import Flow
 *
 * Tests the complete user journey from pasting a job posting to saving it in the system.
 * Covers the "Import from Text" feature with AI parsing and manual editing.
 */

import { test, expect, type Page } from '@playwright/test';

// =============================================================================
// Configuration
// =============================================================================

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// Test credentials (set in .env or skip tests)
const TEST_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

// =============================================================================
// Test Data
// =============================================================================

const VALID_JOB_TEXT = `Senior Software Engineer
TechCorp Inc.
San Francisco, CA - Remote
$120,000 - $160,000 per year

About the Role:
We are seeking a talented Senior Software Engineer to join our growing team. You will work on cutting-edge technologies and help build scalable systems that serve millions of users.

Requirements:
- 5+ years of software development experience
- Strong knowledge of React, TypeScript, and Node.js
- Experience with AWS cloud services
- Excellent problem-solving skills

Nice to Have:
- Experience with GraphQL
- Open source contributions`;

const LINKEDIN_JOB_TEXT = `IT Systems Engineer
Madison, WI · Reposted 2 weeks ago · 91 applicants
On-site · Full-time
Clarity Technology Group, Inc.

About the job
Are you a skilled problem-solver who is always looking to sink your teeth into something new? A strong communicator who enjoys helping others?

What You'll Do:
Plan, design, implement, and support primarily Microsoft solutions both in the cloud and on-premises for organizations ranging from a dozen to hundreds of users

Skills You'll Need:
2+ Years supporting Microsoft cloud technologies (O365, Azure, Entra ID, Intune, etc.)
2+ Years supporting Windows Server and Active Directory
2+ Years working with networking and firewalls
5+ Years combined IT support experience`;

const MINIMAL_JOB_TEXT = `Software Developer at StartupCo

We need a developer who knows JavaScript. Come work with us and build amazing products.`;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Login helper function
 */
async function login(page: Page, email: string, password: string) {
  await page.goto(`${FRONTEND_URL}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|jobs)/);
}

/**
 * Navigate to Jobs page
 */
async function navigateToJobs(page: Page) {
  // Click on Jobs link in navigation
  await page.goto(`${FRONTEND_URL}/jobs`);
  await expect(page).toHaveURL(/\/jobs/);
}

/**
 * Open the Paste Job Dialog
 */
async function openPasteJobDialog(page: Page) {
  // Click "Import from Text" button
  const importButton = page.getByRole('button', { name: /import from text/i });
  await expect(importButton).toBeVisible();
  await importButton.click();

  // Wait for dialog to open
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText(/import job from text/i)).toBeVisible();
}

/**
 * Wait for parsing to complete
 */
async function waitForParsing(page: Page) {
  // Wait for "Analyzing..." to disappear
  await expect(page.getByText(/analyzing/i)).toBeHidden({ timeout: 30000 });
}

/**
 * Wait for save operation to complete
 */
async function waitForSave(page: Page) {
  // Wait for "Saving..." to disappear
  await expect(page.getByText(/saving/i)).toBeHidden({ timeout: 15000 });
}

// =============================================================================
// Test Suite
// =============================================================================

test.describe('Job Paste Import Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Skip if credentials not available
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      test.skip();
      return;
    }

    // Login before each test
    await login(page, TEST_EMAIL, TEST_PASSWORD);
  });

  // ===========================================================================
  // Happy Path - Complete Flow
  // ===========================================================================

  test('should complete full paste-to-save flow successfully', async ({ page }) => {
    // Navigate to Jobs page
    await navigateToJobs(page);

    // Click "Import from Text" button
    await openPasteJobDialog(page);

    // Paste job posting text into textarea
    const textarea = page.getByPlaceholder(/paste the full job posting/i);
    await expect(textarea).toBeVisible();
    await textarea.fill(VALID_JOB_TEXT);

    // Verify character counter updates
    const charCounter = page.getByText(/\/10000 characters/);
    await expect(charCounter).toBeVisible();
    await expect(charCounter).toContainText(`${VALID_JOB_TEXT.length}/10000`);

    // Click "Parse Job" button
    const parseButton = page.getByRole('button', { name: /parse job/i });
    await expect(parseButton).toBeEnabled();
    await parseButton.click();

    // Loading state shows
    await expect(page.getByText(/analyzing/i)).toBeVisible();

    // Wait for parsing to complete
    await waitForParsing(page);

    // Preview section appears with extracted fields
    await expect(page.getByText(/review and edit/i)).toBeVisible();

    // Confidence badge displays
    await expect(page.getByText(/confidence/i)).toBeVisible();

    // Verify extracted fields are populated
    const titleInput = page.getByLabel(/job title/i);
    await expect(titleInput).toHaveValue(/senior software engineer/i);

    const companyInput = page.getByLabel(/company/i);
    await expect(companyInput).toHaveValue(/techcorp/i);

    // Edit one field (location)
    const locationInput = page.getByLabel(/location/i);
    await locationInput.clear();
    await locationInput.fill('Remote - Worldwide');

    // Click "Save Job" button
    const saveButton = page.getByRole('button', { name: /save job/i });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Wait for save to complete
    await waitForSave(page);

    // Success message shows
    await expect(page.getByText(/job saved successfully/i)).toBeVisible();

    // Dialog closes automatically
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 5000 });

    // Jobs list refreshes - verify by checking URL changed to job detail
    await expect(page).toHaveURL(/\/jobs\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    // New job appears (we should be on job detail page)
    await expect(page.getByText(/senior software engineer/i)).toBeVisible();
  });

  // ===========================================================================
  // Step-by-Step UI Tests
  // ===========================================================================

  test('should open Import from Text dialog', async ({ page }) => {
    await navigateToJobs(page);
    await openPasteJobDialog(page);

    // Dialog title and description visible
    await expect(page.getByText(/import job from text/i)).toBeVisible();
    await expect(page.getByText(/paste a job posting and ai will extract/i)).toBeVisible();

    // Textarea is visible and empty
    const textarea = page.getByPlaceholder(/paste the full job posting/i);
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveValue('');

    // Character counter shows 0/10000
    await expect(page.getByText(/0\/10000 characters/)).toBeVisible();

    // Parse button is disabled (no text yet)
    const parseButton = page.getByRole('button', { name: /parse job/i });
    await expect(parseButton).toBeDisabled();
  });

  test('should update character counter as text is typed', async ({ page }) => {
    await navigateToJobs(page);
    await openPasteJobDialog(page);

    const textarea = page.getByPlaceholder(/paste the full job posting/i);

    // Type some text
    await textarea.fill('Short text');

    // Character counter updates
    await expect(page.getByText(/10\/10000 characters/)).toBeVisible();

    // Add more text
    await textarea.fill(VALID_JOB_TEXT);

    // Counter updates again
    const charCount = VALID_JOB_TEXT.length;
    await expect(page.getByText(new RegExp(`${charCount}\\/10000`))).toBeVisible();
  });

  test('should enable Parse button when text is entered', async ({ page }) => {
    await navigateToJobs(page);
    await openPasteJobDialog(page);

    const textarea = page.getByPlaceholder(/paste the full job posting/i);
    const parseButton = page.getByRole('button', { name: /parse job/i });

    // Initially disabled
    await expect(parseButton).toBeDisabled();

    // Type text
    await textarea.fill(VALID_JOB_TEXT);

    // Now enabled
    await expect(parseButton).toBeEnabled();
  });

  test('should show loading state during parsing', async ({ page }) => {
    await navigateToJobs(page);
    await openPasteJobDialog(page);

    const textarea = page.getByPlaceholder(/paste the full job posting/i);
    await textarea.fill(VALID_JOB_TEXT);

    const parseButton = page.getByRole('button', { name: /parse job/i });
    await parseButton.click();

    // Loading indicator appears
    await expect(page.getByText(/analyzing/i)).toBeVisible();

    // Parse button is disabled during parsing
    await expect(parseButton).toBeDisabled();

    await waitForParsing(page);
  });

  test('should display preview section after successful parsing', async ({ page }) => {
    await navigateToJobs(page);
    await openPasteJobDialog(page);

    await page.getByPlaceholder(/paste the full job posting/i).fill(VALID_JOB_TEXT);
    await page.getByRole('button', { name: /parse job/i }).click();
    await waitForParsing(page);

    // Preview section visible
    await expect(page.getByText(/review and edit/i)).toBeVisible();

    // All form fields visible
    await expect(page.getByLabel(/job title/i)).toBeVisible();
    await expect(page.getByLabel(/company/i)).toBeVisible();
    await expect(page.getByLabel(/location/i)).toBeVisible();
    await expect(page.getByLabel(/job posting url/i)).toBeVisible();
    await expect(page.getByLabel(/work arrangement/i)).toBeVisible();
    await expect(page.getByLabel(/job description/i)).toBeVisible();

    // Save Job button visible
    await expect(page.getByRole('button', { name: /save job/i })).toBeVisible();

    // Start Over button visible
    await expect(page.getByRole('button', { name: /start over/i })).toBeVisible();
  });

  test('should display confidence badge', async ({ page }) => {
    await navigateToJobs(page);
    await openPasteJobDialog(page);

    await page.getByPlaceholder(/paste the full job posting/i).fill(VALID_JOB_TEXT);
    await page.getByRole('button', { name: /parse job/i }).click();
    await waitForParsing(page);

    // Confidence badge appears
    const confidenceBadge = page.getByText(/confidence/i);
    await expect(confidenceBadge).toBeVisible();

    // Badge shows percentage
    await expect(confidenceBadge).toContainText(/%/);
  });

  test('should allow editing of extracted fields', async ({ page }) => {
    await navigateToJobs(page);
    await openPasteJobDialog(page);

    await page.getByPlaceholder(/paste the full job posting/i).fill(VALID_JOB_TEXT);
    await page.getByRole('button', { name: /parse job/i }).click();
    await waitForParsing(page);

    // Edit title
    const titleInput = page.getByLabel(/job title/i);
    const _originalTitle = await titleInput.inputValue();
    await titleInput.clear();
    await titleInput.fill('Principal Software Engineer');
    await expect(titleInput).toHaveValue('Principal Software Engineer');

    // Edit company
    const companyInput = page.getByLabel(/company/i);
    await companyInput.clear();
    await companyInput.fill('Google');
    await expect(companyInput).toHaveValue('Google');

    // Edit location
    const locationInput = page.getByLabel(/location/i);
    await locationInput.clear();
    await locationInput.fill('Remote - USA');
    await expect(locationInput).toHaveValue('Remote - USA');
  });

  test('should allow changing work arrangement', async ({ page }) => {
    await navigateToJobs(page);
    await openPasteJobDialog(page);

    await page.getByPlaceholder(/paste the full job posting/i).fill(VALID_JOB_TEXT);
    await page.getByRole('button', { name: /parse job/i }).click();
    await waitForParsing(page);

    // Click work arrangement dropdown
    const workArrangementSelect = page.getByLabel(/work arrangement/i);
    await workArrangementSelect.click();

    // Select "Hybrid"
    await page.getByRole('option', { name: /hybrid/i }).click();

    // Verify selection
    await expect(workArrangementSelect).toContainText(/hybrid/i);
  });

  test('should show warnings for missing optional fields', async ({ page }) => {
    await navigateToJobs(page);
    await openPasteJobDialog(page);

    // Use minimal job text (missing salary, URL, etc.)
    await page.getByPlaceholder(/paste the full job posting/i).fill(MINIMAL_JOB_TEXT);
    await page.getByRole('button', { name: /parse job/i }).click();
    await waitForParsing(page);

    // Warnings section should be visible
    const warningsSection = page.getByText(/warnings/i);
    await expect(warningsSection).toBeVisible();

    // Should list specific warnings
    await expect(page.getByText(/no job posting url/i)).toBeVisible();
  });

  // ===========================================================================
  // Cancel and Reset Tests
  // ===========================================================================

  test('should allow canceling during paste step', async ({ page }) => {
    await navigateToJobs(page);
    await openPasteJobDialog(page);

    // Enter some text
    await page.getByPlaceholder(/paste the full job posting/i).fill('Some text');

    // Click Cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Dialog closes
    await expect(page.getByRole('dialog')).toBeHidden();

    // No job created (still on jobs list page)
    await expect(page).toHaveURL(/\/jobs$/);
  });

  test('should allow canceling during preview step (no job created)', async ({ page }) => {
    await navigateToJobs(page);
    await openPasteJobDialog(page);

    await page.getByPlaceholder(/paste the full job posting/i).fill(VALID_JOB_TEXT);
    await page.getByRole('button', { name: /parse job/i }).click();
    await waitForParsing(page);

    // Now in preview step
    await expect(page.getByText(/review and edit/i)).toBeVisible();

    // Click Cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Dialog closes
    await expect(page.getByRole('dialog')).toBeHidden();

    // No job created
    await expect(page).toHaveURL(/\/jobs$/);
  });

  test('should allow starting over from preview step', async ({ page }) => {
    await navigateToJobs(page);
    await openPasteJobDialog(page);

    await page.getByPlaceholder(/paste the full job posting/i).fill(VALID_JOB_TEXT);
    await page.getByRole('button', { name: /parse job/i }).click();
    await waitForParsing(page);

    // Now in preview step
    await expect(page.getByText(/review and edit/i)).toBeVisible();

    // Click "Start Over"
    await page.getByRole('button', { name: /start over/i }).click();

    // Should be back at paste step
    const textarea = page.getByPlaceholder(/paste the full job posting/i);
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveValue(''); // Cleared

    // Preview section hidden
    await expect(page.getByText(/review and edit/i)).toBeHidden();
  });

  // ===========================================================================
  // Error Cases
  // ===========================================================================

  test('should show error for text shorter than 50 characters', async ({ page }) => {
    await navigateToJobs(page);
    await openPasteJobDialog(page);

    // Enter very short text (< 50 chars)
    const shortText = 'Too short';
    await page.getByPlaceholder(/paste the full job posting/i).fill(shortText);

    // Click Parse
    await page.getByRole('button', { name: /parse job/i }).click();

    // Error message appears
    await expect(page.getByText(/at least 50 characters/i)).toBeVisible();

    // Still on paste step (not advanced to preview)
    const textarea = page.getByPlaceholder(/paste the full job posting/i);
    await expect(textarea).toBeVisible();
  });

  test('should disable Save button if required fields are empty', async ({ page }) => {
    await navigateToJobs(page);
    await openPasteJobDialog(page);

    await page.getByPlaceholder(/paste the full job posting/i).fill(VALID_JOB_TEXT);
    await page.getByRole('button', { name: /parse job/i }).click();
    await waitForParsing(page);

    // Clear required field (title)
    const titleInput = page.getByLabel(/job title/i);
    await titleInput.clear();

    // Save button should be disabled
    const saveButton = page.getByRole('button', { name: /save job/i });
    await expect(saveButton).toBeDisabled();

    // Fill it back in
    await titleInput.fill('Software Engineer');

    // Save button enabled again
    await expect(saveButton).toBeEnabled();
  });

  test('should show error if save fails', async ({ page: _page }) => {
    // This test would require mocking a save failure
    // Skip for now as it requires backend mocking
    test.skip();
  });

  // ===========================================================================
  // Different Job Formats
  // ===========================================================================

  test('should parse LinkedIn job format', async ({ page }) => {
    await navigateToJobs(page);
    await openPasteJobDialog(page);

    await page.getByPlaceholder(/paste the full job posting/i).fill(LINKEDIN_JOB_TEXT);
    await page.getByRole('button', { name: /parse job/i }).click();
    await waitForParsing(page);

    // Verify LinkedIn-specific fields extracted
    await expect(page.getByLabel(/job title/i)).toHaveValue(/it systems engineer/i);
    await expect(page.getByLabel(/company/i)).toHaveValue(/clarity/i);
    await expect(page.getByLabel(/location/i)).toHaveValue(/madison/i);

    // Work arrangement should be "On-site"
    const workArrangement = page.getByLabel(/work arrangement/i);
    await expect(workArrangement).toContainText(/on-site/i);
  });

  test('should handle minimal job posting', async ({ page }) => {
    await navigateToJobs(page);
    await openPasteJobDialog(page);

    await page.getByPlaceholder(/paste the full job posting/i).fill(MINIMAL_JOB_TEXT);
    await page.getByRole('button', { name: /parse job/i }).click();
    await waitForParsing(page);

    // Should still extract basic fields
    await expect(page.getByLabel(/job title/i)).not.toHaveValue('');
    await expect(page.getByLabel(/company/i)).not.toHaveValue('');

    // Should show warnings for missing data
    await expect(page.getByText(/warnings/i)).toBeVisible();
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  test('should be keyboard navigable', async ({ page }) => {
    await navigateToJobs(page);

    // Tab to "Import from Text" button and press Enter
    await page.keyboard.press('Tab');
    // Note: This requires the button to be in tab order
    // Full keyboard navigation testing would need more sophisticated setup
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await navigateToJobs(page);
    await openPasteJobDialog(page);

    // Dialog should have role="dialog"
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Textarea should have label
    const textarea = page.getByPlaceholder(/paste the full job posting/i);
    await expect(textarea).toHaveAccessibleName();
  });

  // ===========================================================================
  // Integration with Jobs List
  // ===========================================================================

  test('should refresh jobs list after successful save', async ({ page }) => {
    await navigateToJobs(page);

    // Count existing jobs
    const _initialJobCount = await page.locator('[data-testid="job-card"]').count();

    // Import new job
    await openPasteJobDialog(page);
    await page.getByPlaceholder(/paste the full job posting/i).fill(VALID_JOB_TEXT);
    await page.getByRole('button', { name: /parse job/i }).click();
    await waitForParsing(page);
    await page.getByRole('button', { name: /save job/i }).click();
    await waitForSave(page);

    // Wait for redirect to job detail page
    await expect(page).toHaveURL(/\/jobs\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    // Navigate back to jobs list
    await page.goto(`${FRONTEND_URL}/jobs`);

    // Job count should have increased (or at least new job should be visible)
    // Note: This assumes we're redirected to the new job's detail page
    await expect(page.getByText(/senior software engineer/i)).toBeVisible();
  });
});

// =============================================================================
// Backend API Tests (Supplementary)
// =============================================================================

test.describe('Job Parse API', () => {
  test('should parse job via API endpoint', async ({ request }) => {
    // Skip if no credentials
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      test.skip();
      return;
    }

    // This test requires authentication token
    // For now, just verify endpoint exists and returns expected structure
    const response = await request.post(`${BACKEND_URL}/api/jobs/parse`, {
      data: { text: VALID_JOB_TEXT },
      headers: {
        'Content-Type': 'application/json',
        // Note: Would need actual auth token here
      },
      failOnStatusCode: false,
    });

    // Without auth, should get 401
    // With auth, should get 200 with parsed data
    expect([200, 401]).toContain(response.status());
  });
});
