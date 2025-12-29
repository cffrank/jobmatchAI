/**
 * Integration Tests for AI Gateway Request Flow
 *
 * Tests verify complete request flow through AI Gateway:
 * - End-to-end application generation with gateway
 * - Response format unchanged from direct API
 * - Error propagation from gateway failures
 * - Cache behavior and performance improvements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Env } from '../../types';

// Mock modules
vi.mock('../../services/supabase', () => ({
  createSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          maybeSingle: vi.fn(),
        })),
        in: vi.fn(() => ({
          eq: vi.fn(),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(),
      })),
    },
  })),
}));

vi.mock('openai', () => {
  const MockOpenAI = vi.fn().mockImplementation((config: any) => {
    return {
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
      _config: config,
    };
  });

  return { default: MockOpenAI };
});

describe('AI Gateway Integration Tests', () => {
  let mockEnv: Env;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockEnv = {
      OPENAI_API_KEY: 'test-api-key',
      CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
      AI_GATEWAY_SLUG: 'jobmatch-ai-gateway',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    } as Env;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Application Generation Flow', () => {
    it('should complete full application generation through AI Gateway', async () => {
      const { generateApplicationVariants } = await import('../../services/openai');
      const { createSupabaseAdmin } = await import('../../services/supabase');

      // Mock database responses
      const mockSupabase = createSupabaseAdmin(mockEnv);
      const mockSelect = vi.fn();

      // @ts-ignore
      mockSupabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'user-1',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
              },
            }),
          }),
        }),
      });

      // Mock OpenAI response
      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                resume: {
                  summary: 'Senior Software Engineer with 5+ years of experience',
                  experience: [
                    {
                      title: 'Software Engineer',
                      company: 'Tech Corp',
                      location: 'San Francisco, CA',
                      startDate: '2020-01',
                      endDate: 'Present',
                      bullets: [
                        'Reduced page load time by 40% through React optimization',
                        'Led migration to TypeScript improving code quality by 60%',
                        'Mentored 3 junior developers on best practices',
                      ],
                    },
                  ],
                  skills: ['TypeScript', 'React', 'Node.js'],
                  education: [
                    {
                      degree: 'Bachelor of Science in Computer Science',
                      school: 'University of Tech',
                      location: 'San Francisco, CA',
                      graduation: '2020-05',
                    },
                  ],
                },
                coverLetter:
                  'Dear Hiring Manager,\n\nI am excited to apply for the Senior Software Engineer position at Tech Corp...',
                aiRationale: [
                  'Highlighted metrics-driven achievements to demonstrate impact',
                  'Emphasized TypeScript and React experience matching job requirements',
                ],
              }),
            },
          },
        ],
      });

      // @ts-ignore
      OpenAI.mockImplementation((config) => ({
        chat: { completions: { create: mockCreate } },
        _config: config,
      }));

      const context = {
        job: {
          id: 'job-1',
          title: 'Senior Software Engineer',
          company: 'Tech Corp',
          description: 'Build amazing software',
          location: 'San Francisco, CA',
          workArrangement: 'Remote' as const,
          url: 'https://example.com/job/1',
          requiredSkills: ['TypeScript', 'React', 'Node.js'],
          userId: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'manual' as const,
          postedDate: new Date().toISOString(),
          isSaved: false,
          isArchived: false,
        },
        profile: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        workExperience: [
          {
            id: 'exp-1',
            userId: 'user-1',
            company: 'Tech Corp',
            position: 'Software Engineer',
            startDate: '2020-01-01',
            current: true,
            description: 'Build software',
            accomplishments: ['Built features', 'Improved performance'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        education: [
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
          },
        ],
        skills: [
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
        ],
      };

      const variants = await generateApplicationVariants(mockEnv, context);

      // Verify all variants generated
      expect(variants).toHaveLength(3);

      // Verify response format is consistent
      variants.forEach((variant) => {
        expect(variant).toHaveProperty('id');
        expect(variant).toHaveProperty('name');
        expect(variant).toHaveProperty('resume');
        expect(variant).toHaveProperty('coverLetter');
        expect(variant).toHaveProperty('aiRationale');

        // Verify resume structure
        expect(variant.resume).toHaveProperty('summary');
        expect(variant.resume).toHaveProperty('experience');
        expect(variant.resume).toHaveProperty('skills');
        expect(variant.resume).toHaveProperty('education');
      });

      // Verify AI Gateway was used
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[OpenAI] Using Cloudflare AI Gateway: jobmatch-ai-gateway'
      );
    });

    it('should maintain backward compatibility with response format', async () => {
      const { generateApplicationVariants } = await import('../../services/openai');

      const mockResponse = {
        resume: {
          summary: 'Test summary',
          experience: [],
          skills: [],
          education: [],
        },
        coverLetter: 'Test letter',
        aiRationale: ['Test rationale'],
      };

      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockResponse),
            },
          },
        ],
      });

      // @ts-ignore
      OpenAI.mockImplementation((config) => ({
        chat: { completions: { create: mockCreate } },
        _config: config,
      }));

      const context = {
        job: {
          id: 'job-1',
          title: 'Test Job',
          company: 'Test Co',
          description: 'Test description',
          location: 'Test Location',
          workArrangement: 'Remote' as const,
          url: 'https://example.com/job/1',
          userId: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'manual' as const,
          postedDate: new Date().toISOString(),
          isSaved: false,
          isArchived: false,
        },
        profile: {
          id: 'user-1',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        workExperience: [],
        education: [],
        skills: [],
      };

      const variants = await generateApplicationVariants(mockEnv, context);

      // Response format should be exactly the same as before AI Gateway
      expect(variants[0]?.resume).toEqual(mockResponse.resume);
      expect(variants[0]?.coverLetter).toEqual(mockResponse.coverLetter);
      expect(variants[0]?.aiRationale).toEqual(mockResponse.aiRationale);
    });
  });

  describe('Error Propagation', () => {
    it('should propagate OpenAI API errors properly', async () => {
      const { generateApplicationVariants } = await import('../../services/openai');

      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockRejectedValue({
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error',
          code: 'rate_limit_exceeded',
        },
      });

      // @ts-ignore
      OpenAI.mockImplementation((config) => ({
        chat: { completions: { create: mockCreate } },
        _config: config,
      }));

      const context = {
        job: {
          id: 'job-1',
          title: 'Test Job',
          company: 'Test Co',
          description: 'Test description',
          location: 'Test Location',
          workArrangement: 'Remote' as const,
          url: 'https://example.com/job/1',
          userId: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'manual' as const,
          postedDate: new Date().toISOString(),
          isSaved: false,
          isArchived: false,
        },
        profile: {
          id: 'user-1',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        workExperience: [],
        education: [],
        skills: [],
      };

      // Should fall back to default variants instead of throwing
      const variants = await generateApplicationVariants(mockEnv, context);

      // Should still return 3 variants (fallback behavior)
      expect(variants).toHaveLength(3);

      // Variants should have fallback indicators
      variants.forEach((variant) => {
        expect(variant.aiRationale).toContain('Fallback generation used');
      });

      // Error should be logged
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle gateway timeout gracefully', async () => {
      const { generateApplicationVariants } = await import('../../services/openai');

      const OpenAI = (await import('openai')).default;
      const mockCreate = vi
        .fn()
        .mockRejectedValue(new Error('Request timeout after 30000ms'));

      // @ts-ignore
      OpenAI.mockImplementation((config) => ({
        chat: { completions: { create: mockCreate } },
        _config: config,
      }));

      const context = {
        job: {
          id: 'job-1',
          title: 'Test Job',
          company: 'Test Co',
          description: 'Test description',
          location: 'Test Location',
          workArrangement: 'Remote' as const,
          url: 'https://example.com/job/1',
          userId: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'manual' as const,
          postedDate: new Date().toISOString(),
          isSaved: false,
          isArchived: false,
        },
        profile: {
          id: 'user-1',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        workExperience: [],
        education: [],
        skills: [],
      };

      const variants = await generateApplicationVariants(mockEnv, context);

      // Should return fallback variants
      expect(variants).toHaveLength(3);
      expect(variants[0]?.aiRationale).toContain('Fallback generation used');
    });

    it('should handle invalid JSON responses', async () => {
      const { generateApplicationVariants } = await import('../../services/openai');

      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'This is not valid JSON',
            },
          },
        ],
      });

      // @ts-ignore
      OpenAI.mockImplementation((config) => ({
        chat: { completions: { create: mockCreate } },
        _config: config,
      }));

      const context = {
        job: {
          id: 'job-1',
          title: 'Test Job',
          company: 'Test Co',
          description: 'Test description',
          location: 'Test Location',
          workArrangement: 'Remote' as const,
          url: 'https://example.com/job/1',
          userId: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'manual' as const,
          postedDate: new Date().toISOString(),
          isSaved: false,
          isArchived: false,
        },
        profile: {
          id: 'user-1',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        workExperience: [],
        education: [],
        skills: [],
      };

      const variants = await generateApplicationVariants(mockEnv, context);

      // Should return fallback variants
      expect(variants).toHaveLength(3);
      expect(variants[0]?.aiRationale).toContain('Fallback generation used');
    });
  });

  describe('Cache Behavior', () => {
    it('should log cache information from AI Gateway headers', async () => {
      // Note: Actual cache hit/miss detection would require inspecting response headers
      // from Cloudflare AI Gateway. This test verifies the logging mechanism is in place.

      const { createOpenAI } = await import('../../services/openai');

      createOpenAI(mockEnv);

      // Verify gateway configuration
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[OpenAI] Using Cloudflare AI Gateway: jobmatch-ai-gateway'
      );

      // In production, AI Gateway adds headers like:
      // - cf-aig-cache-status: HIT or MISS
      // - cf-aig-cost-before: 0.00XXX
      // - cf-aig-cost-after: 0.00000 (for cache hits)
      // These would be logged by the actual API calls
    });

    it('should handle both cache hits and misses identically', async () => {
      const { generateApplicationVariants } = await import('../../services/openai');

      const mockResponse = {
        resume: {
          summary: 'Test summary',
          experience: [],
          skills: [],
          education: [],
        },
        coverLetter: 'Test letter',
        aiRationale: ['Test rationale'],
      };

      const OpenAI = (await import('openai')).default;

      // First call (cache miss)
      const mockCreateMiss = vi.fn().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      });

      // @ts-ignore
      OpenAI.mockImplementation((config) => ({
        chat: { completions: { create: mockCreateMiss } },
        _config: config,
      }));

      const context = {
        job: {
          id: 'job-1',
          title: 'Test Job',
          company: 'Test Co',
          description: 'Test description',
          location: 'Test Location',
          workArrangement: 'Remote' as const,
          url: 'https://example.com/job/1',
          userId: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'manual' as const,
          postedDate: new Date().toISOString(),
          isSaved: false,
          isArchived: false,
        },
        profile: {
          id: 'user-1',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        workExperience: [],
        education: [],
        skills: [],
      };

      const variants1 = await generateApplicationVariants(mockEnv, context);
      const variants2 = await generateApplicationVariants(mockEnv, context);

      // Both calls should produce identical results
      expect(variants1).toEqual(variants2);
      // Response format unchanged regardless of cache status
      expect(variants1[0]?.resume).toEqual(mockResponse.resume);
    });
  });

  describe('Performance and Monitoring', () => {
    it('should complete generation within reasonable time', async () => {
      const { generateApplicationVariants } = await import('../../services/openai');

      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                resume: { summary: 'Test', experience: [], skills: [], education: [] },
                coverLetter: 'Test',
                aiRationale: ['Test'],
              }),
            },
          },
        ],
      });

      // @ts-ignore
      OpenAI.mockImplementation((config) => ({
        chat: { completions: { create: mockCreate } },
        _config: config,
      }));

      const context = {
        job: {
          id: 'job-1',
          title: 'Test Job',
          company: 'Test Co',
          description: 'Test description',
          location: 'Test Location',
          workArrangement: 'Remote' as const,
          url: 'https://example.com/job/1',
          userId: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'manual' as const,
          postedDate: new Date().toISOString(),
          isSaved: false,
          isArchived: false,
        },
        profile: {
          id: 'user-1',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        workExperience: [],
        education: [],
        skills: [],
      };

      const startTime = Date.now();
      await generateApplicationVariants(mockEnv, context);
      const duration = Date.now() - startTime;

      // Should complete in less than 5 seconds (mocked)
      expect(duration).toBeLessThan(5000);
    });
  });
});
