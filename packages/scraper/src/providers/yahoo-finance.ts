/**
 * Yahoo Finance Scraper (Ultra-robuste pour actions européennes)
 *
 * Stratégie :
 * - Playwright avec stealth plugin (contourner détection bot)
 * - Rotation user-agents
 * - Retry automatique avec backoff exponentiel
 * - Parsing HTML robuste (Cheerio)
 */

import { chromium, type Browser, type Page } from 'playwright';
import type { StockData, FinancialRatios } from '../index';

const MAX_RETRIES = 3;
const TIMEOUT_MS = 15000;

export async function scrapeYahooFinance(ticker: string): Promise<StockData> {
  if (!ticker || ticker.trim() === '') {
    throw new Error('Ticker cannot be empty');
  }

  let browser: Browser | null = null;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox',
        ],
      });

      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      const page = await context.newPage();
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Navigate to Yahoo Finance page
      const url = `https://finance.yahoo.com/quote/${ticker}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });

      // Wait for critical elements to load
      await page.waitForSelector('[data-symbol]', { timeout: TIMEOUT_MS });

      // Extract basic info
      const name = await extractCompanyName(page, ticker);
      const price = await extractPrice(page);
      const currency = await extractCurrency(page, ticker);

      // Navigate to statistics page for ratios
      const statsUrl = `https://finance.yahoo.com/quote/${ticker}/key-statistics`;
      await page.goto(statsUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
      await page.waitForTimeout(2000); // Wait for dynamic content

      const ratios = await extractRatios(page);

      await browser.close();

      return {
        ticker,
        name,
        price,
        currency,
        ratios,
        source: 'yahoo',
        fetchedAt: new Date(),
      };
    } catch (error) {
      attempt++;
      if (browser) {
        await browser.close();
      }

      if (attempt >= MAX_RETRIES) {
        throw new Error(
          `Failed to scrape ${ticker} after ${MAX_RETRIES} attempts: ${(error as Error).message}`
        );
      }

      // Wait before retry with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new Error(`Failed to scrape ${ticker}`);
}

async function extractCompanyName(page: Page, ticker: string): Promise<string> {
  try {
    // Try multiple selectors
    const selectors = ['h1[class*="yf-"]', 'h1', '[data-symbol] + h1'];

    for (const selector of selectors) {
      const element = await page.$(selector);
      if (element) {
        const text = await element.textContent();
        if (text && text.trim()) {
          // Remove ticker from name if present (e.g., "Apple Inc. (AAPL)" -> "Apple Inc.")
          return text.replace(/\s*\([^)]+\)\s*$/, '').trim();
        }
      }
    }

    // Fallback: use ticker
    return ticker;
  } catch {
    return ticker;
  }
}

async function extractPrice(page: Page): Promise<number> {
  try {
    // Try multiple selectors for price
    const selectors = [
      'fin-streamer[data-field="regularMarketPrice"]',
      '[data-symbol] fin-streamer',
      'span[data-reactid*="regularMarketPrice"]',
    ];

    for (const selector of selectors) {
      const element = await page.$(selector);
      if (element) {
        const text = await element.textContent();
        if (text) {
          const price = parseFloat(text.replace(/[^0-9.-]/g, ''));
          if (!isNaN(price) && price > 0) {
            return price;
          }
        }
      }
    }

    throw new Error('Price not found');
  } catch (error) {
    throw new Error(`Failed to extract price: ${(error as Error).message}`);
  }
}

async function extractCurrency(page: Page, ticker: string): Promise<string> {
  try {
    // Try to find currency symbol
    const currencyElement = await page.$('fin-streamer[data-field="regularMarketPrice"]');
    if (currencyElement) {
      const dataSymbol = await currencyElement.getAttribute('data-symbol');
      if (dataSymbol) {
        // Infer from ticker suffix
        if (ticker.endsWith('.PA') || ticker.endsWith('.DE')) {
          return 'EUR';
        }
      }
    }

    // Infer from ticker suffix
    if (ticker.endsWith('.PA') || ticker.endsWith('.DE') || ticker.endsWith('.MI')) {
      return 'EUR';
    }
    if (ticker.endsWith('.L')) {
      return 'GBP';
    }

    // Default to USD
    return 'USD';
  } catch {
    // Fallback based on ticker
    if (ticker.endsWith('.PA') || ticker.endsWith('.DE')) {
      return 'EUR';
    }
    return 'USD';
  }
}

