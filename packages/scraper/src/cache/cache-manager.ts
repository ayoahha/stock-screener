/**
 * Cache Manager
 *
 * Stratégie de cache :
 * - Stockage : Supabase (table stock_cache)
 * - TTL : 24h par défaut (configurable via .env)
 * - Invalidation : Automatique via expires_at
 *
 * Sera implémenté en TDD strict à l'étape 3
 */

import type { StockData } from '../index';

export async function getCachedStockData(
  _ticker: string
): Promise<StockData | null> {
  // TODO: Implémenter en TDD à l'étape 3
  throw new Error('Not implemented yet');
}

export async function setCachedStockData(_data: StockData): Promise<void> {
  // TODO: Implémenter en TDD à l'étape 3
  throw new Error('Not implemented yet');
}

export async function invalidateCache(_ticker: string): Promise<void> {
  // TODO: Implémenter en TDD à l'étape 3
  throw new Error('Not implemented yet');
}
