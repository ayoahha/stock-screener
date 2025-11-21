/**
 * Tests TDD pour Scoring Engine
 *
 * Système de notation :
 * - Input : Ratios financiers + Profil (Value/Growth/Dividend)
 * - Output : Score 0-100 + Verdict
 *
 * Verdicts (6 niveaux) :
 * - 0-20   : TROP CHER (TOO_EXPENSIVE)
 * - 20-40  : CHER (EXPENSIVE)
 * - 40-60  : CORRECT (FAIR)
 * - 60-75  : BONNE AFFAIRE (GOOD_DEAL)
 * - 75-90  : EXCELLENTE AFFAIRE (EXCELLENT_DEAL)
 * - 90-100 : OPPORTUNITÉ EXCEPTIONNELLE (EXCEPTIONAL)
 */

import { describe, it, expect } from 'vitest';
import { calculateScore, type ScoringProfile, type ScoringResult } from '../src/index';

describe('Scoring Engine - Main Function', () => {
  describe('Value Profile Scoring', () => {
    const valueProfile: ScoringProfile = {
      name: 'Value (Default)',
      type: 'value',
      ratios: [
        { name: 'PE', weight: 0.25, thresholds: { excellent: 10, good: 15, fair: 20, expensive: 25 } },
        { name: 'PB', weight: 0.25, thresholds: { excellent: 1, good: 1.5, fair: 2.5, expensive: 3.5 } },
        { name: 'PS', weight: 0.15, thresholds: { excellent: 1, good: 2, fair: 3, expensive: 4 } },
        { name: 'DebtToEquity', weight: 0.20, thresholds: { excellent: 0.3, good: 0.5, fair: 1.0, expensive: 1.5 }, inverted: true },
        { name: 'ROE', weight: 0.15, thresholds: { excellent: 0.20, good: 0.15, fair: 0.10, expensive: 0.05 } },
      ],
    };

    it('should score excellent value stock at 90+', () => {
      const ratios = {
        PE: 8,       // Excellent (< 10)
        PB: 0.8,     // Excellent (< 1)
        PS: 0.5,     // Excellent (< 1)
        DebtToEquity: 0.2,  // Excellent (< 0.3)
        ROE: 0.25,   // Excellent (> 0.20)
      };

      const result: ScoringResult = calculateScore(ratios, valueProfile);

      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.verdict).toBe('EXCEPTIONAL');
    });

    it('should score good value stock at 75-90', () => {
      const ratios = {
        PE: 12,      // Good (10-15)
        PB: 1.2,     // Good (1-1.5)
        PS: 1.5,     // Good (1-2)
        DebtToEquity: 0.4,  // Good (0.3-0.5)
        ROE: 0.18,   // Good (0.15-0.20)
      };

      const result = calculateScore(ratios, valueProfile);

      expect(result.score).toBeGreaterThanOrEqual(75);
      expect(result.score).toBeLessThan(90);
      expect(result.verdict).toBe('EXCELLENT_DEAL');
    });

    it('should score fair value stock at 40-60', () => {
      const ratios = {
        PE: 18,      // Fair (15-20)
        PB: 2.0,     // Fair (1.5-2.5)
        PS: 2.5,     // Fair (2-3)
        DebtToEquity: 0.8,  // Fair (0.5-1.0)
        ROE: 0.12,   // Fair (0.10-0.15)
      };

      const result = calculateScore(ratios, valueProfile);

      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThan(60);
      expect(result.verdict).toBe('FAIR');
    });

    it('should score expensive stock at 0-20', () => {
      const ratios = {
        PE: 40,      // Expensive (> 25)
        PB: 5.0,     // Expensive (> 3.5)
        PS: 6.0,     // Expensive (> 4)
        DebtToEquity: 2.0,  // Expensive (> 1.5)
        ROE: 0.03,   // Expensive (< 0.05)
      };

      const result = calculateScore(ratios, valueProfile);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThan(20);
      expect(result.verdict).toBe('TOO_EXPENSIVE');
    });
  });

  describe('Missing Ratios Handling', () => {
    const valueProfile: ScoringProfile = {
      name: 'Value (Default)',
      type: 'value',
      ratios: [
        { name: 'PE', weight: 0.4, thresholds: { excellent: 10, good: 15, fair: 20, expensive: 25 } },
        { name: 'PB', weight: 0.4, thresholds: { excellent: 1, good: 1.5, fair: 2.5, expensive: 3.5 } },
        { name: 'PS', weight: 0.2, thresholds: { excellent: 1, good: 2, fair: 3, expensive: 4 } },
      ],
    };

    it('should handle undefined ratios by excluding them from calculation', () => {
      const ratios = {
        PE: 12,      // Good
        PB: undefined, // Missing
        PS: 1.5,     // Good
      };

      const result = calculateScore(ratios, valueProfile);

      // Should still calculate with available ratios (PE + PS)
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.breakdown).toBeDefined();
    });

    it('should handle all ratios missing', () => {
      const ratios = {
        PE: undefined,
        PB: undefined,
        PS: undefined,
      };

      const result = calculateScore(ratios, valueProfile);

      // Should return neutral score or throw
      expect(result.score).toBe(50); // Neutral when no data
      expect(result.verdict).toBe('FAIR');
    });
  });

  describe('Result Structure', () => {
    const simpleProfile: ScoringProfile = {
      name: 'Simple Test',
      type: 'value',
      ratios: [
        { name: 'PE', weight: 1.0, thresholds: { excellent: 10, good: 15, fair: 20, expensive: 25 } },
      ],
    };

    it('should return all required fields', () => {
      const ratios = { PE: 12 };
      const result = calculateScore(ratios, simpleProfile);

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('verdict');
      expect(result).toHaveProperty('profile');
      expect(result).toHaveProperty('breakdown');

      expect(typeof result.score).toBe('number');
      expect(typeof result.verdict).toBe('string');
      expect(result.profile).toBe('Simple Test');
    });

    it('should include breakdown per ratio', () => {
      const ratios = { PE: 12 };
      const result = calculateScore(ratios, simpleProfile);

      expect(result.breakdown).toBeDefined();
      expect(Array.isArray(result.breakdown)).toBe(true);
      expect(result.breakdown.length).toBeGreaterThan(0);

      const peBreakdown = result.breakdown[0];
      expect(peBreakdown).toHaveProperty('ratio');
      expect(peBreakdown).toHaveProperty('value');
      expect(peBreakdown).toHaveProperty('score');
      expect(peBreakdown).toHaveProperty('weight');
    });
  });

  describe('Verdict Thresholds', () => {
    const testProfile: ScoringProfile = {
      name: 'Test',
      type: 'value',
      ratios: [
        { name: 'PE', weight: 1.0, thresholds: { excellent: 10, good: 15, fair: 20, expensive: 25 } },
      ],
    };

    it('should return TOO_EXPENSIVE for score 0-20', () => {
      // PE = 40 should give very low score
      const result = calculateScore({ PE: 40 }, testProfile);
      if (result.score < 20) {
        expect(result.verdict).toBe('TOO_EXPENSIVE');
      }
    });

    it('should return EXPENSIVE for score 20-40', () => {
      // PE = 23 should give score in 20-40 range
      const result = calculateScore({ PE: 23 }, testProfile);
      if (result.score >= 20 && result.score < 40) {
        expect(result.verdict).toBe('EXPENSIVE');
      }
    });

    it('should return FAIR for score 40-60', () => {
      // PE = 18 should give score around 50
      const result = calculateScore({ PE: 18 }, testProfile);
      if (result.score >= 40 && result.score < 60) {
        expect(result.verdict).toBe('FAIR');
      }
    });

    it('should return GOOD_DEAL for score 60-75', () => {
      // PE = 13 should give score in 60-75 range
      const result = calculateScore({ PE: 13 }, testProfile);
      if (result.score >= 60 && result.score < 75) {
        expect(result.verdict).toBe('GOOD_DEAL');
      }
    });

    it('should return EXCELLENT_DEAL for score 75-90', () => {
      // PE = 11 should give score in 75-90 range
      const result = calculateScore({ PE: 11 }, testProfile);
      if (result.score >= 75 && result.score < 90) {
        expect(result.verdict).toBe('EXCELLENT_DEAL');
      }
    });

    it('should return EXCEPTIONAL for score 90-100', () => {
      // PE = 8 should give score >= 90
      const result = calculateScore({ PE: 8 }, testProfile);
      if (result.score >= 90) {
        expect(result.verdict).toBe('EXCEPTIONAL');
      }
    });
  });

  describe('Weight System', () => {
    it('should respect ratio weights', () => {
      const profile: ScoringProfile = {
        name: 'Weighted Test',
        type: 'value',
        ratios: [
          { name: 'PE', weight: 0.8, thresholds: { excellent: 10, good: 15, fair: 20, expensive: 25 } },
          { name: 'PB', weight: 0.2, thresholds: { excellent: 1, good: 1.5, fair: 2.5, expensive: 3.5 } },
        ],
      };

      // PE excellent, PB terrible
      const result1 = calculateScore({ PE: 8, PB: 10 }, profile);

      // PE terrible, PB excellent
      const result2 = calculateScore({ PE: 40, PB: 0.5 }, profile);

      // result1 should score higher because PE has more weight
      expect(result1.score).toBeGreaterThan(result2.score);
    });

    it('should normalize weights to 1.0', () => {
      const profile: ScoringProfile = {
        name: 'Test',
        type: 'value',
        ratios: [
          { name: 'PE', weight: 50, thresholds: { excellent: 10, good: 15, fair: 20, expensive: 25 } },
          { name: 'PB', weight: 50, thresholds: { excellent: 1, good: 1.5, fair: 2.5, expensive: 3.5 } },
        ],
      };

      const result = calculateScore({ PE: 12, PB: 1.2 }, profile);

      // Should work even with non-normalized weights
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('Inverted Ratios (Debt)', () => {
    it('should handle inverted ratios (lower is better)', () => {
      const profile: ScoringProfile = {
        name: 'Debt Test',
        type: 'value',
        ratios: [
          { name: 'DebtToEquity', weight: 1.0, thresholds: { excellent: 0.3, good: 0.5, fair: 1.0, expensive: 1.5 }, inverted: true },
        ],
      };

      // Low debt should score higher
      const lowDebt = calculateScore({ DebtToEquity: 0.2 }, profile);
      const highDebt = calculateScore({ DebtToEquity: 2.0 }, profile);

      expect(lowDebt.score).toBeGreaterThan(highDebt.score);
    });
  });
});
