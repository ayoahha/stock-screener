/**
 * Orchestrateur de fallback intelligent
 *
 * Logique :
 * 1. Tente Yahoo Finance (scraping)
 * 2. Si échec → FMP API
 * 3. Si échec → Polygon API
 * 4. Si échec → throw error avec détails
 *
 * Sera implémenté en TDD strict à l'étape 3
 */

import type { StockData } from '../index';

export async function fetchWithFallback(ticker: string): Promise<StockData> {
  // TODO: Implémenter en TDD à l'étape 3
  throw new Error('Not implemented yet');
}
