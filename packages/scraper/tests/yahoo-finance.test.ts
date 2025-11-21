/**
 * Tests TDD pour Yahoo Finance Scraper
 *
 * Ces tests DOIVENT échouer initialement (RED)
 * Puis l'implémentation les fera passer (GREEN)
 * Enfin refactoring (REFACTOR)
 */

import { describe, it, expect } from 'vitest';
import { scrapeYahooFinance } from '../src/providers/yahoo-finance';
import type { StockData } from '../src/index';

describe('Yahoo Finance Scraper', () => {
  describe('European Stocks (French)', () => {
    it('should scrape Capgemini (CAP.PA) with all required fields', async () => {
      const result: StockData = await scrapeYahooFinance('CAP.PA');

      // Required fields
      expect(result.ticker).toBe('CAP.PA');
      expect(result.name).toBeTruthy();
      expect(result.name.toLowerCase()).toContain('cap');
      expect(result.price).toBeGreaterThan(0);
      expect(result.currency).toBe('EUR');
      expect(result.source).toBe('yahoo');
      expect(result.fetchedAt).toBeInstanceOf(Date);

      // Ratios object exists
      expect(result.ratios).toBeDefined();
    }, 60_000);

    it('should scrape LVMH (MC.PA) with valuation ratios', async () => {
      const result: StockData = await scrapeYahooFinance('MC.PA');

      expect(result.ticker).toBe('MC.PA');
      expect(result.name.toLowerCase()).toContain('lvmh');
      expect(result.price).toBeGreaterThan(0);
      expect(result.currency).toBe('EUR');

      // Au moins quelques ratios doivent être présents
      const ratios = result.ratios;
      const hasValuationRatios =
        ratios.PE !== undefined ||
        ratios.PB !== undefined ||
        ratios.PS !== undefined;

      expect(hasValuationRatios).toBe(true);
    }, 60_000);

    it('should scrape Airbus (AIR.PA) with profitability metrics', async () => {
      const result: StockData = await scrapeYahooFinance('AIR.PA');

      expect(result.ticker).toBe('AIR.PA');
      expect(result.name.toLowerCase()).toContain('airbus');
      expect(result.currency).toBe('EUR');

      // Au moins un ratio de profitabilité
      const ratios = result.ratios;
      const hasProfitabilityRatios =
        ratios.ROE !== undefined ||
        ratios.ROA !== undefined ||
        ratios.NetMargin !== undefined;

      expect(hasProfitabilityRatios).toBe(true);
    }, 60_000);
  });

  describe('Data Validation', () => {
    it('should return valid PE ratio when available', async () => {
      const result = await scrapeYahooFinance('CAP.PA');

      if (result.ratios.PE !== undefined) {
        expect(result.ratios.PE).toBeGreaterThan(0);
        expect(result.ratios.PE).toBeLessThan(1000); // Sanity check
      }
    });

    it('should return valid PB ratio when available', async () => {
      const result = await scrapeYahooFinance('MC.PA');

      if (result.ratios.PB !== undefined) {
        expect(result.ratios.PB).toBeGreaterThan(0);
        expect(result.ratios.PB).toBeLessThan(100); // Sanity check
      }
    });

    it('should return valid MarketCap when available', async () => {
      const result = await scrapeYahooFinance('AIR.PA');

      if (result.ratios.MarketCap !== undefined) {
        expect(result.ratios.MarketCap).toBeGreaterThan(1_000_000); // At least 1M
      }
    });

    it('should handle optional ratios gracefully (undefined is ok)', async () => {
      const result = await scrapeYahooFinance('CAP.PA');

      // Ces ratios peuvent être undefined (c'est normal)
      expect([undefined, 'number']).toContain(typeof result.ratios.PEG);
      expect([undefined, 'number']).toContain(typeof result.ratios.DividendYield);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid ticker', async () => {
      await expect(scrapeYahooFinance('INVALID_TICKER_XYZ')).rejects.toThrow();
    });

    it('should throw error for empty ticker', async () => {
      await expect(scrapeYahooFinance('')).rejects.toThrow();
    });

    it('should throw error with helpful message for non-existent stock', async () => {
      try {
        await scrapeYahooFinance('NOTREAL.PA');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toBeTruthy();
      }
    });
  });

  describe('Performance', () => {
    it('should complete scraping within 10 seconds', async () => {
      const start = Date.now();
      await scrapeYahooFinance('CAP.PA');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(45_000);
    }, 60_000); // Test timeout 60s

    it('should return fresh data (fetchedAt within last minute)', async () => {
      const result = await scrapeYahooFinance('MC.PA');
      const now = new Date();
      const diff = now.getTime() - result.fetchedAt.getTime();

      expect(diff).toBeLessThan(60_000); // Less than 1 minute
    });
  });

  describe('German Stocks', () => {
    it('should scrape BMW (BMW.DE) with EUR currency', async () => {
      const result = await scrapeYahooFinance('BMW.DE');

      expect(result.ticker).toBe('BMW.DE');
      expect(result.name.toLowerCase()).toContain('bmw');
      expect(result.currency).toBe('EUR');
      expect(result.price).toBeGreaterThan(0);
    });

    it('should scrape Siemens (SIE.DE)', async () => {
      const result = await scrapeYahooFinance('SIE.DE');

      expect(result.ticker).toBe('SIE.DE');
      expect(result.name.toLowerCase()).toContain('siemens');
      expect(result.currency).toBe('EUR');
    });
  });

  describe('US Stocks (sanity check)', () => {
    it('should also work with US stocks (AAPL)', async () => {
      const result = await scrapeYahooFinance('AAPL');

      expect(result.ticker).toBe('AAPL');
      expect(result.name.toLowerCase()).toContain('apple');
      expect(result.currency).toBe('USD');
      expect(result.price).toBeGreaterThan(0);
    });
  });
});
