#!/usr/bin/env node
/**
 * Input Validation Test Suite
 *
 * Run with: node test-validation.js
 *
 * Tests all validation schemas to ensure proper security controls
 */

const {
  validateInput,
  firestoreIdSchema,
  emailSchema,
  urlSchema,
  searchQuerySchema,
  oauthStateSchema,
  oauthCodeSchema,
  locationSchema,
  workArrangementSchema,
  salarySchema,
  jobTitleSchema,
  companyNameSchema,
  skillNameSchema,
  fileFormatSchema,
  generateApplicationSchema,
  exportApplicationSchema,
  sendApplicationEmailSchema,
  linkedInCallbackSchema,
  sanitizeHtml,
  sanitizeFilename
} = require('./lib/validation');

// Test counters
let passed = 0;
let failed = 0;

// Test helper
function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

// Expect validation to pass
function expectValid(schema, value, description) {
  test(`${description} - Valid: ${JSON.stringify(value)}`, () => {
    validateInput(schema, value, description);
  });
}

// Expect validation to fail
function expectInvalid(schema, value, description) {
  test(`${description} - Invalid (should reject): ${JSON.stringify(value)}`, () => {
    try {
      validateInput(schema, value, description);
      throw new Error('Validation should have failed but passed');
    } catch (error) {
      if (error.message.includes('should have failed')) {
        throw error;
      }
      // Expected to fail - this is success
    }
  });
}

console.log('\n🔒 Input Validation Security Test Suite\n');
console.log('=' .repeat(60));

// =============================================================================
// Firestore ID Tests
// =============================================================================
console.log('\n📝 Firestore Document ID Validation\n');

expectValid(firestoreIdSchema, 'valid-id-123', 'Firestore ID');
expectValid(firestoreIdSchema, 'user_abc_def', 'Firestore ID');
expectValid(firestoreIdSchema, 'job-listing-2024', 'Firestore ID');

expectInvalid(firestoreIdSchema, '../admin', 'Firestore ID (path traversal)');
expectInvalid(firestoreIdSchema, '../../secrets', 'Firestore ID (path traversal)');
expectInvalid(firestoreIdSchema, 'id;DROP TABLE users--', 'Firestore ID (SQL injection)');
expectInvalid(firestoreIdSchema, 'id<script>', 'Firestore ID (XSS)');
expectInvalid(firestoreIdSchema, 'a'.repeat(200), 'Firestore ID (too long)');
expectInvalid(firestoreIdSchema, '', 'Firestore ID (empty)');

// =============================================================================
// Email Validation Tests
// =============================================================================
console.log('\n📧 Email Address Validation\n');

expectValid(emailSchema, 'user@example.com', 'Email');
expectValid(emailSchema, 'test.user+tag@subdomain.example.com', 'Email');
expectValid(emailSchema, 'admin@localhost.local', 'Email');

expectInvalid(emailSchema, 'user@example.com;attacker@evil.com', 'Email (injection)');
expectInvalid(emailSchema, 'user@example.com<script>', 'Email (XSS)');
expectInvalid(emailSchema, 'user@example.com\nBcc: attacker@evil.com', 'Email (header injection)');
expectInvalid(emailSchema, 'notanemail', 'Email (invalid format)');
expectInvalid(emailSchema, '@example.com', 'Email (missing user)');

// =============================================================================
// URL Validation Tests
// =============================================================================
console.log('\n🔗 URL Validation\n');

expectValid(urlSchema, 'https://example.com', 'URL');
expectValid(urlSchema, 'http://localhost:3000/path', 'URL');
expectValid(urlSchema, 'https://example.com/job?id=123', 'URL');

expectInvalid(urlSchema, 'javascript:alert(1)', 'URL (XSS)');
expectInvalid(urlSchema, 'data:text/html,<script>alert(1)</script>', 'URL (data URI)');
expectInvalid(urlSchema, 'file:///etc/passwd', 'URL (file protocol)');
expectInvalid(urlSchema, 'ftp://example.com', 'URL (FTP protocol)');
expectInvalid(urlSchema, 'not-a-url', 'URL (invalid format)');

