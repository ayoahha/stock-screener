/**
 * Profil Value (Investissement de valeur)
 *
 * Focus :
 * - PE (Price-to-Earnings) : 25%
 * - PB (Price-to-Book) : 25%
 * - Dividend Yield : 20%
 * - Debt/Equity : 15%
 * - ROE : 15%
 */

import type { ScoringConfig } from '../index';

export const VALUE_PROFILE: ScoringConfig = {
  ratios: [
    {
      name: 'PE',
      weight: 0.25,
      thresholds: {
        excellent: 10,
        good: 15,
        fair: 20,
        expensive: 25,
      },
    },
    {
      name: 'PB',
      weight: 0.25,
      thresholds: {
        excellent: 1,
        good: 1.5,
        fair: 2.5,
        expensive: 3.5,
      },
    },
    {
      name: 'DividendYield',
      weight: 0.2,
      thresholds: {
        excellent: 4,
        good: 3,
        fair: 2,
        expensive: 1,
      },
      inverse: true, // Plus haut = mieux
    },
    {
      name: 'DebtToEquity',
      weight: 0.15,
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
        excellent: 15,
        good: 10,
        fair: 5,
        expensive: 0,
      },
      inverse: true,
    },
  ],
};
