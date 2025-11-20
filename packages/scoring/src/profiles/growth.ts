/**
 * Profil Growth (Croissance)
 *
 * Focus :
 * - Revenue Growth : 30%
 * - EPS Growth : 30%
 * - PEG : 25%
 * - ROE : 15%
 */

import type { ScoringConfig } from '../index';

export const GROWTH_PROFILE: ScoringConfig = {
  ratios: [
    {
      name: 'RevenueGrowth',
      weight: 0.3,
      thresholds: {
        excellent: 30,
        good: 20,
        fair: 10,
        expensive: 5,
      },
      inverse: true,
    },
    {
      name: 'EPSGrowth',
      weight: 0.3,
      thresholds: {
        excellent: 25,
        good: 15,
        fair: 8,
        expensive: 3,
      },
      inverse: true,
    },
    {
      name: 'PEG',
      weight: 0.25,
      thresholds: {
        excellent: 0.5,
        good: 1,
        fair: 1.5,
        expensive: 2,
      },
    },
    {
      name: 'ROE',
      weight: 0.15,
      thresholds: {
        excellent: 20,
        good: 15,
        fair: 10,
        expensive: 5,
      },
      inverse: true,
    },
  ],
};
