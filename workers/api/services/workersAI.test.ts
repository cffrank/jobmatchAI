/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Test suite for Workers AI job compatibility analysis service
 *
 * Tests:
 * - Successful analysis generation
 * - Quality validation (all dimensions, scores, justifications)
 * - Multi-model fallback chain
 * - Retry logic with exponential backoff
 * - JSON parsing and error handling
 * - Edge cases (empty data, malformed responses)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeJobCompatibilityWithWorkersAI, COMPATIBILITY_MODEL } from './workersAI';
import type { Env, Job, UserProfile, WorkExperience, Education, Skill, JobCompatibilityAnalysis } from '../types';

// =============================================================================
// Mock Data
// =============================================================================

const mockJob: Job = {
  id: 'job-123',
  title: 'Senior Software Engineer',
  company: 'Tech Corp',
  location: 'San Francisco, CA',
  workArrangement: 'Remote',
  salaryMin: 150000,
  salaryMax: 200000,
  postedDate: '2024-01-01',
  description: 'We are seeking a Senior Software Engineer with 5+ years of experience in React, TypeScript, and Node.js. You will lead the development of our next-generation platform.',
  url: 'https://example.com/job',
  source: 'linkedin',
  requiredSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
  preferredSkills: ['AWS', 'Docker', 'GraphQL'],
  experienceLevel: 'Senior',
  isSaved: false,
  isArchived: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockProfile: UserProfile = {
  id: 'user-456',
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  location: 'San Francisco, CA',
  headline: 'Senior Software Engineer',
  summary: 'Passionate software engineer with 6 years of experience building scalable web applications.',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockWorkExperience: WorkExperience[] = [
  {
    id: 'exp-1',
    userId: 'user-456',
    position: 'Senior Software Engineer',
    company: 'StartupCo',
    location: 'San Francisco, CA',
    startDate: '2020-01-01',
    current: true,
    description: 'Lead engineer for platform team',
    accomplishments: [
      'Built React-based dashboard serving 10,000+ daily users',
      'Reduced API response time by 40% through database optimization',
      'Mentored 3 junior engineers',
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'exp-2',
    userId: 'user-456',
    position: 'Software Engineer',
    company: 'BigCorp',
    location: 'San Francisco, CA',
    startDate: '2018-01-01',
    endDate: '2020-01-01',
    current: false,
    description: 'Full-stack development',
    accomplishments: [
      'Developed microservices using Node.js and PostgreSQL',
      'Implemented CI/CD pipeline with Docker',
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const mockEducation: Education[] = [
  {
    id: 'edu-1',
    userId: 'user-456',
    degree: 'Bachelor of Science',
    field: 'Computer Science',
    school: 'University of California',
    graduationYear: 2018,
    gpa: 3.8,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const mockSkills: Skill[] = [
  { id: 's1', userId: 'user-456', name: 'React', level: 'expert', yearsOfExperience: 5, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 's2', userId: 'user-456', name: 'TypeScript', level: 'expert', yearsOfExperience: 5, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 's3', userId: 'user-456', name: 'Node.js', level: 'advanced', yearsOfExperience: 4, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 's4', userId: 'user-456', name: 'PostgreSQL', level: 'advanced', yearsOfExperience: 4, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 's5', userId: 'user-456', name: 'AWS', level: 'intermediate', yearsOfExperience: 2, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
];

const mockValidAnalysis: JobCompatibilityAnalysis = {
  overallScore: 85,
  recommendation: 'Strong Match',
  dimensions: {
    skillMatch: {
      score: 9,
      justification: 'Candidate has extensive experience with all required skills (React, TypeScript, Node.js, PostgreSQL) with 4-5 years in each. Also has AWS experience which is a preferred skill.',
    },
    industryMatch: {
      score: 8,
      justification: 'Strong background in software engineering at tech companies. Experience aligns well with startup and enterprise environments.',
    },
    experienceLevel: {
      score: 9,
      justification: 'Candidate has 6 years of experience which exceeds the 5+ year requirement. Has progressed from Software Engineer to Senior Software Engineer showing career growth.',
    },
    locationMatch: {
      score: 10,
      justification: 'Perfect match - candidate is already in San Francisco and job is remote, providing maximum flexibility.',
    },
    seniorityLevel: {
      score: 10,
      justification: 'Candidate currently holds Senior Software Engineer title matching the job title exactly. Leadership experience mentoring 3 junior engineers.',
    },
    educationCertification: {
      score: 9,
      justification: 'BS in Computer Science from reputable university with strong GPA (3.8). Meets all educational requirements.',
    },
    softSkillsLeadership: {
      score: 8,
      justification: 'Demonstrated leadership through mentoring junior engineers. Accomplishments show ability to deliver impact and work on complex problems.',
    },
    employmentStability: {
      score: 9,
      justification: 'Stable employment history with 2 years at BigCorp and 4 years (current) at StartupCo. No job-hopping pattern, shows commitment.',
    },
    growthPotential: {
      score: 8,
      justification: 'Clear career progression from Engineer to Senior Engineer. Continuous skill acquisition (added AWS recently). Strong learning trajectory.',
    },
    companyScaleAlignment: {
      score: 7,
      justification: 'Experience at both startup and larger company provides good fit for Tech Corp. Adaptable to different organizational scales.',
    },
  },
  strengths: [
    'Perfect skill match with all required technologies and 4-5 years experience each',
    'Senior-level experience with leadership and mentoring background',
    'Geographic match with remote flexibility',
  ],
  gaps: [
    'Limited experience with Docker (mentioned in accomplishments but not as primary skill)',
    'No GraphQL experience mentioned (preferred skill)',
    'Could benefit from more enterprise-scale project experience',
  ],
  redFlags: [],
};

// =============================================================================
// Mock Environment
// =============================================================================

function createMockEnv(mockAIResponses?: JobCompatibilityAnalysis[], alwaysReturnFirstResponse = false): Env {
  let callCount = 0;

  return {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    OPENAI_API_KEY: 'test-openai-key',
    APP_URL: 'http://localhost:3000',
    ENVIRONMENT: 'development',
    AI: {
      run: vi.fn(async (_model: string, _inputs: any) => {
        // For validation tests, always return the same (invalid) response
        // so fallback models also fail validation
        const responseIndex = alwaysReturnFirstResponse ? 0 : callCount;
        const analysisToReturn = mockAIResponses?.[responseIndex] || mockValidAnalysis;
        callCount++;

        return {
          response: JSON.stringify(analysisToReturn),
        };
      }),
    } as any,
  } as Env;
}

// =============================================================================
// Test Suite
// =============================================================================

describe('Workers AI Job Compatibility Analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful Analysis', () => {
    it('should generate valid compatibility analysis', async () => {
      const env = createMockEnv();
      const context = {
        job: mockJob,
        profile: mockProfile,
        workExperience: mockWorkExperience,
        education: mockEducation,
        skills: mockSkills,
      };

      const result = await analyzeJobCompatibilityWithWorkersAI(env, context);

      expect(result).toBeDefined();
      expect(result?.overallScore).toBe(85);
      expect(result?.recommendation).toBe('Strong Match');
      expect(env.AI.run).toHaveBeenCalledWith(
        COMPATIBILITY_MODEL,
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' }),
          ]),
          temperature: 0.3,
          max_tokens: 4000,
          response_format: { type: 'json_object' },
        })
      );
    });

    it('should include all 10 dimensions in analysis', async () => {
      const env = createMockEnv();
      const context = {
        job: mockJob,
        profile: mockProfile,
        workExperience: mockWorkExperience,
        education: mockEducation,
        skills: mockSkills,
      };

      const result = await analyzeJobCompatibilityWithWorkersAI(env, context);

      expect(result).toBeDefined();
      expect(result?.dimensions.skillMatch).toBeDefined();
      expect(result?.dimensions.industryMatch).toBeDefined();
      expect(result?.dimensions.experienceLevel).toBeDefined();
      expect(result?.dimensions.locationMatch).toBeDefined();
      expect(result?.dimensions.seniorityLevel).toBeDefined();
      expect(result?.dimensions.educationCertification).toBeDefined();
      expect(result?.dimensions.softSkillsLeadership).toBeDefined();
      expect(result?.dimensions.employmentStability).toBeDefined();
      expect(result?.dimensions.growthPotential).toBeDefined();
      expect(result?.dimensions.companyScaleAlignment).toBeDefined();
    });

    it('should validate all dimension scores are 1-10', async () => {
      const env = createMockEnv();
      const context = {
        job: mockJob,
        profile: mockProfile,
        workExperience: mockWorkExperience,
        education: mockEducation,
        skills: mockSkills,
      };

      const result = await analyzeJobCompatibilityWithWorkersAI(env, context);

      expect(result).toBeDefined();
      const dimensions = Object.values(result!.dimensions);
      dimensions.forEach(dim => {
        expect(dim.score).toBeGreaterThanOrEqual(1);
        expect(dim.score).toBeLessThanOrEqual(10);
        expect(dim.justification).toBeDefined();
        expect(dim.justification.length).toBeGreaterThan(30);
      });
    });

    it('should return exactly 3 strengths and 3 gaps', async () => {
      const env = createMockEnv();
      const context = {
        job: mockJob,
        profile: mockProfile,
        workExperience: mockWorkExperience,
        education: mockEducation,
        skills: mockSkills,
      };

      const result = await analyzeJobCompatibilityWithWorkersAI(env, context);

      expect(result).toBeDefined();
      expect(result?.strengths).toHaveLength(3);
      expect(result?.gaps).toHaveLength(3);
      expect(Array.isArray(result?.redFlags)).toBe(true);
    });
  });

  describe('Quality Validation', () => {
    it('should reject analysis with invalid overall score', async () => {
      const invalidAnalysis = {
        ...mockValidAnalysis,
        overallScore: 150, // Invalid - outside 0-100 range
      };

      // Use alwaysReturnFirstResponse=true so all fallback models return the same invalid response
      const env = createMockEnv([invalidAnalysis], true);
      const context = {
        job: mockJob,
        profile: mockProfile,
        workExperience: mockWorkExperience,
        education: mockEducation,
        skills: mockSkills,
      };

      const result = await analyzeJobCompatibilityWithWorkersAI(env, context);

      // Should return null when quality validation fails for all models
      expect(result).toBeNull();
    });

    it('should reject analysis with invalid recommendation', async () => {
      const invalidAnalysis = {
        ...mockValidAnalysis,
        recommendation: 'Invalid Category' as any,
      };

      const env = createMockEnv([invalidAnalysis], true);
      const context = {
        job: mockJob,
        profile: mockProfile,
        workExperience: mockWorkExperience,
        education: mockEducation,
        skills: mockSkills,
      };

      const result = await analyzeJobCompatibilityWithWorkersAI(env, context);

      expect(result).toBeNull();
    });

    it('should reject analysis with missing dimension', async () => {
      const invalidAnalysis = {
        ...mockValidAnalysis,
        dimensions: {
          ...mockValidAnalysis.dimensions,
          skillMatch: undefined as any, // Missing dimension
        },
      };

      const env = createMockEnv([invalidAnalysis], true);
      const context = {
        job: mockJob,
        profile: mockProfile,
        workExperience: mockWorkExperience,
        education: mockEducation,
        skills: mockSkills,
      };

      const result = await analyzeJobCompatibilityWithWorkersAI(env, context);

      expect(result).toBeNull();
    });

    it('should reject analysis with invalid dimension score', async () => {
      const invalidAnalysis = {
        ...mockValidAnalysis,
        dimensions: {
          ...mockValidAnalysis.dimensions,
          skillMatch: {
            score: 15, // Invalid - outside 1-10 range
            justification: 'Test justification that is long enough',
          },
        },
      };

      const env = createMockEnv([invalidAnalysis], true);
      const context = {
        job: mockJob,
        profile: mockProfile,
        workExperience: mockWorkExperience,
        education: mockEducation,
        skills: mockSkills,
      };

      const result = await analyzeJobCompatibilityWithWorkersAI(env, context);

      expect(result).toBeNull();
    });

    it('should reject analysis with short justification', async () => {
      const invalidAnalysis = {
        ...mockValidAnalysis,
        dimensions: {
          ...mockValidAnalysis.dimensions,
          skillMatch: {
            score: 8,
            justification: 'Too short', // Less than 30 chars
          },
        },
      };

      const env = createMockEnv([invalidAnalysis], true);
      const context = {
        job: mockJob,
        profile: mockProfile,
        workExperience: mockWorkExperience,
        education: mockEducation,
        skills: mockSkills,
      };

      const result = await analyzeJobCompatibilityWithWorkersAI(env, context);

      expect(result).toBeNull();
    });

    it('should reject analysis with insufficient strengths', async () => {
      const invalidAnalysis = {
        ...mockValidAnalysis,
        strengths: ['Only one strength'], // Need 3
      };

      const env = createMockEnv([invalidAnalysis], true);
      const context = {
        job: mockJob,
        profile: mockProfile,
        workExperience: mockWorkExperience,
        education: mockEducation,
        skills: mockSkills,
      };

      const result = await analyzeJobCompatibilityWithWorkersAI(env, context);

      expect(result).toBeNull();
    });

    it('should reject analysis with insufficient gaps', async () => {
      const invalidAnalysis = {
        ...mockValidAnalysis,
        gaps: ['Only one gap'], // Need 3
      };

      const env = createMockEnv([invalidAnalysis], true);
      const context = {
        job: mockJob,
        profile: mockProfile,
        workExperience: mockWorkExperience,
        education: mockEducation,
        skills: mockSkills,
      };

      const result = await analyzeJobCompatibilityWithWorkersAI(env, context);

      expect(result).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should return null when Workers AI throws error', async () => {
      const env = createMockEnv();
      vi.mocked(env.AI.run).mockRejectedValue(new Error('Workers AI unavailable'));

      const context = {
        job: mockJob,
        profile: mockProfile,
        workExperience: mockWorkExperience,
        education: mockEducation,
        skills: mockSkills,
      };

      const result = await analyzeJobCompatibilityWithWorkersAI(env, context);

      expect(result).toBeNull();
    });

    it('should return null when response is not valid JSON', async () => {
      const env = createMockEnv();
      vi.mocked(env.AI.run).mockResolvedValue({
        response: 'This is not JSON',
      } as any);

      const context = {
        job: mockJob,
        profile: mockProfile,
        workExperience: mockWorkExperience,
        education: mockEducation,
        skills: mockSkills,
      };

      const result = await analyzeJobCompatibilityWithWorkersAI(env, context);

      expect(result).toBeNull();
    });

    it('should retry on transient failures', async () => {
      const env = createMockEnv();

      // First call fails, second succeeds
      vi.mocked(env.AI.run)
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce({
          response: JSON.stringify(mockValidAnalysis),
        } as any);

      const context = {
        job: mockJob,
        profile: mockProfile,
        workExperience: mockWorkExperience,
        education: mockEducation,
        skills: mockSkills,
      };

      const result = await analyzeJobCompatibilityWithWorkersAI(env, context);

      expect(result).toBeDefined();
      expect(result?.overallScore).toBe(85);
      expect(env.AI.run).toHaveBeenCalledTimes(2); // Retry succeeded
    });
  });

  describe('Prompt Construction', () => {
    it('should include job details in prompt', async () => {
      const env = createMockEnv();
      const context = {
        job: mockJob,
        profile: mockProfile,
        workExperience: mockWorkExperience,
        education: mockEducation,
        skills: mockSkills,
      };

      await analyzeJobCompatibilityWithWorkersAI(env, context);

      const callArgs = vi.mocked(env.AI.run).mock.calls[0];
      const inputs = callArgs[1] as { messages: { role: string; content: string }[] };
      const userMessage = inputs.messages.find((m: any) => m.role === 'user');

      expect(userMessage).toBeDefined();
      expect(userMessage!.content).toContain('Senior Software Engineer');
      expect(userMessage!.content).toContain('Tech Corp');
      expect(userMessage!.content).toContain('React');
      expect(userMessage!.content).toContain('TypeScript');
    });

    it('should include candidate profile in prompt', async () => {
      const env = createMockEnv();
      const context = {
        job: mockJob,
        profile: mockProfile,
        workExperience: mockWorkExperience,
        education: mockEducation,
        skills: mockSkills,
      };

      await analyzeJobCompatibilityWithWorkersAI(env, context);

      const callArgs = vi.mocked(env.AI.run).mock.calls[0];
      const inputs = callArgs[1] as { messages: { role: string; content: string }[] };
      const userMessage = inputs.messages.find((m: any) => m.role === 'user');

      expect(userMessage).toBeDefined();
      expect(userMessage!.content).toContain('John Doe');
      expect(userMessage!.content).toContain('john@example.com');
      expect(userMessage!.content).toContain('StartupCo');
      expect(userMessage!.content).toContain('University of California');
    });
  });
});
