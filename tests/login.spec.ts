import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  // Use Cloudflare Pages (not Railway)
  const BASE_URL = process.env.FRONTEND_URL || 'https://jobmatch-ai-dev.pages.dev';

  // Generate unique test credentials for each run
  const timestamp = Date.now();
  const TEST_EMAIL = `test-login-${timestamp}@example.com`;
  const TEST_PASSWORD = 'TestPassword123!';
  const TEST_NAME = 'Test User';

  test('should successfully log in and navigate to home page', async ({ page }) => {
    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // STEP 1: Create a fresh account via signup
    console.log('📝 Creating fresh test account...');
    await page.goto(BASE_URL + '/signup', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/.*\/signup/);

    const nameInput = page.locator('input[name="name"], input[type="text"]').first();
    const signupEmailInput = page.locator('input[type="email"]');
    const signupPasswordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').last();

    await nameInput.fill(TEST_NAME);
    await signupEmailInput.fill(TEST_EMAIL);
    await signupPasswordInput.fill(TEST_PASSWORD);

    // Fill confirm password if it exists
    const confirmPasswordCount = await page.locator('input[type="password"]').count();
    if (confirmPasswordCount > 1) {
      await confirmPasswordInput.fill(TEST_PASSWORD);
    }

    const signupButton = page.locator('button[type="submit"]', { hasText: /sign up|create account|register/i });
    await signupButton.click();

    // Wait for signup to complete
    await page.waitForURL((url) => !url.pathname.includes('/signup'), { timeout: 15000 });
    console.log('✅ Test account created');

    // STEP 2: Logout (if auto-logged in)
    const signupUrl = page.url();
    if (!signupUrl.includes('/login')) {
      // Navigate to login page (may trigger logout or already logged out)
      await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle' });
    }

    // Navigate to login page
    console.log('📍 Navigating to login page...');
    await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle' });

    // Verify we're on login page
    await expect(page).toHaveURL(/.*\/login/);
    console.log('✅ On login page');

    // Fill in email
    console.log('📝 Filling in credentials...');
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(TEST_EMAIL);

    // Fill in password
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(TEST_PASSWORD);

    console.log('✅ Credentials entered');

    // Click sign in button
    console.log('🔘 Clicking sign in button...');
    const signInButton = page.locator('button[type="submit"]', { hasText: /sign in/i });
    await signInButton.click();

    // Wait for navigation away from login page (with timeout)
    console.log('⏳ Waiting for navigation...');
    try {
      await page.waitForURL((url) => !url.pathname.includes('/login'), {
        timeout: 10000
      });
      console.log('✅ Navigated away from login page');
    } catch (error) {
      console.error('❌ Failed to navigate away from login page');
      console.error('Current URL:', page.url());
      throw error;
    }

    // Verify we're on home page
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);

    // Should be at root or dashboard
    expect(currentUrl).toMatch(/\/(dashboard)?$/);
    console.log('✅ Successfully navigated to home page');

    // Wait a bit for the page to fully load
    await page.waitForLoadState('networkidle');

    // Check for session initialization in console (for debugging if needed)
    // const sessionLogs = await page.evaluate(() => {
    //   return (window as Record<string, unknown>).__sessionLogs || [];
    // });

    // Verify no critical console errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('Failed to fetch location') && // ipapi.co errors are expected
      !err.includes('429') // Rate limit errors from ipapi.co
    );

    if (criticalErrors.length > 0) {
      console.warn('⚠️  Console errors detected:', criticalErrors);
    } else {
      console.log('✅ No critical console errors');
    }

    // Verify user profile or dashboard elements are visible
    // This confirms the app actually loaded after login
    console.log('🔍 Checking if app loaded successfully...');

    // Wait for any of these elements to appear (depending on what's on home page)
    try {
      await page.waitForSelector('body', { state: 'attached' });

      // Check if we see app content (not an error page)
      const bodyText = await page.textContent('body');
      expect(bodyText).not.toContain('Error');
      expect(bodyText).not.toContain('Cannot read properties of undefined');

      console.log('✅ App loaded successfully after login');
    } catch (error) {
      console.error('❌ App did not load properly after login');

      // Take screenshot for debugging
      await page.screenshot({ path: 'login-error.png', fullPage: true });
      console.log('📸 Screenshot saved to login-error.png');

      throw error;
    }

    // Take success screenshot
    await page.screenshot({ path: 'login-success.png', fullPage: true });
    console.log('📸 Success screenshot saved to login-success.png');

    console.log('');
    console.log('✅ LOGIN TEST PASSED');
  });

  test('should show session and security events in console', async ({ page }) => {
    const consoleLogs: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Session]') || text.includes('[Security]')) {
        consoleLogs.push(text);
      }
    });

    // Create a unique account for this test
    const testEmail = `test-session-${Date.now()}@example.com`;

    // Signup first
    await page.goto(BASE_URL + '/signup', { waitUntil: 'networkidle' });
    const nameInput = page.locator('input[name="name"], input[type="text"]').first();
    const signupEmailInput = page.locator('input[type="email"]');
    const signupPasswordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').last();

    await nameInput.fill(TEST_NAME);
    await signupEmailInput.fill(testEmail);
    await signupPasswordInput.fill(TEST_PASSWORD);

    const confirmPasswordCount = await page.locator('input[type="password"]').count();
    if (confirmPasswordCount > 1) {
      await confirmPasswordInput.fill(TEST_PASSWORD);
    }

    const signupButton = page.locator('button[type="submit"]', { hasText: /sign up|create account|register/i });
    await signupButton.click();
    await page.waitForURL((url) => !url.pathname.includes('/signup'), { timeout: 15000 });

    // Go back to login
    await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle' });

    // Login
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]', { hasText: /sign in/i }).click();

    // Wait for navigation
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    await page.waitForTimeout(2000); // Give time for session events to log

    console.log('');
    console.log('📋 Session and Security Logs:');
    consoleLogs.forEach(log => console.log('  ', log));
    console.log('');

    // Verify expected logs
    const hasSessionInitialized = consoleLogs.some(log => log.includes('Session initialized'));
    const hasLoginSuccess = consoleLogs.some(log => log.includes('Login success'));
    const hasSessionCreated = consoleLogs.some(log => log.includes('Session created/updated'));

    expect(hasSessionInitialized || hasLoginSuccess || hasSessionCreated).toBeTruthy();
    console.log('✅ Session and security events logged correctly');
  });
});
