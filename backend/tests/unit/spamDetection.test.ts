/**
 * Unit Tests for Spam Detection Service
 *
 * Tests AI-powered job spam detection functionality including:
 * - Single job analysis
 * - Batch processing
 * - Caching behavior
 * - Error handling
 * - Database integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  analyzeJobForSpam,
  analyzeBatchForSpam,
  clearSpamCache,
  getSpamCacheStats,
  type JobToAnalyze,
} from '../../src/services/spamDetection.service';

// =============================================================================
// Test Data
// =============================================================================

const LEGITIMATE_JOB: JobToAnalyze = {
  id: 'job-001',
  title: 'Senior Software Engineer',
  company: 'Tech Corp',
  description: `We are seeking a Senior Software Engineer to join our growing team.

Responsibilities:
- Design and implement scalable backend systems
- Collaborate with product team on new features
- Mentor junior engineers
- Code review and technical documentation

Requirements:
- 5+ years of experience with Node.js and TypeScript
- Experience with PostgreSQL and Redis
- Strong understanding of REST API design
- Excellent communication skills

We offer competitive salary ($120k-$180k), health benefits, 401k matching, and flexible remote work.`,
  location: 'San Francisco, CA',
  salaryMin: 120000,
  salaryMax: 180000,
  url: 'https://techcorp.com/careers/senior-engineer',
  source: 'linkedin',
};

const MLM_SCAM_JOB: JobToAnalyze = {
  id: 'job-002',
  title: 'Business Owner - Unlimited Income Potential',
  company: 'Global Ventures LLC',
  description: `🔥 BE YOUR OWN BOSS! 🔥

Are you tired of working for someone else? Do you want UNLIMITED INCOME POTENTIAL?

We're looking for motivated individuals to join our REVOLUTIONARY business opportunity!

What you'll do:
- Build your own team of business partners
- Sell premium health and wellness products to friends and family
- Recruit others to join the opportunity
- Work from home on your own schedule

NO EXPERIENCE NEEDED! We provide all the training!

Investment required: $500 startup kit
Earn $5,000-$50,000 per month or MORE!

This is NOT a job - it's a BUSINESS OPPORTUNITY!

Join our team of successful entrepreneurs today!`,
  location: 'Work from Home',
  salaryMin: 0,
  salaryMax: 0,
  url: 'https://globalventures.biz',
  source: 'indeed',
};

const COMMISSION_ONLY_JOB: JobToAnalyze = {
  id: 'job-003',
  title: 'Sales Representative',
  company: 'Sales Pro Inc',
  description: `Looking for motivated sales professionals!

Compensation: Commission-based (no base salary)
Unlimited earning potential - top performers make $200k+!

Requirements:
- Must have own vehicle
- Must provide own laptop and phone
- Self-motivated and entrepreneurial mindset

This is a 1099 independent contractor position.`,
  location: 'Remote',
  salaryMin: 0,
  salaryMax: 0,
  source: 'indeed',
};

const EXCESSIVE_REQUIREMENTS_JOB: JobToAnalyze = {
  id: 'job-004',
  title: 'Entry Level Developer',
  company: 'Startup Co',
  description: `Entry level position for recent graduates.

Requirements:
- 10+ years of experience with React (required)
- Expert-level knowledge of 15+ programming languages
- PhD in Computer Science
- Published research in AI/ML
- 5+ years of DevOps experience
- Fluent in 5 languages

Salary: $35,000 - $40,000`,
  location: 'New York, NY',
  salaryMin: 35000,
  salaryMax: 40000,
  source: 'linkedin',
};

// =============================================================================
// Tests
// =============================================================================

describe('Spam Detection Service', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearSpamCache();
  });

  describe('analyzeJobForSpam', () => {
    it('should identify legitimate job postings', async () => {
      const result = await analyzeJobForSpam(LEGITIMATE_JOB);

      expect(result.isSpam).toBe(false);
      expect(result.spamProbability).toBeLessThan(0.4);
      expect(result.recommendation).toBe('safe');
      expect(result.confidence).toMatch(/low|medium|high/);
      expect(result.analyzedAt).toBeDefined();
    }, 60000); // 60s timeout for AI call

    it('should detect MLM/pyramid schemes', async () => {
      const result = await analyzeJobForSpam(MLM_SCAM_JOB);

      expect(result.spamProbability).toBeGreaterThan(0.7);
      expect(result.recommendation).toBe('block');
      expect(result.categories).toContain('mlm-scheme');
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.flags.length).toBeGreaterThan(0);
    }, 60000);

    it('should detect commission-only positions', async () => {
      const result = await analyzeJobForSpam(COMMISSION_ONLY_JOB);

      expect(result.spamProbability).toBeGreaterThanOrEqual(0.4);
      expect(result.recommendation).toMatch(/review|block/);
      expect(result.categories).toContain('commission-only');
    }, 60000);

    it('should detect excessive requirements', async () => {
      const result = await analyzeJobForSpam(EXCESSIVE_REQUIREMENTS_JOB);

      expect(result.spamProbability).toBeGreaterThanOrEqual(0.4);
      expect(result.recommendation).toMatch(/review|block/);
      expect(result.categories).toContain('excessive-requirements');
    }, 60000);

    it('should use cache for duplicate analysis', async () => {
      // First analysis
      const result1 = await analyzeJobForSpam(LEGITIMATE_JOB);

      // Second analysis (should use cache)
      const result2 = await analyzeJobForSpam(LEGITIMATE_JOB);

      // Results should be identical
      expect(result2.spamProbability).toBe(result1.spamProbability);
      expect(result2.analyzedAt).toBe(result1.analyzedAt);

      // Cache should have 1 entry
      const stats = getSpamCacheStats();
      expect(stats.size).toBe(1);
    }, 60000);
  });

  describe('analyzeBatchForSpam', () => {
    it('should analyze multiple jobs in batch', async () => {
      const jobs: JobToAnalyze[] = [
        LEGITIMATE_JOB,
        MLM_SCAM_JOB,
        COMMISSION_ONLY_JOB,
      ];

      const result = await analyzeBatchForSpam(jobs);

      expect(result.total).toBe(3);
      expect(result.analyzed).toBeGreaterThan(0);
      expect(result.results.size).toBe(3);
      expect(result.spamDetected).toBeGreaterThan(0);
    }, 120000); // 2 minutes for batch processing

    it('should handle cache hits in batch processing', async () => {
      // Analyze once to populate cache
      await analyzeJobForSpam(LEGITIMATE_JOB);

      // Batch analyze with cached job
      const jobs: JobToAnalyze[] = [
        LEGITIMATE_JOB,
        MLM_SCAM_JOB,
      ];

      const result = await analyzeBatchForSpam(jobs);

      expect(result.total).toBe(2);
      expect(result.cached).toBe(1);
      expect(result.analyzed).toBe(1);
    }, 90000);

    it('should handle errors gracefully', async () => {
      const invalidJob: JobToAnalyze = {
        id: 'invalid',
        title: '',
        company: '',
        description: '',
        source: 'linkedin',
      };

      const result = await analyzeBatchForSpam([invalidJob]);

      expect(result.total).toBe(1);
      // Should return conservative "review" recommendation on error
      const jobResult = result.results.get('invalid');
      expect(jobResult).toBeDefined();
      expect(jobResult?.recommendation).toBe('review');
    }, 60000);
  });

  describe('Cache Management', () => {
    it('should clear cache completely', async () => {
      // Populate cache
      await analyzeJobForSpam(LEGITIMATE_JOB);
      await analyzeJobForSpam(MLM_SCAM_JOB);

      let stats = getSpamCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      // Clear cache
      clearSpamCache();

      stats = getSpamCacheStats();
      expect(stats.size).toBe(0);
    }, 90000);

    it('should provide cache statistics', async () => {
      await analyzeJobForSpam(LEGITIMATE_JOB);

      const stats = getSpamCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.keys.length).toBe(1);
      expect(stats.keys[0]).toContain('spam:job:');
    }, 60000);
  });

  describe('Spam Probability Scoring', () => {
    it('should return probability between 0 and 1', async () => {
      const result = await analyzeJobForSpam(LEGITIMATE_JOB);

      expect(result.spamProbability).toBeGreaterThanOrEqual(0);
      expect(result.spamProbability).toBeLessThanOrEqual(1);
    }, 60000);

    it('should set isSpam flag correctly based on threshold', async () => {
      const legitimateResult = await analyzeJobForSpam(LEGITIMATE_JOB);
      const spamResult = await analyzeJobForSpam(MLM_SCAM_JOB);

      expect(legitimateResult.isSpam).toBe(false);
      expect(spamResult.isSpam).toBe(true);
    }, 90000);

    it('should provide appropriate recommendations', async () => {
      const jobs: JobToAnalyze[] = [
        LEGITIMATE_JOB,
        COMMISSION_ONLY_JOB,
        MLM_SCAM_JOB,
      ];

      for (const job of jobs) {
        const result = await analyzeJobForSpam(job);

        // Recommendation should match probability
        if (result.spamProbability >= 0.7) {
          expect(result.recommendation).toBe('block');
        } else if (result.spamProbability >= 0.4) {
          expect(result.recommendation).toBe('review');
        } else {
          expect(result.recommendation).toBe('safe');
        }
      }
    }, 120000);
  });

  describe('Response Format', () => {
    it('should return all required fields', async () => {
      const result = await analyzeJobForSpam(LEGITIMATE_JOB);

      expect(result).toHaveProperty('isSpam');
      expect(result).toHaveProperty('spamProbability');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('categories');
      expect(result).toHaveProperty('reasons');
      expect(result).toHaveProperty('flags');
      expect(result).toHaveProperty('recommendation');
      expect(result).toHaveProperty('analyzedAt');
    }, 60000);

    it('should include detailed flags for spam jobs', async () => {
      const result = await analyzeJobForSpam(MLM_SCAM_JOB);

      expect(result.flags).toBeDefined();
      expect(result.flags.length).toBeGreaterThan(0);

      result.flags.forEach((flag) => {
        expect(flag).toHaveProperty('type');
        expect(flag).toHaveProperty('severity');
        expect(flag).toHaveProperty('description');
        expect(flag.severity).toMatch(/low|medium|high|critical/);
      });
    }, 60000);

    it('should provide human-readable reasons', async () => {
      const result = await analyzeJobForSpam(MLM_SCAM_JOB);

      expect(result.reasons).toBeDefined();
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(typeof result.reasons[0]).toBe('string');
      expect(result.reasons[0].length).toBeGreaterThan(10); // Not just empty strings
    }, 60000);
  });
});
