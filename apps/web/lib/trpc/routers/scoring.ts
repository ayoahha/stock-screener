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
// import { calculateScore } from '@stock-screener/scoring';

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
        profile: z.enum(['value', 'growth', 'dividend']),
      })
    )
    .query(async ({ input }) => {
      // TODO: Implémenter avec scoring engine (étape 4)
      // return calculateScore(input.ratios, input.profile);

      // Placeholder
      const score = Math.random() * 100;
      let verdict: string;
      if (score >= 90) verdict = 'EXCEPTIONAL_OPPORTUNITY';
      else if (score >= 75) verdict = 'EXCELLENT_DEAL';
      else if (score >= 60) verdict = 'GOOD_DEAL';
      else if (score >= 40) verdict = 'FAIR';
      else if (score >= 20) verdict = 'EXPENSIVE';
      else verdict = 'TOO_EXPENSIVE';

      return {
        score: Math.round(score),
        verdict,
        breakdown: [],
        profile: input.profile,
        timestamp: new Date(),
      };
    }),

  /**
   * Get all scoring profiles
   */
  getProfiles: publicProcedure.query(async () => {
    // TODO: Fetch depuis Supabase custom_scoring_profiles
    return [
      {
        id: '1',
        name: 'Value (Default)',
        description: 'Profil Value classique',
        baseProfile: 'value',
      },
      {
        id: '2',
        name: 'Growth (Default)',
        description: 'Profil Growth',
        baseProfile: 'growth',
      },
      {
        id: '3',
        name: 'Dividend (Default)',
        description: 'Profil Dividend',
        baseProfile: 'dividend',
      },
    ];
  }),

  /**
   * Get profile by ID
   */
  getProfile: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      // TODO: Fetch depuis Supabase
      return {
        id: input.id,
        name: 'Value (Default)',
        description: 'Profil Value classique',
        baseProfile: 'value',
        config: {
          ratios: [],
        },
      };
    }),
});
