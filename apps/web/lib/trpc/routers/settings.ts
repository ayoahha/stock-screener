/**
 * Router Settings
 *
 * Procedures :
 * - get() : Récupère settings utilisateur
 * - update(data) : Met à jour settings
 */

import { z } from 'zod';
import { router, publicProcedure } from '../server';

export const settingsRouter = router({
  /**
   * Get user settings
   */
  get: publicProcedure.query(async () => {
    // TODO: Fetch depuis Supabase user_settings
    // En v1 sans auth : un seul utilisateur fictif
    return {
      id: '00000000-0000-0000-0000-000000000001',
      defaultScoringProfile: 'value' as const,
      theme: 'dark' as const,
      settings: {},
    };
  }),

  /**
   * Update user settings
   */
  update: publicProcedure
    .input(
      z.object({
        defaultScoringProfile: z
          .enum(['value', 'growth', 'dividend'])
          .optional(),
        theme: z.enum(['light', 'dark']).optional(),
        settings: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Update dans Supabase user_settings
      return {
        id: '00000000-0000-0000-0000-000000000001',
        defaultScoringProfile: input.defaultScoringProfile || 'value',
        theme: input.theme || 'dark',
        settings: input.settings || {},
      };
    }),
});
