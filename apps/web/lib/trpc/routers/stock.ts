/**
 * Router Stock
 *
 * Procedures :
 * - fetch(ticker) : Récupère données financières (scraper + cache)
 * - resolve(name) : Résout nom entreprise → ticker
 * - search(query) : Recherche multi-ticker
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../server';
import { fetchStockData, resolveTicker } from '@stock-screener/scraper';

export const stockRouter = router({
  /**
   * Fetch stock data
   * Input: ticker (ex: "CAP.PA", "AAPL")
   * Output: StockData complet avec ratios
   */
  fetch: publicProcedure
    .input(
      z.object({
        ticker: z.string().min(1).max(20),
      })
    )
    .query(async ({ input }) => {
      try {
        // Fetch real stock data using scraper (Yahoo Finance → FMP fallback)
        return await fetchStockData(input.ticker);
      } catch (error) {
        console.error(`Error fetching stock ${input.ticker}:`, error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch stock data',
          cause: error,
        });
      }
    }),

  /**
   * Resolve ticker from company name
   * Input: query (ex: "LVMH", "Airbus")
   * Output: TickerResolution avec ticker, name, confidence
   */
  resolve: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      // Resolve ticker using the scraper's ticker resolver
      return await resolveTicker(input.query);
    }),

  /**
   * Search multiple tickers at once
   * Input: tickers (ex: ["AAPL", "CAP.PA", "AIR.PA"])
   * Output: Array<StockData>
   */
  search: publicProcedure
    .input(
      z.object({
        tickers: z.array(z.string()).min(1).max(10),
      })
    )
    .query(async ({ input }) => {
      // Batch fetch multiple tickers in parallel
      return await Promise.all(input.tickers.map((t) => fetchStockData(t)));
    }),
});