// =============================================================================
// Search Query Validation Tests
// =============================================================================
console.log('\n🔍 Search Query Validation\n');

expectValid(searchQuerySchema, 'Software Engineer', 'Search query');
expectValid(searchQuerySchema, 'React Developer in San Francisco', 'Search query');
expectValid(searchQuerySchema, 'Senior DevOps Engineer', 'Search query');

expectInvalid(searchQuerySchema, "' OR 1=1--", 'Search query (SQL injection)');
expectInvalid(searchQuerySchema, '$where: function() { return true }', 'Search query (NoSQL injection)');
expectInvalid(searchQuerySchema, '<script>alert(1)</script>', 'Search query (XSS)');
expectInvalid(searchQuerySchema, 'UNION SELECT * FROM users--', 'Search query (SQL injection)');
expectInvalid(searchQuerySchema, 'a'.repeat(600), 'Search query (too long)');
expectInvalid(searchQuerySchema, '', 'Search query (empty)');

// =============================================================================
// OAuth Validation Tests
// =============================================================================
console.log('\n🔐 OAuth Token Validation\n');

expectValid(oauthStateSchema, 'a'.repeat(30), 'OAuth state');
expectValid(oauthCodeSchema, 'abc123-def456_ghi789', 'OAuth code');

expectInvalid(oauthStateSchema, 'short', 'OAuth state (too short)');
expectInvalid(oauthStateSchema, 'a'.repeat(600), 'OAuth state (too long)');
expectInvalid(oauthCodeSchema, 'code;rm -rf /', 'OAuth code (injection)');

// =============================================================================
// Location Validation Tests
// =============================================================================
console.log('\n📍 Location Validation\n');

expectValid(locationSchema, 'San Francisco, CA', 'Location');
expectValid(locationSchema, 'New York, NY, USA', 'Location');
expectValid(locationSchema, 'London, UK', 'Location');

expectInvalid(locationSchema, 'City<script>alert(1)</script>', 'Location (XSS)');
expectInvalid(locationSchema, 'a'.repeat(300), 'Location (too long)');

// =============================================================================
// Work Arrangement Tests
// =============================================================================
console.log('\n💼 Work Arrangement Validation\n');

expectValid(workArrangementSchema, 'Remote', 'Work arrangement');
expectValid(workArrangementSchema, 'Hybrid', 'Work arrangement');
expectValid(workArrangementSchema, 'On-site', 'Work arrangement');

expectInvalid(workArrangementSchema, 'Invalid', 'Work arrangement');
expectInvalid(workArrangementSchema, 'remote', 'Work arrangement (case sensitive)');

// =============================================================================
// Salary Validation Tests
// =============================================================================
console.log('\n💰 Salary Validation\n');

expectValid(salarySchema, 50000, 'Salary');
expectValid(salarySchema, 150000, 'Salary');
expectValid(salarySchema, 0, 'Salary');

expectInvalid(salarySchema, -1000, 'Salary (negative)');
expectInvalid(salarySchema, 50000.50, 'Salary (decimal)');
expectInvalid(salarySchema, 99999999999, 'Salary (unreasonably high)');

// =============================================================================
// Job Title/Company Validation Tests
// =============================================================================
console.log('\n🏢 Job Title & Company Validation\n');

expectValid(jobTitleSchema, 'Senior Software Engineer', 'Job title');
expectValid(jobTitleSchema, 'DevOps/SRE Engineer', 'Job title');

expectInvalid(jobTitleSchema, 'Engineer<script>alert(1)</script>', 'Job title (XSS)');
expectInvalid(jobTitleSchema, 'a'.repeat(300), 'Job title (too long)');

expectValid(companyNameSchema, "McDonald's Corporation", 'Company name');
expectValid(companyNameSchema, 'AT&T Inc.', 'Company name');

expectInvalid(companyNameSchema, 'Company<iframe>', 'Company name (XSS)');

// =============================================================================
// Skill Validation Tests
// =============================================================================
console.log('\n🛠️ Skill Name Validation\n');

