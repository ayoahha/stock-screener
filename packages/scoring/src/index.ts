/**
 * @stock-screener/scoring
 *
 * Moteur de scoring modulaire et 100% personnalisable
 *
 * Supports 3 profils par défaut :
 * - Value : Focus PE, PB, Dividendes
 * - Growth : Focus croissance revenue/EPS, PEG
 * - Dividend : Focus dividend yield, payout ratio
 *
 * Chaque profil est personnalisable (poids + seuils) via UI ou JSON
 */

export * from './engine';
export * from './profiles/value';
export * from './profiles/growth';
export * from './profiles/dividend';
export * from './classification';

import { VALUE_PROFILE } from './profiles/value';
import { GROWTH_PROFILE } from './profiles/growth';
import { DIVIDEND_PROFILE } from './profiles/dividend';

/**
 * Default scoring profiles
 */
export const defaultProfiles = {
  value: VALUE_PROFILE,
  growth: GROWTH_PROFILE,
  dividend: DIVIDEND_PROFILE,
} as const;

// Types principaux
export type ProfileType = 'value' | 'growth' | 'dividend';

export type ScoreVerdict =
  | 'TOO_EXPENSIVE' // 0-20
  | 'EXPENSIVE' // 20-40
  | 'FAIR' // 40-60
  | 'GOOD_DEAL' // 60-75
  | 'EXCELLENT_DEAL' // 75-90
  | 'EXCEPTIONAL'; // 90-100

export interface ScoringResult {
  score: number; // 0-100
  verdict: ScoreVerdict;
  breakdown: RatioScore[];
  profile: string; // Profile name
}

export interface RatioScore {
  ratio: string; // Ratio name
  value: number | undefined;
  score: number; // 0-100
  weight: number; // 0-1
}

export interface RatioThresholds {
  excellent: number;
  good: number;
  fair: number;
  expensive: number;
}

export interface RatioConfig {
  name: string;
  weight: number;
  thresholds: RatioThresholds;
  inverted?: boolean; // true if lower is better (e.g., Debt)
}

export interface ScoringProfile {
  name: string;
  type: ProfileType;
  ratios: RatioConfig[];
}

/**
 * Calculate score from financial ratios and profile
 */
