/**
 * Orchestrateur de fallback intelligent
 *
 * Logique (mise à jour Nov 2025) :
 * 1. [OPTIONAL] Yahoo Finance Query API - Priorité 1 (rapide mais nécessite auth cookie/crumb)
 *    - DÉSACTIVÉ PAR DÉFAUT pour éviter le blocage IP (erreurs 401)
 *    - Pour l'activer : ENABLE_YAHOO_QUERY_API=true
 * 2. Yahoo Finance Scraping - Priorité 2 (plus de données, plus lent mais fiable)
 * 3. AI (Kimi-K2 / DeepSeek) - Priorité 3 (NEW - fallback intelligent avec validation stricte)
 *    - Validation: confidence >= 80%
 *    - Budget: $5/month max
 * 4. Si échec → FMP API - Priorité 4 (fallback final, mais endpoint legacy)
 * 5. Si échec → throw error avec détails
 *
 * Optimisations :
 * - Timeout adaptatif
 * - Tracking des erreurs
 * - Log des sources utilisées
 * - Validation des prix
 * - Protection contre le rate limiting Yahoo (Query API désactivé par défaut)
 * - AI cost tracking et budget enforcement
 */

import type { StockData } from '../index';
import { fetchFromYahooQueryAPI } from './yahoo-query-api';
import { scrapeYahooFinance } from './yahoo-finance';
import { fetchFromFMP } from './fmp';
import { AIProvider } from './ai-provider';
import { validateAIData } from '../validation/ai-validator';
import { BudgetManager } from '../cost/budget-manager';
import { RateLimiter } from '../cost/rate-limiter';

interface FallbackAttempt {
  source: 'yahoo-query' | 'yahoo-scrape' | 'ai' | 'fmp' | 'polygon';
  error?: Error;
  duration?: number;
  confidence?: number; // For AI attempts
  accepted?: boolean; // Was AI data accepted?
}

// Feature flags
const ENABLE_YAHOO_QUERY_API = process.env.ENABLE_YAHOO_QUERY_API === 'true';
const ENABLE_AI_FALLBACK = process.env.ENABLE_AI_FALLBACK !== 'false'; // Enabled by default
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// AI Configuration
const AI_PRIMARY_MODEL = (process.env.AI_PRIMARY_MODEL || 'kimi') as 'kimi' | 'deepseek';
const AI_FALLBACK_MODEL = (process.env.AI_FALLBACK_MODEL || 'deepseek') as 'kimi' | 'deepseek';

// Singleton instances
let aiProvider: AIProvider | null = null;
let budgetManager: BudgetManager | null = null;
let rateLimiter: RateLimiter | null = null;

// Initialize AI components
function initializeAI() {
  if (!OPENROUTER_API_KEY) {
    console.warn('[Fallback] OpenRouter API key not found, AI fallback disabled');
    return false;
  }

  if (!aiProvider) {
    aiProvider = new AIProvider({
      apiKey: OPENROUTER_API_KEY,
      primaryModel: AI_PRIMARY_MODEL,
      fallbackModel: AI_FALLBACK_MODEL
    });
  }

  if (!budgetManager) {
    budgetManager = new BudgetManager({
      maxMonthlyUSD: parseFloat(process.env.AI_MAX_MONTHLY_BUDGET || '5.00'),
      maxDailyUSD: parseFloat(process.env.AI_MAX_DAILY_BUDGET || '0.50'),
      maxCostPerCall: parseFloat(process.env.AI_MAX_COST_PER_CALL || '0.01')
    });
  }

  if (!rateLimiter) {
    rateLimiter = new RateLimiter();
  }

  return true;
}

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

  // Strategy 3: AI (Kimi-K2 / DeepSeek) - NEW
  // Intelligent fallback with strict validation (confidence >= 80%)
  if (ENABLE_AI_FALLBACK && initializeAI()) {
    const startTime = Date.now();
    try {
      console.log(`[Fallback] Attempting AI provider for ${ticker}...`);

      // Check budget and rate limits
      const budgetCheck = await budgetManager!.canMakeRequest('data_fetch');
      if (!budgetCheck.allowed) {
        console.log(`[Fallback] ✗ AI budget/limit exceeded: ${budgetCheck.reason}`);
        attempts.push({
          source: 'ai',
          error: new Error(budgetCheck.reason || 'Budget exceeded')
        });
      } else {
        const rateCheck = rateLimiter!.canMakeCall(ticker);
        if (!rateCheck.allowed) {
          console.log(`[Fallback] ✗ AI rate limit: ${rateCheck.reason}`);
          attempts.push({
            source: 'ai',
            error: new Error(rateCheck.reason || 'Rate limited')
          });
        } else {
          // Make AI call
          rateLimiter!.recordCall(ticker);

          const result = await aiProvider!.fetchStockData(ticker);
          const duration = Date.now() - startTime;

          // Validate AI data (strict mode)
          const validation = validateAIData(result.data, ticker);

          // Log usage
          await budgetManager!.logUsage({
            ticker,
            purpose: 'data_fetch',
            model: result.model,
            provider: 'openrouter',
            tokensInput: result.tokensInput,
            tokensOutput: result.tokensOutput,
            costUSD: result.cost,
            success: true,
            confidence: validation.finalConfidence,
            accepted: validation.shouldAccept,
            errorMessage: validation.errors.length > 0 ? validation.errors.join('; ') : undefined,
            responseTimeMs: duration
          });

          console.log(`[Fallback] AI response received: confidence=${(validation.finalConfidence * 100).toFixed(1)}%, accepted=${validation.shouldAccept}`);

          if (validation.warnings.length > 0) {
            console.warn(`[Fallback] AI warnings:`, validation.warnings);
          }

          if (validation.errors.length > 0) {
            console.error(`[Fallback] AI errors:`, validation.errors);
          }

          // Accept only if confidence >= 80% (strict mode)
          if (validation.shouldAccept) {
            attempts.push({
              source: 'ai',
              duration,
              confidence: validation.finalConfidence,
              accepted: true
            });

            console.log(`[Fallback] ✓ AI succeeded in ${duration}ms (cost: $${result.cost.toFixed(4)})`);

            // Convert AIStockData to StockData
            const stockData: StockData = {
              ...result.data,
              source: 'ai' as const
            };

            return stockData;
          } else {
            const rejectReason = `Confidence ${(validation.finalConfidence * 100).toFixed(1)}% below threshold (80%)`;
            attempts.push({
              source: 'ai',
              duration,
              confidence: validation.finalConfidence,
              accepted: false,
              error: new Error(rejectReason)
            });
            console.log(`[Fallback] ✗ AI rejected: ${rejectReason}`);
          }
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      lastError = error as Error;
      attempts.push({ source: 'ai', error: lastError, duration });
      console.log(`[Fallback] ✗ AI failed: ${lastError.message}`);

      // Log failed attempt
      if (budgetManager && aiProvider) {
        await budgetManager.logUsage({
          ticker,
          purpose: 'data_fetch',
          model: AI_PRIMARY_MODEL,
          provider: 'openrouter',
          tokensInput: 0,
          tokensOutput: 0,
          costUSD: 0,
          success: false,
          errorMessage: lastError.message,
          responseTimeMs: duration
        });
      }
    }
  } else if (!ENABLE_AI_FALLBACK) {
    console.log(`[Fallback] AI fallback disabled (set ENABLE_AI_FALLBACK=true to enable)`);
  }

  // Strategy 4: FMP API (last resort)
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
