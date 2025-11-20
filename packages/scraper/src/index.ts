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

// Placeholder exports (seront implémentés en TDD à l'étape 3)
export async function fetchStockData(_ticker: string): Promise<StockData> {
  throw new Error('Not implemented yet - will be implemented in Step 3 (TDD)');
}

export async function resolveTicker(_query: string): Promise<TickerResolution> {
  throw new Error('Not implemented yet - will be implemented in Step 3 (TDD)');
}
