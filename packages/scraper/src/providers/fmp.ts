/**
 * Financial Modeling Prep (FMP) API Provider
 *
 * API gratuite : 250 calls/jour
 * Documentation : https://site.financialmodelingprep.com/developer/docs
 *
 * Endpoints:
 * - /quote/{ticker} - Prix + données basiques
 * - /ratios/{ticker} - Ratios financiers
 */

import axios from 'axios';
import type { StockData, FinancialRatios } from '../index';

const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';
const MAX_RETRIES = 3;

export async function fetchFromFMP(ticker: string): Promise<StockData> {
  if (!ticker || ticker.trim() === '') {
    throw new Error('Ticker cannot be empty');
  }

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey || apiKey === 'demo') {
    console.warn('FMP_API_KEY is missing or set to "demo". FMP calls may fail or be limited.');
  }

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      // Fetch profile data (replaces legacy quote endpoint)
      const profileUrl = `${FMP_BASE_URL}/profile/${ticker}?apikey=${apiKey || 'demo'}`;
      const profileResponse = await axios.get(profileUrl, { timeout: 10000 });

      if (!profileResponse.data || profileResponse.data.length === 0) {
        // FMP returns empty array for invalid ticker, but sometimes 404/403 for other issues
        if (profileResponse.status === 403) {
           throw new Error('FMP API Key Invalid or Quota Exceeded (403)');
        }
        throw new Error(`No data found for ticker: ${ticker}`);
      }

      const profile = profileResponse.data[0];

      // Fetch ratios
      const ratiosUrl = `${FMP_BASE_URL}/ratios/${ticker}?apikey=${apiKey || 'demo'}`;
      let ratios: FinancialRatios = {};

      try {
        const ratiosResponse = await axios.get(ratiosUrl, { timeout: 10000 });
        if (ratiosResponse.data && ratiosResponse.data.length > 0) {
          ratios = parseRatios(ratiosResponse.data[0]);
        }
      } catch {
        // Ratios optional, continue without them
      }

      // Detect currency from ticker or profile
      const currency = profile.currency || detectCurrency(ticker);

      return {
        ticker,
        name: profile.companyName || profile.name || ticker,
        price: parseFloat(profile.price) || 0,
        currency,
        ratios: {
          ...ratios,
          PE: ratios.PE, // Profile doesn't have PE usually, rely on ratios endpoint
          MarketCap: parseFloat(profile.mktCap) || parseFloat(profile.marketCap) || ratios.MarketCap,
          Beta: parseFloat(profile.beta) || ratios.Beta,
        },
        source: 'fmp',
        fetchedAt: new Date(),
      };
    } catch (error) {
      attempt++;

      // Enhanced error logging for Axios errors
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          console.error(`FMP 403 Forbidden for ${ticker}. Check FMP_API_KEY. Response:`, error.response.data);
          throw new Error(`FMP API Key Invalid or Quota Exceeded (403). Details: ${JSON.stringify(error.response.data)}`);
        }
      }

      if (attempt >= MAX_RETRIES) {
        throw new Error(
          `Failed to fetch from FMP after ${MAX_RETRIES} attempts: ${(error as Error).message}`
        );
      }

      // Exponential backoff
      const backoff = Math.min(1000 * 2 ** attempt, 10000);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  throw new Error(`Failed to fetch from FMP for ${ticker}`);
}

function parseRatios(data: any): FinancialRatios {
  return {
    PE: parseNumber(data.priceEarningsRatio),
    PB: parseNumber(data.priceToBookRatio),
    PS: parseNumber(data.priceToSalesRatio),
    PEG: parseNumber(data.pegRatio),
    ROE: parseNumber(data.returnOnEquity),
    ROA: parseNumber(data.returnOnAssets),
    ROIC: parseNumber(data.returnOnCapitalEmployed),
    GrossMargin: parseNumber(data.grossProfitMargin),
    OperatingMargin: parseNumber(data.operatingProfitMargin),
    NetMargin: parseNumber(data.netProfitMargin),
    DebtToEquity: parseNumber(data.debtEquityRatio),
    CurrentRatio: parseNumber(data.currentRatio),
    QuickRatio: parseNumber(data.quickRatio),
    DividendYield: parseNumber(data.dividendYield),
    PayoutRatio: parseNumber(data.payoutRatio),
  };
}

function parseNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === 'N/A') {
    return undefined;
  }
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
}

function detectCurrency(ticker: string): string {
  if (ticker.endsWith('.PA') || ticker.endsWith('.DE') || ticker.endsWith('.MI')) {
    return 'EUR';
  }
  if (ticker.endsWith('.L')) {
    return 'GBP';
  }
  return 'USD';
}
