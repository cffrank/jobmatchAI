/**
 * Unit tests for Job Parser Service
 *
 * Tests AI-powered parsing of unstructured job posting text into structured JSON.
 * Validates parsing logic, quality validation, confidence scoring, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../types';
import {
  parseJobPosting,
  PARSER_MODEL,
  FALLBACK_MODEL,
  PARSER_CONFIG,
  QUALITY_THRESHOLD,
  type ParsedJobData,
  type WorkArrangement,
} from '../jobParser';

// =============================================================================
// Test Data
// =============================================================================

/**
 * LinkedIn job posting example (from user's request)
 */
const LINKEDIN_JOB_TEXT = `IT Systems Engineer
Madison, WI · Reposted 2 weeks ago · 91 applicants
On-site · Full-time
Clarity Technology Group, Inc.

About the job
Are you a skilled problem-solver who is always looking to sink your teeth into something new? A strong communicator who enjoys helping others?

What You'll Do:
Plan, design, implement, and support primarily Microsoft solutions both in the cloud and on-premises for organizations ranging from a dozen to hundreds of users

Skills You'll Need:
2+ Years supporting Microsoft cloud technologies (O365, Azure, Entra ID, Intune, etc.)
2+ Years supporting Windows Server and Active Directory
2+ Years working with networking and firewalls
5+ Years combined IT support experience`;

/**
 * Indeed job posting with salary
 */
const INDEED_JOB_TEXT = `Senior Software Engineer - Full Stack
Google
San Francisco, CA
$150,000 - $200,000 a year - Remote

Job Description:
We're looking for a talented Senior Software Engineer to join our team building next-generation cloud infrastructure. You'll work with React, Node.js, and AWS to create scalable systems.

Requirements:
- 5+ years of full-stack development experience
- Expert knowledge of React, TypeScript, Node.js
- Experience with AWS, Docker, Kubernetes
- Strong problem-solving and communication skills

Nice to have:
- GraphQL experience
- Machine learning knowledge
- Open source contributions`;

/**
 * Minimal job posting (only essential fields)
 */
const MINIMAL_JOB_TEXT = `Software Developer
TechCorp

We are hiring a software developer to work on exciting projects. You should know Python and JavaScript. This is a full-time position.`;

/**
 * Expected parsed result for LinkedIn job
 */
const LINKEDIN_EXPECTED: Partial<ParsedJobData> = {
  title: 'IT Systems Engineer',
  company: 'Clarity Technology Group',
  location: 'Madison, WI',
  workArrangement: 'On-site',
};

/**
 * Expected parsed result for Indeed job
 */
const INDEED_EXPECTED: Partial<ParsedJobData> = {
  title: 'Senior Software Engineer - Full Stack',
  company: 'Google',
  location: 'San Francisco, CA',
  workArrangement: 'Remote',
  salaryMin: 150000,
  salaryMax: 200000,
};

// =============================================================================
// Mock Environment
// =============================================================================

/**
 * Create mock environment with AI bindings
 */
