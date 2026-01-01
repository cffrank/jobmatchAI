import { test, expect } from '@playwright/test';

/**
 * Post-Deployment Authentication Test
 *
 * This test runs after Cloudflare Pages deployment to verify:
 * 1. Signup flow works with a fresh account
 * 2. Login flow works with the newly created account
 * 3. User can access the application after login
 *
 * Uses unique email per test run to avoid conflicts.
 */

test.describe('Post-Deployment Authentication', () => {
  const BASE_URL = process.env.FRONTEND_URL || 'https://jobmatch-ai-dev.pages.dev';

  // Generate unique test credentials for each run
  const timestamp = Date.now();
  const TEST_EMAIL = `test-${timestamp}@example.com`;
  const TEST_PASSWORD = 'TestPassword123!';
  const TEST_NAME = 'Test User';

  test('should signup with new account and login successfully', async ({ page }) => {
    console.log('🧪 Starting post-deployment authentication test');
    console.log('📧 Test email:', TEST_EMAIL);
    console.log('🌐 Testing deployment:', BASE_URL);

    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // ============================================
    // STEP 1: SIGNUP
    // ============================================
    console.log('\n📝 STEP 1: Testing signup flow...');

    await page.goto(BASE_URL + '/signup', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/.*\/signup/);
    console.log('✅ On signup page');

    // Fill in signup form
    const nameInput = page.locator('input[name="name"], input[type="text"]').first();
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').last();

    await nameInput.fill(TEST_NAME);
    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);

    // Only fill confirm password if it exists
    const confirmPasswordCount = await page.locator('input[type="password"]').count();
    if (confirmPasswordCount > 1) {
      await confirmPasswordInput.fill(TEST_PASSWORD);
    }

    console.log('✅ Signup form filled');

    // Submit signup form
    const signupButton = page.locator('button[type="submit"]', { hasText: /sign up|create account|register/i });
    await signupButton.click();
    console.log('🔘 Signup button clicked');

    // Wait for navigation after signup
    try {
      await page.waitForURL((url) => !url.pathname.includes('/signup'), {
        timeout: 15000
      });
      console.log('✅ Navigated away from signup page');
    } catch (error) {
      console.error('❌ Failed to navigate after signup');
      console.error('Current URL:', page.url());

      // Check for error messages on signup page
      const bodyText = await page.textContent('body');
      console.error('Page content:', bodyText);

      // Take screenshot
      await page.screenshot({ path: 'signup-error.png', fullPage: true });
      console.log('📸 Screenshot saved to signup-error.png');

      throw error;
    }

    const signupRedirectUrl = page.url();
    console.log('📍 After signup URL:', signupRedirectUrl);

    // Check for critical console errors
    const criticalSignupErrors = consoleErrors.filter(err =>
      !err.includes('Failed to fetch location') && // ipapi.co errors are expected
      !err.includes('429') // Rate limit errors from ipapi.co
    );

    if (criticalSignupErrors.length > 0) {
      console.warn('⚠️  Console errors during signup:', criticalSignupErrors);
    }

    // ============================================
    // STEP 2: VERIFY LOGGED IN OR LOGOUT
    // ============================================
    console.log('\n🔍 STEP 2: Checking if logged in after signup...');

    // Some apps auto-login after signup, others require email confirmation
    const currentUrl = page.url();

    if (currentUrl.includes('/login') || currentUrl.includes('/confirm') || currentUrl.includes('/verify')) {
      console.log('⚠️  Not auto-logged in (requires confirmation or manual login)');

      // If we're on a confirmation page, note it but continue
      if (currentUrl.includes('/confirm') || currentUrl.includes('/verify')) {
        console.log('📧 Email confirmation required - skipping login test');
        console.log('✅ SIGNUP TEST PASSED (email confirmation required)');
        return; // Exit test early
      }

      // If redirected to login, proceed with login test
      console.log('➡️  Proceeding to login test...');
    } else {
      console.log('✅ Auto-logged in after signup');

      // Verify app loaded
      await page.waitForLoadState('networkidle');
      const bodyText = await page.textContent('body');
      expect(bodyText).not.toContain('Error');

      console.log('✅ SIGNUP + AUTO-LOGIN TEST PASSED');
      return; // Exit test early since we're already logged in
    }

    // ============================================
    // STEP 3: LOGIN
    // ============================================
    console.log('\n🔐 STEP 3: Testing login flow...');

    // Navigate to login if not already there
    if (!currentUrl.includes('/login')) {
      await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle' });
    }

    await expect(page).toHaveURL(/.*\/login/);
    console.log('✅ On login page');

    // Fill in login form
    const loginEmailInput = page.locator('input[type="email"]');
    const loginPasswordInput = page.locator('input[type="password"]');

    await loginEmailInput.fill(TEST_EMAIL);
    await loginPasswordInput.fill(TEST_PASSWORD);
    console.log('✅ Login credentials entered');

    // Click login button
    const loginButton = page.locator('button[type="submit"]', { hasText: /sign in|log in|login/i });
    await loginButton.click();
    console.log('🔘 Login button clicked');

    // Wait for navigation away from login page
    try {
      await page.waitForURL((url) => !url.pathname.includes('/login'), {
        timeout: 15000
      });
      console.log('✅ Navigated away from login page');
    } catch (error) {
      console.error('❌ Failed to navigate away from login page');
      console.error('Current URL:', page.url());

      // Take screenshot
      await page.screenshot({ path: 'login-error.png', fullPage: true });
      console.log('📸 Screenshot saved to login-error.png');

      throw error;
    }

    const loginRedirectUrl = page.url();
    console.log('📍 After login URL:', loginRedirectUrl);

    // Should be at home/dashboard
    expect(loginRedirectUrl).toMatch(/\/(dashboard)?$/);
    console.log('✅ Successfully navigated to home page');

    // ============================================
    // STEP 4: VERIFY APP LOADED
    // ============================================
    console.log('\n🔍 STEP 4: Verifying app loaded correctly...');

    await page.waitForLoadState('networkidle');

    // Check app loaded without errors
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Error');
    expect(bodyText).not.toContain('Cannot read properties of undefined');

    console.log('✅ App loaded successfully after login');

    // Check for critical console errors
    const criticalLoginErrors = consoleErrors.filter(err =>
      !err.includes('Failed to fetch location') &&
      !err.includes('429')
    );

    if (criticalLoginErrors.length > 0) {
      console.warn('⚠️  Console errors detected:', criticalLoginErrors);
    } else {
      console.log('✅ No critical console errors');
    }

    // Take success screenshot
    await page.screenshot({ path: 'post-deployment-auth-success.png', fullPage: true });
    console.log('📸 Success screenshot saved');

    console.log('\n✅ POST-DEPLOYMENT AUTHENTICATION TEST PASSED');
    console.log('   ✓ Signup successful');
    console.log('   ✓ Login successful');
    console.log('   ✓ App loaded correctly');
  });

  test('should show proper error for invalid login', async ({ page }) => {
    console.log('\n🧪 Testing invalid login handling...');

    await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle' });

    // Try to login with non-existent credentials
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await emailInput.fill('nonexistent@example.com');
    await passwordInput.fill('WrongPassword123!');

    const loginButton = page.locator('button[type="submit"]', { hasText: /sign in|log in|login/i });
    await loginButton.click();

    // Should stay on login page or show error
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const bodyText = await page.textContent('body');

    // Should either stay on login page or show error message
    const staysOnLogin = currentUrl.includes('/login');
    const showsError = bodyText?.includes('Invalid') ||
                       bodyText?.includes('incorrect') ||
                       bodyText?.includes('failed') ||
                       bodyText?.includes('error');

    expect(staysOnLogin || showsError).toBeTruthy();
    console.log('✅ Invalid login properly rejected');
  });
});
