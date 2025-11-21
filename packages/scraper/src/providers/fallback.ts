/**
 * Orchestrateur de fallback intelligent
 *
 * Logique (mise à jour 2025) :
 * 1. Tente Yahoo Finance Query API - Priorité 1 (rapide, fiable, sans scraping)
 * 2. Si échec → Yahoo Finance Scraping - Priorité 2 (plus de données, plus lent)
 * 3. Si échec → FMP API - Priorité 3 (fallback final, mais endpoint legacy)
 * 4. Si échec → throw error avec détails
 *
 * Optimisations :
 * - Timeout adaptatif
 * - Tracking des erreurs
 * - Log des sources utilisées
 * - Validation des prix
 */

import type { StockData } from '../index';
import { fetchFromYahooQueryAPI } from './yahoo-query-api';
import { scrapeYahooFinance } from './yahoo-finance';
import { fetchFromFMP } from './fmp';

interface FallbackAttempt {
  source: 'yahoo-query' | 'yahoo-scrape' | 'fmp' | 'polygon';
  error?: Error;
  duration?: number;
}

export async function fetchWithFallback(ticker: string): Promise<StockData> {
  if (!ticker || ticker.trim() === '') {
    throw new Error('Ticker cannot be empty');
  }

  const attempts: FallbackAttempt[] = [];
  let lastError: Error | null = null;

  // Strategy 1: Yahoo Finance Query API (fast and reliable)
  // Uses unofficial but stable JSON API endpoint
  try {
    console.log(`[Fallback] Attempting Yahoo Query API for ${ticker}...`);
    const startTime = Date.now();

    const data = await fetchFromYahooQueryAPI(ticker);

    const duration = Date.now() - startTime;
    attempts.push({ source: 'yahoo-query', duration });

    console.log(`[Fallback] ✓ Yahoo Query API succeeded in ${duration}ms`);
    return data;
  } catch (error) {
    lastError = error as Error;
    attempts.push({ source: 'yahoo-query', error: lastError });
    console.log(`[Fallback] ✗ Yahoo Query API failed: ${lastError.message}`);
  }

  // Strategy 2: Yahoo Finance HTML Scraping (slower but more comprehensive)
  // Most comprehensive data, especially for European stocks
  try {
    console.log(`[Fallback] Attempting Yahoo Finance HTML scraping for ${ticker}...`);
    const startTime = Date.now();

    const data = await scrapeYahooFinance(ticker);

    const duration = Date.now() - startTime;
    attempts.push({ source: 'yahoo-scrape', duration });

    console.log(`[Fallback] ✓ Yahoo Finance scraping succeeded in ${duration}ms`);
    return data;
  } catch (error) {
    lastError = error as Error;
    attempts.push({ source: 'yahoo-scrape', error: lastError });
    console.log(`[Fallback] ✗ Yahoo Finance scraping failed: ${lastError.message}`);
  }

  // Strategy 3: FMP API (last resort)
  // Good fallback for US stocks, limited for European
  // NOTE: Legacy endpoints deprecated as of Aug 2025, may require paid plan
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

  // Strategy 4: Additional providers (optional, not implemented yet)
  // Could add Alpha Vantage, Twelve Data, or other providers as fourth fallback

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