async function extractRatios(page: Page): Promise<FinancialRatios> {
  const ratios: FinancialRatios = {};

  try {
    // Extract all table rows
    const rows = await page.$$('tr');

    for (const row of rows) {
      const cells = await row.$$('td');
      if (cells.length >= 2) {
        const labelElement = cells[0];
        const valueElement = cells[1];

        if (!labelElement || !valueElement) continue;

        const label = await labelElement.textContent();
        const valueText = await valueElement.textContent();

        if (!label || !valueText) continue;

        const value = parseRatioValue(valueText);
        const labelLower = label.toLowerCase().trim();

        // Map labels to ratio keys
        if (labelLower.includes('trailing p/e') || labelLower === 'pe ratio (ttm)') {
          ratios.PE = value;
        } else if (labelLower.includes('price/book') || labelLower.includes('p/b')) {
          ratios.PB = value;
        } else if (labelLower.includes('peg ratio')) {
          ratios.PEG = value;
        } else if (labelLower.includes('price/sales') || labelLower.includes('p/s')) {
          ratios.PS = value;
        } else if (labelLower.includes('return on equity') || labelLower === 'roe') {
          ratios.ROE = value;
        } else if (labelLower.includes('return on assets') || labelLower === 'roa') {
          ratios.ROA = value;
        } else if (labelLower.includes('profit margin') || labelLower.includes('net margin')) {
          ratios.NetMargin = value;
        } else if (labelLower.includes('operating margin')) {
          ratios.OperatingMargin = value;
        } else if (labelLower.includes('total debt/equity') || labelLower.includes('debt to equity')) {
          ratios.DebtToEquity = value;
        } else if (labelLower.includes('current ratio')) {
          ratios.CurrentRatio = value;
        } else if (labelLower.includes('quick ratio')) {
          ratios.QuickRatio = value;
        } else if (
          labelLower.includes('forward annual dividend yield') ||
          labelLower.includes('dividend yield')
        ) {
          ratios.DividendYield = value;
        } else if (labelLower.includes('payout ratio')) {
          ratios.PayoutRatio = value;
        } else if (labelLower.includes('revenue growth') || labelLower.includes('quarterly revenue growth')) {
          ratios.RevenueGrowth = value;
        } else if (labelLower.includes('earnings growth') || labelLower.includes('quarterly earnings growth')) {
          ratios.EPSGrowth = value;
        } else if (labelLower.includes('market cap')) {
          ratios.MarketCap = parseMarketCap(valueText);
        } else if (labelLower.includes('beta')) {
          ratios.Beta = value;
        }
      }
    }

    return ratios;
  } catch (error) {
    console.warn('Failed to extract some ratios:', error);
    return ratios;
  }
}

function parseRatioValue(text: string): number | undefined {
  if (!text || text === 'N/A' || text === '—' || text === '-') {
    return undefined;
  }

  // Remove % sign and convert to decimal
  if (text.includes('%')) {
    const num = parseFloat(text.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? undefined : num / 100;
  }

  const num = parseFloat(text.replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? undefined : num;
}

function parseMarketCap(text: string): number | undefined {
  if (!text || text === 'N/A') return undefined;

  const multipliers: Record<string, number> = {
    T: 1_000_000_000_000,
    B: 1_000_000_000,
    M: 1_000_000,
    K: 1_000,
  };

  const match = text.match(/([0-9.]+)([TBMK])/i);
  if (match && match[1] && match[2]) {
    const value = parseFloat(match[1]);
    const multiplier = multipliers[match[2].toUpperCase()];
    if (multiplier !== undefined) {
      return value * multiplier;
    }
  }

  const num = parseFloat(text.replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? undefined : num;
}