export function calculateScore(
  ratios: Record<string, number | undefined>,
  profile: ScoringProfile
): ScoringResult {
  const breakdown: RatioScore[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;

  // Calculate total weight for normalization
  const actualTotalWeight = profile.ratios.reduce((sum, config) => {
    const value = ratios[config.name];
    // Only count weight if ratio value exists
    return value !== undefined ? sum + config.weight : sum;
  }, 0);

  // If no ratios available, return neutral score
  if (actualTotalWeight === 0) {
    return {
      score: 50,
      verdict: 'FAIR',
      breakdown: [],
      profile: profile.name,
    };
  }

  // Calculate score for each ratio
  for (const config of profile.ratios) {
    const value = ratios[config.name];

    if (value === undefined) {
      // Skip missing ratios
      continue;
    }

    // Calculate individual ratio score (0-100)
    const ratioScore = calculateRatioScore(value, config);

    // Normalize weight based on available ratios
    const normalizedWeight = config.weight / actualTotalWeight;

    breakdown.push({
      ratio: config.name,
      value,
      score: ratioScore,
      weight: normalizedWeight,
    });

    totalWeightedScore += ratioScore * normalizedWeight;
    totalWeight += normalizedWeight;
  }

  // Final score (should be 0-100)
  const finalScore = Math.round(totalWeightedScore);

  // Determine verdict
  const verdict = getVerdictFromScore(finalScore);

  return {
    score: finalScore,
    verdict,
    breakdown,
    profile: profile.name,
  };
}

/**
 * Calculate score for a single ratio (0-100)
 */
function calculateRatioScore(value: number, config: RatioConfig): number {
  const { thresholds } = config;

  // Auto-detect if higher is better based on threshold order
  // If excellent > expensive, then higher values are better (e.g., ROE: excellent=0.20, expensive=0.05)
  // If excellent < expensive, then lower values are better (e.g., PE: excellent=10, expensive=25)
  const higherIsBetter = thresholds.excellent > thresholds.expensive;

  if (higherIsBetter) {
    // Higher is better (e.g., ROE, ROA, Margins)
    if (value >= thresholds.excellent) {
      return 100; // Excellent
    } else if (value >= thresholds.good) {
      // Linear interpolation
      const range = thresholds.excellent - thresholds.good;
      const position = value - thresholds.good;
      return Math.round(75 + (position / range) * 25); // 75-100
    } else if (value >= thresholds.fair) {
      const range = thresholds.good - thresholds.fair;
      const position = value - thresholds.fair;
      return Math.round(45 + (position / range) * 30); // 45-75
    } else if (value >= thresholds.expensive) {
      const range = thresholds.fair - thresholds.expensive;
      const position = value - thresholds.expensive;
      return Math.round(20 + (position / range) * 25); // 20-45
    } else {
      // Below expensive threshold
      const shortfall = (thresholds.expensive - value) / thresholds.expensive;
      const penalty = Math.min(shortfall * 20, 20);
      return Math.max(0, Math.round(20 - penalty)); // 20-0
    }
  } else {
    // Lower is better (e.g., PE, PB, PS, Debt)
    if (value <= thresholds.excellent) {
      return 100; // Excellent
    } else if (value <= thresholds.good) {
      // Linear interpolation
      const range = thresholds.good - thresholds.excellent;
      const position = value - thresholds.excellent;
      return Math.round(100 - (position / range) * 25); // 100-75
    } else if (value <= thresholds.fair) {
      const range = thresholds.fair - thresholds.good;
      const position = value - thresholds.good;
      return Math.round(75 - (position / range) * 30); // 75-45
    } else if (value <= thresholds.expensive) {
      const range = thresholds.expensive - thresholds.fair;
      const position = value - thresholds.fair;
      return Math.round(45 - (position / range) * 25); // 45-20
    } else {
      // Beyond expensive threshold
      const excess = (value - thresholds.expensive) / thresholds.expensive;
      const penalty = Math.min(excess * 20, 20);
      return Math.max(0, Math.round(20 - penalty)); // 20-0
    }
  }
}

/**
 * Get verdict from score (0-100)
 */
export function getVerdictFromScore(score: number): ScoreVerdict {
  if (score >= 90) return 'EXCEPTIONAL';
  if (score >= 75) return 'EXCELLENT_DEAL';
  if (score >= 60) return 'GOOD_DEAL';
  if (score >= 40) return 'FAIR';
  if (score >= 20) return 'EXPENSIVE';
  return 'TOO_EXPENSIVE';
}

/**
 * Get French label for verdict
 */
export function getVerdictLabel(verdict: ScoreVerdict): string {
  const labels: Record<ScoreVerdict, string> = {
    TOO_EXPENSIVE: 'TROP CHER',
    EXPENSIVE: 'CHER',
    FAIR: 'CORRECT',
    GOOD_DEAL: 'BONNE AFFAIRE',
    EXCELLENT_DEAL: 'EXCELLENTE AFFAIRE',
    EXCEPTIONAL: 'OPPORTUNITÉ EXCEPTIONNELLE',
  };
  return labels[verdict];
}

/**
 * Get color for verdict
 */
export function getVerdictColor(verdict: ScoreVerdict): string {
  const colors: Record<ScoreVerdict, string> = {
    TOO_EXPENSIVE: '#DC2626', // red-600
    EXPENSIVE: '#F97316', // orange-500
    FAIR: '#FACC15', // yellow-400
    GOOD_DEAL: '#22C55E', // green-500
    EXCELLENT_DEAL: '#10B981', // emerald-500
    EXCEPTIONAL: '#059669', // emerald-600
  };
  return colors[verdict];
}
