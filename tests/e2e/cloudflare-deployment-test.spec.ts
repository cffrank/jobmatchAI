import { test, expect } from '@playwright/test';

const CLOUDFLARE_URL = 'https://f19550db.jobmatch-ai-dev.pages.dev';
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

    // Check page loads
    await expect(page).toHaveTitle(/JobMatch AI/);

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

    await page.goto(`${CLOUDFLARE_URL}/signup`);

    // Fill in signup form
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);

    // Look for confirm password field if it exists
    const confirmPasswordField = page.locator('input[placeholder*="Confirm" i], input[name*="confirm" i]').first();
    if (await confirmPasswordField.isVisible()) {
      await confirmPasswordField.fill(TEST_PASSWORD);
    }

    // Click sign up button
    await page.click('button:has-text("Sign Up"), button:has-text("Create Account")');

    // Wait for navigation or success message
    await page.waitForTimeout(3000);

    // Check for errors
    console.log('\n=== Console Errors During Signup ===');
    if (consoleErrors.length > 0) {
      consoleErrors.forEach(err => console.log('  -', err));
    } else {
      console.log('✅ No console errors');
    }

    // Should either redirect to dashboard or show success message
    const currentUrl = page.url();
    const hasSuccessMessage = await page.getByText(/success/i).isVisible().catch(() => false);

    console.log('\n=== Signup Result ===');
    console.log('Current URL:', currentUrl);
    console.log('Has success message:', hasSuccessMessage);

    // Verify we're not still on signup page or we have a success indicator
    expect(
      currentUrl.includes('/dashboard') ||
      currentUrl.includes('/settings') ||
      hasSuccessMessage
    ).toBeTruthy();
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
    await page.goto(CLOUDFLARE_URL);

    // Check if environment variables are loaded
    const envCheck = await page.evaluate(() => {
      return {
        hasSupabaseUrl: !!(window as any).VITE_SUPABASE_URL || !!import.meta.env.VITE_SUPABASE_URL,
        hasSupabaseKey: !!(window as any).VITE_SUPABASE_ANON_KEY || !!import.meta.env.VITE_SUPABASE_ANON_KEY,
        hasBackendUrl: !!(window as any).VITE_BACKEND_URL || !!import.meta.env.VITE_BACKEND_URL,
      };
    });

    console.log('\n=== Environment Variables Check ===');
    console.log('Has VITE_SUPABASE_URL:', envCheck.hasSupabaseUrl);
    console.log('Has VITE_SUPABASE_ANON_KEY:', envCheck.hasSupabaseKey);
    console.log('Has VITE_BACKEND_URL:', envCheck.hasBackendUrl);

    // At least Supabase URL should be available
    expect(envCheck.hasSupabaseUrl).toBeTruthy();
  });

  test('should display user profile logs correctly', async ({ page }) => {
    consoleLogs = [];

    await page.goto(`${CLOUDFLARE_URL}/login`);

    // Fill in login form with test credentials
    await page.fill('input[type="email"]', TEST_EMAIL);
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
