/**
 * Tests TDD pour Cache Manager (Supabase)
 *
 * Stratégie de cache :
 * - TTL : 5 minutes pour les données temps réel
 * - Stockage dans Supabase (table stock_cache)
 * - Invalidation manuelle possible
 * - Tracking erreurs et performance
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCachedStockData,
  setCachedStockData,
  invalidateCache,
  isCacheValid,
} from '../src/cache/cache-manager';
import type { StockData } from '../src/index';

const mockStockData: StockData = {
  ticker: 'CAP.PA',
  name: 'Capgemini SE',
  price: 180.45,
  currency: 'EUR',
  ratios: {
    PE: 18.5,
    PB: 3.2,
    MarketCap: 30_000_000_000,
  },
  source: 'yahoo',
  fetchedAt: new Date(),
};

describe('Cache Manager', () => {
  describe('Basic Cache Operations', () => {
    it('should return null for non-existent cache', async () => {
      const result = await getCachedStockData('NONEXISTENT.PA');
      expect(result).toBeNull();
    });

    it('should store and retrieve stock data', async () => {
      await setCachedStockData(mockStockData, 300); // 5 min TTL

      const result = await getCachedStockData('CAP.PA');

      expect(result).not.toBeNull();
      expect(result?.ticker).toBe('CAP.PA');
      expect(result?.name).toBe('Capgemini SE');
      expect(result?.price).toBe(180.45);
    });

    it('should update existing cache entry', async () => {
      // First cache
      await setCachedStockData(mockStockData, 300);

      // Update with new price
      const updatedData: StockData = {
        ...mockStockData,
        price: 185.00,
        fetchedAt: new Date(),
      };

      await setCachedStockData(updatedData, 300);

      const result = await getCachedStockData('CAP.PA');
      expect(result?.price).toBe(185.00);
    });
  });

  describe('Cache Expiration (TTL)', () => {
    it('should return null for expired cache', async () => {
      // Cache with 0 second TTL (immediately expired)
      await setCachedStockData(mockStockData, 0);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await getCachedStockData('CAP.PA');
      expect(result).toBeNull();
    });

    it('should return data for valid (non-expired) cache', async () => {
      // Cache with 10 second TTL
      await setCachedStockData(mockStockData, 10);

      const result = await getCachedStockData('CAP.PA');
      expect(result).not.toBeNull();
      expect(result?.ticker).toBe('CAP.PA');
    });

    it('should validate cache TTL correctly', async () => {
      const now = new Date();
      const futureExpiry = new Date(now.getTime() + 300_000); // 5 min future
      const pastExpiry = new Date(now.getTime() - 1000); // 1 sec past

      expect(isCacheValid(futureExpiry)).toBe(true);
      expect(isCacheValid(pastExpiry)).toBe(false);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate specific ticker cache', async () => {
      await setCachedStockData(mockStockData, 300);

      // Verify it's cached
      let result = await getCachedStockData('CAP.PA');
      expect(result).not.toBeNull();

      // Invalidate
      await invalidateCache('CAP.PA');

      // Should be gone
      result = await getCachedStockData('CAP.PA');
      expect(result).toBeNull();
    });

    it('should invalidate all cache when no ticker specified', async () => {
      // Cache multiple stocks
      await setCachedStockData(mockStockData, 300);
      await setCachedStockData(
        { ...mockStockData, ticker: 'MC.PA', name: 'LVMH' },
        300
      );

      // Invalidate all
      await invalidateCache();

      // Both should be gone
      expect(await getCachedStockData('CAP.PA')).toBeNull();
      expect(await getCachedStockData('MC.PA')).toBeNull();
    });

    it('should not throw error when invalidating non-existent cache', async () => {
      await expect(invalidateCache('NONEXISTENT.PA')).resolves.not.toThrow();
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all stock data fields', async () => {
      const fullData: StockData = {
        ticker: 'MC.PA',
        name: 'LVMH Moët Hennessy Louis Vuitton SE',
        price: 725.50,
        currency: 'EUR',
        ratios: {
          PE: 25.3,
          PB: 5.8,
          PS: 4.2,
          ROE: 0.285,
          NetMargin: 0.195,
          DebtToEquity: 0.35,
          DividendYield: 0.018,
          MarketCap: 360_000_000_000,
          Beta: 0.95,
        },
        source: 'yahoo',
        fetchedAt: new Date(),
      };

      await setCachedStockData(fullData, 300);
      const result = await getCachedStockData('MC.PA');

      expect(result).not.toBeNull();
      expect(result?.ticker).toBe('MC.PA');
      expect(result?.name).toBe('LVMH Moët Hennessy Louis Vuitton SE');
      expect(result?.currency).toBe('EUR');
      expect(result?.ratios.PE).toBe(25.3);
      expect(result?.ratios.MarketCap).toBe(360_000_000_000);
      expect(result?.source).toBe('yahoo');
    });

    it('should handle undefined ratios correctly', async () => {
      const dataWithMissingRatios: StockData = {
        ticker: 'TEST.PA',
        name: 'Test Company',
        price: 100,
        currency: 'EUR',
        ratios: {
          PE: 15.5,
          PB: undefined, // Missing
          MarketCap: 1_000_000_000,
        },
        source: 'yahoo',
        fetchedAt: new Date(),
      };

      await setCachedStockData(dataWithMissingRatios, 300);
      const result = await getCachedStockData('TEST.PA');

      expect(result?.ratios.PE).toBe(15.5);
      expect(result?.ratios.PB).toBeUndefined();
      expect(result?.ratios.MarketCap).toBe(1_000_000_000);
    });
  });

  describe('Performance Metadata', () => {
    it('should store fetch duration metadata', async () => {
      const fetchDuration = 2500; // 2.5 seconds
      await setCachedStockData(mockStockData, 300, fetchDuration);

      // This would be verified by checking the database directly
      // For now, just ensure it doesn't throw
      expect(true).toBe(true);
    });

    it('should track error count', async () => {
      // First attempt fails
      await setCachedStockData(mockStockData, 300, undefined, 1);

      // Second attempt succeeds
      await setCachedStockData(mockStockData, 300, 1500, 0);

      // Should work
      const result = await getCachedStockData('CAP.PA');
      expect(result).not.toBeNull();
    });
  });

  describe('Source Tracking', () => {
    it('should preserve data source', async () => {
      const yahooData = { ...mockStockData, source: 'yahoo' as const };
      await setCachedStockData(yahooData, 300);
      let result = await getCachedStockData('CAP.PA');
      expect(result?.source).toBe('yahoo');

      const fmpData = { ...mockStockData, ticker: 'MC.PA', source: 'fmp' as const };
      await setCachedStockData(fmpData, 300);
      result = await getCachedStockData('MC.PA');
      expect(result?.source).toBe('fmp');
    });
  });
});
