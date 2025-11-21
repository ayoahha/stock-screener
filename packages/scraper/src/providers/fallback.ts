/**
 * Orchestrateur de fallback intelligent
 *
 * Logique (mise à jour Nov 2025) :
 * 1. [OPTIONAL] Yahoo Finance Query API - Priorité 1 (rapide mais nécessite auth cookie/crumb)
 *    - DÉSACTIVÉ PAR DÉFAUT pour éviter le blocage IP (erreurs 401)
 *    - Pour l'activer : ENABLE_YAHOO_QUERY_API=true
 * 2. Yahoo Finance Scraping - Priorité 1 ou 2 (plus de données, plus lent mais fiable)
 * 3. Si échec → FMP API - Priorité 3 (fallback final, mais endpoint legacy)
 * 4. Si échec → throw error avec détails
 *
 * Optimisations :
 * - Timeout adaptatif
 * - Tracking des erreurs
 * - Log des sources utilisées
 * - Validation des prix
 * - Protection contre le rate limiting Yahoo (Query API désactivé par défaut)
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

// Yahoo Query API is DISABLED by default to avoid IP blocks from 401 errors
// Enable with: ENABLE_YAHOO_QUERY_API=true in environment
const ENABLE_YAHOO_QUERY_API = process.env.ENABLE_YAHOO_QUERY_API === 'true';

export async function fetchWithFallback(ticker: string): Promise<StockData> {
  if (!ticker || ticker.trim() === '') {
    throw new Error('Ticker cannot be empty');
  }

  const attempts: FallbackAttempt[] = [];
  let lastError: Error | null = null;

  // Strategy 1: Yahoo Finance Query API (OPTIONAL - disabled by default)
  // NOTE: Currently returns 401 errors without cookie/crumb authentication
  // See: .github/ISSUE_YAHOO_API_AUTH.md for implementation details
  if (ENABLE_YAHOO_QUERY_API) {
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
  } else {
    console.log(`[Fallback] Yahoo Query API disabled (set ENABLE_YAHOO_QUERY_API=true to enable)`);
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
