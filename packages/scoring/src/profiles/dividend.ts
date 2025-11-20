/**
 * Profil Dividend (Rendement)
 *
 * Focus :
 * - Dividend Yield : 35%
 * - Payout Ratio : 25%
 * - Debt/Equity : 20%
 * - PE : 20%
 */

import type { ScoringProfile } from '../index';

export const DIVIDEND_PROFILE: ScoringProfile = {
  name: 'Dividend (Default)',
  type: 'dividend',
  ratios: [
    {
      name: 'DividendYield',
      weight: 0.35,
      thresholds: {
        excellent: 5,
        good: 4,
        fair: 3,
        expensive: 2,
      },
    },
    {
      name: 'PayoutRatio',
      weight: 0.25,
      thresholds: {
        excellent: 50,
        good: 60,
        fair: 75,
        expensive: 90,
      },
    },
    {
      name: 'DebtToEquity',
      weight: 0.2,
      thresholds: {
        excellent: 0.5,
        good: 1,
        fair: 1.5,
        expensive: 2,
      },
    },
    {
      name: 'PE',
      weight: 0.2,
      thresholds: {
        excellent: 12,
        good: 18,
        fair: 25,
        expensive: 30,
      },
    },
  ],
};
