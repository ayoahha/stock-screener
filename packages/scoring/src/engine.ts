/**
 * Scoring Engine
 *
 * Algorithme :
 * 1. Pour chaque ratio défini dans le profil :
 *    - Compare la valeur aux seuils (excellent, good, fair, expensive)
 *    - Calcule un score 0-100
 *    - Applique le poids du ratio
 * 2. Agrège tous les scores pondérés
 * 3. Détermine le verdict final
 *
 * Sera implémenté en TDD strict à l'étape 4
 */

import type { ScoringResult, ScoringProfile } from './index';

export function calculateScoreFromConfig(
  ratios: Record<string, number | undefined>,
  profile: ScoringProfile
): ScoringResult {
  // TODO: Implémenter en TDD à l'étape 4
  throw new Error('Not implemented yet');
}
