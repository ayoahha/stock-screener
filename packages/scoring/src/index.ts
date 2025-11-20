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

// Types principaux
export type ScoringProfile = 'value' | 'growth' | 'dividend';

export type ScoreVerdict =
  | 'TOO_EXPENSIVE' // 0-20
  | 'EXPENSIVE' // 20-40
  | 'FAIR' // 40-60
  | 'GOOD_DEAL' // 60-75
  | 'EXCELLENT_DEAL' // 75-90
  | 'EXCEPTIONAL_OPPORTUNITY'; // 90-100

export interface ScoringResult {
  score: number; // 0-100
  verdict: ScoreVerdict;
  breakdown: RatioScore[];
  profile: ScoringProfile;
  timestamp: Date;
}

export interface RatioScore {
  name: string;
  value: number | undefined;
  score: number; // 0-100
  weight: number; // 0-1
  thresholds: RatioThresholds;
}

export interface RatioThresholds {
  excellent: number;
  good: number;
  fair: number;
  expensive: number;
}

export interface ScoringConfig {
  ratios: {
    name: string;
    weight: number;
    thresholds: RatioThresholds;
    inverse?: boolean; // true si plus haut = mieux (ex: ROE)
  }[];
}

// Placeholder exports (seront implémentés en TDD à l'étape 4)
export function calculateScore(
  _ratios: Record<string, number | undefined>,
  _profile: ScoringProfile
): ScoringResult {
  throw new Error('Not implemented yet - will be implemented in Step 4 (TDD)');
}

export function getVerdictFromScore(score: number): ScoreVerdict {
  if (score >= 90) return 'EXCEPTIONAL_OPPORTUNITY';
  if (score >= 75) return 'EXCELLENT_DEAL';
  if (score >= 60) return 'GOOD_DEAL';
  if (score >= 40) return 'FAIR';
  if (score >= 20) return 'EXPENSIVE';
  return 'TOO_EXPENSIVE';
}

export function getVerdictLabel(verdict: ScoreVerdict): string {
  const labels: Record<ScoreVerdict, string> = {
    TOO_EXPENSIVE: 'TROP CHER',
    EXPENSIVE: 'CHER',
    FAIR: 'CORRECT',
    GOOD_DEAL: 'BONNE AFFAIRE',
    EXCELLENT_DEAL: 'EXCELLENTE AFFAIRE',
    EXCEPTIONAL_OPPORTUNITY: 'OPPORTUNITÉ EXCEPTIONNELLE',
  };
  return labels[verdict];
}

export function getVerdictColor(verdict: ScoreVerdict): string {
  const colors: Record<ScoreVerdict, string> = {
    TOO_EXPENSIVE: '#DC2626', // red-600
    EXPENSIVE: '#F97316', // orange-500
    FAIR: '#FACC15', // yellow-400
    GOOD_DEAL: '#22C55E', // green-500
    EXCELLENT_DEAL: '#10B981', // emerald-500
    EXCEPTIONAL_OPPORTUNITY: '#059669', // emerald-600
  };
  return colors[verdict];
}
