/**
 * Router History
 *
 * CRUD operations pour stock_history :
 * - list(filters, sort, pagination) : Liste l'historique des actions avec filtres
 * - get(ticker) : Détails d'une action de l'historique
 * - upsert(stockData) : Créer/Mettre à jour une entrée d'historique
 * - delete(ticker) : Supprimer une action de l'historique
 * - refresh(ticker) : Re-fetch les données et mettre à jour l'historique
 * - stats() : Statistiques globales de l'historique
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../server';
import { createServerClient } from '@stock-screener/database';
import { fetchStockData } from '@stock-screener/scraper';

// Schémas de validation
const StockTypeEnum = z.enum(['value', 'growth', 'dividend']);
const SortFieldEnum = z.enum(['lastFetched', 'score', 'name', 'ticker']);
const SortOrderEnum = z.enum(['asc', 'desc']);

export const historyRouter = router({
  /**
   * List all stocks in history with optional filters and sorting
   * Supports: search, stockType filter, score range, pagination, sorting
   */
  list: publicProcedure
    .input(
      z.object({
        // Filters
        filters: z
          .object({
            stockType: StockTypeEnum.optional(),
            minScore: z.number().min(0).max(100).optional(),
            maxScore: z.number().min(0).max(100).optional(),
            searchQuery: z.string().optional(), // Search in ticker or name
          })
          .optional(),
        // Sorting
        sort: SortFieldEnum.optional().default('name'),
        order: SortOrderEnum.optional().default('asc'),
        // Pagination
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      const supabase = createServerClient();

      let query = supabase.from('stock_history').select('*', { count: 'exact' });

      // Apply filters
      if (input.filters?.stockType) {
        query = query.eq('stock_type', input.filters.stockType);
      }

      if (input.filters?.minScore !== undefined) {
        query = query.gte('score', input.filters.minScore);
      }

      if (input.filters?.maxScore !== undefined) {
        query = query.lte('score', input.filters.maxScore);
      }

      if (input.filters?.searchQuery) {
        const search = input.filters.searchQuery.toLowerCase();
        query = query.or(
          `ticker.ilike.%${search}%,name.ilike.%${search}%`
        );
      }

      // Apply sorting
      const sortColumn =
        input.sort === 'lastFetched'
          ? 'last_fetched_at'
          : input.sort === 'score'
          ? 'score'
          : input.sort === 'name'
          ? 'name'
          : 'ticker';

      query = query.order(sortColumn, {
        ascending: input.order === 'asc',
        nullsFirst: false,
      });

      // Apply pagination
      query = query.range(input.offset, input.offset + input.limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch stock history',
          cause: error,
        });
      }

      return {
        items: data || [],
        total: count || 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get a single stock from history by ticker
   */
  get: publicProcedure
    .input(
      z.object({
        ticker: z.string().min(1).max(20),
      })
    )
    .query(async ({ input }) => {
      const supabase = createServerClient();

      const { data, error } = await supabase
        .from('stock_history')
        .select('*')
        .eq('ticker', input.ticker.toUpperCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch stock from history',
          cause: error,
        });
      }

      return data;
    }),

  /**
   * Upsert (insert or update) a stock in history
   * This is called automatically after fetching stock data
   */
  upsert: publicProcedure
    .input(
      z.object({
        ticker: z.string().min(1).max(20),
        name: z.string().min(1).max(255),
        price: z.number().nullable().optional(),
        currency: z.string().max(10).nullable().optional(),
        source: z.enum(['yahoo', 'fmp', 'polygon', 'scraping']),
        ratios: z.record(z.unknown()), // JSON object with ratios
        score: z.number().min(0).max(100).nullable().optional(),
        verdict: z.string().nullable().optional(),
        stockType: StockTypeEnum,
      })
    )
    .mutation(async ({ input }) => {
      const supabase = createServerClient();

      const { data, error } = await (supabase
        .from('stock_history') as any)
        .upsert(
          {
            ticker: input.ticker.toUpperCase(),
            name: input.name,
            price: input.price ?? null,
            currency: input.currency ?? null,
            source: input.source,
            ratios: input.ratios,
            score: input.score ?? null,
            verdict: input.verdict ?? null,
            stock_type: input.stockType,
            last_fetched_at: new Date().toISOString(),
          },
          {
            onConflict: 'ticker',
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to save stock to history',
          cause: error,
        });
      }

      return data;
    }),

  /**
   * Delete a stock from history
   */
  delete: publicProcedure
    .input(
      z.object({
        ticker: z.string().min(1).max(20),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = createServerClient();

      const { error } = await supabase
        .from('stock_history')
        .delete()
        .eq('ticker', input.ticker.toUpperCase());

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete stock from history',
          cause: error,
        });
      }

      return { success: true, ticker: input.ticker.toUpperCase() };
    }),

  /**
   * Refresh stock data: Re-fetch from sources and update history
   */
  refresh: publicProcedure
    .input(
      z.object({
        ticker: z.string().min(1).max(20),
        stockType: StockTypeEnum.optional(), // Optional: preserve existing type if not provided
      })
    )
    .mutation(async ({ input }) => {
      const supabase = createServerClient();

      // Re-fetch stock data
      let stockData;
      try {
        stockData = await fetchStockData(input.ticker);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to refresh stock data',
          cause: error,
        });
      }

      // Get existing stock type if not provided
      let stockType = input.stockType;
      if (!stockType) {
        const { data: existing } = await (supabase
          .from('stock_history') as any)
          .select('stock_type')
          .eq('ticker', input.ticker.toUpperCase())
          .single();

        stockType = existing?.stock_type || 'value'; // Default to 'value' if not found
      }

      // Calculate score (we'll need to import the scoring logic)
      // For now, we'll set it to null and let the frontend handle it
      const score = null;
      const verdict = null;

      // Update history
      const { data, error } = await (supabase
        .from('stock_history') as any)
        .upsert(
          {
            ticker: stockData.ticker.toUpperCase(),
            name: stockData.name,
            price: stockData.price,
            currency: stockData.currency,
            source: stockData.source,
            ratios: stockData.ratios as Record<string, unknown>,
            score,
            verdict,
            stock_type: stockType,
            last_fetched_at: new Date().toISOString(),
          },
          {
            onConflict: 'ticker',
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update stock in history',
          cause: error,
        });
      }

      return data;
    }),

  /**
   * Get global statistics about the history
   */
  stats: publicProcedure.query(async () => {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('stock_history_stats')
      .select('*')
      .single();

    // Handle case where database is empty (view returns no rows or PGRST116 error)
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - return default empty stats
        return {
          total_stocks: 0,
          value_stocks: 0,
          growth_stocks: 0,
          dividend_stocks: 0,
          average_score: null,
          last_update: null,
        };
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch history statistics',
        cause: error,
      });
    }

    return data;
  }),
});
