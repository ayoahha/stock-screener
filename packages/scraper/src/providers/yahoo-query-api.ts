/**
 * Yahoo Finance Query API Provider
 *
 * Uses Yahoo's unofficial but more reliable query API endpoint
 * instead of HTML scraping. This is faster and more stable.
 *
 * Endpoint: https://query1.finance.yahoo.com/v7/finance/quote
 *
 * Advantages:
 * - Much faster than Playwright scraping
 * - No need for browser automation
 * - More reliable data structure
 * - Works for both US and European stocks
 */

import axios from 'axios';
import type { StockData, FinancialRatios } from '../index';

const QUERY_BASE_URL = 'https://query1.finance.yahoo.com';
const TIMEOUT_MS = 10000;
const MAX_RETRIES = 3;

interface YahooQuoteResponse {
  quoteResponse: {
    result: Array<{
      symbol: string;
      longName?: string;
      shortName?: string;
      regularMarketPrice?: number;
      currency?: string;
      marketCap?: number;
      trailingPE?: number;
      forwardPE?: number;
      priceToBook?: number;
      dividendYield?: number;
      beta?: number;
      fiftyTwoWeekHigh?: number;
      fiftyTwoWeekLow?: number;
      trailingAnnualDividendYield?: number;
      epsTrailingTwelveMonths?: number;
      bookValue?: number;
      priceToSalesTrailing12Months?: number;
    }>;
    error: null | any;
  };
}

/**
 * Validate that a price makes sense for a stock
 */
export function validatePrice(price: number, ticker: string): boolean {
  // Basic sanity checks
  if (!Number.isFinite(price) || price <= 0) {
    return false;
  }

  // Most stocks trade below $10,000 per share
  // Notable exceptions: BRK.A (~$600k+)
  if (price > 1000000) {
    console.warn(`Price ${price} for ${ticker} exceeds $1M - likely invalid`);
    return false;
  }

  // For most stocks, prices above $50k are very suspicious
  // Only allow for specific known high-price stocks
  const highPriceExceptions = ['BRK.A', 'BRK-A', 'BRKA'];
  if (price > 50000 && !highPriceExceptions.includes(ticker.toUpperCase())) {
    console.warn(`Price ${price} for ${ticker} is suspiciously high (>${50000}) - likely wrong data`);
    return false;
  }

  // Prices below $0.001 are suspicious (though penny stocks exist)
  if (price < 0.001) {
    console.warn(`Price ${price} for ${ticker} is suspiciously low - might be delisted or wrong data`);
    return false;
  }

  return true;
}

/**
 * Fetch stock data from Yahoo Finance Query API
 */
export async function fetchFromYahooQueryAPI(ticker: string): Promise<StockData> {
  if (!ticker || ticker.trim() === '') {
    throw new Error('Ticker cannot be empty');
  }

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < MAX_RETRIES) {
    try {
      const url = `${QUERY_BASE_URL}/v7/finance/quote`;
      const params = {
        symbols: ticker,
        fields: [
          'symbol',
          'longName',
          'shortName',
          'regularMarketPrice',
          'currency',
          'marketCap',
          'trailingPE',
          'forwardPE',
          'priceToBook',
          'dividendYield',
          'beta',
          'fiftyTwoWeekHigh',
          'fiftyTwoWeekLow',
          'trailingAnnualDividendYield',
          'epsTrailingTwelveMonths',
          'bookValue',
          'priceToSalesTrailing12Months',
        ].join(','),
      };

      console.log(`[Yahoo Query API] Fetching ${ticker}...`);

      const response = await axios.get<YahooQuoteResponse>(url, {
        params,
        timeout: TIMEOUT_MS,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });

      // Check if response has data
      if (!response.data?.quoteResponse?.result || response.data.quoteResponse.result.length === 0) {
        throw new Error(`No data found for ticker: ${ticker}`);
      }

      const quote = response.data.quoteResponse.result[0];

      // Ensure quote exists
      if (!quote) {
        throw new Error(`No quote data returned for ticker: ${ticker}`);
      }

      // Extract and validate price
      const price = quote.regularMarketPrice;
      if (price === undefined || price === null) {
        throw new Error(`Price not available for ${ticker}`);
      }

      if (!validatePrice(price, ticker)) {
        throw new Error(`Price validation failed for ${ticker}: ${price} is not a valid stock price`);
      }

      // Extract company name
      const name = quote.longName || quote.shortName || ticker;

      // Extract currency (with fallback based on ticker suffix)
      const currency = quote.currency || inferCurrency(ticker);

      // Build financial ratios from available data
      const ratios: FinancialRatios = {
        MarketCap: quote.marketCap,
        PE: quote.trailingPE || quote.forwardPE,
        PB: quote.priceToBook,
        PS: quote.priceToSalesTrailing12Months,
        DividendYield: quote.dividendYield || quote.trailingAnnualDividendYield,
        Beta: quote.beta,
      };

      // Calculate PEG if we have PE and can estimate growth
      // (This is a simplified version - the HTML scraper gets more detailed data)

      console.log(`[Yahoo Query API] ✓ Successfully fetched ${ticker}: $${price} ${currency}`);

      return {
        ticker,
        name,
        price,
        currency,
        ratios,
        source: 'yahoo-query',
        fetchedAt: new Date(),
      };
    } catch (error) {
      attempt++;
      lastError = error as Error;

      // Log specific error details
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.error(`[Yahoo Query API] Ticker ${ticker} not found (404)`);
          throw new Error(`Ticker not found: ${ticker}`);
        } else if (error.response?.status === 429) {
          console.error(`[Yahoo Query API] Rate limited (429) - too many requests`);
        } else {
          console.error(`[Yahoo Query API] HTTP ${error.response?.status}: ${error.message}`);
        }
      }

      if (attempt >= MAX_RETRIES) {
        throw new Error(
          `Failed to fetch ${ticker} from Yahoo Query API after ${MAX_RETRIES} attempts: ${lastError.message}`
        );
      }

      // Exponential backoff
      const backoff = Math.min(1000 * 2 ** attempt, 10000);
      console.log(`[Yahoo Query API] Retry ${attempt}/${MAX_RETRIES} after ${backoff}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  throw new Error(`Failed to fetch ${ticker} from Yahoo Query API`);
}

/**
 * Infer currency from ticker suffix
 */
function inferCurrency(ticker: string): string {
  if (ticker.endsWith('.PA') || ticker.endsWith('.DE') || ticker.endsWith('.MI') || ticker.endsWith('.AS')) {
    return 'EUR';
  }
  if (ticker.endsWith('.L')) {
    return 'GBP';
  }
  if (ticker.endsWith('.TO')) {
    return 'CAD';
  }
  if (ticker.endsWith('.SW')) {
    return 'CHF';
  }
  return 'USD';
}
