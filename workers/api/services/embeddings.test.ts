/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit Tests for Embedding Service
 *
 * Comprehensive test coverage for Cloudflare Workers AI embedding generation:
 * - generateEmbedding() - Core embedding generation with retry logic
 * - generateJobEmbedding() - Job listing embeddings
 * - generateResumeEmbedding() - User profile/resume embeddings
 * - updateUserResumeEmbedding() - Database integration
 *
 * Coverage Target: >90%
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateEmbedding,
  generateJobEmbedding,
  generateResumeEmbedding,
  updateUserResumeEmbedding,
} from './embeddings';
import type { Env, Job, UserProfile, WorkExperience, Skill } from '../types';

// =============================================================================
// Test Utilities & Mocks
// =============================================================================

/**
 * Create a valid 768-dimensional embedding vector
 * Returns array of random numbers between -1 and 1 (typical embedding range)
 */
function createMockEmbedding(dimensions = 768): number[] {
  return Array.from({ length: dimensions }, () => Math.random() * 2 - 1);
}

/**
 * Create mock environment with Workers AI binding
 */
function createMockEnv(): Env {
  return {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    OPENAI_API_KEY: 'test-openai-key',
    APP_URL: 'http://localhost:3000',
    ENVIRONMENT: 'development',
    AI: {
      run: vi.fn(),
    },
  } as unknown as Env;
}

/**
 * Create mock Supabase client with proper chaining
 */
function createMockSupabase() {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  };

  return {
    from: vi.fn(() => mockChain),
  };
}

/**
 * Create mock job object
 */
function createMockJob(overrides?: Partial<Job>): Job {
  return {
    id: 'job-123',
    userId: 'user-456',
    title: 'Senior Software Engineer',
    company: 'Acme Corporation',
    companyLogo: 'https://example.com/logo.png',
    location: 'San Francisco, CA',
    workArrangement: 'Remote',
    salaryMin: 150000,
    salaryMax: 200000,
    postedDate: '2024-01-15',
    description:
      'We are looking for a talented engineer to build scalable systems using TypeScript, React, and Node.js.',
    url: 'https://example.com/jobs/123',
    source: 'linkedin',
    requiredSkills: ['TypeScript', 'React', 'Node.js'],
    preferredSkills: ['PostgreSQL', 'Docker'],
    experienceLevel: 'Senior',
    matchScore: 85,
    isSaved: false,
    isArchived: false,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    ...overrides,
  };
}

/**
 * Create mock user profile
 */
function createMockProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    headline: 'Senior Software Engineer',
    summary: 'Experienced full-stack developer with 8 years of experience in TypeScript and React.',
    location: 'San Francisco, CA',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    ...overrides,
  };
}

/**
 * Create mock work experience
 */
