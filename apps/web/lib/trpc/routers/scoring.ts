/**
 * Router Scoring
 *
 * Procedures :
 * - calculate(ratios, profile) : Calcule score selon profil
 * - getProfiles() : Liste tous les profils disponibles
 * - getProfile(id) : Détails d'un profil
 */

import { z } from 'zod';
import { router, publicProcedure } from '../server';
import {
  calculateScore,
  defaultProfiles,
  type RatioConfig,
} from '@stock-screener/scoring';

export const scoringRouter = router({
  /**
   * Calculate score
   * Input: ratios + profile (value/growth/dividend)
   * Output: ScoringResult avec score, verdict, breakdown
   */
  calculate: publicProcedure
    .input(
      z.object({
        ratios: z.record(z.number().optional()),
        profileType: z.enum(['value', 'growth', 'dividend']).default('value'),
      })
    )
    .query(async ({ input }) => {
      // Get the selected profile from defaults
      const profile = defaultProfiles[input.profileType];

      // Calculate score using the real scoring engine
      const result = calculateScore(input.ratios, profile);

      return {
        ...result,
        timestamp: new Date(),
      };
    }),

  /**
   * Get all scoring profiles
   */
  getProfiles: publicProcedure.query(async () => {
    // Return the default profiles from the scoring engine
    return [
      {
        id: 'value',
        name: defaultProfiles.value.name,
        description: 'Profil Value classique - Focus P/E, P/B, dette',
        type: defaultProfiles.value.type,
      },
      {
        id: 'growth',
        name: defaultProfiles.growth.name,
        description: 'Profil Growth - Focus croissance CA/EPS, marges',
        type: defaultProfiles.growth.type,
      },
      {
        id: 'dividend',
        name: defaultProfiles.dividend.name,
        description: 'Profil Dividend - Focus rendement et payout ratio',
        type: defaultProfiles.dividend.type,
      },
    ];
  }),

  /**
   * Get profile by ID
   */
  getProfile: publicProcedure
    .input(
      z.object({
        id: z.enum(['value', 'growth', 'dividend']),
      })
    )
    .query(async ({ input }) => {
      // Return the full profile configuration
      const profile = defaultProfiles[input.id];

      return {
        id: input.id,
        name: profile.name,
        type: profile.type,
        ratios: profile.ratios.map((r: RatioConfig) => ({
          name: r.name,
          weight: r.weight,
          thresholds: r.thresholds,
        })),
      };
    }),
});