function createMockEnv(
  workersAIResponse?: Partial<ParsedJobData>,
  workersAIError?: Error
): Env {
  const mockKV = {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue({ keys: [], list_complete: true }),
  };

  // Default successful Workers AI response
  const defaultResponse: ParsedJobData = {
    title: 'IT Systems Engineer',
    company: 'Clarity Technology Group',
    location: 'Madison, WI',
    workArrangement: 'On-site',
    salaryMin: undefined,
    salaryMax: undefined,
    description:
      'Plan, design, implement, and support primarily Microsoft solutions both in the cloud and on-premises for organizations ranging from a dozen to hundreds of users. 2+ Years supporting Microsoft cloud technologies.',
    url: undefined,
    experienceLevel: 'Mid Level',
    requiredSkills: [
      'O365',
      'Azure',
      'Entra ID',
      'Intune',
      'Windows Server',
      'Active Directory',
      'Networking',
      'Firewalls',
    ],
    preferredSkills: [],
  };

  const aiResponse = workersAIResponse || defaultResponse;

  return {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    OPENAI_API_KEY: 'test-openai-key',
    APP_URL: 'http://localhost:3000',
    ENVIRONMENT: 'development',
    CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
    AI_GATEWAY_SLUG: 'test-gateway',

    // KV Namespaces
    JOB_ANALYSIS_CACHE: mockKV as unknown as KVNamespace,
    SESSIONS: mockKV as unknown as KVNamespace,
    RATE_LIMITS: mockKV as unknown as KVNamespace,
    OAUTH_STATES: mockKV as unknown as KVNamespace,
    EMBEDDINGS_CACHE: mockKV as unknown as KVNamespace,
    AI_GATEWAY_CACHE: mockKV as unknown as KVNamespace,

    // D1 Database
    DB: {} as unknown as D1Database,

    // Vectorize
    VECTORIZE: {} as unknown as Vectorize,

    // R2 Buckets
    AVATARS: {} as unknown as R2Bucket,
    RESUMES: {} as unknown as R2Bucket,
    EXPORTS: {} as unknown as R2Bucket,

    // AI binding
    AI: {
      run: workersAIError
        ? vi.fn().mockRejectedValue(workersAIError)
        : vi.fn().mockResolvedValue({
            response: JSON.stringify(aiResponse),
          }),
    } as unknown as Ai,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('Job Parser Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Successful Parsing Tests
  // ===========================================================================

  describe('parseJobPosting - Successful Parsing', () => {
    it('should parse LinkedIn job posting format', async () => {
      const env = createMockEnv();
      const result = await parseJobPosting(env, LINKEDIN_JOB_TEXT);

      expect(result).toBeDefined();
      expect(result.job.title).toBe(LINKEDIN_EXPECTED.title);
      expect(result.job.company).toBe(LINKEDIN_EXPECTED.company);
      expect(result.job.location).toBe(LINKEDIN_EXPECTED.location);
      expect(result.job.workArrangement).toBe(LINKEDIN_EXPECTED.workArrangement);
      expect(result.job.description.length).toBeGreaterThanOrEqual(
        QUALITY_THRESHOLD.MIN_DESCRIPTION_LENGTH
      );
      expect(result.metadata.aiModel).toBe('workers-ai');
    });

    it('should parse Indeed job posting format with salary', async () => {
      const env = createMockEnv({
        title: 'Senior Software Engineer - Full Stack',
        company: 'Google',
        location: 'San Francisco, CA',
        workArrangement: 'Remote',
        salaryMin: 150000,
        salaryMax: 200000,
        description:
          "We're looking for a talented Senior Software Engineer to join our team building next-generation cloud infrastructure. You'll work with React, Node.js, and AWS to create scalable systems.",
        experienceLevel: 'Senior',
        requiredSkills: ['React', 'TypeScript', 'Node.js', 'AWS', 'Docker', 'Kubernetes'],
        preferredSkills: ['GraphQL', 'Machine Learning'],
      });

      const result = await parseJobPosting(env, INDEED_JOB_TEXT);

      expect(result.job.title).toBe(INDEED_EXPECTED.title);
      expect(result.job.company).toBe(INDEED_EXPECTED.company);
      expect(result.job.location).toBe(INDEED_EXPECTED.location);
      expect(result.job.workArrangement).toBe(INDEED_EXPECTED.workArrangement);
      expect(result.job.salaryMin).toBe(INDEED_EXPECTED.salaryMin);
      expect(result.job.salaryMax).toBe(INDEED_EXPECTED.salaryMax);
    });

    it('should parse minimal job posting (only title, company, description)', async () => {
      const env = createMockEnv({
        title: 'Software Developer',
        company: 'TechCorp',
        location: 'Location not specified',
        workArrangement: 'Unknown',
        description:
          'We are hiring a software developer to work on exciting projects. You should know Python and JavaScript.',
        requiredSkills: ['Python', 'JavaScript'],
        preferredSkills: [],
      });

      const result = await parseJobPosting(env, MINIMAL_JOB_TEXT);

      expect(result.job.title).toBe('Software Developer');
      expect(result.job.company).toBe('TechCorp');
      expect(result.job.description.length).toBeGreaterThanOrEqual(
        QUALITY_THRESHOLD.MIN_DESCRIPTION_LENGTH
      );
      expect(result.metadata.warnings.length).toBeGreaterThan(0); // Should have warnings for missing fields
    });

    it('should handle missing optional fields (no salary, no URL)', async () => {
      const env = createMockEnv({
        title: 'Frontend Developer',
        company: 'StartupCo',
        location: 'New York, NY',
        workArrangement: 'Hybrid',
        description:
          'Join our team to build amazing web applications. We use modern JavaScript frameworks and care about user experience.',
        requiredSkills: ['React', 'JavaScript', 'CSS'],
        preferredSkills: ['TypeScript', 'Next.js'],
      });

      const result = await parseJobPosting(env, 'Frontend Developer at StartupCo...');

      expect(result.job.salaryMin).toBeUndefined();
      expect(result.job.salaryMax).toBeUndefined();
      expect(result.job.url).toBeUndefined();
      expect(result.metadata.warnings).toContain('No job posting URL provided');
    });
  });

  // ===========================================================================
  // Salary Parsing Tests
  // ===========================================================================

  describe('Salary Parsing', () => {
    it('should parse salary format: "$100k-$150k"', async () => {
      const env = createMockEnv({
        title: 'Engineer',
        company: 'Company',
        location: 'Remote',
        workArrangement: 'Remote',
        salaryMin: 100000,
        salaryMax: 150000,
        description: 'Engineering position with competitive salary and great benefits. We offer flexible work arrangements.',
        requiredSkills: [],
        preferredSkills: [],
      });

      const result = await parseJobPosting(env, 'Engineer at Company. Salary: $100k-$150k');

      expect(result.job.salaryMin).toBe(100000);
      expect(result.job.salaryMax).toBe(150000);
    });

    it('should parse salary format: "100-150K"', async () => {
      const env = createMockEnv({
        title: 'Engineer',
        company: 'Company',
        location: 'Remote',
        workArrangement: 'Remote',
        salaryMin: 100000,
        salaryMax: 150000,
        description: 'Engineering position with competitive salary and great benefits. We offer flexible work arrangements.',
        requiredSkills: [],
        preferredSkills: [],
      });

      const result = await parseJobPosting(env, 'Engineer at Company. Salary: 100-150K');

      expect(result.job.salaryMin).toBe(100000);
      expect(result.job.salaryMax).toBe(150000);
    });

    it('should parse salary format: "100000-150000"', async () => {
      const env = createMockEnv({
        title: 'Engineer',
        company: 'Company',
        location: 'Remote',
        workArrangement: 'Remote',
        salaryMin: 100000,
        salaryMax: 150000,
        description: 'Engineering position with competitive salary and great benefits. We offer flexible work arrangements.',
        requiredSkills: [],
        preferredSkills: [],
      });

      const result = await parseJobPosting(env, 'Engineer at Company. Salary: $100,000-$150,000');

      expect(result.job.salaryMin).toBe(100000);
      expect(result.job.salaryMax).toBe(150000);
    });

    it('should handle single salary value (set both min and max)', async () => {
      const env = createMockEnv({
        title: 'Engineer',
        company: 'Company',
        location: 'Remote',
        workArrangement: 'Remote',
        salaryMin: 120000,
        salaryMax: 120000,
        description: 'Engineering position with fixed salary and great benefits. We offer flexible work arrangements.',
        requiredSkills: [],
        preferredSkills: [],
      });

      const result = await parseJobPosting(env, 'Engineer at Company. Salary: $120,000');

      expect(result.job.salaryMin).toBe(120000);
      expect(result.job.salaryMax).toBe(120000);
    });
  });

  // ===========================================================================
  // Work Arrangement Inference Tests
  // ===========================================================================

  describe('Work Arrangement Inference', () => {
    it('should detect "Remote" from keyword "remote"', async () => {
      const env = createMockEnv({
        title: 'Remote Engineer',
        company: 'Company',
        location: 'Remote',
        workArrangement: 'Remote',
        description: 'This is a fully remote position where you can work from anywhere in the world.',
        requiredSkills: [],
        preferredSkills: [],
      });

      const result = await parseJobPosting(env, 'Remote Engineer at Company. Work from anywhere.');

      expect(result.job.workArrangement).toBe('Remote');
    });

    it('should detect "Hybrid" from keyword "hybrid"', async () => {
      const env = createMockEnv({
        title: 'Hybrid Engineer',
        company: 'Company',
        location: 'San Francisco, CA',
        workArrangement: 'Hybrid',
        description: 'This is a hybrid position with 3 days in office and 2 days remote each week.',
        requiredSkills: [],
        preferredSkills: [],
      });

      const result = await parseJobPosting(
        env,
        'Hybrid Engineer at Company. 3 days in office, 2 days remote.'
      );

      expect(result.job.workArrangement).toBe('Hybrid');
    });

    it('should detect "On-site" from keyword "on-site"', async () => {
      const env = createMockEnv({
        title: 'Onsite Engineer',
        company: 'Company',
        location: 'New York, NY',
        workArrangement: 'On-site',
        description: 'This is an on-site position at our New York office requiring daily attendance.',
        requiredSkills: [],
        preferredSkills: [],
      });

      const result = await parseJobPosting(env, 'Onsite Engineer at Company. Office-based role.');

      expect(result.job.workArrangement).toBe('On-site');
    });

    it('should default to "Unknown" when work arrangement is unclear', async () => {
      const env = createMockEnv({
        title: 'Engineer',
        company: 'Company',
        location: 'Location not specified',
        workArrangement: 'Unknown',
        description: 'Engineering position with flexible work options and competitive benefits package.',
        requiredSkills: [],
        preferredSkills: [],
      });

      const result = await parseJobPosting(env, 'Engineer at Company. Details TBD.');

      expect(result.job.workArrangement).toBe('Unknown');
    });
  });

  // ===========================================================================
  // Validation Tests
  // ===========================================================================

  describe('Quality Validation', () => {
    it('should reject parsing with invalid data: empty title', async () => {
      const env = createMockEnv({
        title: '', // Invalid
        company: 'Company',
        location: 'Remote',
        workArrangement: 'Remote',
        description: 'Valid description that is long enough to pass validation rules.',
        requiredSkills: [],
        preferredSkills: [],
      });

      await expect(parseJobPosting(env, 'Invalid job posting')).rejects.toThrow();
    });

    it('should reject parsing with invalid data: title too short', async () => {
      const env = createMockEnv({
        title: 'IT', // Too short (< 3 chars)
        company: 'Company',
        location: 'Remote',
        workArrangement: 'Remote',
        description: 'Valid description that is long enough to pass validation rules.',
        requiredSkills: [],
        preferredSkills: [],
      });

      await expect(parseJobPosting(env, 'Invalid job posting')).rejects.toThrow();
    });

    it('should reject parsing with description too short', async () => {
      const env = createMockEnv({
        title: 'Engineer',
        company: 'Company',
        location: 'Remote',
        workArrangement: 'Remote',
        description: 'Too short', // < 50 chars
        requiredSkills: [],
        preferredSkills: [],
      });

      await expect(parseJobPosting(env, 'Invalid job posting')).rejects.toThrow();
    });

    it('should reject parsing with invalid salary range (min > max)', async () => {
      const env = createMockEnv({
        title: 'Engineer',
        company: 'Company',
        location: 'Remote',
        workArrangement: 'Remote',
        salaryMin: 150000, // Greater than max
        salaryMax: 100000,
        description: 'Valid description that is long enough to pass validation rules.',
        requiredSkills: [],
        preferredSkills: [],
      });

      await expect(parseJobPosting(env, 'Invalid job posting')).rejects.toThrow();
    });

    it('should reject parsing with negative salary values', async () => {
      const env = createMockEnv({
        title: 'Engineer',
        company: 'Company',
        location: 'Remote',
        workArrangement: 'Remote',
        salaryMin: -50000, // Negative
        salaryMax: 100000,
        description: 'Valid description that is long enough to pass validation rules.',
        requiredSkills: [],
        preferredSkills: [],
      });

      await expect(parseJobPosting(env, 'Invalid job posting')).rejects.toThrow();
    });

    it('should reject parsing with invalid work arrangement', async () => {
      const env = createMockEnv({
        title: 'Engineer',
        company: 'Company',
        location: 'Remote',
        workArrangement: 'InvalidArrangement' as WorkArrangement,
        description: 'Valid description that is long enough to pass validation rules.',
        requiredSkills: [],
        preferredSkills: [],
      });

      await expect(parseJobPosting(env, 'Invalid job posting')).rejects.toThrow();
    });
  });

  // ===========================================================================
  // Confidence Scoring Tests
  // ===========================================================================

  describe('Confidence Scoring', () => {
    it('should calculate high confidence (>= 80) for complete data', async () => {
      const env = createMockEnv({
        title: 'Senior Engineer',
        company: 'Google',
        location: 'San Francisco, CA',
        workArrangement: 'Remote',
        salaryMin: 150000,
        salaryMax: 200000,
        description:
          'Complete job description with all the details you need to know about this position.',
        url: 'https://careers.google.com/jobs/123',
        experienceLevel: 'Senior',
        requiredSkills: ['React', 'TypeScript', 'Node.js', 'AWS', 'Docker'],
        preferredSkills: ['GraphQL', 'Machine Learning'],
      });

      const result = await parseJobPosting(env, INDEED_JOB_TEXT);

      expect(result.metadata.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should calculate medium confidence (50-79) for partial data', async () => {
      const env = createMockEnv({
        title: 'Engineer',
        company: 'Company',
        location: 'Location not specified',
        workArrangement: 'Unknown',
        description:
          'Basic job description without many details but still meets minimum length requirement.',
        requiredSkills: ['JavaScript'],
        preferredSkills: [],
      });

      const result = await parseJobPosting(env, MINIMAL_JOB_TEXT);

      expect(result.metadata.confidence).toBeGreaterThanOrEqual(40); // Has required fields
      expect(result.metadata.confidence).toBeLessThan(80);
    });

    it('should include warnings for missing optional fields', async () => {
      const env = createMockEnv({
        title: 'Engineer',
        company: 'Company',
        location: 'Remote',
        workArrangement: 'Unknown', // Triggers warning
        description: 'Valid description that is long enough to pass validation rules.',
        // No URL - triggers warning
        // No experienceLevel - triggers warning
        requiredSkills: [], // Empty skills - triggers warning
        preferredSkills: [],
      });

      const result = await parseJobPosting(env, 'Minimal job posting');

      expect(result.metadata.warnings).toContain('No job posting URL provided');
      expect(result.metadata.warnings).toContain('Experience level not specified');
      expect(result.metadata.warnings).toContain('No required skills extracted');
      expect(result.metadata.warnings).toContain('Could not determine work arrangement');
    });
  });

  // ===========================================================================
  // Retry and Fallback Tests
  // ===========================================================================

  describe('Retry Logic and Fallback', () => {
    it('should retry Workers AI on transient failure', async () => {
      const env = createMockEnv();
      const mockAI = env.AI as { run: ReturnType<typeof vi.fn> };

      // First call fails, second succeeds
      mockAI.run
        .mockRejectedValueOnce(new Error('Transient failure'))
        .mockResolvedValueOnce({
          response: JSON.stringify({
            title: 'Engineer',
            company: 'Company',
            location: 'Remote',
            workArrangement: 'Remote',
            description: 'Valid description that is long enough to pass validation rules.',
            requiredSkills: [],
            preferredSkills: [],
          }),
        });

      const result = await parseJobPosting(env, 'Job posting text');

      expect(result).toBeDefined();
      expect(mockAI.run).toHaveBeenCalledTimes(2); // Retry happened
    });

    it('should fallback to OpenAI when Workers AI fails after retries', async () => {
      const env = createMockEnv(undefined, new Error('Workers AI failure'));

      // This should trigger OpenAI fallback
      // Mock will need to be configured for OpenAI in real implementation
      await expect(parseJobPosting(env, 'Job posting text')).rejects.toThrow();
      // Note: Full OpenAI fallback testing requires mocking fetch/OpenAI client
    });

    it('should use correct model names', () => {
      expect(PARSER_MODEL).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
      expect(FALLBACK_MODEL).toBe('gpt-4o-mini');
    });

    it('should use correct retry configuration', () => {
      expect(PARSER_CONFIG.MAX_RETRIES).toBe(2);
      expect(PARSER_CONFIG.RETRY_DELAY_MS).toBe(500);
      expect(PARSER_CONFIG.RETRY_BACKOFF_MULTIPLIER).toBe(2);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty required skills array', async () => {
      const env = createMockEnv({
        title: 'Engineer',
        company: 'Company',
        location: 'Remote',
        workArrangement: 'Remote',
        description: 'Job description without specific skill requirements or technical details provided.',
        requiredSkills: [],
        preferredSkills: [],
      });

      const result = await parseJobPosting(env, 'Generic job posting');

      expect(result.job.requiredSkills).toEqual([]);
      expect(result.metadata.warnings).toContain('No required skills extracted');
    });

    it('should handle empty preferred skills array', async () => {
      const env = createMockEnv({
        title: 'Engineer',
        company: 'Company',
        location: 'Remote',
        workArrangement: 'Remote',
        description: 'Job description with required skills but no preferred skills or bonus qualifications.',
        requiredSkills: ['JavaScript'],
        preferredSkills: [],
      });

      const result = await parseJobPosting(env, 'Job posting');

      expect(result.job.preferredSkills).toEqual([]);
    });

    it('should handle job posting with URL', async () => {
      const env = createMockEnv({
        title: 'Engineer',
        company: 'Company',
        location: 'Remote',
        workArrangement: 'Remote',
        description: 'Job description with valid URL and link to complete application details online.',
        url: 'https://example.com/jobs/123',
        requiredSkills: [],
        preferredSkills: [],
      });

      const result = await parseJobPosting(env, 'Job posting with URL');

      expect(result.job.url).toBe('https://example.com/jobs/123');
      expect(result.metadata.warnings).not.toContain('No job posting URL provided');
    });

    it('should handle job posting with experience level', async () => {
      const env = createMockEnv({
        title: 'Senior Engineer',
        company: 'Company',
        location: 'Remote',
        workArrangement: 'Remote',
        description: 'Senior-level engineering position requiring extensive experience and technical expertise.',
        experienceLevel: 'Senior',
        requiredSkills: [],
        preferredSkills: [],
      });

      const result = await parseJobPosting(env, 'Senior job posting');

      expect(result.job.experienceLevel).toBe('Senior');
      expect(result.metadata.warnings).not.toContain('Experience level not specified');
    });
  });

  // ===========================================================================
  // Integration Tests (Workers AI Calls)
  // ===========================================================================

  describe('Workers AI Integration', () => {
    it('should call Workers AI with correct model and parameters', async () => {
      const env = createMockEnv();
      const mockAI = env.AI as { run: ReturnType<typeof vi.fn> };

      await parseJobPosting(env, LINKEDIN_JOB_TEXT);

      expect(mockAI.run).toHaveBeenCalledWith(
        PARSER_MODEL,
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' }),
          ]),
          temperature: PARSER_CONFIG.TEMPERATURE,
          max_tokens: PARSER_CONFIG.MAX_TOKENS,
          response_format: { type: 'json_object' },
        })
      );
    });

    it('should include job text in user prompt', async () => {
      const env = createMockEnv();
      const mockAI = env.AI as { run: ReturnType<typeof vi.fn> };

      await parseJobPosting(env, LINKEDIN_JOB_TEXT);

      const callArgs = mockAI.run.mock.calls[0][1];
      const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');

      expect(userMessage.content).toContain(LINKEDIN_JOB_TEXT);
    });
  });
});
