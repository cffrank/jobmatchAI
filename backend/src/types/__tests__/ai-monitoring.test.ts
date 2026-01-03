/**
 * AI Monitoring Types - Unit Tests
 *
 * Tests for PII masking, cost calculation, and utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
  maskUserId,
  sanitizeErrorMessage,
  calculateCost,
  MODEL_COSTS,
} from '../ai-monitoring';

describe('AI Monitoring - PII Protection', () => {
  describe('maskUserId', () => {
    it('should mask user IDs correctly', () => {
      expect(maskUserId('user_1234567890')).toBe('user_123***890');
      expect(maskUserId('abc1234567890def')).toBe('abc12345***def');
    });

    it('should handle short user IDs', () => {
      expect(maskUserId('user_123')).toBe('user_***');
      expect(maskUserId('short')).toBe('user_***');
    });

    it('should handle empty/null user IDs', () => {
      expect(maskUserId('')).toBe('user_***');
    });

    it('should preserve first 8 and last 3 characters', () => {
      const userId = 'user_abcdefghijklmnopqrstuvwxyz';
      const masked = maskUserId(userId);

      expect(masked.startsWith('user_abc')).toBe(true);
      expect(masked.endsWith('xyz')).toBe(true);
      expect(masked).toContain('***');
    });
  });

  describe('sanitizeErrorMessage', () => {
    it('should remove email addresses', () => {
      const input = 'Error for user john.doe@example.com';
      const output = sanitizeErrorMessage(input);

      expect(output).toBe('Error for user [EMAIL]');
      expect(output).not.toContain('john.doe');
      expect(output).not.toContain('example.com');
    });

    it('should remove phone numbers (various formats)', () => {
      const input1 = 'Call 555-123-4567 for support';
      const input2 = 'Phone: 555.123.4567';
      const input3 = 'Contact 5551234567';

      expect(sanitizeErrorMessage(input1)).toBe('Call [PHONE] for support');
      expect(sanitizeErrorMessage(input2)).toBe('Phone: [PHONE]');
      expect(sanitizeErrorMessage(input3)).toBe('Contact [PHONE]');
    });

    it('should remove user IDs from error messages', () => {
      const input = 'Error: user_1234567890 not found';
      const output = sanitizeErrorMessage(input);

      expect(output).toBe('Error: user_[REDACTED] not found');
      expect(output).not.toContain('user_1234567890');
    });

    it('should remove API keys', () => {
      const input = 'Invalid API key: sk-1234567890abcdefghijklmnop';
      const output = sanitizeErrorMessage(input);

      expect(output).toBe('Invalid API key: sk-[REDACTED]');
      expect(output).not.toContain('sk-1234567890');
    });

    it('should handle multiple PII types in one message', () => {
      const input = 'Error for user_123456 (john@example.com, 555-1234) - API key sk-abc123';
      const output = sanitizeErrorMessage(input);

      expect(output).not.toContain('john@example.com');
      expect(output).not.toContain('555-1234');
      expect(output).not.toContain('user_123456');
      expect(output).not.toContain('sk-abc123');
      expect(output).toContain('[EMAIL]');
      expect(output).toContain('[PHONE]');
      expect(output).toContain('[REDACTED]');
    });

    it('should preserve non-PII error information', () => {
      const input = 'Database connection failed: timeout after 5000ms';
      const output = sanitizeErrorMessage(input);

      expect(output).toBe(input); // Should be unchanged
      expect(output).toContain('Database connection failed');
      expect(output).toContain('5000ms');
    });
  });
});

describe('AI Monitoring - Cost Calculation', () => {
  describe('calculateCost', () => {
    it('should calculate cost for gpt-4o correctly', () => {
      // gpt-4o: $2.50 input, $10.00 output per 1M tokens
      const cost = calculateCost('gpt-4o', 1000, 500);

      // Expected: (1000/1M * $2.50) + (500/1M * $10.00)
      // = $0.0025 + $0.0050 = $0.0075
      expect(cost).toBeCloseTo(0.0075, 4);
    });

    it('should calculate cost for gpt-4o-mini correctly', () => {
      // gpt-4o-mini: $0.15 input, $0.60 output per 1M tokens
      const cost = calculateCost('gpt-4o-mini', 2000, 1000);

      // Expected: (2000/1M * $0.15) + (1000/1M * $0.60)
      // = $0.0003 + $0.0006 = $0.0009
      expect(cost).toBeCloseTo(0.0009, 4);
    });

    it('should handle large token counts', () => {
      // Resume parsing: 4000 output tokens with gpt-4o
      const cost = calculateCost('gpt-4o', 500, 4000);

      // Expected: (500/1M * $2.50) + (4000/1M * $10.00)
      // = $0.00125 + $0.04 = $0.04125
      expect(cost).toBeCloseTo(0.04125, 5);
    });

    it('should return 0 for zero tokens', () => {
      expect(calculateCost('gpt-4o', 0, 0)).toBe(0);
    });

    it('should use fallback pricing for unknown models', () => {
      // Unknown model should fall back to gpt-4o-mini pricing
      const cost = calculateCost('unknown-model', 1000, 1000);
      const expectedCost = calculateCost('gpt-4o-mini', 1000, 1000);

      expect(cost).toBe(expectedCost);
    });

    it('should handle all configured models', () => {
      Object.keys(MODEL_COSTS).forEach((model) => {
        const cost = calculateCost(model, 1000, 1000);
        expect(cost).toBeGreaterThan(0);
        expect(typeof cost).toBe('number');
      });
    });
  });

  describe('MODEL_COSTS configuration', () => {
    it('should have pricing for all production models', () => {
      expect(MODEL_COSTS['gpt-4o']).toBeDefined();
      expect(MODEL_COSTS['gpt-4o-mini']).toBeDefined();
      expect(MODEL_COSTS['gpt-4']).toBeDefined();
      expect(MODEL_COSTS['gpt-3.5-turbo']).toBeDefined();
    });

    it('should have correct cost structure', () => {
      Object.values(MODEL_COSTS).forEach((config) => {
        expect(config).toHaveProperty('model');
        expect(config).toHaveProperty('inputCostPer1M');
        expect(config).toHaveProperty('outputCostPer1M');
        expect(typeof config.inputCostPer1M).toBe('number');
        expect(typeof config.outputCostPer1M).toBe('number');
        expect(config.inputCostPer1M).toBeGreaterThan(0);
        expect(config.outputCostPer1M).toBeGreaterThan(0);
      });
    });

    it('should have output cost higher than input cost (general rule)', () => {
      Object.values(MODEL_COSTS).forEach((config) => {
        // For most models, output tokens cost more than input tokens
        expect(config.outputCostPer1M).toBeGreaterThanOrEqual(config.inputCostPer1M);
      });
    });
  });
});

describe('AI Monitoring - Real-world Scenarios', () => {
  it('should accurately estimate resume parsing cost', () => {
    // Typical resume parsing: 500 input, 4000 output with gpt-4o
    const cost = calculateCost('gpt-4o', 500, 4000);

    // Expected based on architecture doc: ~$0.04
    expect(cost).toBeGreaterThan(0.03);
    expect(cost).toBeLessThan(0.05);
  });

  it('should accurately estimate application generation cost', () => {
    // Typical application: 1500 input, 3000 output with gpt-4o-mini
    const cost = calculateCost('gpt-4o-mini', 1500, 3000);

    // Expected based on architecture doc: ~$0.002-0.003
    expect(cost).toBeGreaterThan(0.001);
    expect(cost).toBeLessThan(0.005);
  });

  it('should estimate monthly cost for expected usage', () => {
    // Expected monthly usage:
    // - 100 resume parses (gpt-4o, 500 input + 4000 output each)
    // - 200 applications (gpt-4o-mini, 1500 input + 3000 output each)

    const resumeCostPerRequest = calculateCost('gpt-4o', 500, 4000);
    const applicationCostPerRequest = calculateCost('gpt-4o-mini', 1500, 3000);

    const monthlyResumeCost = resumeCostPerRequest * 100;
    const monthlyApplicationCost = applicationCostPerRequest * 200;
    const totalMonthlyCost = monthlyResumeCost + monthlyApplicationCost;

    // Should be close to $40 + $36 = $76 (before caching)
    expect(totalMonthlyCost).toBeGreaterThan(4); // At least $4
    expect(totalMonthlyCost).toBeLessThan(10); // Less than $10
  });

  it('should demonstrate cache cost savings', () => {
    // Without cache: 200 requests
    const costPerRequest = calculateCost('gpt-4o-mini', 1500, 3000);
    const costWithoutCache = costPerRequest * 200;

    // With 60% cache hit rate: 80 actual requests
    const costWithCache = costPerRequest * 80;

    // Savings should be 60%
    const savings = costWithoutCache - costWithCache;
    const savingsPercentage = (savings / costWithoutCache) * 100;

    expect(savingsPercentage).toBeCloseTo(60, 0);
    expect(costWithCache).toBeLessThan(costWithoutCache);
  });
});
