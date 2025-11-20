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

  const apiKey = process.env.FMP_API_KEY || 'demo';

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      // Fetch quote data
      const quoteUrl = `${FMP_BASE_URL}/quote/${ticker}?apikey=${apiKey}`;
      const quoteResponse = await axios.get(quoteUrl, { timeout: 10000 });

      if (!quoteResponse.data || quoteResponse.data.length === 0) {
        throw new Error(`No data found for ticker: ${ticker}`);
      }

      const quote = quoteResponse.data[0];

      // Fetch ratios
      const ratiosUrl = `${FMP_BASE_URL}/ratios/${ticker}?apikey=${apiKey}`;
      let ratios: FinancialRatios = {};

      try {
        const ratiosResponse = await axios.get(ratiosUrl, { timeout: 10000 });
        if (ratiosResponse.data && ratiosResponse.data.length > 0) {
          ratios = parseRatios(ratiosResponse.data[0]);
        }
      } catch {
        // Ratios optional, continue without them
      }

      // Detect currency from ticker
      const currency = detectCurrency(ticker);

      return {
        ticker,
        name: quote.name || ticker,
        price: parseFloat(quote.price) || 0,
        currency,
        ratios: {
          ...ratios,
          PE: quote.pe || ratios.PE,
          MarketCap: quote.marketCap || ratios.MarketCap,
          Beta: quote.beta || ratios.Beta,
        },
        source: 'fmp',
        fetchedAt: new Date(),
      };
    } catch (error) {
      attempt++;
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
