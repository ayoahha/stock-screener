/**
 * Orchestrateur de fallback intelligent
 *
 * Logique :
 * 1. Tente Yahoo Finance (scraping) - Priorité 1 (plus de données)
 * 2. Si échec → FMP API - Priorité 2 (250 calls/jour gratuits)
 * 3. Si échec → throw error avec détails
 *
 * Optimisations :
 * - Timeout adaptatif
 * - Tracking des erreurs
 * - Log des sources utilisées
 */

import type { StockData } from '../index';
import { scrapeYahooFinance } from './yahoo-finance';
import { fetchFromFMP } from './fmp';

interface FallbackAttempt {
  source: 'yahoo' | 'fmp' | 'polygon';
  error?: Error;
  duration?: number;
}

export async function fetchWithFallback(ticker: string): Promise<StockData> {
  if (!ticker || ticker.trim() === '') {
    throw new Error('Ticker cannot be empty');
  }

  const attempts: FallbackAttempt[] = [];
  let lastError: Error | null = null;

  // Strategy 1: Yahoo Finance (scraping)
  // Most comprehensive data, especially for European stocks
  try {
    console.log(`[Fallback] Attempting Yahoo Finance for ${ticker}...`);
    const startTime = Date.now();

    const data = await scrapeYahooFinance(ticker);

    const duration = Date.now() - startTime;
    attempts.push({ source: 'yahoo', duration });

    console.log(`[Fallback] ✓ Yahoo Finance succeeded in ${duration}ms`);
    return data;
  } catch (error) {
    lastError = error as Error;
    attempts.push({ source: 'yahoo', error: lastError });
    console.log(`[Fallback] ✗ Yahoo Finance failed: ${lastError.message}`);
  }

  // Strategy 2: FMP API
  // Good fallback for US stocks, limited for European
  try {
    console.log(`[Fallback] Attempting FMP API for ${ticker}...`);
    const startTime = Date.now();

    const data = await fetchFromFMP(ticker);

    const duration = Date.now() - startTime;
    attempts.push({ source: 'fmp', duration });

    console.log(`[Fallback] ✓ FMP API succeeded in ${duration}ms`);
    return data;
  } catch (error) {
    lastError = error as Error;
    attempts.push({ source: 'fmp', error: lastError });
    console.log(`[Fallback] ✗ FMP API failed: ${lastError.message}`);
  }

  // Strategy 3: Polygon API (optional, not implemented yet)
  // Could be added later as third fallback

  // All strategies failed
  const errorMessage = buildErrorMessage(ticker, attempts);
  throw new Error(errorMessage);
}

function buildErrorMessage(ticker: string, attempts: FallbackAttempt[]): string {
  const attemptedSources = attempts.map((a) => a.source).join(', ');
  const errors = attempts
    .filter((a) => a.error)
    .map((a) => `${a.source}: ${a.error?.message}`)
    .join('; ');

  return `Failed to fetch data for ${ticker} after trying: ${attemptedSources}. Errors: ${errors}`;
}
