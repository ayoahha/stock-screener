/**
 * @stock-screener/scraper
 *
 * Moteur de scraping ultra-robuste pour données financières
 * Focus : Actions européennes (mal couvertes par APIs gratuites)
 *
 * Architecture :
 * - Priorité 1 : Scraping Yahoo Finance (Playwright + stealth)
 * - Priorité 2 : APIs (FMP, Polygon)
 * - Fallback intelligent avec retry + cache
 */

export * from './providers/yahoo-finance';
export * from './providers/fmp';
export * from './providers/fallback';
export * from './resolver/ticker-resolver';
export * from './cache/cache-manager';

// Types principaux
export interface StockData {
  ticker: string;
  name: string;
  price: number;
  currency: string;
  ratios: FinancialRatios;
  source: 'yahoo' | 'fmp' | 'polygon' | 'scraping';
  fetchedAt: Date;
}

export interface FinancialRatios {
  // Valuation
  PE?: number; // Price-to-Earnings
  PB?: number; // Price-to-Book
  PEG?: number; // PEG Ratio
  PS?: number; // Price-to-Sales

  // Profitability
  ROE?: number; // Return on Equity
  ROA?: number; // Return on Assets
  ROIC?: number; // Return on Invested Capital
  GrossMargin?: number;
  OperatingMargin?: number;
  NetMargin?: number;

  // Debt
  DebtToEquity?: number;
  DebtToEBITDA?: number;
  CurrentRatio?: number;
  QuickRatio?: number;

  // Dividends
  DividendYield?: number;
  PayoutRatio?: number;

  // Growth
  RevenueGrowth?: number; // YoY %
  EPSGrowth?: number; // YoY %
  BookValueGrowth?: number; // YoY %

  // Other
  MarketCap?: number;
  Beta?: number;
}

export interface TickerResolution {
  query: string; // Input (ex: "LVMH", "Airbus")
  ticker: string; // Output (ex: "MC.PA", "AIR.PA")
  name: string; // Company name
  exchange: string; // Ex: "Paris", "NASDAQ"
  confidence: number; // 0-1
}

/**
 * Main exports - Wired to implementations
 */

import { fetchWithFallback } from './providers/fallback';
import { resolveTickerFromName } from './resolver/ticker-resolver';
import { getCachedStockData, setCachedStockData } from './cache/cache-manager';

/**
 * Fetch stock data with intelligent fallback
 * Uses cache if available, then tries: Yahoo → FMP → Error
 */
export async function fetchStockData(ticker: string): Promise<StockData> {
  // Check cache first
  const cached = await getCachedStockData(ticker);
  if (cached) {
    console.log(`[fetchStockData] Cache hit for ${ticker}`);
    return cached;
  }

  // Fetch with fallback
  const startTime = Date.now();
  const data = await fetchWithFallback(ticker);
  const duration = Date.now() - startTime;

  // Cache the result
  try {
    await setCachedStockData(data, 300, duration); // 5 min TTL
  } catch (error) {
    console.warn('Failed to cache data:', error);
  }

  return data;
}

/**
 * Resolve company name to ticker
 * Examples: "LVMH" → "MC.PA", "Apple" → "AAPL"
 */
export async function resolveTicker(query: string): Promise<TickerResolution> {
  return resolveTickerFromName(query);
}
