#!/usr/bin/env tsx

import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin SDK
// Using application default credentials (gcloud auth application-default login)
// or GOOGLE_APPLICATION_CREDENTIALS environment variable
admin.initializeApp({
  projectId: 'ai-career-os-139db',
});

const auth = admin.auth();

// Test users to create
const testUsers = [
  {
    email: 'test1@jobmatch.ai',
    password: 'TestPassword123!',
    displayName: 'Test User 1',
  },
  {
    email: 'test2@jobmatch.ai',
    password: 'TestPassword123!',
    displayName: 'Test User 2',
  },
  {
    email: 'test3@jobmatch.ai',
    password: 'TestPassword123!',
    displayName: 'Test User 3',
  },
];

async function createTestUsers() {
  console.log('🚀 Creating Firebase test users...\n');

  const createdUsers = [];

  for (const userData of testUsers) {
    try {
      // Check if user already exists
      let user;
      try {
        user = await auth.getUserByEmail(userData.email);
        console.log(`✓ User already exists: ${userData.email} (uid: ${user.uid})`);
      } catch (error) {
        if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'auth/user-not-found') {
          // Create new user
          user = await auth.createUser({
            email: userData.email,
            password: userData.password,
            displayName: userData.displayName,
            emailVerified: true, // Auto-verify for testing
          });
          console.log(`✓ Created user: ${userData.email} (uid: ${user.uid})`);
        } else {
          throw error;
        }
      }

      createdUsers.push({
        email: userData.email,
        password: userData.password,
        uid: user.uid,
        displayName: userData.displayName,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`✗ Failed to create ${userData.email}:`, message);
    }
  }

  // Save credentials to file
  const credentialsPath = path.join(process.cwd(), 'testsprite_tests', 'test-credentials.json');
  fs.writeFileSync(credentialsPath, JSON.stringify(createdUsers, null, 2));

  console.log(`\n✅ Test users ready!`);
  console.log(`📄 Credentials saved to: ${credentialsPath}\n`);

  // Display credentials
  console.log('Test Credentials:');
  console.log('='.repeat(60));
  createdUsers.forEach((user, index) => {
    console.log(`\nTest User ${index + 1}:`);
    console.log(`  Email:    ${user.email}`);
    console.log(`  Password: ${user.password}`);
    console.log(`  UID:      ${user.uid}`);
  });
  console.log('\n' + '='.repeat(60));

  process.exit(0);
}

createTestUsers().catch((error) => {
  console.error('❌ Error creating test users:', error);
  process.exit(1);
});
