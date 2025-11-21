/**
 * Router Stock
 *
 * Procedures :
 * - fetch(ticker) : Récupère données financières (scraper + cache)
 * - resolve(name) : Résout nom entreprise → ticker
 * - search(query) : Recherche multi-ticker
 *
 * Auto-save : Chaque fetch sauvegarde automatiquement dans stock_history
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../server';
import { fetchStockData, resolveTicker } from '@stock-screener/scraper';
import { classifyStock, calculateScore, defaultProfiles } from '@stock-screener/scoring';
import { createServerClient } from '@stock-screener/database';

export const stockRouter = router({
  /**
   * Fetch stock data
   * Input: ticker (ex: "CAP.PA", "AAPL")
   * Output: StockData complet avec ratios
   *
   * Auto-save: Automatically saves/updates stock in history
   */
  fetch: publicProcedure
    .input(
      z.object({
        ticker: z.string().min(1).max(20),
      })
    )
    .query(async ({ input }) => {
      try {
        // 1. Fetch real stock data using scraper (Yahoo Finance → FMP fallback)
        const stockData = await fetchStockData(input.ticker);

        // 2. Classify stock type (value, growth, dividend)
        const stockType = classifyStock(stockData.ratios as Record<string, number | undefined>);

        // 3. Calculate score using the appropriate profile
        const profile = defaultProfiles[stockType];
        const scoringResult = calculateScore(stockData.ratios as Record<string, number | undefined>, profile);

        // 4. Auto-save to history (non-blocking, errors logged but not thrown)
        try {
          const supabase = createServerClient();
          await (supabase.from('stock_history') as any).upsert(
            {
              ticker: stockData.ticker.toUpperCase(),
              name: stockData.name,
              price: stockData.price,
              currency: stockData.currency,
              source: stockData.source,
              ratios: stockData.ratios as Record<string, unknown>,
              score: scoringResult.score,
              verdict: scoringResult.verdict,
              stock_type: stockType,
              last_fetched_at: new Date().toISOString(),
            },
            {
              onConflict: 'ticker',
              ignoreDuplicates: false,
            }
          );
          console.log(`✅ Auto-saved ${stockData.ticker} to history (${stockType}, score: ${scoringResult.score})`);
        } catch (historyError) {
          // Log but don't fail the request if history save fails
          console.error(`⚠️ Failed to save ${stockData.ticker} to history:`, historyError);
        }

        // 5. Return stock data to frontend
        return stockData;
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
