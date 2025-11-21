/**
 * Cache Manager
 *
 * Stratégie de cache :
 * - Stockage : Supabase (table stock_cache)
 * - TTL : 5 minutes par défaut (configurable)
 * - Invalidation : Automatique via expires_at + manuelle
 */

import { createBrowserClient, type Database, type Json } from '@stock-screener/database';
import type { StockData } from '../index';

const DEFAULT_TTL_SECONDS = 300; // 5 minutes

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    try {
      supabaseClient = createBrowserClient();
    } catch (error) {
      console.warn('Failed to initialize Supabase client in cache manager:', error);
      return null;
    }
  }
  return supabaseClient;
}

/**
 * Récupère les données en cache si elles sont valides
 */
export async function getCachedStockData(ticker: string): Promise<StockData | null> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('stock_cache')
      .select('*')
      .eq('ticker', ticker)
      .single();

    if (error || !data) {
      return null;
    }

    // Type assertion for the row data
    type CacheRow = Database['public']['Tables']['stock_cache']['Row'];
    const cacheRow = data as CacheRow;

    // Check if cache is expired
    const expiresAt = new Date(cacheRow.expires_at);
    if (!isCacheValid(expiresAt)) {
      // Cache expired, delete it
      await supabase.from('stock_cache').delete().eq('ticker', ticker);
      return null;
    }

    // Parse and return the cached data
    const cachedData = cacheRow.data as unknown as StockData;

    return {
      ...cachedData,
      fetchedAt: new Date(cacheRow.updated_at),
    };
  } catch (error) {
    console.error('Error getting cached data:', error);
    return null;
  }
}

/**
 * Stocke les données en cache avec TTL
 */
export async function setCachedStockData(
  data: StockData,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
  fetchDurationMs?: number,
  errorCount: number = 0
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    const cacheEntry = {
      ticker: data.ticker,
      data: data as unknown as Json,
      source: data.source,
      expires_at: expiresAt.toISOString(),
      updated_at: now.toISOString(),
      fetch_duration_ms: fetchDurationMs ?? null,
      error_count: errorCount,
    };

    // Upsert (insert or update)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase
      .from('stock_cache') as any)
      .upsert(cacheEntry, {
        onConflict: 'ticker',
      });

    if (error) {
      throw new Error(`Failed to cache data: ${error.message}`);
    }
  } catch (error) {
    console.error('Error setting cache:', error);
    throw error;
  }
}

/**
 * Invalide le cache pour un ticker spécifique ou tous les caches
 */
export async function invalidateCache(ticker?: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    if (ticker) {
      // Invalidate specific ticker
      await supabase.from('stock_cache').delete().eq('ticker', ticker);
    } else {
      // Invalidate all cache
      await supabase.from('stock_cache').delete().neq('ticker', ''); // Delete all
    }
  } catch (error) {
    console.error('Error invalidating cache:', error);
    // Don't throw - invalidation errors are not critical
  }
}

/**
 * Vérifie si le cache est toujours valide
 */
export function isCacheValid(expiresAt: Date): boolean {
  const now = new Date();
  return expiresAt > now;
}
