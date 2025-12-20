#!/usr/bin/env tsx

/**
 * Reset John Frank's password to a known value
 */

import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'ai-career-os-139db',
  });
}

const auth = admin.auth();

// John Frank's UID
const JOHN_FRANK_UID = 'B7JWGPNQCYVlTWxvNZOTvgpujbr2';
const NEW_PASSWORD = 'TestPassword123!';

async function resetPassword() {
  try {
    console.log('Resetting password for John Frank...');
    console.log('UID:', JOHN_FRANK_UID);

    await auth.updateUser(JOHN_FRANK_UID, {
      password: NEW_PASSWORD,
    });

    console.log('✅ Password reset successfully!');
    console.log('New credentials:');
    console.log('  Email: cffrank@yahoo.com');
    console.log('  Password:', NEW_PASSWORD);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetPassword();
