/**
 * Router Watchlist
 *
 * CRUD operations pour watchlists :
 * - list() : Liste toutes les watchlists
 * - get(id) : Détails d'une watchlist
 * - create(data) : Créer une watchlist
 * - update(id, data) : Modifier une watchlist
 * - delete(id) : Supprimer une watchlist
 */

import { z } from 'zod';
import { router, publicProcedure } from '../server';

export const watchlistRouter = router({
  /**
   * List all watchlists
   */
  list: publicProcedure.query(async () => {
    // TODO: Fetch depuis Supabase watchlists table
    return [
      {
        id: '1',
        name: 'Tech Favorites',
        description: 'My favorite tech stocks',
        tickers: ['AAPL', 'MSFT', 'GOOGL'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }),

  /**
   * Get watchlist by ID
   */
  get: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      // TODO: Fetch depuis Supabase
      return {
        id: input.id,
        name: 'Tech Favorites',
        description: 'My favorite tech stocks',
        tickers: ['AAPL', 'MSFT', 'GOOGL'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }),

  /**
   * Create watchlist
   */
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        tickers: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Insert dans Supabase
      return {
        id: 'new-id',
        name: input.name,
        description: input.description || null,
        tickers: input.tickers || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }),

  /**
   * Update watchlist
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        tickers: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Update dans Supabase
      return {
        id: input.id,
        name: input.name || 'Updated',
        description: input.description,
        tickers: input.tickers || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }),

  /**
   * Delete watchlist
   */
  delete: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Delete depuis Supabase
      return { success: true, id: input.id };
    }),
});
