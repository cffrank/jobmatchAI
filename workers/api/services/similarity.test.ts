/**
 * Similarity Service Tests
 *
 * Comprehensive test suite for vector similarity calculations and job ranking.
 */

import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  rankJobsBySimilarity,
  hybridScore,
  type JobWithEmbedding,
} from './similarity';
import type { Database } from '../../../src/types/supabase';

// Type alias for Job row from database
type Job = Database['public']['Tables']['jobs']['Row'];

describe('Similarity Service', () => {
  describe('cosineSimilarity', () => {
    it('should calculate similarity for identical vectors', () => {
      const vec = [1, 0, 0];
      const similarity = cosineSimilarity(vec, vec);
      expect(similarity).toBe(1);
    });

    it('should calculate similarity for opposite vectors', () => {
      const vecA = [1, 0, 0];
      const vecB = [-1, 0, 0];
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBe(-1);
    });

    it('should calculate similarity for orthogonal vectors', () => {
      const vecA = [1, 0, 0];
      const vecB = [0, 1, 0];
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(0, 10);
    });

    it('should calculate similarity for similar vectors', () => {
      const vecA = [1, 2, 3];
      const vecB = [1, 2, 3.1];
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeGreaterThan(0.99);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should handle 768-dimensional vectors (typical embedding size)', () => {
      const vecA = new Array(768).fill(0).map(() => Math.random());
      const vecB = new Array(768).fill(0).map(() => Math.random());
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should calculate correct similarity for known vectors', () => {
      // Vectors at 60 degrees: cos(60°) = 0.5
      const vecA = [1, 0];
      const vecB = [0.5, Math.sqrt(3) / 2];
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(0.5, 5);
    });

    it('should throw error for null vectors', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => cosineSimilarity(null as any, [1, 2, 3])).toThrow(
        'Vectors cannot be null or undefined'
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => cosineSimilarity([1, 2, 3], null as any)).toThrow(
        'Vectors cannot be null or undefined'
      );
    });

    it('should throw error for undefined vectors', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => cosineSimilarity(undefined as any, [1, 2, 3])).toThrow(
        'Vectors cannot be null or undefined'
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => cosineSimilarity([1, 2, 3], undefined as any)).toThrow(
        'Vectors cannot be null or undefined'
      );
    });

    it('should throw error for non-array inputs', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => cosineSimilarity('not an array' as any, [1, 2, 3])).toThrow(
        'Both inputs must be arrays'
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => cosineSimilarity([1, 2, 3], 'not an array' as any)).toThrow(
        'Both inputs must be arrays'
      );
    });

    it('should throw error for vectors with different dimensions', () => {
      const vecA = [1, 2, 3];
      const vecB = [1, 2];
      expect(() => cosineSimilarity(vecA, vecB)).toThrow(
        'Vector dimensions must match. Got 3 and 2'
      );
    });

    it('should throw error for empty vectors', () => {
      expect(() => cosineSimilarity([], [])).toThrow('Vectors cannot be empty');
    });

    it('should throw error for zero vectors', () => {
      const vecA = [0, 0, 0];
      const vecB = [1, 2, 3];
      expect(() => cosineSimilarity(vecA, vecB)).toThrow(
        'Cannot calculate similarity for zero vectors'
      );
    });

    it('should throw error for vectors with NaN values', () => {
      const vecA = [1, NaN, 3];
      const vecB = [1, 2, 3];
      expect(() => cosineSimilarity(vecA, vecB)).toThrow(
        'First vector contains invalid values'
      );
      expect(() => cosineSimilarity(vecB, vecA)).toThrow(
        'Second vector contains invalid values'
      );
    });

    it('should throw error for vectors with Infinity values', () => {
      const vecA = [1, Infinity, 3];
      const vecB = [1, 2, 3];
      expect(() => cosineSimilarity(vecA, vecB)).toThrow(
        'First vector contains invalid values'
      );
      expect(() => cosineSimilarity(vecB, vecA)).toThrow(
        'Second vector contains invalid values'
      );
    });

    it('should handle very small values without underflow', () => {
      const vecA = [1e-10, 1e-10, 1e-10];
      const vecB = [1e-10, 1e-10, 1e-10];
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should handle very large values without overflow', () => {
      const vecA = [1e100, 1e100, 1e100];
      const vecB = [1e100, 1e100, 1e100];
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should be commutative', () => {
      const vecA = [1, 2, 3, 4, 5];
      const vecB = [5, 4, 3, 2, 1];
      const simAB = cosineSimilarity(vecA, vecB);
      const simBA = cosineSimilarity(vecB, vecA);
      expect(simAB).toBe(simBA);
    });

    it('should clamp results to [-1, 1] range', () => {
      // Even with floating point errors, should never exceed range
      const vecA = new Array(768).fill(0).map(() => Math.random() * 100);
      const vecB = new Array(768).fill(0).map(() => Math.random() * 100);
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('rankJobsBySimilarity', () => {
    const createMockJob = (id: string, title: string): Job => ({
      id,
      user_id: 'user-123',
      title,
      company: 'Test Company',
      location: 'Remote',
      description: 'Test description',
      required_skills: ['TypeScript', 'React'],
      salary_min: 80000,
      salary_max: 120000,
      job_type: 'full-time',
      experience_level: 'mid',
      source: 'manual',
      url: null,
      company_logo: null,
      work_arrangement: 'remote',
      match_score: null,
      compatibility_breakdown: null,
      recommendations: null,
      missing_skills: null,
      saved: false,
      archived: false,
      added_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    it('should rank jobs by similarity score', () => {
      const userEmbedding = [1, 0, 0];

      const jobs: JobWithEmbedding[] = [
        {
          job: createMockJob('1', 'Low Match'),
          embedding: [0, 0, 1], // Orthogonal (similarity ~0)
        },
        {
          job: createMockJob('2', 'High Match'),
          embedding: [0.9, 0.1, 0], // Very similar (similarity ~0.99)
        },
        {
          job: createMockJob('3', 'Medium Match'),
          embedding: [0.5, 0.5, 0], // Somewhat similar (similarity ~0.7)
        },
      ];

      const ranked = rankJobsBySimilarity(userEmbedding, jobs);

      expect(ranked).toHaveLength(3);
      expect(ranked[0].job.title).toBe('High Match');
      expect(ranked[1].job.title).toBe('Medium Match');
      expect(ranked[2].job.title).toBe('Low Match');
    });

    it('should include both semantic and normalized scores', () => {
      const userEmbedding = [1, 0, 0];
      const jobs: JobWithEmbedding[] = [
        {
          job: createMockJob('1', 'Job 1'),
          embedding: [1, 0, 0], // Identical
        },
      ];

      const ranked = rankJobsBySimilarity(userEmbedding, jobs);

      expect(ranked[0]).toHaveProperty('job');
      expect(ranked[0]).toHaveProperty('semanticScore');
      expect(ranked[0]).toHaveProperty('normalizedScore');
      expect(ranked[0].semanticScore).toBe(1);
      expect(ranked[0].normalizedScore).toBe(100);
    });

    it('should handle normalized scores correctly', () => {
      const userEmbedding = [1, 0, 0];
      const jobs: JobWithEmbedding[] = [
        {
          job: createMockJob('1', 'Orthogonal Job'),
          embedding: [0, 1, 0], // Orthogonal (similarity = 0)
        },
      ];

      const ranked = rankJobsBySimilarity(userEmbedding, jobs);

      // Cosine similarity of 0 should map to 50 on 0-100 scale
      // because we normalize [-1,1] to [0,1] then multiply by 100
      expect(ranked[0].semanticScore).toBeCloseTo(0, 5);
      expect(ranked[0].normalizedScore).toBeCloseTo(50, 1);
    });

    it('should handle empty job array', () => {
      const userEmbedding = [1, 0, 0];
      const ranked = rankJobsBySimilarity(userEmbedding, []);
      expect(ranked).toHaveLength(0);
    });

    it('should handle 768-dimensional vectors', () => {
      const userEmbedding = new Array(768).fill(0).map(() => Math.random());
      const jobs: JobWithEmbedding[] = [
        {
          job: createMockJob('1', 'Job 1'),
          embedding: new Array(768).fill(0).map(() => Math.random()),
        },
        {
          job: createMockJob('2', 'Job 2'),
          embedding: new Array(768).fill(0).map(() => Math.random()),
        },
      ];

      const ranked = rankJobsBySimilarity(userEmbedding, jobs);
      expect(ranked).toHaveLength(2);
      expect(ranked[0].semanticScore).toBeGreaterThanOrEqual(-1);
      expect(ranked[0].semanticScore).toBeLessThanOrEqual(1);
    });

    it('should throw error for invalid user embedding', () => {
      const jobs: JobWithEmbedding[] = [
        {
          job: createMockJob('1', 'Job 1'),
          embedding: [1, 0, 0],
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => rankJobsBySimilarity(null as any, jobs)).toThrow(
        'User embedding must be a valid array'
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => rankJobsBySimilarity(undefined as any, jobs)).toThrow(
        'User embedding must be a valid array'
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => rankJobsBySimilarity('invalid' as any, jobs)).toThrow(
        'User embedding must be a valid array'
      );
    });

    it('should throw error for empty user embedding', () => {
      const jobs: JobWithEmbedding[] = [
        {
          job: createMockJob('1', 'Job 1'),
          embedding: [1, 0, 0],
        },
      ];

      expect(() => rankJobsBySimilarity([], jobs)).toThrow(
        'User embedding cannot be empty'
      );
    });

    it('should throw error for invalid jobs array', () => {
      const userEmbedding = [1, 0, 0];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => rankJobsBySimilarity(userEmbedding, null as any)).toThrow(
        'Jobs must be a valid array'
      );
      expect(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rankJobsBySimilarity(userEmbedding, undefined as any)
      ).toThrow('Jobs must be a valid array');
      expect(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rankJobsBySimilarity(userEmbedding, 'invalid' as any)
      ).toThrow('Jobs must be a valid array');
    });

    it('should throw error for null job', () => {
      const userEmbedding = [1, 0, 0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jobs: any[] = [null];

      expect(() => rankJobsBySimilarity(userEmbedding, jobs)).toThrow(
        'Job at index 0 is null or undefined'
      );
    });

    it('should throw error for job with invalid embedding', () => {
      const userEmbedding = [1, 0, 0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jobs: any[] = [
        {
          job: createMockJob('1', 'Job 1'),
          embedding: null,
        },
      ];

      expect(() => rankJobsBySimilarity(userEmbedding, jobs)).toThrow(
        'Job "Job 1" (index 0) has invalid embedding'
      );
    });

    it('should throw error for mismatched embedding dimensions', () => {
      const userEmbedding = [1, 0, 0];
      const jobs: JobWithEmbedding[] = [
        {
          job: createMockJob('1', 'Job 1'),
          embedding: [1, 0], // Wrong dimension
        },
      ];

      expect(() => rankJobsBySimilarity(userEmbedding, jobs)).toThrow(
        'Failed to calculate similarity for job "Job 1"'
      );
    });

    it('should maintain stable sort for equal scores', () => {
      const userEmbedding = [1, 0, 0];
      const jobs: JobWithEmbedding[] = [
        {
          job: createMockJob('1', 'Job A'),
          embedding: [1, 0, 0],
        },
        {
          job: createMockJob('2', 'Job B'),
          embedding: [1, 0, 0],
        },
        {
          job: createMockJob('3', 'Job C'),
          embedding: [1, 0, 0],
        },
      ];

      const ranked = rankJobsBySimilarity(userEmbedding, jobs);

      // All should have same score
      expect(ranked[0].semanticScore).toBe(ranked[1].semanticScore);
      expect(ranked[1].semanticScore).toBe(ranked[2].semanticScore);
    });
  });

  describe('hybridScore', () => {
    it('should calculate hybrid score with 70/30 weighting', () => {
      const semantic = 1.0; // Perfect semantic match
      const keyword = 100; // Perfect keyword match
      const hybrid = hybridScore(semantic, keyword);

      // 1.0 * 100 * 0.7 + 100 * 0.3 = 70 + 30 = 100
      expect(hybrid).toBe(100);
    });

    it('should weight semantic score at 70%', () => {
      const semantic = 1.0;
      const keyword = 0;
      const hybrid = hybridScore(semantic, keyword);

      // 1.0 * 100 * 0.7 + 0 * 0.3 = 70
      expect(hybrid).toBe(70);
    });

    it('should weight keyword score at 30%', () => {
      const semantic = 0;
      const keyword = 100;
      const hybrid = hybridScore(semantic, keyword);

      // 0 * 100 * 0.7 + 100 * 0.3 = 30
      expect(hybrid).toBe(30);
    });

    it('should handle mid-range scores correctly', () => {
      const semantic = 0.5;
      const keyword = 50;
      const hybrid = hybridScore(semantic, keyword);

      // 0.5 * 100 * 0.7 + 50 * 0.3 = 35 + 15 = 50
      expect(hybrid).toBe(50);
    });

    it('should handle minimum scores', () => {
      const semantic = 0;
      const keyword = 0;
      const hybrid = hybridScore(semantic, keyword);
      expect(hybrid).toBe(0);
    });

    it('should handle maximum scores', () => {
      const semantic = 1;
      const keyword = 100;
      const hybrid = hybridScore(semantic, keyword);
      expect(hybrid).toBe(100);
    });

    it('should round to 2 decimal places', () => {
      const semantic = 0.333; // Would create repeating decimal
      const keyword = 33.333;
      const hybrid = hybridScore(semantic, keyword);

      // 0.333 * 100 * 0.7 + 33.333 * 0.3 = 23.31 + 9.9999 = 33.3099
      expect(hybrid).toBeCloseTo(33.31, 2);
    });

    it('should throw error for invalid semantic score type', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => hybridScore('invalid' as any, 50)).toThrow(
        'Semantic score must be a finite number'
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => hybridScore(null as any, 50)).toThrow(
        'Semantic score must be a finite number'
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => hybridScore(undefined as any, 50)).toThrow(
        'Semantic score must be a finite number'
      );
    });

    it('should throw error for invalid keyword score type', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => hybridScore(0.5, 'invalid' as any)).toThrow(
        'Keyword score must be a finite number'
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => hybridScore(0.5, null as any)).toThrow(
        'Keyword score must be a finite number'
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => hybridScore(0.5, undefined as any)).toThrow(
        'Keyword score must be a finite number'
      );
    });

    it('should throw error for NaN values', () => {
      expect(() => hybridScore(NaN, 50)).toThrow(
        'Semantic score must be a finite number'
      );
      expect(() => hybridScore(0.5, NaN)).toThrow(
        'Keyword score must be a finite number'
      );
    });

    it('should throw error for Infinity values', () => {
      expect(() => hybridScore(Infinity, 50)).toThrow(
        'Semantic score must be a finite number'
      );
      expect(() => hybridScore(0.5, Infinity)).toThrow(
        'Keyword score must be a finite number'
      );
    });

    it('should throw error for semantic score out of range', () => {
      expect(() => hybridScore(-0.1, 50)).toThrow(
        'Semantic score must be between 0 and 1'
      );
      expect(() => hybridScore(1.1, 50)).toThrow(
        'Semantic score must be between 0 and 1'
      );
      expect(() => hybridScore(-1, 50)).toThrow(
        'Semantic score must be between 0 and 1'
      );
      expect(() => hybridScore(2, 50)).toThrow(
        'Semantic score must be between 0 and 1'
      );
    });

    it('should throw error for keyword score out of range', () => {
      expect(() => hybridScore(0.5, -1)).toThrow(
        'Keyword score must be between 0 and 100'
      );
      expect(() => hybridScore(0.5, 101)).toThrow(
        'Keyword score must be between 0 and 100'
      );
      expect(() => hybridScore(0.5, -10)).toThrow(
        'Keyword score must be between 0 and 100'
      );
      expect(() => hybridScore(0.5, 200)).toThrow(
        'Keyword score must be between 0 and 100'
      );
    });

    it('should allow boundary values', () => {
      expect(() => hybridScore(0, 0)).not.toThrow();
      expect(() => hybridScore(1, 100)).not.toThrow();
      expect(() => hybridScore(0, 100)).not.toThrow();
      expect(() => hybridScore(1, 0)).not.toThrow();
    });

    it('should produce scores in valid range', () => {
      const testCases = [
        { semantic: 0, keyword: 0 },
        { semantic: 0.25, keyword: 25 },
        { semantic: 0.5, keyword: 50 },
        { semantic: 0.75, keyword: 75 },
        { semantic: 1, keyword: 100 },
      ];

      testCases.forEach(({ semantic, keyword }) => {
        const hybrid = hybridScore(semantic, keyword);
        expect(hybrid).toBeGreaterThanOrEqual(0);
        expect(hybrid).toBeLessThanOrEqual(100);
      });
    });

    it('should prioritize semantic over keyword', () => {
      // High semantic, low keyword
      const scoreA = hybridScore(1.0, 0);

      // Low semantic, high keyword
      const scoreB = hybridScore(0, 100);

      // Semantic should contribute more (70 vs 30)
      expect(scoreA).toBeGreaterThan(scoreB);
    });
  });
});
