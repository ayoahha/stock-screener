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
import { validatePrice } from './yahoo-query-api';

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
      }).catch((error: Error) => {
        // Check if it's a missing Playwright browsers error
        if (error.message.includes("Executable doesn't exist") || error.message.includes('browserType.launch')) {
          throw new Error(
            'Playwright browsers not installed. Please run: pnpm exec playwright install chromium\n' +
            'This is required for scraping Yahoo Finance data. The installation should have been automatic.\n' +
            'Original error: ' + error.message
          );
        }
        throw error;
      });

      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      const page = await context.newPage();
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Navigate to Yahoo Finance page
      const url = `https://finance.yahoo.com/quote/${ticker}`;
      // Just wait for DOM content, don't wait for specific selectors that might not exist
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });

      // Handle Cookie Consent (EU)
      try {
        const consentButton = await page.$('button[name="agree"], button.accept-all, form[action*="consent"] button[type="submit"]');
        if (consentButton) {
          console.log('Consent modal detected, clicking agree...');
          await consentButton.click();
          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { });
        }
      } catch (e) {
        // Ignore consent errors, maybe it wasn't there
      }

      // Wait for price element to populate with LIVE data (not just DOM load or cached data)
      try {
        console.log('[Price Extraction] Waiting for LIVE price data to load...');

        // Wait for the most specific price element with actual non-zero data
        // Note: Function is executed in browser context, so we use string notation
        await page.waitForFunction(
          `() => {
            // Target the main price element (most specific selector)
            const el = document.querySelector('fin-streamer[data-field="regularMarketPrice"][data-test="qsp-price"]');
            if (!el) return false;

            // Check that element has actual data (not empty/null/zero)
            const value = el.getAttribute('value') || el.getAttribute('data-value');
            if (!value || value === '0' || value === '' || value === 'null') return false;

            // Verify the price is a reasonable number
            const price = parseFloat(value);
            return !isNaN(price) && price > 0 && price < 1000000;
          }`,
          { timeout: 15000, polling: 500 } // Poll every 500ms for up to 15s
        );

        console.log('[Price Extraction] Price element with data detected');

        // Additional wait for any final JavaScript updates
        await page.waitForTimeout(3000); // Increased from 2000

        // Wait for network to settle
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => { });

        console.log('[Price Extraction] Ready to extract price');
      } catch (error) {
        console.warn('[Price Extraction] Timeout waiting for live data, attempting extraction anyway...');
        // Continue anyway - we'll try to extract what we can
      }

      // Extract basic info with robust fallbacks
      const name = await extractCompanyName(page, ticker);
      let price = 0;
      try {
        price = await extractPrice(page, ticker);
      } catch (e) {
        const title = await page.title();
        console.warn(`Failed to extract price for ${ticker}. Page title: "${title}"`);
        throw e;
      }
      const currency = await extractCurrency(ticker);

      // Navigate to statistics page for ratios
      let ratios: FinancialRatios = {};

      // 1. Key Statistics
      try {
        const statsUrl = `https://finance.yahoo.com/quote/${ticker}/key-statistics`;
        await page.goto(statsUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
        await page.waitForTimeout(2000); // Wait for dynamic content
        ratios = await extractRatios(page);
      } catch (error) {
        console.warn(`Failed to fetch key statistics for ${ticker}:`, error);
      }

      // 2. Financials (Income Statement)
      const incomeMap: Record<string, keyof FinancialRatios> = {
        'Total Revenue': 'Revenue',
        'Gross Profit': 'GrossProfit',
        'Operating Income': 'OperatingIncome',
        'Net Income Common Stockholders': 'NetIncome',
        'Interest Expense': 'InterestExpense',
        'EBITDA': 'EBITDA'
      };
      const incomeData = await extractFinancialData(page, ticker, 'financials', incomeMap);
      ratios = { ...ratios, ...incomeData };

      // 3. Balance Sheet
      const balanceMap: Record<string, keyof FinancialRatios> = {
        'Total Assets': 'TotalAssets',
        'Total Liabilities Net Minority Interest': 'TotalLiabilities',
        'Total Equity Gross Minority Interest': 'TotalEquity',
        'Cash And Cash Equivalents': 'CashAndEquivalents',
        'Total Debt': 'TotalDebt',
        'Total Debt Net Minority Interest': 'TotalDebt', // Alternative label
        'Inventory': 'Inventory',
        'Accounts Receivable': 'AccountsReceivable',
        'Accounts Payable': 'AccountsPayable',
        'Working Capital': 'WorkingCapital',
        'Total Current Assets': 'TotalCurrentAssets', // New
        'Total Current Liabilities Net Minority Interest': 'TotalCurrentLiabilities', // New
        'Current Liabilities': 'TotalCurrentLiabilities' // Alternative
      };
      const balanceData = await extractFinancialData(page, ticker, 'balance-sheet', balanceMap);
      ratios = { ...ratios, ...balanceData };

      // 4. Cash Flow
      const cashFlowMap: Record<string, keyof FinancialRatios> = {
        'Operating Cash Flow': 'OperatingCashFlow',
        'Free Cash Flow': 'FreeCashFlow',
        'Capital Expenditure': 'CAPEX',
        'Cash Dividends Paid': 'DividendsPaid'
      };
      const cashFlowData = await extractFinancialData(page, ticker, 'cash-flow', cashFlowMap);
      ratios = { ...ratios, ...cashFlowData };

      // 5. Calculate derived ratios
      ratios = calculateAllRatios(ratios);

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
    // Modern selectors (2024/2025)
    const selectors = [
      '[data-test="quote-header"] h1',
      'section h1',
      'h1.yf-1s1a174',
      'h1'
    ];

    for (const selector of selectors) {
      const element = await page.$(selector);
      if (element) {
        const text = await element.textContent();
        if (text && text.trim()) {
          const cleanName = text.replace(/\s*\([^)]+\)\s*$/, '').trim();
          // Avoid generic titles
          if (cleanName !== 'Yahoo Finance' && cleanName !== 'Finance') {
            return cleanName;
          }
        }
      }
    }

    // Fallback: try to get title
    const title = await page.title();
    if (title) {
      const parts = title.split('(');
      if (parts[0] && parts[0].trim() !== 'Yahoo Finance') {
        return parts[0].trim();
      }
    }

    return ticker;
  } catch {
    return ticker;
  }
}

