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

// Note: yahoo-finance is NOT exported here to avoid bundling Playwright in client builds
// It's only used internally by fallback.ts
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
  source: 'yahoo' | 'yahoo-query' | 'fmp' | 'polygon' | 'scraping';
  fetchedAt: Date;
}

export interface FinancialRatios {
  // Valuation
  PE?: number; // Price-to-Earnings
  PEG?: number; // PEG Ratio
  PB?: number; // Price-to-Book (PTB)
  PS?: number; // Price-to-Sales
  PCF?: number; // Price-to-Cash-Flow
  PFCF?: number; // Price-to-Free-Cash-Flow
  EV_EBITDA?: number; // Enterprise Value to EBITDA

  // Profitability
  ROE?: number; // Return on Equity
  ROA?: number; // Return on Assets
  ROIC?: number; // Return on Invested Capital
  GrossMargin?: number;
  OperatingMargin?: number;
  NetMargin?: number;
  FCFMargin?: number;
  CashReturn?: number;

  // Liquidity
  CurrentRatio?: number;
  QuickRatio?: number;
  CashRatio?: number;

  // Debt & Solvency
  DebtToEquity?: number;
  DebtToAssets?: number;
  DebtToRevenue?: number;
  InterestCoverage?: number;
  NetDebtToEBITDA?: number;
  DebtToEBITDA?: number; // New

  // Efficiency
  AssetTurnover?: number;
  InventoryTurnover?: number;
  ReceivablesTurnover?: number;
  PayablesTurnover?: number;

  // Growth
  RevenueGrowth?: number; // YoY %
  EPSGrowth?: number; // YoY %
  BookValueGrowth?: number; // YoY %
  IGR?: number; // Internal Growth Rate
  SGR?: number; // Sustainable Growth Rate

  // Dividends
  DividendYield?: number;
  PayoutRatio?: number;

  // Other
  MarketCap?: number;
  Beta?: number;

  // Raw Data (for calculations & display)
  Revenue?: number;
  GrossProfit?: number;
  OperatingIncome?: number;
  NetIncome?: number;
  InterestExpense?: number;
  EBITDA?: number;
  EBIT?: number;

  TotalAssets?: number;
  TotalLiabilities?: number;
  TotalEquity?: number;
  TotalCurrentAssets?: number; // New
  TotalCurrentLiabilities?: number; // New
  CashAndEquivalents?: number;
  ShortTermDebt?: number;
  LongTermDebt?: number;
  TotalDebt?: number;
  Inventory?: number;
  AccountsReceivable?: number;
  AccountsPayable?: number;
  WorkingCapital?: number;

  OperatingCashFlow?: number;
  FreeCashFlow?: number;
  CAPEX?: number;
  DividendsPaid?: number;
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
export async function fetchStockData(ticker: string, forceRefresh = false): Promise<StockData> {
  // Check cache first (unless force refresh is requested)
  if (!forceRefresh) {
    const cached = await getCachedStockData(ticker);
    if (cached) {
      console.log(`[fetchStockData] Cache hit for ${ticker}`);
      return cached;
    }
  } else {
    console.log(`[fetchStockData] Force refresh requested for ${ticker}, bypassing cache`);
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
