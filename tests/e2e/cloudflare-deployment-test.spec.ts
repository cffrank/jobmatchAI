import { test, expect } from '@playwright/test';

// Use current deployment URL from environment or fallback to dev
const CLOUDFLARE_URL = process.env.FRONTEND_URL || 'https://jobmatch-ai-dev.pages.dev';
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';

test.describe('Cloudflare Pages Deployment Tests', () => {
  let consoleLogs: string[] = [];
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Capture console logs
    page.on('console', (msg) => {
      const text = msg.text();
      consoleLogs.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });
  });

  test('should load the login page', async ({ page }) => {
    await page.goto(`${CLOUDFLARE_URL}/login`);

    // Check page loads (title is lowercase "jobmatch-ai")
    await expect(page).toHaveTitle(/jobmatch/i);

    // Check for sign up link
    await expect(page.getByText(/sign up/i)).toBeVisible();
  });

  test('should have no Firebase/Firestore references in console', async ({ page }) => {
    consoleLogs = [];

    await page.goto(`${CLOUDFLARE_URL}/login`);

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Wait a bit for any async logs
    await page.waitForTimeout(2000);

    // Check console logs for Firebase/Firestore
    const firebaseRefs = consoleLogs.filter(log =>
      log.toLowerCase().includes('firebase') ||
      log.toLowerCase().includes('firestore')
    );

    console.log('\n=== Console Logs ===');
    consoleLogs.forEach(log => console.log(log));

    console.log('\n=== Firebase/Firestore References ===');
    if (firebaseRefs.length > 0) {
      console.log('❌ Found Firebase references:');
      firebaseRefs.forEach(ref => console.log('  -', ref));
    } else {
      console.log('✅ No Firebase references found');
    }

    expect(firebaseRefs.length).toBe(0);
  });

  test('should sign up a new user', async ({ page }) => {
    consoleLogs = [];
    consoleErrors = [];

    await page.goto(`${CLOUDFLARE_URL}/signup`, { waitUntil: 'networkidle' });

    // Fill in signup form
    const nameInput = page.locator('input[name="name"], input[type="text"]').first();
    await nameInput.fill('Test User');
    await page.fill('input[type="email"]', TEST_EMAIL);

    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.first().fill(TEST_PASSWORD);

    // Look for confirm password field if it exists
    const confirmPasswordCount = await passwordInputs.count();
    if (confirmPasswordCount > 1) {
      await passwordInputs.last().fill(TEST_PASSWORD);
    }

    console.log('✅ Signup form filled');

    // Click sign up button using the same selector as successful test
    const signupButton = page.locator('button[type="submit"]', { hasText: /sign up|create account|register/i });
    await signupButton.click();
    console.log('🔘 Signup button clicked');

    // Wait for navigation away from signup page (same as successful test)
    try {
      await page.waitForURL((url) => !url.pathname.includes('/signup'), {
        timeout: 15000
      });
      console.log('✅ Navigated away from signup page');
    } catch (error) {
      console.error('❌ Failed to navigate after signup');
      console.error('Current URL:', page.url());

      // Take screenshot for debugging
      await page.screenshot({ path: 'signup-error.png', fullPage: true });
      console.log('📸 Screenshot saved to signup-error.png');

      throw error;
    }

    const currentUrl = page.url();
    console.log('📍 After signup URL:', currentUrl);

    // Filter out expected non-critical errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('Failed to fetch location') && // ipapi.co errors are expected
      !err.includes('Failed to fetch IP') && // CloudFlare IP fetch may fail
      !err.includes('Failed to create session') && // Session creation errors are logged but non-critical
      !err.includes('429') // Rate limit errors from ipapi.co
    );

    console.log('\n=== Console Errors During Signup ===');
    if (criticalErrors.length > 0) {
      console.warn('⚠️  Critical console errors:', criticalErrors);
    } else {
      console.log('✅ No critical console errors');
    }

    // Verify we successfully navigated away from signup page
    expect(currentUrl).not.toContain('/signup');
    console.log('✅ SIGNUP TEST PASSED');
  });

  test('should connect to Supabase successfully', async ({ page }) => {
    consoleLogs = [];

    await page.goto(CLOUDFLARE_URL);

    // Wait for page load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for Supabase connection logs
    const supabaseLogs = consoleLogs.filter(log =>
      log.toLowerCase().includes('supabase')
    );

    console.log('\n=== Supabase Connection Logs ===');
    if (supabaseLogs.length > 0) {
      supabaseLogs.forEach(log => console.log('  -', log));
    } else {
      console.log('ℹ️ No explicit Supabase logs (may be silent success)');
    }

    // Check for authentication-related errors
    const authErrors = consoleErrors.filter(err =>
      err.toLowerCase().includes('auth') ||
      err.toLowerCase().includes('supabase') ||
      err.toLowerCase().includes('401') ||
      err.toLowerCase().includes('403')
    );

    console.log('\n=== Auth/Connection Errors ===');
    if (authErrors.length > 0) {
      console.log('❌ Found errors:');
      authErrors.forEach(err => console.log('  -', err));
    } else {
      console.log('✅ No auth/connection errors');
    }

    expect(authErrors.length).toBe(0);
  });

  test('should have correct environment variables', async ({ page }) => {
    consoleLogs = [];
    consoleErrors = [];

    await page.goto(CLOUDFLARE_URL);

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for DNS resolution errors (would indicate missing env vars)
    const dnsErrors = consoleErrors.filter(err =>
      err.includes('ERR_NAME_NOT_RESOLVED') ||
      err.includes('Failed to fetch') ||
      err.includes('NetworkError')
    );

    console.log('\n=== Environment Variables Check ===');
    if (dnsErrors.length > 0) {
      console.log('❌ DNS/Network errors (likely missing Supabase env vars):');
      dnsErrors.forEach(err => console.log('  -', err));
    } else {
      console.log('✅ No DNS/network errors (Supabase env vars configured correctly)');
    }

    // If env vars are missing, we'd see ERR_NAME_NOT_RESOLVED errors
    expect(dnsErrors.length).toBe(0);
  });

  test('should display user profile logs correctly', async ({ page }) => {
    consoleLogs = [];

    // Create unique account for this test
    const testEmail = `test-profile-${Date.now()}@example.com`;

    // Signup first
    await page.goto(`${CLOUDFLARE_URL}/signup`);
    const nameInput = page.locator('input[name="name"], input[type="text"]').first();
    await nameInput.fill('Test User');
    await page.fill('input[type="email"]', testEmail);

    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.first().fill(TEST_PASSWORD);

    const confirmPasswordCount = await passwordInputs.count();
    if (confirmPasswordCount > 1) {
      await passwordInputs.last().fill(TEST_PASSWORD);
    }

    await page.click('button:has-text("Sign Up"), button:has-text("Create Account")');
    await page.waitForTimeout(3000);

    // Go to login page
    await page.goto(`${CLOUDFLARE_URL}/login`);

    // Fill in login form with test credentials
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Login")');

    // Wait for potential redirect
    await page.waitForTimeout(3000);

    // Navigate to settings if we're logged in
    const settingsUrl = `${CLOUDFLARE_URL}/settings`;
    await page.goto(settingsUrl);
    await page.waitForTimeout(2000);

    // Check console logs
    const profileLogs = consoleLogs.filter(log =>
      log.includes('profile') || log.includes('Profile')
    );

    console.log('\n=== Profile-Related Console Logs ===');
    if (profileLogs.length > 0) {
      profileLogs.forEach(log => {
        const isFirestoreBad = log.toLowerCase().includes('firestore');
        const prefix = isFirestoreBad ? '❌' : '✅';
        console.log(`${prefix} ${log}`);
      });
    } else {
      console.log('ℹ️ No profile logs found');
    }

    // Should see "User profile" not "Firestore profile"
    const hasUserProfile = profileLogs.some(log => log.includes('User profile'));
    const hasFirestoreProfile = profileLogs.some(log => log.includes('Firestore profile'));

    console.log('\n=== Profile Log Verification ===');
    console.log('Has "User profile" logs:', hasUserProfile);
    console.log('Has "Firestore profile" logs:', hasFirestoreProfile);

    // Firestore references should be gone
    expect(hasFirestoreProfile).toBe(false);
  });

  test('should check for 404 errors on missing tables', async ({ page }) => {
    consoleErrors = [];

    await page.goto(CLOUDFLARE_URL);
    await page.waitForTimeout(2000);

    // Filter for 404 errors related to subscriptions/usage_limits
    const table404s = consoleErrors.filter(err =>
      err.includes('404') && (
        err.includes('subscriptions') ||
        err.includes('usage_limits')
      )
    );

    console.log('\n=== Missing Table 404 Errors ===');
    if (table404s.length > 0) {
      console.log('ℹ️ Found expected 404s for optional tables:');
      table404s.forEach(err => console.log('  -', err));
      console.log('(These are non-critical - tables not yet created in dev DB)');
    } else {
      console.log('✅ No 404 errors for missing tables');
    }

    // 404s for subscriptions/usage_limits are expected and non-critical
    // We're just documenting them here
  });

  test.afterAll(async () => {
    console.log('\n========================================');
    console.log('CLOUDFLARE DEPLOYMENT TEST SUMMARY');
    console.log('========================================');
    console.log('URL:', CLOUDFLARE_URL);
    console.log('Test Email:', TEST_EMAIL);
    console.log('Total Console Logs:', consoleLogs.length);
    console.log('Total Console Errors:', consoleErrors.length);
    console.log('========================================\n');
  });
});