async function extractPrice(page: Page, ticker: string): Promise<number> {
  try {
    console.log(`[Price Extraction] Starting extraction for ${ticker}`);

    // Use THE MOST SPECIFIC selector to get the primary price element
    // This is the main price displayed at the top of the page
    const primarySelector = 'fin-streamer[data-field="regularMarketPrice"][data-test="qsp-price"]';
    const element = await page.$(primarySelector);

    if (element) {
      console.log(`[Price Extraction] Found primary price element with selector: ${primarySelector}`);

      // Extract all attributes for debugging
      const valueAttr = await element.getAttribute('value');
      const dataValue = await element.getAttribute('data-value');
      const dataSymbol = await element.getAttribute('data-symbol');
      const textContent = await element.textContent();

      console.log(`[Price Debug] Element attributes:`, {
        ticker,
        selector: primarySelector,
        valueAttr,
        dataValue,
        dataSymbol,
        textContent: textContent?.substring(0, 50)
      });

      // PRIORITY 1: 'value' attribute (most frequently updated by Yahoo's JavaScript)
      // Based on logs, this attribute contains the correct live price
      if (valueAttr && valueAttr !== '0' && valueAttr !== '') {
        const price = parseFloat(valueAttr);
        if (!isNaN(price) && validatePrice(price, ticker)) {
          console.log(`[Price Extraction] ✓ SUCCESS: Extracted price ${price} from 'value' attribute`);
          return price;
        } else {
          console.warn(`[Price Extraction] 'value' attribute exists but validation failed: ${price}`);
        }
      }

      // PRIORITY 2: 'data-value' attribute (may contain cached/stale data)
      if (dataValue && dataValue !== '0' && dataValue !== '') {
        const price = parseFloat(dataValue);
        if (!isNaN(price) && validatePrice(price, ticker)) {
          console.log(`[Price Extraction] ✓ SUCCESS: Extracted price ${price} from 'data-value' attribute`);
          return price;
        } else {
          console.warn(`[Price Extraction] 'data-value' attribute exists but validation failed: ${price}`);
        }
      }

      // PRIORITY 3: textContent as fallback (less reliable due to formatting)
      if (textContent) {
        const price = parseFormattedNumber(textContent);
        if (price !== undefined && validatePrice(price, ticker)) {
          console.log(`[Price Extraction] ✓ SUCCESS: Extracted price ${price} from textContent`);
          return price;
        } else {
          console.warn(`[Price Extraction] textContent exists but validation failed: ${price}`);
        }
      }
    } else {
      console.warn(`[Price Extraction] Primary price element NOT found with selector: ${primarySelector}`);

      // Fallback: try less specific selectors
      const fallbackSelectors = [
        'fin-streamer[data-field="regularMarketPrice"]',
        '[data-test="qsp-price"]',
        '.livePrice'
      ];

      for (const selector of fallbackSelectors) {
        console.log(`[Price Extraction] Trying fallback selector: ${selector}`);
        const fallbackElement = await page.$(selector);

        if (fallbackElement) {
          const valueAttr = await fallbackElement.getAttribute('value');
          const dataValue = await fallbackElement.getAttribute('data-value');

          // Try value first, then data-value
          if (valueAttr) {
            const price = parseFloat(valueAttr);
            if (!isNaN(price) && validatePrice(price, ticker)) {
              console.log(`[Price Extraction] ✓ SUCCESS: Extracted price ${price} from fallback selector '${selector}' (value attr)`);
              return price;
            }
          }

          if (dataValue) {
            const price = parseFloat(dataValue);
            if (!isNaN(price) && validatePrice(price, ticker)) {
              console.log(`[Price Extraction] ✓ SUCCESS: Extracted price ${price} from fallback selector '${selector}' (data-value attr)`);
              return price;
            }
          }
        }
      }
    }

    // Regex fallback on whole page source - MATCH TICKER FIRST, then extract price
    console.log('[Price Extraction] DOM extraction failed. Searching page source with regex...');
    const content = await page.content();

    // STRATEGY 1: Find ticker-specific price in JSON structure
    // Yahoo embeds data like: "AAPL":{"regularMarketPrice":{"raw":230.45,"fmt":"230.45"},...}
    // We need to match the SPECIFIC ticker to avoid grabbing prices from trending/related stocks

    // Clean ticker for regex (escape special characters like ^, .)
    const tickerRegexSafe = ticker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Pattern: Look for ticker symbol followed by regularMarketPrice
    // Allows for other JSON properties between ticker and price
    const tickerPriceRegex = new RegExp(
      `"${tickerRegexSafe}"\\s*:\\s*\\{[^}]*?"regularMarketPrice"\\s*:\\s*\\{\\s*"raw"\\s*:\\s*([0-9.]+)`,
      'i'
    );

    const tickerMatch = tickerPriceRegex.exec(content);

    if (tickerMatch && tickerMatch[1]) {
      const price = parseFloat(tickerMatch[1]);
      if (!isNaN(price) && validatePrice(price, ticker)) {
        console.log(`[Price Extraction] ✓ SUCCESS: Extracted ticker-matched price ${price} using regex (ticker: ${ticker})`);
        return price;
      } else {
        console.warn(`[Price Extraction] Found ticker-matched price ${price} but validation failed`);
      }
    }

    // STRATEGY 2: If ticker match fails, try finding symbol in quote context
    // Pattern: "symbol":"AAPL" ... "regularMarketPrice":{"raw":123.45
    const symbolContextRegex = new RegExp(
      `"symbol"\\s*:\\s*"${tickerRegexSafe}"[^}]*?\\{[^}]*?"regularMarketPrice"\\s*:\\s*\\{\\s*"raw"\\s*:\\s*([0-9.]+)`,
      'i'
    );

    const symbolMatch = symbolContextRegex.exec(content);

    if (symbolMatch && symbolMatch[1]) {
      const price = parseFloat(symbolMatch[1]);
      if (!isNaN(price) && validatePrice(price, ticker)) {
        console.log(`[Price Extraction] ✓ SUCCESS: Extracted symbol-matched price ${price} using regex (symbol: ${ticker})`);
        return price;
      } else {
        console.warn(`[Price Extraction] Found symbol-matched price ${price} but validation failed`);
      }
    }

    // STRATEGY 3: Last resort - collect all prices but LOG WARNING
    // This is unreliable and should rarely be used
    console.warn(`[Price Extraction] WARNING: Could not find ticker-specific price, falling back to generic price extraction (unreliable)`);

    const priceRegex = /"regularMarketPrice":\s*\{\s*"raw"\s*:\s*([0-9.]+)/g;
    const allMatches: number[] = [];
    let match;

    while ((match = priceRegex.exec(content)) !== null) {
      const price = parseFloat(match[1] || '0');
      if (!isNaN(price) && price > 0) {
        allMatches.push(price);
        console.log(`[Price Debug] Found regularMarketPrice in JSON: ${price}`);
      }
    }

    console.log(`[Price Extraction] Found ${allMatches.length} price values in page source`);

    // If we found prices, use the FIRST VALID one (most likely to be current/live)
    if (allMatches.length > 0) {
      // Filter out invalid prices using validation
      const validPrices = allMatches.filter(p => validatePrice(p, ticker));

      if (validPrices.length > 0) {
        const price = validPrices[0];
        if (price === undefined) {
          throw new Error('Failed to extract valid price after filtering');
        }
        console.warn(`[Price Extraction] ⚠ FALLBACK: Using first valid price ${price} (of ${validPrices.length} matches) - may be inaccurate!`);
        if (validPrices.length > 1) {
          console.log(`[Price Debug] Other valid prices found (discarded): ${validPrices.slice(1).join(', ')}`);
        }
        return price;
      } else {
        console.error(`[Price Extraction] ✗ FAIL: Found ${allMatches.length} prices but none passed validation: ${allMatches.join(', ')}`);
        throw new Error(`Price validation failed - found suspicious values: ${allMatches.join(', ')}`);
      }
    }

    throw new Error('Price not found after waiting for JavaScript - no valid price data in page');
  } catch (error) {
    throw new Error(`Failed to extract price: ${(error as Error).message}`);
  }
}

/**
 * Parse a formatted number that might use commas, spaces, or other separators
 * Handles both US format (1,234.56) and EU format (1.234,56 or 1 234,56)
 */
function parseFormattedNumber(text: string): number | undefined {
  if (!text || text === 'N/A' || text === '—' || text === '-') {
    return undefined;
  }

  // Remove currency symbols, letters, and extra whitespace
  let cleaned = text.replace(/[^\d.,\s-]/g, '').trim();

  if (!cleaned) return undefined;

  // Detect format by looking at the last separator
  // If last separator is comma, it's likely EU format (decimal comma)
  // If last separator is dot, it's likely US format (decimal dot)
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma > lastDot) {
    // EU format: 1.234,56 or 1 234,56 -> convert to US format
    cleaned = cleaned.replace(/[\s.]/g, '').replace(',', '.');
  } else {
    // US format: 1,234.56 -> remove commas
    cleaned = cleaned.replace(/[,\s]/g, '');
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

async function extractCurrency(ticker: string): Promise<string> {
  // Infer from ticker suffix - most reliable method
  if (ticker.endsWith('.PA') || ticker.endsWith('.DE') || ticker.endsWith('.MI') || ticker.endsWith('.AS')) {
    return 'EUR';
  }
  if (ticker.endsWith('.L')) {
    return 'GBP';
  }
  if (ticker.endsWith('.TO')) {
    return 'CAD';
  }

  // Default to USD
  return 'USD';
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

  // Handle percentage values
  if (text.includes('%')) {
    const num = parseFormattedNumber(text.replace('%', ''));
    return num !== undefined ? num / 100 : undefined;
  }

  return parseFormattedNumber(text);
}

function parseMarketCap(text: string): number | undefined {
  if (!text || text === 'N/A') return undefined;

  const multipliers: Record<string, number> = {
    T: 1_000_000_000_000,
    B: 1_000_000_000,
    M: 1_000_000,
    K: 1_000,
  };

  // Check for T/B/M/K suffix (common in financial data)
  const match = text.match(/([0-9.,\s]+)([TBMK])/i);
  if (match && match[1] && match[2]) {
    const value = parseFormattedNumber(match[1]);
    const multiplier = multipliers[match[2].toUpperCase()];
    if (value !== undefined && multiplier !== undefined) {
      return value * multiplier;
    }
  }

  // No multiplier, parse as regular number
  return parseFormattedNumber(text);
}

async function extractFinancialData(page: Page, ticker: string, tab: string, labelMap: Record<string, keyof FinancialRatios>): Promise<Partial<FinancialRatios>> {
  const data: Partial<FinancialRatios> = {};
  try {
    const url = `https://finance.yahoo.com/quote/${ticker}/${tab}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    try {
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => { });
    } catch { }

    // Yahoo Finance Financials Table Selectors
    // They use div structures now mostly
    const rows = await page.$$('.tableBody .row, div[data-test="fin-row"], tr');

    for (const row of rows) {
      const labelEl = await row.$('.rowTitle, div[class*="title"], td:first-child');
      const valueEl = await row.$('.rowValue, div[class*="column"]:last-child, td:last-child');

      if (labelEl && valueEl) {
        const labelText = (await labelEl.textContent())?.trim();
        const valueText = (await valueEl.textContent())?.trim();

        if (labelText && valueText && labelMap[labelText]) {
          const key = labelMap[labelText];
          const value = parseMarketCap(valueText); // Reuse parseMarketCap as it handles K, M, B, T
          if (value !== undefined) {
            data[key] = value;
          }
        }
      }
    }
  } catch (e) {
    console.warn(`Failed to extract ${tab} for ${ticker}:`, e);
  }
  return data;
}

function calculateAllRatios(ratios: FinancialRatios): FinancialRatios {
  const r = { ...ratios };

  // Helper to safe divide
  const div = (n: number | undefined, d: number | undefined) => (n !== undefined && d !== undefined && d !== 0) ? n / d : undefined;

  // --- Valuation ---
  // PEG = PE / Growth
  if (!r.PEG && r.PE && r.EPSGrowth) {
    r.PEG = div(r.PE, r.EPSGrowth * 100); // EPSGrowth is usually 0.15 for 15%
  }

  // PTB (Price to Book) = Price / BookValuePerShare = MarketCap / TotalEquity
  if (!r.PB && r.MarketCap && r.TotalEquity) {
    r.PB = div(r.MarketCap, r.TotalEquity);
  }

  // PS (Price to Sales) = MarketCap / Revenue
  if (!r.PS && r.MarketCap && r.Revenue) {
    r.PS = div(r.MarketCap, r.Revenue);
  }

  // PCF (Price to Cash Flow) = MarketCap / OperatingCashFlow
  if (!r.PCF && r.MarketCap && r.OperatingCashFlow) {
    r.PCF = div(r.MarketCap, r.OperatingCashFlow);
  }

  // PFCF (Price to Free Cash Flow) = MarketCap / FreeCashFlow
  if (!r.PFCF && r.MarketCap && r.FreeCashFlow) {
    r.PFCF = div(r.MarketCap, r.FreeCashFlow);
  }

  // EV/EBITDA
  // EV = MarketCap + TotalDebt - Cash
  if (!r.EV_EBITDA && r.MarketCap && r.TotalDebt && r.CashAndEquivalents && r.EBITDA) {
    const ev = r.MarketCap + r.TotalDebt - r.CashAndEquivalents;
    r.EV_EBITDA = div(ev, r.EBITDA);
  }

  // --- Profitability ---
  // Gross Margin = Gross Profit / Revenue
  if (!r.GrossMargin && r.GrossProfit && r.Revenue) {
    r.GrossMargin = div(r.GrossProfit, r.Revenue);
  }

  // Operating Margin = Operating Income / Revenue
  if (!r.OperatingMargin && r.OperatingIncome && r.Revenue) {
    r.OperatingMargin = div(r.OperatingIncome, r.Revenue);
  }

  // Net Margin = Net Income / Revenue
  if (!r.NetMargin && r.NetIncome && r.Revenue) {
    r.NetMargin = div(r.NetIncome, r.Revenue);
  }

  // FCF Margin = FCF / Revenue
  if (!r.FCFMargin && r.FreeCashFlow && r.Revenue) {
    r.FCFMargin = div(r.FreeCashFlow, r.Revenue);
  }

  // ROA = Net Income / Total Assets
  if (!r.ROA && r.NetIncome && r.TotalAssets) {
    r.ROA = div(r.NetIncome, r.TotalAssets);
  }

  // ROE = Net Income / Total Equity
  if (!r.ROE && r.NetIncome && r.TotalEquity) {
    r.ROE = div(r.NetIncome, r.TotalEquity);
  }

  // ROIC = NOPAT / Invested Capital
  // NOPAT = EBIT * (1 - TaxRate). Approx TaxRate 25% or derive?
  // Invested Capital = Total Equity + Total Debt - Cash
  if (!r.ROIC && r.OperatingIncome && r.TotalEquity && r.TotalDebt && r.CashAndEquivalents) {
    const nopat = r.OperatingIncome * 0.75; // Approx 25% tax
    const investedCapital = r.TotalEquity + r.TotalDebt - r.CashAndEquivalents;
    r.ROIC = div(nopat, investedCapital);
  }

  // Cash Return = (FCF + Net Interest) / EV
  if (!r.CashReturn && r.FreeCashFlow && r.InterestExpense && r.MarketCap && r.TotalDebt && r.CashAndEquivalents) {
    const ev = r.MarketCap + r.TotalDebt - r.CashAndEquivalents;
    r.CashReturn = div(r.FreeCashFlow + r.InterestExpense, ev);
  }

  // --- Liquidity ---
  // Current Ratio = Current Assets / Current Liabilities
  if (!r.CurrentRatio && r.TotalCurrentAssets && r.TotalCurrentLiabilities) {
    r.CurrentRatio = div(r.TotalCurrentAssets, r.TotalCurrentLiabilities);
  }

  // Quick Ratio = (Cash + Receivables) / Current Liabilities
  // Or (Current Assets - Inventory) / Current Liabilities
  if (!r.QuickRatio && r.TotalCurrentAssets && r.Inventory && r.TotalCurrentLiabilities) {
    r.QuickRatio = div(r.TotalCurrentAssets - r.Inventory, r.TotalCurrentLiabilities);
  } else if (!r.QuickRatio && r.CashAndEquivalents && r.AccountsReceivable && r.TotalCurrentLiabilities) {
    r.QuickRatio = div(r.CashAndEquivalents + r.AccountsReceivable, r.TotalCurrentLiabilities);
  }

  // Cash Ratio = Cash / Current Liabilities
  if (!r.CashRatio && r.CashAndEquivalents && r.TotalCurrentLiabilities) {
    r.CashRatio = div(r.CashAndEquivalents, r.TotalCurrentLiabilities);
  }

  // --- Debt ---
  // Debt to Equity = Total Debt / Total Equity
  if (!r.DebtToEquity && r.TotalDebt && r.TotalEquity) {
    r.DebtToEquity = div(r.TotalDebt, r.TotalEquity);
  }

  // Debt to EBITDA
  if (!r.DebtToEBITDA && r.TotalDebt && r.EBITDA) {
    r.DebtToEBITDA = div(r.TotalDebt, r.EBITDA);
  }

  // Interest Coverage = EBIT / Interest Expense
  if (!r.InterestCoverage && r.OperatingIncome && r.InterestExpense) {
    r.InterestCoverage = div(r.OperatingIncome, r.InterestExpense);
  }

  // --- Efficiency ---
  // Asset Turnover = Revenue / Total Assets
  if (!r.AssetTurnover && r.Revenue && r.TotalAssets) {
    r.AssetTurnover = div(r.Revenue, r.TotalAssets);
  }

  // --- Growth ---
  // IGR = ROA * b / (1 - ROA * b) where b is retention ratio (1 - payout)
  if (!r.IGR && r.ROA && r.PayoutRatio !== undefined) {
    const b = 1 - r.PayoutRatio;
    const roa = r.ROA; // Assuming ROA is decimal
    r.IGR = div(roa * b, 1 - roa * b);
  }

  // SGR = ROE * b / (1 - ROE * b)
  if (!r.SGR && r.ROE && r.PayoutRatio !== undefined) {
    const b = 1 - r.PayoutRatio;
    const roe = r.ROE;
    r.SGR = div(roe * b, 1 - roe * b);
  }

  return r;
}
