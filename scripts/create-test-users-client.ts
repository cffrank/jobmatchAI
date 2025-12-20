#!/usr/bin/env tsx

/**
 * Create test users using Firebase Client SDK (no admin credentials needed)
 * This uses the public Firebase API to create user accounts
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import * as fs from 'fs';
import * as path from 'path';

// Firebase configuration from environment variables
// SECURITY: Never use hardcoded credentials. All values must come from .env.local
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

// Validate all required environment variables are present
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n📝 Please create a .env.local file with these variables.');
  console.error('   See .env.example for the required format.\n');
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY!,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.VITE_FIREBASE_APP_ID!,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

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
  console.log('🚀 Creating Firebase test users via client SDK...\n');

  const createdUsers = [];

  for (const userData of testUsers) {
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      const user = userCredential.user;

      // Update display name
      await updateProfile(user, {
        displayName: userData.displayName,
      });

      console.log(`✓ Created user: ${userData.email} (uid: ${user.uid})`);

      createdUsers.push({
        email: userData.email,
        password: userData.password,
        uid: user.uid,
        displayName: userData.displayName,
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`✓ User already exists: ${userData.email}`);
        createdUsers.push({
          email: userData.email,
          password: userData.password,
          uid: 'existing-user',
          displayName: userData.displayName,
        });
      } else {
        console.error(`✗ Failed to create ${userData.email}:`, error.code, error.message);
      }
    }
  }

  // Save credentials to file
  const credentialsDir = path.join(process.cwd(), 'testsprite_tests');
  if (!fs.existsSync(credentialsDir)) {
    fs.mkdirSync(credentialsDir, { recursive: true });
  }

  const credentialsPath = path.join(credentialsDir, 'test-credentials.json');
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

  console.log('\n📋 Next step: Update TestSprite test configuration with these credentials\n');

  process.exit(0);
}

createTestUsers().catch((error) => {
  console.error('❌ Error creating test users:', error);
  process.exit(1);
});
