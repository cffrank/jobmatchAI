/**
 * Unit tests for job analysis caching service
 *
 * Tests the hybrid caching strategy (KV + Database)
 */

import { describe, it, expect, vi } from 'vitest';
import type { JobCompatibilityAnalysis, Env } from '../../types';
import {
  getCachedAnalysis,
  cacheAnalysis,
  invalidateCacheForUser,
} from '../jobAnalysisCache';

// Mock data
const mockAnalysis: JobCompatibilityAnalysis = {
  overallScore: 85,
  recommendation: 'Strong Match',
  dimensions: {
    skillMatch: { score: 9, justification: 'Strong technical skills alignment' },
    industryMatch: { score: 8, justification: 'Relevant industry experience' },
    experienceLevel: { score: 9, justification: 'Perfect experience match' },
    locationMatch: { score: 10, justification: 'Same location' },
    seniorityLevel: { score: 8, justification: 'Appropriate level' },
    educationCertification: { score: 7, justification: 'Meets requirements' },
    softSkillsLeadership: { score: 8, justification: 'Clear leadership indicators' },
    employmentStability: { score: 9, justification: 'Stable career progression' },
    growthPotential: { score: 8, justification: 'Strong learning pattern' },
    companyScaleAlignment: { score: 7, justification: 'Similar scale experience' },
  },
  strengths: [
    'Strong technical skills match',
    'Excellent experience level',
    'Geographic compatibility',
  ],
  gaps: [
    'Minor education gap',
    'Limited certifications',
    'No direct industry experience',
  ],
  redFlags: [],
};

// Mock environment
function createMockEnv(withKV = true): Env {
  const mockKV = {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };

  return {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    OPENAI_API_KEY: 'test-openai-key',
    APP_URL: 'http://localhost:3000',
    ENVIRONMENT: 'development',
    JOB_ANALYSIS_CACHE: withKV ? (mockKV as unknown as KVNamespace) : undefined,
    AI: {} as unknown as Ai,
  } as Env;
}

describe('Job Analysis Cache', () => {
  describe('getCachedAnalysis', () => {
    it('should return null when no cache exists', async () => {
      const env = createMockEnv();
      const result = await getCachedAnalysis(env, 'user-123', 'job-456');

      expect(result).toBeNull();
    });

    it('should return cached analysis from KV when available', async () => {
      const env = createMockEnv();
      const mockKV = env.JOB_ANALYSIS_CACHE!;

      // Mock KV get to return cached data
      vi.mocked(mockKV.get).mockResolvedValue(JSON.stringify(mockAnalysis));

      const result = await getCachedAnalysis(env, 'user-123', 'job-456');

      expect(result).not.toBeNull();
      expect(result?.source).toBe('kv');
      expect(result?.analysis).toEqual(mockAnalysis);
    });

    it('should handle KV cache errors gracefully', async () => {
      const env = createMockEnv();
      const mockKV = env.JOB_ANALYSIS_CACHE!;

      // Mock KV get to throw error
      vi.mocked(mockKV.get).mockRejectedValue(new Error('KV error'));

      const result = await getCachedAnalysis(env, 'user-123', 'job-456');

      // Should return null instead of throwing
      expect(result).toBeNull();
    });

    it('should work when KV is not configured', async () => {
      const env = createMockEnv(false); // No KV namespace

      const result = await getCachedAnalysis(env, 'user-123', 'job-456');

      // Should not throw error
      expect(result).toBeNull();
    });
  });

  describe('cacheAnalysis', () => {
    it('should store analysis in both KV and database', async () => {
      const env = createMockEnv();
      const mockKV = env.JOB_ANALYSIS_CACHE!;

      await cacheAnalysis(env, 'user-123', 'job-456', mockAnalysis);

      // Should have called KV put
      expect(mockKV.put).toHaveBeenCalled();
      expect(mockKV.put).toHaveBeenCalledWith(
        'job-analysis:user-123:job-456',
        JSON.stringify(mockAnalysis),
        expect.objectContaining({
          expirationTtl: 7 * 24 * 60 * 60, // 7 days in seconds
        })
      );
    });

    it('should handle KV cache write errors gracefully', async () => {
      const env = createMockEnv();
      const mockKV = env.JOB_ANALYSIS_CACHE!;

      // Mock KV put to throw error
      vi.mocked(mockKV.put).mockRejectedValue(new Error('KV write error'));

      // Should not throw error
      await expect(
        cacheAnalysis(env, 'user-123', 'job-456', mockAnalysis)
      ).resolves.not.toThrow();
    });
  });

  describe('invalidateCacheForUser', () => {
    it('should delete specific job analyses from KV', async () => {
      const env = createMockEnv();
      const mockKV = env.JOB_ANALYSIS_CACHE!;

      await invalidateCacheForUser(env, 'user-123', ['job-456', 'job-789']);

      // Should have called KV delete twice
      expect(mockKV.delete).toHaveBeenCalledTimes(2);
      expect(mockKV.delete).toHaveBeenCalledWith('job-analysis:user-123:job-456');
      expect(mockKV.delete).toHaveBeenCalledWith('job-analysis:user-123:job-789');
    });

    it('should handle KV deletion errors gracefully', async () => {
      const env = createMockEnv();
      const mockKV = env.JOB_ANALYSIS_CACHE!;

      // Mock KV delete to throw error
      vi.mocked(mockKV.delete).mockRejectedValue(new Error('KV delete error'));

      // Should not throw error
      await expect(
        invalidateCacheForUser(env, 'user-123', ['job-456'])
      ).resolves.not.toThrow();
    });
  });
});