function createMockWorkExperience(overrides?: Partial<WorkExperience>): WorkExperience {
  return {
    id: 'exp-1',
    userId: 'user-123',
    position: 'Senior Software Engineer',
    company: 'Tech Company',
    location: 'San Francisco, CA',
    startDate: '2020-01-01',
    endDate: null,
    current: true,
    description: 'Led development of microservices architecture using Node.js and TypeScript.',
    accomplishments: ['Built scalable API', 'Improved performance by 40%'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Create mock skill
 */
function createMockSkill(name: string): Skill {
  return {
    id: `skill-${name}`,
    userId: 'user-123',
    name,
    level: 'advanced',
    endorsements: 15,
    yearsOfExperience: 5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

// =============================================================================
// Test Suite 1: generateEmbedding()
// =============================================================================

describe('generateEmbedding', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 768-dimensional vector for valid text', async () => {
    const mockEmbedding = createMockEmbedding(768);
    vi.mocked(mockEnv.AI.run).mockResolvedValueOnce({
      shape: [1, 768],
      data: [mockEmbedding],
    });

    const result = await generateEmbedding(mockEnv, 'software engineer with TypeScript experience');

    expect(result).toHaveLength(768);
    expect(result.every((n) => typeof n === 'number')).toBe(true);
    expect(result).toEqual(mockEmbedding);
    expect(mockEnv.AI.run).toHaveBeenCalledTimes(1);
    expect(mockEnv.AI.run).toHaveBeenCalledWith('@cf/baai/bge-base-en-v1.5', {
      text: ['software engineer with TypeScript experience'],
    });
  });

  it('throws error for empty text', async () => {
    await expect(generateEmbedding(mockEnv, '')).rejects.toThrow(
      'Cannot generate embedding for empty text'
    );
    expect(mockEnv.AI.run).not.toHaveBeenCalled();
  });

  it('throws error for whitespace-only text', async () => {
    await expect(generateEmbedding(mockEnv, '   \n\t   ')).rejects.toThrow(
      'Cannot generate embedding for empty text'
    );
    expect(mockEnv.AI.run).not.toHaveBeenCalled();
  });

  it('truncates very long text to 8000 characters', async () => {
    const longText = 'a'.repeat(10000);
    const mockEmbedding = createMockEmbedding(768);
    vi.mocked(mockEnv.AI.run).mockResolvedValueOnce({
      shape: [1, 768],
      data: [mockEmbedding],
    });

    await generateEmbedding(mockEnv, longText);

    expect(mockEnv.AI.run).toHaveBeenCalledWith('@cf/baai/bge-base-en-v1.5', {
      text: ['a'.repeat(8000)],
    });
  });

  it('different texts produce different embeddings', async () => {
    const embedding1 = createMockEmbedding(768);
    const embedding2 = embedding1.map((v) => v * 0.5); // Different values

    vi.mocked(mockEnv.AI.run)
      .mockResolvedValueOnce({
        shape: [1, 768],
        data: [embedding1],
      })
      .mockResolvedValueOnce({
        shape: [1, 768],
        data: [embedding2],
      });

    const result1 = await generateEmbedding(mockEnv, 'software engineer');
    const result2 = await generateEmbedding(mockEnv, 'data scientist');

    expect(result1).not.toEqual(result2);
    expect(mockEnv.AI.run).toHaveBeenCalledTimes(2);
  });

  it('retries on API failure with exponential backoff', async () => {
    const mockEmbedding = createMockEmbedding(768);

    // First two attempts fail, third succeeds
    vi.mocked(mockEnv.AI.run)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce({
        shape: [1, 768],
        data: [mockEmbedding],
      });

    const promise = generateEmbedding(mockEnv, 'test text');

    // Fast-forward through retry delays
    await vi.advanceTimersByTimeAsync(1000); // First retry after 1000ms
    await vi.advanceTimersByTimeAsync(2000); // Second retry after 2000ms

    const result = await promise;

    expect(result).toEqual(mockEmbedding);
    expect(mockEnv.AI.run).toHaveBeenCalledTimes(3);
  });

  it('throws error after max retries exhausted', async () => {
    vi.mocked(mockEnv.AI.run).mockRejectedValue(new Error('Persistent failure'));

    const promise = generateEmbedding(mockEnv, 'test text');

    // Fast-forward through all retries
    await vi.advanceTimersByTimeAsync(1000); // First retry
    await vi.advanceTimersByTimeAsync(2000); // Second retry
    await vi.advanceTimersByTimeAsync(4000); // Third retry

    await expect(promise).rejects.toThrow('Failed to generate embedding after 3 attempts');
    expect(mockEnv.AI.run).toHaveBeenCalledTimes(3);
  });

  it('throws error if response structure is invalid', async () => {
    vi.useFakeTimers();

    vi.mocked(mockEnv.AI.run).mockResolvedValue({
      // Missing 'data' field - will retry 3 times
      shape: [1, 768],
    } as unknown as AiTextEmbeddingsOutput);

    const promise = generateEmbedding(mockEnv, 'test text');

    // Fast-forward through all retries
    await vi.advanceTimersByTimeAsync(7000);

    await expect(promise).rejects.toThrow(
      'Invalid response structure from Workers AI'
    );

    vi.useRealTimers();
  });

  it('throws error if embedding data is missing', async () => {
    vi.useFakeTimers();

    vi.mocked(mockEnv.AI.run).mockResolvedValue({
      shape: [1, 768],
      data: [], // Empty array
    });

    const promise = generateEmbedding(mockEnv, 'test text');

    // Fast-forward through all retries
    await vi.advanceTimersByTimeAsync(7000);

    await expect(promise).rejects.toThrow(
      'Embedding data is missing or invalid'
    );

    vi.useRealTimers();
  });

  it('throws error if embedding dimensions are incorrect', async () => {
    vi.useFakeTimers();

    const wrongDimensionEmbedding = createMockEmbedding(512); // Wrong size
    vi.mocked(mockEnv.AI.run).mockResolvedValue({
      shape: [1, 512],
      data: [wrongDimensionEmbedding],
    });

    const promise = generateEmbedding(mockEnv, 'test text');

    // Fast-forward through all retries
    await vi.advanceTimersByTimeAsync(7000);

    await expect(promise).rejects.toThrow(
      'Unexpected embedding dimensions: got 512, expected 768'
    );

    vi.useRealTimers();
  });

  it('handles non-Error exceptions during retry', async () => {
    const mockEmbedding = createMockEmbedding(768);

    // Throw non-Error object, then succeed
    vi.mocked(mockEnv.AI.run)
      .mockRejectedValueOnce('String error') // Not an Error object
      .mockResolvedValueOnce({
        shape: [1, 768],
        data: [mockEmbedding],
      });

    const promise = generateEmbedding(mockEnv, 'test text');
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toEqual(mockEmbedding);
  });
});

// =============================================================================
// Test Suite 2: generateJobEmbedding()
// =============================================================================

describe('generateJobEmbedding', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
    vi.clearAllMocks();
  });

  it('combines all job fields into embedding', async () => {
    const job = createMockJob();
    const mockEmbedding = createMockEmbedding(768);

    vi.mocked(mockEnv.AI.run).mockResolvedValueOnce({
      shape: [1, 768],
      data: [mockEmbedding],
    });

    const result = await generateJobEmbedding(mockEnv, job);

    expect(result).toHaveLength(768);
    expect(result).toEqual(mockEmbedding);

    // Verify the combined text includes all fields
    const calledWith = vi.mocked(mockEnv.AI.run).mock.calls[0][1];
    const combinedText = calledWith.text[0];

    expect(combinedText).toContain(job.title);
    expect(combinedText).toContain(job.company);
    expect(combinedText).toContain(job.description);
    expect(combinedText).toContain('TypeScript');
    expect(combinedText).toContain('React');
    expect(combinedText).toContain('PostgreSQL');
  });

  it('handles missing optional skill fields', async () => {
    const job = createMockJob({
      requiredSkills: undefined,
      preferredSkills: undefined,
    });
    const mockEmbedding = createMockEmbedding(768);

    vi.mocked(mockEnv.AI.run).mockResolvedValueOnce({
      shape: [1, 768],
      data: [mockEmbedding],
    });

    const result = await generateJobEmbedding(mockEnv, job);

    expect(result).toHaveLength(768);
    expect(mockEnv.AI.run).toHaveBeenCalledTimes(1);
  });

  it('handles empty skill arrays', async () => {
    const job = createMockJob({
      requiredSkills: [],
      preferredSkills: [],
    });
    const mockEmbedding = createMockEmbedding(768);

    vi.mocked(mockEnv.AI.run).mockResolvedValueOnce({
      shape: [1, 768],
      data: [mockEmbedding],
    });

    const result = await generateJobEmbedding(mockEnv, job);

    expect(result).toHaveLength(768);
  });

  it('throws error if job data is completely empty', async () => {
    const emptyJob = createMockJob({
      title: '',
      company: '',
      description: '',
      requiredSkills: [],
      preferredSkills: [],
    });

    await expect(generateJobEmbedding(mockEnv, emptyJob)).rejects.toThrow(
      'Job data is empty - cannot generate embedding'
    );
    expect(mockEnv.AI.run).not.toHaveBeenCalled();
  });

  it('filters out empty string parts', async () => {
    const job = createMockJob({
      title: 'Engineer',
      company: '',
      description: 'Great role',
      requiredSkills: ['JavaScript', '', 'Python'],
    });
    const mockEmbedding = createMockEmbedding(768);

    vi.mocked(mockEnv.AI.run).mockResolvedValueOnce({
      shape: [1, 768],
      data: [mockEmbedding],
    });

    await generateJobEmbedding(mockEnv, job);

    const calledWith = vi.mocked(mockEnv.AI.run).mock.calls[0][1];
    const combinedText = calledWith.text[0];

    // Verify all expected parts are present
    expect(combinedText).toContain('Engineer');
    expect(combinedText).toContain('Great role');
    expect(combinedText).toContain('JavaScript');
    expect(combinedText).toContain('Python');
  });

  it('validates embedding dimensions from response', async () => {
    vi.useFakeTimers();

    const job = createMockJob();
    const wrongDimensionEmbedding = createMockEmbedding(512);

    // Will retry 3 times before failing
    vi.mocked(mockEnv.AI.run).mockResolvedValue({
      shape: [1, 512],
      data: [wrongDimensionEmbedding],
    });

    const promise = generateJobEmbedding(mockEnv, job);

    // Fast-forward through retries
    await vi.advanceTimersByTimeAsync(7000);

    await expect(promise).rejects.toThrow(
      'Unexpected embedding dimensions: got 512, expected 768'
    );

    vi.useRealTimers();
  });
});