expectValid(skillNameSchema, 'JavaScript', 'Skill');
expectValid(skillNameSchema, 'C++', 'Skill');
expectValid(skillNameSchema, 'Node.js', 'Skill');
expectValid(skillNameSchema, 'C#', 'Skill');

expectInvalid(skillNameSchema, 'Skill<script>', 'Skill (XSS)');
expectInvalid(skillNameSchema, 'a'.repeat(150), 'Skill (too long)');

// =============================================================================
// File Format Tests
// =============================================================================
console.log('\n📄 File Format Validation\n');

expectValid(fileFormatSchema, 'pdf', 'File format');
expectValid(fileFormatSchema, 'docx', 'File format');

expectInvalid(fileFormatSchema, 'exe', 'File format (executable)');
expectInvalid(fileFormatSchema, 'sh', 'File format (script)');
expectInvalid(fileFormatSchema, 'PDF', 'File format (case sensitive)');

// =============================================================================
// Function Schema Tests
// =============================================================================
console.log('\n⚙️ Function-Specific Schema Validation\n');

expectValid(generateApplicationSchema, { jobId: 'job-123' }, 'generateApplication');
expectInvalid(generateApplicationSchema, { jobId: '../admin' }, 'generateApplication');
expectInvalid(generateApplicationSchema, {}, 'generateApplication (missing jobId)');

expectValid(exportApplicationSchema, { applicationId: 'app-123', format: 'pdf' }, 'exportApplication');
expectInvalid(exportApplicationSchema, { applicationId: 'app-123', format: 'exe' }, 'exportApplication');

expectValid(sendApplicationEmailSchema,
  { applicationId: 'app-123', recipientEmail: 'user@example.com' },
  'sendApplicationEmail'
);
expectInvalid(sendApplicationEmailSchema,
  { applicationId: 'app-123', recipientEmail: 'invalid-email' },
  'sendApplicationEmail'
);

expectValid(linkedInCallbackSchema,
  { code: 'abc123def456', state: 'a'.repeat(30) },
  'linkedInCallback'
);
expectInvalid(linkedInCallbackSchema,
  { code: 'short', state: 'short' },
  'linkedInCallback'
);

// =============================================================================
// Sanitization Tests
// =============================================================================
console.log('\n🧹 Sanitization Function Tests\n');

test('sanitizeHtml - Basic XSS', () => {
  const input = '<script>alert(1)</script>';
  const output = sanitizeHtml(input);
  if (output.includes('<script>')) {
    throw new Error('Script tags not sanitized');
  }
  if (!output.includes('&lt;script&gt;')) {
    throw new Error('HTML not properly escaped');
  }
});

test('sanitizeHtml - Attribute injection', () => {
  const input = 'Hello" onload="alert(1)';
  const output = sanitizeHtml(input);
  if (output.includes('"')) {
    throw new Error('Quotes not sanitized');
  }
});

test('sanitizeFilename - Path traversal', () => {
  const input = '../../etc/passwd';
  const output = sanitizeFilename(input);
  if (output.includes('..')) {
    throw new Error('Path traversal not removed');
  }
  if (output.includes('/')) {
    throw new Error('Slashes not removed');
  }
});

test('sanitizeFilename - Special characters', () => {
  const input = 'file<script>.pdf';
  const output = sanitizeFilename(input);
  if (output.includes('<') || output.includes('>')) {
    throw new Error('Special characters not sanitized');
  }
});

test('sanitizeFilename - Length limit', () => {
  const input = 'a'.repeat(300);
  const output = sanitizeFilename(input);
  if (output.length > 255) {
    throw new Error('Filename not truncated');
  }
});

// =============================================================================
// Results
// =============================================================================
console.log('\n' + '='.repeat(60));
console.log('\n📊 Test Results\n');
console.log(`   Passed: ${passed} ✅`);
console.log(`   Failed: ${failed} ❌`);
console.log(`   Total:  ${passed + failed}`);
console.log(`   Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 All validation tests passed!\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} test(s) failed. Review implementation.\n`);
  process.exit(1);
}
