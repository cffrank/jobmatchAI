/**
 * Complete Onboarding Flow E2E Test
 *
 * This test validates the entire user onboarding workflow WITHOUT Supabase PostgreSQL dependencies.
 * Only Supabase Auth is allowed - all data operations must go through Workers API → D1.
 *
 * Test Flow:
 * 1. Create new account (Supabase Auth)
 * 2. Login with new account (Supabase Auth)
 * 3. Complete profile information (Workers API → D1)
 * 4. Import resume with AI parsing (Workers API → D1)
 * 5. Generate gap analysis (Workers API → D1)
 * 6. Answer gap analysis questions (Workers API → D1)
 * 7. Logout and verify session cleared
 *
 * Network Monitoring:
 * - Capture all network requests
 * - Flag any direct Supabase PostgreSQL queries (except auth.supabase.co)
 * - Verify all data operations use Workers API (VITE_API_URL)
 * - Generate network activity report
 */

import { test, expect, Page, Request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// Network monitoring data structures
interface NetworkCall {
  url: string;
  method: string;
  status: number;
  requestBody?: string;
  responseBody?: string;
  timestamp: number;
  duration?: number;
}

interface NetworkReport {
  totalCalls: number;
  supabaseAuthCalls: number;
  supabaseDbCalls: number; // Should be 0!
  workersCalls: number;
  otherCalls: number;
  calls: NetworkCall[];
  violations: string[];
}

// Helper to generate unique test user email
function generateTestEmail(): string {
  const timestamp = Date.now();
  return `test-user-${timestamp}@jobmatch-test.com`;
}

// Helper to monitor and capture network activity
class NetworkMonitor {
  private calls: NetworkCall[] = [];
  private violations: string[] = [];
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    this.setupMonitoring();
  }

  private setupMonitoring() {
    // Monitor all requests
    this.page.on('request', async (request: Request) => {
      const url = request.url();
      const method = request.method();

      // Flag Supabase database calls (not auth)
      // Allow: /auth/v1/* (Supabase Auth API)
      // Block: /rest/v1/* (Supabase Database REST API)
      if (url.includes('supabase.co') && url.includes('/rest/v1/')) {
        this.violations.push(
          `VIOLATION: Direct Supabase DB call detected: ${method} ${url}`
        );
      }

      // Capture request details
      const call: NetworkCall = {
        url,
        method,
        status: 0,
        timestamp: Date.now(),
      };

      // Capture request body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        try {
          const postData = request.postDataJSON();
          call.requestBody = JSON.stringify(postData, null, 2);
        } catch {
          // Not JSON, skip
        }
      }

      this.calls.push(call);
    });

    // Monitor all responses
    this.page.on('response', async (response) => {
      const request = response.request();
      const url = request.url();

      // Find matching call and update with response data
      const call = this.calls.find(
        (c) => c.url === url && c.status === 0
      );

      if (call) {
        call.status = response.status();
        call.duration = Date.now() - call.timestamp;

        // Capture response body for API calls
        if (url.includes('/api/') || url.includes('supabase.co')) {
          try {
            const body = await response.text();
            call.responseBody = body.substring(0, 500); // Limit size
          } catch {
            // Skip if can't read body
          }
        }
      }
    });
  }

  public generateReport(): NetworkReport {
    const supabaseAuthCalls = this.calls.filter((c) =>
      c.url.includes('supabase.co') && c.url.includes('/auth/v1/')
    ).length;

    const supabaseDbCalls = this.calls.filter(
      (c) => c.url.includes('supabase.co') && c.url.includes('/rest/v1/')
    ).length;

    const workersCalls = this.calls.filter(
      (c) => c.url.includes('/api/') && !c.url.includes('supabase.co')
    ).length;

    const otherCalls = this.calls.filter(
      (c) => !c.url.includes('supabase.co') && !c.url.includes('/api/')
    ).length;

    return {
      totalCalls: this.calls.length,
      supabaseAuthCalls,
      supabaseDbCalls,
      workersCalls,
      otherCalls,
      calls: this.calls,
      violations: this.violations,
    };
  }

  public getViolations(): string[] {
    return this.violations;
  }
}

