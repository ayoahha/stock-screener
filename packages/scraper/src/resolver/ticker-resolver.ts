/**
 * Ticker Resolver (Résolution nom → ticker)
 *
 * Exemples :
 * - "LVMH" → "MC.PA"
 * - "Airbus" → "AIR.PA"
 * - "Total" → "TTE.PA"
 * - "Apple" → "AAPL"
 *
 * Stratégie :
 * 1. Base locale (JSON statique pour tickers fréquents)
 * 2. API Yahoo Finance Search
 * 3. Fuzzy matching
 *
 * Sera implémenté en TDD strict à l'étape 3
 */

import type { TickerResolution } from '../index';

export async function resolveTickerFromName(
  _query: string
): Promise<TickerResolution> {
  // TODO: Implémenter en TDD à l'étape 3
  throw new Error('Not implemented yet');
}
