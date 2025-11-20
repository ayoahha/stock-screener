/**
 * Router Stock
 *
 * Procedures :
 * - fetch(ticker) : Récupère données financières (scraper + cache)
 * - resolve(name) : Résout nom entreprise → ticker
 * - search(query) : Recherche multi-ticker
 */

import { z } from 'zod';
import { router, publicProcedure } from '../server';
// import { fetchStockData, resolveTicker } from '@stock-screener/scraper';

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
      // TODO: Implémenter avec le scraper (étape 3)
      // return await fetchStockData(input.ticker);

      // Placeholder pour dev
      return {
        ticker: input.ticker,
        name: `Company ${input.ticker}`,
        price: 100.0,
        currency: 'EUR',
        ratios: {
          PE: 15.0,
          PB: 2.0,
          ROE: 18.0,
        },
        source: 'placeholder' as const,
        fetchedAt: new Date(),
      };
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
      // TODO: Implémenter avec le resolver (étape 3)
      // return await resolveTicker(input.query);

      // Placeholder
      return {
        query: input.query,
        ticker: `${input.query}.PA`,
        name: `${input.query} SE`,
        exchange: 'Paris',
        confidence: 0.9,
      };
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
      // TODO: Implémenter batch fetch (étape 3)
      // return await Promise.all(input.tickers.map(t => fetchStockData(t)));

      // Placeholder
      return input.tickers.map((ticker) => ({
        ticker,
        name: `Company ${ticker}`,
        price: Math.random() * 200,
        currency: 'EUR',
        ratios: {
          PE: Math.random() * 30,
          PB: Math.random() * 5,
          ROE: Math.random() * 25,
        },
        source: 'placeholder' as const,
        fetchedAt: new Date(),
      }));
    }),
});
