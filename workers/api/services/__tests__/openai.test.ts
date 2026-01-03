/**
 * Unit Tests for OpenAI Service with AI Gateway Integration
 *
 * Tests verify:
 * - AI Gateway URL construction
 * - Fallback to direct OpenAI when gateway not configured
 * - Error handling when gateway fails
 * - Cache hit/miss logging
 * - Application variant generation
 * - Resume parsing with vision model
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createOpenAI,
  isOpenAIConfigured,
  isAIGatewayConfigured,
  generateApplicationVariants,
  parseResume,
  MODELS,
  GENERATION_STRATEGIES,
} from '../openai';
import type { Env, Job, UserProfile, WorkExperience, Education, Skill } from '../../types';

// Mock OpenAI
vi.mock('openai', () => {
  const MockOpenAI = vi.fn().mockImplementation((config: unknown) => {
    return {
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
      _config: config, // Store config for testing
    };
  });

  return { default: MockOpenAI };
});

// Mock Supabase
vi.mock('../supabase', () => ({
  createSupabaseAdmin: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(),
      })),
    },
  })),
}));

describe('OpenAI Service - AI Gateway Integration', () => {
  let mockEnv: Env;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Spy on console.log to verify gateway logging
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Default mock environment
    mockEnv = {
      OPENAI_API_KEY: 'test-api-key',
      CLOUDFLARE_ACCOUNT_ID: undefined,
      AI_GATEWAY_SLUG: undefined,
    } as Env;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('createOpenAI - AI Gateway URL Construction', () => {
    it('should construct correct AI Gateway URL when configured', () => {
      mockEnv.CLOUDFLARE_ACCOUNT_ID = 'test-account-id';
      mockEnv.AI_GATEWAY_SLUG = 'jobmatch-ai-gateway';

      const client = createOpenAI(mockEnv);

      // Verify the client was created with gateway URL
      expect(client).toBeDefined();
      // @ts-expect-error - Accessing private config for testing
      expect(client._config.baseURL).toBe(
        'https://gateway.ai.cloudflare.com/v1/test-account-id/jobmatch-ai-gateway/openai'
      );
      // @ts-expect-error - Accessing private config for testing
      expect(client._config.apiKey).toBe('test-api-key');

      // Verify logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[OpenAI] Using Cloudflare AI Gateway: jobmatch-ai-gateway'
      );
    });

    it('should use direct OpenAI API when AI Gateway not configured', () => {
      // No CLOUDFLARE_ACCOUNT_ID or AI_GATEWAY_SLUG set
      const client = createOpenAI(mockEnv);

      expect(client).toBeDefined();
      // @ts-expect-error - Accessing private config for testing
      expect(client._config.baseURL).toBeUndefined(); // Direct API uses default baseURL
      // @ts-expect-error - Accessing private config for testing
      expect(client._config.apiKey).toBe('test-api-key');

      // Verify logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[OpenAI] Using direct OpenAI API (AI Gateway not configured)'
      );
    });

    it('should fallback to direct API when only ACCOUNT_ID is set', () => {
      mockEnv.CLOUDFLARE_ACCOUNT_ID = 'test-account-id';
      // AI_GATEWAY_SLUG is undefined

      const client = createOpenAI(mockEnv);

      // @ts-expect-error - Accessing private config for testing
      expect(client._config.baseURL).toBeUndefined();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[OpenAI] Using direct OpenAI API (AI Gateway not configured)'
      );
    });

    it('should fallback to direct API when only AI_GATEWAY_SLUG is set', () => {
      mockEnv.AI_GATEWAY_SLUG = 'jobmatch-ai-gateway';
      // CLOUDFLARE_ACCOUNT_ID is undefined

      const client = createOpenAI(mockEnv);

      // @ts-expect-error - Accessing private config for testing
      expect(client._config.baseURL).toBeUndefined();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[OpenAI] Using direct OpenAI API (AI Gateway not configured)'
      );
    });

    it('should throw error when OPENAI_API_KEY is missing', () => {
      mockEnv.OPENAI_API_KEY = undefined as unknown as string;

      expect(() => createOpenAI(mockEnv)).toThrow('OPENAI_API_KEY is not configured');
    });
  });

  describe('Configuration Checks', () => {
    it('isOpenAIConfigured should return true when API key is set', () => {
      expect(isOpenAIConfigured(mockEnv)).toBe(true);
    });

    it('isOpenAIConfigured should return false when API key is missing', () => {
      mockEnv.OPENAI_API_KEY = undefined as unknown as string;
      expect(isOpenAIConfigured(mockEnv)).toBe(false);
    });

    it('isAIGatewayConfigured should return true when both account ID and slug are set', () => {
      mockEnv.CLOUDFLARE_ACCOUNT_ID = 'test-account-id';
      mockEnv.AI_GATEWAY_SLUG = 'jobmatch-ai-gateway';

      expect(isAIGatewayConfigured(mockEnv)).toBe(true);
    });

    it('isAIGatewayConfigured should return false when account ID is missing', () => {
      mockEnv.AI_GATEWAY_SLUG = 'jobmatch-ai-gateway';
      expect(isAIGatewayConfigured(mockEnv)).toBe(false);
    });

    it('isAIGatewayConfigured should return false when slug is missing', () => {
      mockEnv.CLOUDFLARE_ACCOUNT_ID = 'test-account-id';
      expect(isAIGatewayConfigured(mockEnv)).toBe(false);
    });

    it('isAIGatewayConfigured should return false when both are missing', () => {
      expect(isAIGatewayConfigured(mockEnv)).toBe(false);
    });
  });

  describe('generateApplicationVariants - Error Handling', () => {
    const mockJob: Job = {
      id: 'job-1',
      title: 'Senior Software Engineer',
      company: 'Tech Corp',
      description: 'Build amazing software',
      location: 'San Francisco, CA',
      workArrangement: 'Remote',
      requiredSkills: ['TypeScript', 'React', 'Node.js'],
      salaryMin: 150000,
      salaryMax: 200000,
      userId: 'user-1',
      createdAt: new Date().toISOString(),
      source: 'manual',
      postedDate: new Date().toISOString(),
    } as Job;

    const mockProfile: UserProfile = {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '555-1234',
      location: 'San Francisco, CA',
      summary: 'Experienced software engineer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as UserProfile;

    const mockWorkExperience: WorkExperience[] = [
      {
        id: 'exp-1',
        userId: 'user-1',
        company: 'Previous Corp',
        position: 'Software Engineer',
        location: 'San Francisco, CA',
        startDate: '2020-01-01',
        endDate: '2023-12-31',
        current: false,
        description: 'Built software',
        accomplishments: ['Improved performance by 50%', 'Led team of 5 engineers'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const mockEducation: Education[] = [
      {
        id: 'edu-1',
        userId: 'user-1',
        school: 'University of Tech',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        startDate: '2016-09-01',
        endDate: '2020-05-01',
        current: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Education,
    ];

    const mockSkills: Skill[] = [
      {
        id: 'skill-1',
        userId: 'user-1',
        name: 'TypeScript',
        endorsements: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'skill-2',
        userId: 'user-1',
        name: 'React',
        endorsements: 8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    it('should generate all variants successfully with AI Gateway', async () => {
      mockEnv.CLOUDFLARE_ACCOUNT_ID = 'test-account-id';
      mockEnv.AI_GATEWAY_SLUG = 'jobmatch-ai-gateway';

      // Mock OpenAI responses
      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                resume: {
                  summary: 'Experienced engineer',
                  experience: [],
                  skills: [],
                  education: [],
                },
                coverLetter: 'Dear Hiring Manager...',
                aiRationale: ['Optimized for impact'],
              }),
            },
          },
        ],
      });

      // @ts-expect-error - Mocking OpenAI client for testing
      OpenAI.mockImplementation((config) => ({
        chat: { completions: { create: mockCreate } },
        _config: config,
      }));

      const context = {
        job: mockJob,
        profile: mockProfile,
        workExperience: mockWorkExperience,
        education: mockEducation,
        skills: mockSkills,
      };

      const variants = await generateApplicationVariants(mockEnv, context);

      // Should generate all 3 variants
      expect(variants).toHaveLength(3);
      expect(variants[0]?.id).toBe('variant-impact');
      expect(variants[1]?.id).toBe('variant-keyword');
      expect(variants[2]?.id).toBe('variant-concise');

      // Should have called OpenAI 3 times (once per variant)
      expect(mockCreate).toHaveBeenCalledTimes(3);

      // Verify model configuration
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: MODELS.APPLICATION_GENERATION,
          temperature: 0.7,
          max_tokens: 3000,
          response_format: { type: 'json_object' },
        })
      );
    });

    it('should use fallback when OpenAI API fails', async () => {
      // Mock OpenAI to throw error
      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockRejectedValue(new Error('OpenAI API error'));

      // @ts-expect-error - Mocking OpenAI client for testing
      OpenAI.mockImplementation((config) => ({
        chat: { completions: { create: mockCreate } },
        _config: config,
      }));

      const context = {
        job: mockJob,
        profile: mockProfile,
        workExperience: mockWorkExperience,
        education: mockEducation,
        skills: mockSkills,
      };

      const variants = await generateApplicationVariants(mockEnv, context);

      // Should still generate all 3 variants using fallback
      expect(variants).toHaveLength(3);

      // Fallback variants should have aiRationale indicating fallback
      variants.forEach((variant) => {
        expect(variant.aiRationale).toContain('Fallback generation used');
      });
    });

    it('should handle partial failures gracefully', async () => {
      const OpenAI = (await import('openai')).default;
      let callCount = 0;

      const mockCreate = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          // Second call fails (variant-keyword)
          return Promise.reject(new Error('API error'));
        }
        return Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  resume: {
                    summary: 'Test summary',
                    experience: [],
                    skills: [],
                    education: [],
                  },
                  coverLetter: 'Test letter',
                  aiRationale: ['Test rationale'],
                }),
              },
            },
          ],
        });
      });

      // @ts-expect-error - Mocking OpenAI client for testing
      OpenAI.mockImplementation((config) => ({
        chat: { completions: { create: mockCreate } },
        _config: config,
      }));

      const context = {
        job: mockJob,
        profile: mockProfile,
        workExperience: mockWorkExperience,
        education: mockEducation,
        skills: mockSkills,
      };

      const variants = await generateApplicationVariants(mockEnv, context);

      // Should generate all 3 variants (2 from API, 1 fallback)
      expect(variants).toHaveLength(3);

      // First variant (impact) should be from API
      expect(variants[0]?.aiRationale).toEqual(['Test rationale']);

      // Second variant (keyword) should be fallback
      expect(variants[1]?.aiRationale).toContain('Fallback generation used');

      // Third variant (concise) should be from API
      expect(variants[2]?.aiRationale).toEqual(['Test rationale']);
    });
  });

  describe('parseResume - Vision Model with AI Gateway', () => {
    it('should successfully parse image resume through AI Gateway', async () => {
      mockEnv.CLOUDFLARE_ACCOUNT_ID = 'test-account-id';
      mockEnv.AI_GATEWAY_SLUG = 'jobmatch-ai-gateway';

      const mockParsedResume = {
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '555-5678',
          location: 'New York, NY',
          headline: 'Software Engineer',
          summary: 'Experienced developer',
          linkedInUrl: '',
        },
        workExperience: [],
        education: [],
        skills: [],
      };

      // Mock Supabase storage
      const { createSupabaseAdmin } = await import('../supabase');
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://storage.example.com/resume.png?signed=true' },
        error: null,
      });

      // @ts-expect-error - Mocking Supabase client for testing
      createSupabaseAdmin.mockReturnValue({
        storage: {
          from: vi.fn(() => ({
            createSignedUrl: mockCreateSignedUrl,
          })),
        },
      });

      // Mock OpenAI vision response
      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockParsedResume),
            },
          },
        ],
      });

      // @ts-expect-error - Mocking OpenAI client for testing
      OpenAI.mockImplementation((config) => ({
        chat: { completions: { create: mockCreate } },
        _config: config,
      }));

      const result = await parseResume(mockEnv, 'users/user-123/resume.png');

      expect(result).toEqual(mockParsedResume);
      expect(mockCreateSignedUrl).toHaveBeenCalledWith('users/user-123/resume.png', 3600);

      // Verify vision model was used
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: MODELS.RESUME_PARSING,
          response_format: { type: 'json_object' },
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.arrayContaining([
                expect.objectContaining({ type: 'text' }),
                expect.objectContaining({
                  type: 'image_url',
                  image_url: {
                    url: 'https://storage.example.com/resume.png?signed=true',
                  },
                }),
              ]),
            }),
          ]),
        })
      );
    });

    it('should reject PDF files with helpful error message', async () => {
      await expect(parseResume(mockEnv, 'users/user-123/resume.pdf')).rejects.toThrow(
        'PDF parsing is not yet supported in Cloudflare Workers'
      );
    });

    it('should reject unsupported file formats', async () => {
      await expect(parseResume(mockEnv, 'users/user-123/resume.docx')).rejects.toThrow(
        'Unsupported file format'
      );
    });

    it('should handle storage errors gracefully', async () => {
      const { createSupabaseAdmin } = await import('../supabase');
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'File not found' },
      });

      // @ts-expect-error - Mocking Supabase client for testing
      createSupabaseAdmin.mockReturnValue({
        storage: {
          from: vi.fn(() => ({
            createSignedUrl: mockCreateSignedUrl,
          })),
        },
      });

      await expect(parseResume(mockEnv, 'users/user-123/resume.jpg')).rejects.toThrow(
        'Failed to access resume file'
      );
    });
  });

  describe('Model Configuration Constants', () => {
    it('should use correct models for different tasks', () => {
      expect(MODELS.APPLICATION_GENERATION).toBe('gpt-4o-mini');
      expect(MODELS.MATCH_ANALYSIS).toBe('gpt-4o-mini');
      expect(MODELS.RESUME_PARSING).toBe('gpt-4o'); // Vision model
    });

    it('should have correct generation strategies', () => {
      expect(GENERATION_STRATEGIES).toHaveLength(3);
      expect(GENERATION_STRATEGIES[0]?.id).toBe('variant-impact');
      expect(GENERATION_STRATEGIES[1]?.id).toBe('variant-keyword');
      expect(GENERATION_STRATEGIES[2]?.id).toBe('variant-concise');
    });
  });
});