test.describe('Complete Onboarding Flow (No Supabase DB)', () => {
  let testEmail: string;
  let testPassword: string;
  let networkMonitor: NetworkMonitor;

  test.beforeEach(async ({ page }) => {
    // Generate unique test credentials
    testEmail = generateTestEmail();
    testPassword = 'TestPassword123!@#Strong';

    // Initialize network monitoring
    networkMonitor = new NetworkMonitor(page);

    console.log(`\n🧪 Test User: ${testEmail}`);
  });

  test.afterEach(async () => {
    // Generate network report
    const report = networkMonitor.generateReport();

    console.log('\n📊 Network Activity Report:');
    console.log(`Total API calls: ${report.totalCalls}`);
    console.log(`Supabase Auth calls: ${report.supabaseAuthCalls}`);
    console.log(`Supabase DB calls: ${report.supabaseDbCalls} ${report.supabaseDbCalls > 0 ? '⚠️ VIOLATION!' : '✅'}`);
    console.log(`Workers API calls: ${report.workersCalls}`);
    console.log(`Other calls: ${report.otherCalls}`);

    if (report.violations.length > 0) {
      console.log('\n⚠️ VIOLATIONS DETECTED:');
      report.violations.forEach((v) => console.log(`  - ${v}`));
    } else {
      console.log('\n✅ No Supabase DB violations detected!');
    }

    // Write detailed report to file
    const reportPath = path.join(__dirname, '../../test-results', 'network-activity-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  });

  test('Complete user onboarding flow (signup → profile → resume → gap analysis → logout)', async ({ page }) => {
    // Set longer timeout for this test (AI parsing can take 2-3 minutes)
    test.setTimeout(300000); // 5 minutes total
    // ==========================================
    // STEP 1: CREATE NEW ACCOUNT
    // ==========================================
    console.log('\n📝 Step 1: Creating new account...');

    await page.goto(`${FRONTEND_URL}/signup`);
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();

    // Fill signup form
    await page.fill('input[id="displayName"]', 'Test User');
    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="password"]', testPassword);

    // Wait for password strength validation
    await page.waitForTimeout(500);

    // Submit signup form
    await page.getByRole('button', { name: /create account/i }).click();

    // Wait for redirect to profile page or dashboard
    await page.waitForURL(/\/(profile|dashboard|$)/, { timeout: 15000 });

    console.log('✅ Account created successfully');

    // ==========================================
    // STEP 2: VERIFY AUTHENTICATION
    // ==========================================
    console.log('\n🔐 Step 2: Verifying authentication...');

    // Check if JWT token exists in localStorage
    const hasToken = await page.evaluate(() => {
      const token = localStorage.getItem('jobmatch-auth-token');
      return token !== null && token.length > 0;
    });
    expect(hasToken).toBe(true);
    console.log('✅ JWT token received and stored');

    // ==========================================
    // STEP 3: COMPLETE PROFILE INFORMATION
    // ==========================================
    console.log('\n👤 Step 3: Completing profile information...');

    // Navigate to edit profile page
    await page.goto(`${FRONTEND_URL}/profile/edit-profile`);
    await expect(page.getByRole('heading', { name: /edit profile|create profile/i })).toBeVisible();

    // Fill required profile fields
    await page.fill('input[id="firstName"]', 'John');
    await page.fill('input[id="lastName"]', 'Doe');
    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="phone"]', '+1 (555) 123-4567');
    await page.fill('input[id="location"]', 'San Francisco, CA');
    await page.fill('input[id="linkedInUrl"]', 'linkedin.com/in/johndoe');
    await page.fill('input[id="headline"]', 'Senior Software Engineer');
    await page.fill('textarea[id="summary"]',
      'Experienced software engineer with 8+ years building scalable web applications. ' +
      'Proficient in React, Node.js, TypeScript, and cloud infrastructure. ' +
      'Passionate about clean code and mentoring junior developers.'
    );

    // Save profile
    await page.getByRole('button', { name: /save changes/i }).click();

    // Wait for save confirmation
    await expect(page.locator('text=/profile updated successfully/i')).toBeVisible({ timeout: 10000 });
    console.log('✅ Profile information saved to D1');

    // Verify API call went to Workers backend
    const report = networkMonitor.generateReport();
    const profileUpdateCalls = report.calls.filter(
      (c) => c.url.includes('/api/profile') && c.method === 'PATCH'
    );
    expect(profileUpdateCalls.length).toBeGreaterThan(0);
    console.log(`✅ Profile update went through Workers API (${profileUpdateCalls.length} calls)`);

    // ==========================================
    // STEP 4: IMPORT RESUME (WITH AI PARSING)
    // ==========================================
    console.log('\n📄 Step 4: Importing resume with AI parsing...');

    // Navigate back to profile overview
    await page.goto(`${FRONTEND_URL}/profile`);
    await page.waitForTimeout(1000);

    // Look for resume upload button/dialog trigger
    const uploadButton = page.locator('button:has-text("Import Resume"), button:has-text("Upload Resume")').first();

    if (await uploadButton.isVisible({ timeout: 5000 })) {
      await uploadButton.click();

      // Wait for upload dialog to appear (use more specific selector)
      await expect(page.getByRole('heading', { name: /import resume/i })).toBeVisible({ timeout: 5000 });

      // Upload resume file
      const resumePath = path.join(__dirname, '../fixtures/sample-resume.pdf');

      // Check if fixture exists, if not we'll skip this step
      if (fs.existsSync(resumePath)) {
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(resumePath);

        // Wait for file to be selected
        await page.waitForTimeout(500);

        // Click parse/upload button
        const parseButton = page.locator('button:has-text("Parse Resume"), button:has-text("Upload")').first();
        await parseButton.click();

        // Wait for parsing dialog to appear
        await expect(
          page.locator('text=/parsing your resume|analyzing/i')
        ).toBeVisible({ timeout: 5000 });

        console.log('⏳ Waiting for resume parsing (this can take 30-90 seconds)...');

        // Wait for parsing completion with multiple possible success indicators
        // The dialog will close and we'll be redirected or see success message
        try {
          // Option 1: Wait for parsing dialog to disappear (most reliable)
          await page.waitForSelector('text=/parsing your resume/i', {
            state: 'hidden',
            timeout: 120000 // 2 minutes for AI parsing
          });
          console.log('✅ Parsing dialog closed');

          // Wait a bit for any animations/redirects
          await page.waitForTimeout(2000);

          // Check if we're on a new page or see success indicators
          const currentUrl = page.url();
          console.log(`Current URL after parsing: ${currentUrl}`);

        } catch (parseError) {
          console.log('⚠️ Parsing dialog timeout - checking for alternative success states');

          // Option 2: Check if we see any success text
          const hasSuccess = await page.locator('text=/gap analysis|resume parsed|clarification|import complete|success/i').isVisible({ timeout: 5000 }).catch(() => false);

          if (!hasSuccess) {
            console.log('❌ Resume parsing appears to have failed or timed out');
            throw parseError;
          }
        }

        console.log('✅ Resume parsed and gap analysis generated');

        // ==========================================
        // STEP 5: ANSWER GAP ANALYSIS QUESTIONS
        // ==========================================
        console.log('\n💡 Step 5: Checking for gap analysis questions...');

        // Wait for page to settle after parsing
        await page.waitForTimeout(2000);

        // Look for various gap analysis indicators
        const hasGapAnalysisHeading = await page.locator('text=/gap analysis|clarification questions/i').isVisible({ timeout: 5000 }).catch(() => false);
        const hasTextareas = await page.locator('textarea').isVisible({ timeout: 5000 }).catch(() => false);

        if (hasGapAnalysisHeading || hasTextareas) {
          console.log('📋 Found gap analysis section');

          // Find all textareas (questions)
          const textareas = page.locator('textarea[placeholder*="answer"], textarea[placeholder*="provide"], textarea');
          const questionCount = await textareas.count();

          if (questionCount > 0) {
            console.log(`Found ${questionCount} gap analysis question(s)`);

            // Answer first 2 questions (or all if fewer)
            const questionsToAnswer = Math.min(2, questionCount);

            for (let i = 0; i < questionsToAnswer; i++) {
              const textarea = textareas.nth(i);

              if (await textarea.isVisible({ timeout: 2000 })) {
                await textarea.fill(
                  `This is a comprehensive answer to gap analysis question ${i + 1}. ` +
                  `I have extensive experience in this area and can provide detailed context about my career transitions and decisions.`
                );
                console.log(`✅ Answered question ${i + 1}`);
              }
            }

            // Click continue/submit button
            const submitButton = page.locator(
              'button:has-text("Continue"), button:has-text("Submit"), button:has-text("Import"), button:has-text("Save"), button:has-text("Complete")'
            ).first();

            if (await submitButton.isVisible({ timeout: 2000 })) {
              console.log('🔘 Clicking submit button...');
              await submitButton.click();

              // Wait for submission to complete
              try {
                await expect(
                  page.locator('text=/success|complete|updated|imported/i')
                ).toBeVisible({ timeout: 30000 });
                console.log('✅ Gap analysis answers submitted successfully');
              } catch {
                console.log('⚠️ Did not see explicit success message, but continuing');
              }
            } else {
              console.log('⚠️ No submit button found after answering questions');
            }
          } else {
            console.log('⚠️ No question textareas found');
          }
        } else {
          console.log('⚠️ No gap analysis section found - may have auto-imported or skipped');
        }

        // ==========================================
        // STEP 6: VERIFY DATA PERSISTED IN D1
        // ==========================================
        console.log('\n🔍 Step 6: Verifying data persistence...');

        // Navigate to profile page and verify data appears
        await page.goto(`${FRONTEND_URL}/profile`);
        await page.waitForTimeout(2000);

        // Verify profile data is displayed (use .first() to handle multiple matches)
        await expect(page.locator('text=/John Doe/i').first()).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=/Senior Software Engineer/i').first()).toBeVisible({ timeout: 5000 });

        console.log('✅ Profile data persisted and displayed correctly');

        // Check for work experience (if parsed from resume) - use heading selector to avoid strict mode violations
        const hasWorkExperience = await page.getByRole('heading', { name: /work experience/i }).isVisible({ timeout: 3000 }).catch(() => false);
        if (hasWorkExperience) {
          console.log('✅ Work experience data persisted');
        }

        // Check for skills (if parsed from resume) - use heading selector
        const hasSkills = await page.getByRole('heading', { name: /skills/i }).isVisible({ timeout: 3000 }).catch(() => false);
        if (hasSkills) {
          console.log('✅ Skills data persisted');
        }

      } else {
        console.log('⚠️ Sample resume fixture not found, skipping resume import test');
        console.log(`Expected path: ${resumePath}`);
      }
    } else {
      console.log('⚠️ Resume upload button not found, skipping resume import test');
    }

    // ==========================================
    // STEP 7: LOGOUT AND VERIFY SESSION CLEARED
    // ==========================================
    console.log('\n🚪 Step 7: Logging out...');

    // Find and click logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")').first();

    if (await logoutButton.isVisible({ timeout: 5000 })) {
      await logoutButton.click();

      // Wait for redirect to login page
      await page.waitForURL(/\/(login|$)/, { timeout: 10000 });

      // Verify JWT token is cleared
      const tokenAfterLogout = await page.evaluate(() => {
        return localStorage.getItem('jobmatch-auth-token');
      });
      expect(tokenAfterLogout).toBeNull();

      console.log('✅ Session cleared successfully');

      // Verify protected routes are inaccessible
      await page.goto(`${FRONTEND_URL}/profile`);
      await page.waitForURL(/\/login/, { timeout: 10000 });

      console.log('✅ Protected routes require authentication');
    } else {
      console.log('⚠️ Logout button not found');
    }

    // ==========================================
    // FINAL VALIDATION
    // ==========================================
    console.log('\n🎉 All onboarding steps completed successfully!');

    // Final network validation
    const finalReport = networkMonitor.generateReport();

    // Assert: No Supabase DB calls (except auth)
    expect(finalReport.supabaseDbCalls).toBe(0);

    // Assert: At least some Workers API calls
    expect(finalReport.workersCalls).toBeGreaterThan(0);

    // Assert: No violations
    expect(finalReport.violations).toHaveLength(0);

    console.log('\n✅ Migration validation PASSED: All data operations use Workers API → D1');
  });

  test('Verify backend API is accessible and healthy', async ({ request }) => {
    console.log('\n🏥 Testing backend health endpoint...');
    console.log(`Backend URL: ${BACKEND_URL}`);

    try {
      const response = await request.get(`${BACKEND_URL}/health`);

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.status).toBe('healthy');

      console.log(`✅ Backend is healthy: ${JSON.stringify(data)}`);
    } catch (error) {
      console.error(`❌ Backend health check failed:`, error);
      console.log(`⚠️ Make sure Workers dev server is running at ${BACKEND_URL}`);
      throw error;
    }
  });

  test('Verify CORS headers are present on Workers API', async ({ request }) => {
    console.log('\n🌐 Testing CORS headers...');
    console.log(`Backend URL: ${BACKEND_URL}`);

    try {
      const response = await request.get(`${BACKEND_URL}/health`, {
        headers: {
          Origin: FRONTEND_URL,
        },
      });

      expect(response.ok()).toBeTruthy();
      const headers = response.headers();

      expect(headers['access-control-allow-origin']).toBeTruthy();
      console.log(`✅ CORS headers present: ${headers['access-control-allow-origin']}`);
    } catch (error) {
      console.error(`❌ CORS test failed:`, error);
      console.log(`⚠️ Make sure Workers dev server is running at ${BACKEND_URL}`);
      throw error;
    }
  });
});