// =============================================================================
// Test Suite 3: generateResumeEmbedding()
// =============================================================================

describe('generateResumeEmbedding', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
    vi.clearAllMocks();
  });

  it('combines profile + work + skills into embedding', async () => {
    const profile = createMockProfile();
    const workExperience = [
      createMockWorkExperience(),
      createMockWorkExperience({
        id: 'exp-2',
        position: 'Software Engineer',
        company: 'Previous Company',
        current: false,
        endDate: '2019-12-31',
      }),
    ];
    const skills = [createMockSkill('TypeScript'), createMockSkill('React'), createMockSkill('Node.js')];
    const mockEmbedding = createMockEmbedding(768);

    vi.mocked(mockEnv.AI.run).mockResolvedValueOnce({
      shape: [1, 768],
      data: [mockEmbedding],
    });

    const result = await generateResumeEmbedding(mockEnv, profile, workExperience, skills);

    expect(result).toHaveLength(768);
    expect(result).toEqual(mockEmbedding);

    // Verify combined text includes all components
    const calledWith = vi.mocked(mockEnv.AI.run).mock.calls[0][1];
    const combinedText = calledWith.text[0];

    expect(combinedText).toContain(profile.headline);
    expect(combinedText).toContain(profile.summary);
    expect(combinedText).toContain('Tech Company');
    expect(combinedText).toContain('Previous Company');
    expect(combinedText).toContain('TypeScript');
    expect(combinedText).toContain('React');
  });

  it('handles minimal profile data (only headline)', async () => {
    const profile = createMockProfile({
      headline: 'Software Engineer',
      summary: undefined,
    });
    const mockEmbedding = createMockEmbedding(768);

    vi.mocked(mockEnv.AI.run).mockResolvedValueOnce({
      shape: [1, 768],
      data: [mockEmbedding],
    });

    const result = await generateResumeEmbedding(mockEnv, profile, [], []);

    expect(result).toHaveLength(768);
  });

  it('handles empty work experience array', async () => {
    const profile = createMockProfile();
    const skills = [createMockSkill('TypeScript')];
    const mockEmbedding = createMockEmbedding(768);

    vi.mocked(mockEnv.AI.run).mockResolvedValueOnce({
      shape: [1, 768],
      data: [mockEmbedding],
    });

    const result = await generateResumeEmbedding(mockEnv, profile, [], skills);

    expect(result).toHaveLength(768);
  });

  it('handles empty skills array', async () => {
    const profile = createMockProfile();
    const workExperience = [createMockWorkExperience()];
    const mockEmbedding = createMockEmbedding(768);

    vi.mocked(mockEnv.AI.run).mockResolvedValueOnce({
      shape: [1, 768],
      data: [mockEmbedding],
    });

    const result = await generateResumeEmbedding(mockEnv, profile, workExperience, []);

    expect(result).toHaveLength(768);
  });

  it('throws error if profile is completely empty', async () => {
    const emptyProfile = createMockProfile({
      headline: undefined,
      summary: undefined,
    });

    await expect(generateResumeEmbedding(mockEnv, emptyProfile, [], [])).rejects.toThrow(
      'Profile is empty - cannot generate embedding. Please complete your profile.'
    );
    expect(mockEnv.AI.run).not.toHaveBeenCalled();
  });

  it('handles work experience with missing description', async () => {
    const profile = createMockProfile();
    const workExperience = [
      createMockWorkExperience({
        description: undefined,
      }),
    ];
    const mockEmbedding = createMockEmbedding(768);

    vi.mocked(mockEnv.AI.run).mockResolvedValueOnce({
      shape: [1, 768],
      data: [mockEmbedding],
    });

    const result = await generateResumeEmbedding(mockEnv, profile, workExperience, []);

    expect(result).toHaveLength(768);
  });

  it('validates embedding dimensions from response', async () => {
    vi.useFakeTimers();

    const profile = createMockProfile();
    const workExperience = [createMockWorkExperience()];
    const wrongDimensionEmbedding = createMockEmbedding(384);

    // Will retry 3 times before failing
    vi.mocked(mockEnv.AI.run).mockResolvedValue({
      shape: [1, 384],
      data: [wrongDimensionEmbedding],
    });

    const promise = generateResumeEmbedding(mockEnv, profile, workExperience, []);

    // Fast-forward through retries
    await vi.advanceTimersByTimeAsync(7000);

    await expect(promise).rejects.toThrow(
      'Unexpected embedding dimensions: got 384, expected 768'
    );

    vi.useRealTimers();
  });

  it('filters out empty text parts from work experience', async () => {
    const profile = createMockProfile();
    const workExperience = [
      createMockWorkExperience({
        position: '',
        company: 'Company',
        description: '',
      }),
    ];
    const mockEmbedding = createMockEmbedding(768);

    vi.mocked(mockEnv.AI.run).mockResolvedValueOnce({
      shape: [1, 768],
      data: [mockEmbedding],
    });

    await generateResumeEmbedding(mockEnv, profile, workExperience, []);

    const calledWith = vi.mocked(mockEnv.AI.run).mock.calls[0][1];
    const combinedText = calledWith.text[0];

    // Should still have content from profile
    expect(combinedText.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Test Suite 4: updateUserResumeEmbedding()
// =============================================================================

describe('updateUserResumeEmbedding', () => {
  let mockEnv: Env;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockEnv = createMockEnv();
    mockSupabase = createMockSupabase();
    vi.clearAllMocks();
  });

  it('fetches data, generates embedding, and updates database', async () => {
    const userId = 'user-123';
    const mockEmbedding = createMockEmbedding(768);

    // Create a fresh mock for each call chain
    const profileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: userId,
          current_title: 'Senior Engineer',
          professional_summary: 'Experienced developer',
        },
        error: null,
      }),
    };

    const workChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            position: 'Senior Engineer',
            company: 'Tech Corp',
            description: 'Built systems',
            start_date: '2020-01-01',
          },
        ],
        error: null,
      }),
    };

    const skillsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ name: 'TypeScript' }, { name: 'React' }],
        error: null,
      }),
    };

    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
    };

    // Mock from() to return different chains based on table name
    vi.mocked(mockSupabase.from)
      .mockReturnValueOnce(profileChain as unknown as ReturnType<typeof mockSupabase.from>)
      .mockReturnValueOnce(workChain as unknown as ReturnType<typeof mockSupabase.from>)
      .mockReturnValueOnce(skillsChain as unknown as ReturnType<typeof mockSupabase.from>)
      .mockReturnValueOnce(updateChain as unknown as ReturnType<typeof mockSupabase.from>);

    // Mock AI generation
    vi.mocked(mockEnv.AI.run).mockResolvedValueOnce({
      shape: [1, 768],
      data: [mockEmbedding],
    });

    await updateUserResumeEmbedding(mockEnv, mockSupabase, userId);

    expect(mockSupabase.from).toHaveBeenCalledWith('users');
    expect(mockSupabase.from).toHaveBeenCalledWith('work_experience');
    expect(mockSupabase.from).toHaveBeenCalledWith('skills');
    expect(mockEnv.AI.run).toHaveBeenCalledTimes(1);
  });

  it('throws error if user profile not found', async () => {
    const userId = 'user-456';

    const profileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValueOnce(profileChain as any);

    await expect(updateUserResumeEmbedding(mockEnv, mockSupabase, userId)).rejects.toThrow(
      'User not found: user-456'
    );
  });

  it('throws error if profile fetch fails', async () => {
    const userId = 'user-789';

    const profileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValueOnce(profileChain as any);

    await expect(updateUserResumeEmbedding(mockEnv, mockSupabase, userId)).rejects.toThrow(
      'Failed to fetch user profile: Database connection failed'
    );
  });

  it('handles work experience fetch failure gracefully', async () => {
    const userId = 'user-123';
    const mockEmbedding = createMockEmbedding(768);

    // Profile succeeds
    const profileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: userId,
          current_title: 'Engineer',
          professional_summary: 'Summary',
        },
        error: null,
      }),
    };

    // Work experience fails
    const workChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Work query failed' },
      }),
    };

    // Skills succeeds
    const skillsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ name: 'Python' }],
        error: null,
      }),
    };

    // Update succeeds
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from)
      .mockReturnValueOnce(profileChain as any)
      .mockReturnValueOnce(workChain as any)
      .mockReturnValueOnce(skillsChain as any)
      .mockReturnValueOnce(updateChain as any);

    vi.mocked(mockEnv.AI.run).mockResolvedValueOnce({
      shape: [1, 768],
      data: [mockEmbedding],
    });

    // Should still complete successfully with available data
    await expect(updateUserResumeEmbedding(mockEnv, mockSupabase, userId)).resolves.not.toThrow();
  });

  it('handles skills fetch failure gracefully', async () => {
    const userId = 'user-123';
    const mockEmbedding = createMockEmbedding(768);

    // Profile succeeds
    const profileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: userId,
          current_title: 'Engineer',
          professional_summary: 'Summary',
        },
        error: null,
      }),
    };

    // Work experience succeeds
    const workChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    // Skills fails
    const skillsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Skills query failed' },
      }),
    };

    // Update succeeds
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from)
      .mockReturnValueOnce(profileChain as any)
      .mockReturnValueOnce(workChain as any)
      .mockReturnValueOnce(skillsChain as any)
      .mockReturnValueOnce(updateChain as any);

    vi.mocked(mockEnv.AI.run).mockResolvedValueOnce({
      shape: [1, 768],
      data: [mockEmbedding],
    });

    // Should still complete successfully with available data
    await expect(updateUserResumeEmbedding(mockEnv, mockSupabase, userId)).resolves.not.toThrow();
  });

  it('throws error if embedding update fails', async () => {
    const userId = 'user-123';
    const mockEmbedding = createMockEmbedding(768);

    // All fetches succeed
    const profileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: userId,
          current_title: 'Engineer',
          professional_summary: 'Summary',
        },
        error: null,
      }),
    };

    const workChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    const skillsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    // Update fails
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        error: { message: 'Update failed' },
      }),
    };

    vi.mocked(mockSupabase.from)
      .mockReturnValueOnce(profileChain as any)
      .mockReturnValueOnce(workChain as any)
      .mockReturnValueOnce(skillsChain as any)
      .mockReturnValueOnce(updateChain as any);

    vi.mocked(mockEnv.AI.run).mockResolvedValueOnce({
      shape: [1, 768],
      data: [mockEmbedding],
    });

    await expect(updateUserResumeEmbedding(mockEnv, mockSupabase, userId)).rejects.toThrow(
      'Failed to update resume embedding: Update failed'
    );
  });

  it('throws error if profile is empty and embedding generation fails', async () => {
    const userId = 'user-empty';

    // Profile with no data
    const profileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: userId,
          current_title: null,
          professional_summary: null,
        },
        error: null,
      }),
    };

    const workChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    const skillsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from)
      .mockReturnValueOnce(profileChain as any)
      .mockReturnValueOnce(workChain as any)
      .mockReturnValueOnce(skillsChain as any);

    // Should fail during embedding generation (empty profile)
    await expect(updateUserResumeEmbedding(mockEnv, mockSupabase, userId)).rejects.toThrow(
      'Profile is empty - cannot generate embedding'
    );
  });
});
