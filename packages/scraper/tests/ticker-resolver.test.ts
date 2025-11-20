/**
 * Tests TDD pour Ticker Resolver
 *
 * Objectif : Résoudre les noms de sociétés en tickers
 * Exemples :
 * - "LVMH" → "MC.PA"
 * - "Airbus" → "AIR.PA"
 * - "Capgemini" → "CAP.PA"
 * - "BMW" → "BMW.DE"
 * - "Apple" → "AAPL"
 *
 * Stratégie :
 * 1. Base locale (JSON statique pour tickers fréquents)
 * 2. Fuzzy matching pour typos
 * 3. Fallback API Yahoo Finance Search (optionnel)
 */

import { describe, it, expect } from 'vitest';
import { resolveTickerFromName } from '../src/resolver/ticker-resolver';
import type { TickerResolution } from '../src/index';

describe('Ticker Resolver', () => {
  describe('French Stocks (Exact Matches)', () => {
    it('should resolve "LVMH" to MC.PA', async () => {
      const result: TickerResolution = await resolveTickerFromName('LVMH');

      expect(result.ticker).toBe('MC.PA');
      expect(result.name).toContain('LVMH');
      expect(result.exchange).toContain('Paris');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should resolve "Airbus" to AIR.PA', async () => {
      const result = await resolveTickerFromName('Airbus');

      expect(result.ticker).toBe('AIR.PA');
      expect(result.name.toLowerCase()).toContain('airbus');
      expect(result.exchange).toContain('Paris');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should resolve "Capgemini" to CAP.PA', async () => {
      const result = await resolveTickerFromName('Capgemini');

      expect(result.ticker).toBe('CAP.PA');
      expect(result.name.toLowerCase()).toContain('capgemini');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should resolve "Total" to TTE.PA', async () => {
      const result = await resolveTickerFromName('Total');

      expect(result.ticker).toBe('TTE.PA');
      expect(result.name.toLowerCase()).toContain('total');
      expect(result.exchange).toContain('Paris');
    });

    it('should resolve "BNP Paribas" to BNP.PA', async () => {
      const result = await resolveTickerFromName('BNP Paribas');

      expect(result.ticker).toBe('BNP.PA');
      expect(result.name.toLowerCase()).toContain('bnp');
    });
  });

  describe('German Stocks (Exact Matches)', () => {
    it('should resolve "BMW" to BMW.DE', async () => {
      const result = await resolveTickerFromName('BMW');

      expect(result.ticker).toBe('BMW.DE');
      expect(result.name).toBeTruthy(); // "Bayerische Motoren Werke AG"
      expect(result.exchange).toContain('XETRA');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should resolve "Siemens" to SIE.DE', async () => {
      const result = await resolveTickerFromName('Siemens');

      expect(result.ticker).toBe('SIE.DE');
      expect(result.name.toLowerCase()).toContain('siemens');
    });

    it('should resolve "Volkswagen" to VOW.DE', async () => {
      const result = await resolveTickerFromName('Volkswagen');

      expect(result.ticker).toBe('VOW.DE');
      expect(result.name.toLowerCase()).toContain('volkswagen');
    });
  });

  describe('US Stocks (Exact Matches)', () => {
    it('should resolve "Apple" to AAPL', async () => {
      const result = await resolveTickerFromName('Apple');

      expect(result.ticker).toBe('AAPL');
      expect(result.name.toLowerCase()).toContain('apple');
      expect(result.exchange).toContain('NASDAQ');
    });

    it('should resolve "Microsoft" to MSFT', async () => {
      const result = await resolveTickerFromName('Microsoft');

      expect(result.ticker).toBe('MSFT');
      expect(result.name.toLowerCase()).toContain('microsoft');
    });

    it('should resolve "Google" to GOOGL', async () => {
      const result = await resolveTickerFromName('Google');

      expect(result.ticker).toBe('GOOGL');
      expect(result.name).toBeTruthy(); // "Alphabet Inc."
    });
  });

  describe('Case Insensitivity', () => {
    it('should resolve lowercase "lvmh"', async () => {
      const result = await resolveTickerFromName('lvmh');

      expect(result.ticker).toBe('MC.PA');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should resolve uppercase "AIRBUS"', async () => {
      const result = await resolveTickerFromName('AIRBUS');

      expect(result.ticker).toBe('AIR.PA');
    });

    it('should resolve mixed case "CaPgEmInI"', async () => {
      const result = await resolveTickerFromName('CaPgEmInI');

      expect(result.ticker).toBe('CAP.PA');
    });
  });

  describe('Fuzzy Matching (Typos)', () => {
    it('should resolve "Airbuss" (1 typo) to AIR.PA', async () => {
      const result = await resolveTickerFromName('Airbuss');

      expect(result.ticker).toBe('AIR.PA');
      expect(result.confidence).toBeGreaterThan(0.7); // Lower confidence for typo
      expect(result.confidence).toBeLessThan(1.0);
    });

    it('should resolve "Capgeminii" (1 typo) to CAP.PA', async () => {
      const result = await resolveTickerFromName('Capgeminii');

      expect(result.ticker).toBe('CAP.PA');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should resolve "Aplle" (1 typo) to AAPL', async () => {
      const result = await resolveTickerFromName('Aplle');

      expect(result.ticker).toBe('AAPL');
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Partial Matches', () => {
    it('should resolve "Air" to AIR.PA (partial match)', async () => {
      const result = await resolveTickerFromName('Air');

      expect(result.ticker).toBe('AIR.PA');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should resolve "Cap" to CAP.PA (partial match)', async () => {
      const result = await resolveTickerFromName('Cap');

      expect(result.ticker).toBe('CAP.PA');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Direct Ticker Input', () => {
    it('should accept direct ticker "CAP.PA"', async () => {
      const result = await resolveTickerFromName('CAP.PA');

      expect(result.ticker).toBe('CAP.PA');
      expect(result.confidence).toBe(1.0); // Perfect confidence
    });

    it('should accept direct ticker "AAPL"', async () => {
      const result = await resolveTickerFromName('AAPL');

      expect(result.ticker).toBe('AAPL');
      expect(result.confidence).toBe(1.0);
    });

    it('should accept direct ticker "BMW.DE"', async () => {
      const result = await resolveTickerFromName('BMW.DE');

      expect(result.ticker).toBe('BMW.DE');
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for empty string', async () => {
      await expect(resolveTickerFromName('')).rejects.toThrow();
    });

    it('should throw error for whitespace only', async () => {
      await expect(resolveTickerFromName('   ')).rejects.toThrow();
    });

    it('should throw error for completely unknown company', async () => {
      await expect(resolveTickerFromName('XYZ_COMPLETELY_UNKNOWN_123')).rejects.toThrow();
    });

    it('should provide helpful error message', async () => {
      try {
        await resolveTickerFromName('UNKNOWN_COMPANY_XYZ');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).toContain('Could not resolve');
      }
    });
  });

  describe('Response Structure', () => {
    it('should return all required fields', async () => {
      const result = await resolveTickerFromName('LVMH');

      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('ticker');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('exchange');
      expect(result).toHaveProperty('confidence');

      expect(result.query).toBe('LVMH');
      expect(typeof result.ticker).toBe('string');
      expect(typeof result.name).toBe('string');
      expect(typeof result.exchange).toBe('string');
      expect(typeof result.confidence).toBe('number');
    });

    it('should have confidence between 0 and 1', async () => {
      const result = await resolveTickerFromName('Airbus');

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Common Aliases', () => {
    it('should resolve "Moët Hennessy" to MC.PA (LVMH alias)', async () => {
      const result = await resolveTickerFromName('Moët Hennessy');

      expect(result.ticker).toBe('MC.PA');
    });

    it('should resolve "TotalEnergies" to TTE.PA', async () => {
      const result = await resolveTickerFromName('TotalEnergies');

      expect(result.ticker).toBe('TTE.PA');
    });
  });
});
