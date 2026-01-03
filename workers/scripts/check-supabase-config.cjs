#!/usr/bin/env node
/**
 * Supabase Configuration Checker
 *
 * Verifies that Workers and frontend are using the same Supabase project.
 * Run: node workers/scripts/check-supabase-config.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 Supabase Configuration Checker');
console.log('=' .repeat(70));

// Read frontend .env.local
const frontendEnvPath = path.join(__dirname, '../../.env.local');
let frontendSupabaseUrl = null;
let frontendAnonKey = null;

if (fs.existsSync(frontendEnvPath)) {
  const frontendEnv = fs.readFileSync(frontendEnvPath, 'utf8');
  const urlMatch = frontendEnv.match(/VITE_SUPABASE_URL=(.+)/);
  const keyMatch = frontendEnv.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

  if (urlMatch) frontendSupabaseUrl = urlMatch[1].trim();
  if (keyMatch) frontendAnonKey = keyMatch[1].trim();
}

// Read Workers .dev.vars
const workersEnvPath = path.join(__dirname, '../.dev.vars');
let workersSupabaseUrl = null;
let workersAnonKey = null;

if (fs.existsSync(workersEnvPath)) {
  const workersEnv = fs.readFileSync(workersEnvPath, 'utf8');
  const urlMatch = workersEnv.match(/SUPABASE_URL=(.+)/);
  const keyMatch = workersEnv.match(/SUPABASE_ANON_KEY=(.+)/);

  if (urlMatch) workersSupabaseUrl = urlMatch[1].trim();
  if (keyMatch) workersAnonKey = keyMatch[1].trim();
}

console.log('\n📋 Configuration Status:');
console.log('-'.repeat(70));

// Frontend config
console.log('\n🎨 FRONTEND (.env.local):');
if (frontendSupabaseUrl) {
  console.log(`   ✅ SUPABASE_URL found`);
  console.log(`      ${frontendSupabaseUrl}`);
} else {
  console.log(`   ❌ SUPABASE_URL not found`);
}

if (frontendAnonKey) {
  console.log(`   ✅ SUPABASE_ANON_KEY found`);
  console.log(`      ${frontendAnonKey.substring(0, 30)}...`);
} else {
  console.log(`   ❌ SUPABASE_ANON_KEY not found`);
}

// Workers config
console.log('\n⚙️  WORKERS (.dev.vars):');
if (workersSupabaseUrl) {
  console.log(`   ✅ SUPABASE_URL found`);
  console.log(`      ${workersSupabaseUrl}`);
} else {
  console.log(`   ❌ SUPABASE_URL not found`);
}

if (workersAnonKey) {
  console.log(`   ✅ SUPABASE_ANON_KEY found`);
  console.log(`      ${workersAnonKey.substring(0, 30)}...`);
} else {
  console.log(`   ❌ SUPABASE_ANON_KEY not found`);
}

// Comparison
console.log('\n🔍 Configuration Match Check:');
console.log('-'.repeat(70));

let hasIssues = false;

if (!frontendSupabaseUrl || !workersSupabaseUrl) {
  console.log('   ⚠️  Cannot compare - missing configuration files');
  hasIssues = true;
} else if (frontendSupabaseUrl === workersSupabaseUrl) {
  console.log('   ✅ SUPABASE_URL matches!');
  console.log(`      Both using: ${frontendSupabaseUrl}`);
} else {
  console.log('   ❌ SUPABASE_URL MISMATCH DETECTED!');
  console.log(`      Frontend: ${frontendSupabaseUrl}`);
  console.log(`      Workers:  ${workersSupabaseUrl}`);
  console.log('\n   🔥 THIS IS THE ROOT CAUSE OF 401 ERRORS!');
  hasIssues = true;
}

if (frontendAnonKey && workersAnonKey) {
  if (frontendAnonKey === workersAnonKey) {
    console.log('   ✅ SUPABASE_ANON_KEY matches!');
  } else {
    console.log('   ❌ SUPABASE_ANON_KEY mismatch!');
    console.log(`      Frontend: ${frontendAnonKey.substring(0, 30)}...`);
    console.log(`      Workers:  ${workersAnonKey.substring(0, 30)}...`);
    hasIssues = true;
  }
}

// Deployed secrets check
console.log('\n☁️  DEPLOYED CONFIGURATION:');
console.log('-'.repeat(70));
console.log('   To check deployed Workers secrets, run:');
console.log('   $ cd workers && wrangler secret list --env development');
console.log('   $ cd workers && wrangler secret list --env staging');
console.log('   $ cd workers && wrangler secret list --env production');
console.log('\n   Verify SUPABASE_URL matches:');
console.log(`   Expected: ${frontendSupabaseUrl || '<from .env.local>'}`);

// Summary
console.log('\n📊 SUMMARY:');
console.log('='.repeat(70));

if (!hasIssues && frontendSupabaseUrl && workersSupabaseUrl) {
  console.log('\n✅ Configuration looks good!');
  console.log('   Frontend and Workers are using the same Supabase project.');
  console.log('\n   If you still see 401 errors:');
  console.log('   1. Restart Workers dev server: cd workers && npm run dev');
  console.log('   2. Check deployed secrets match (see commands above)');
  console.log('   3. Test with: node workers/scripts/test-auth-fix.js\n');
} else {
  console.log('\n❌ Configuration issues detected!');

  if (frontendSupabaseUrl !== workersSupabaseUrl) {
    console.log('\n🔧 FIX REQUIRED:');
    console.log('   Update workers/.dev.vars to match frontend:');
    console.log(`   SUPABASE_URL=${frontendSupabaseUrl || '<from .env.local>'}`);
  }

  if (!frontendSupabaseUrl) {
    console.log('\n   Frontend .env.local missing VITE_SUPABASE_URL');
  }

  if (!workersSupabaseUrl) {
    console.log('\n   Workers .dev.vars missing SUPABASE_URL');
    console.log('   Create workers/.dev.vars with:');
    console.log(`   SUPABASE_URL=${frontendSupabaseUrl || 'https://your-project.supabase.co'}`);
    console.log('   SUPABASE_ANON_KEY=<your-anon-key>');
    console.log('   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>');
  }

  console.log('\n   After fixing, restart Workers: cd workers && npm run dev\n');
}

console.log('📖 For more details, see:');
console.log('   docs/SESSION_CREATION_DIAGNOSIS.md\n');

process.exit(hasIssues ? 1 : 0);
