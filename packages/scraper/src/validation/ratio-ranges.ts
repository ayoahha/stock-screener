/**
 * Expected ranges for financial ratios
 *
 * Used for validation of AI-generated data to detect:
 * - Hallucinations (values outside possible ranges)
 * - Data errors
 * - Unit conversion issues
 */

export interface RatioRange {
  min: number;
  max: number;
  required: boolean;
  description?: string;
}

export const RATIO_RANGES: Record<string, RatioRange> = {
  // Valuation Ratios
  PE: {
    min: 0,
    max: 500,
    required: false,
    description: 'Price-to-Earnings ratio. Negative earnings → null'
  },
  PB: {
    min: 0,
    max: 50,
    required: false,
    description: 'Price-to-Book ratio'
  },
  PEG: {
    min: 0,
    max: 10,
    required: false,
    description: 'PEG ratio (PE / growth rate)'
  },
  PS: {
    min: 0,
    max: 100,
    required: false,
    description: 'Price-to-Sales ratio'
  },
  PCF: {
    min: 0,
    max: 100,
    required: false,
    description: 'Price-to-Cash-Flow ratio'
  },
  PFCF: {
    min: 0,
    max: 100,
    required: false,
    description: 'Price-to-Free-Cash-Flow ratio'
  },
  EV_EBITDA: {
    min: 0,
    max: 100,
    required: false,
    description: 'Enterprise Value to EBITDA'
  },

  // Profitability Ratios (as decimals: 0.15 = 15%)
  ROE: {
    min: -1.0,
    max: 2.0,
    required: false,
    description: 'Return on Equity (decimal)'
  },
  ROA: {
    min: -0.5,
    max: 1.0,
    required: false,
    description: 'Return on Assets (decimal)'
  },
  ROIC: {
    min: -0.5,
    max: 1.5,
    required: false,
    description: 'Return on Invested Capital (decimal)'
  },
  GrossMargin: {
    min: 0,
    max: 1.0,
    required: false,
    description: 'Gross Profit Margin (decimal)'
  },
  OperatingMargin: {
    min: -0.5,
    max: 1.0,
    required: false,
    description: 'Operating Margin (decimal)'
  },
  NetMargin: {
    min: -0.5,
    max: 1.0,
    required: false,
    description: 'Net Profit Margin (decimal)'
  },
  FCFMargin: {
    min: -0.5,
    max: 1.0,
    required: false,
    description: 'Free Cash Flow Margin (decimal)'
  },
  CashReturn: {
    min: -0.5,
    max: 1.0,
    required: false,
    description: 'Cash Return on Investment (decimal)'
  },

  // Liquidity Ratios
  CurrentRatio: {
    min: 0,
    max: 10,
    required: false,
    description: 'Current Assets / Current Liabilities'
  },
  QuickRatio: {
    min: 0,
    max: 10,
    required: false,
    description: 'Quick Ratio (Acid Test)'
  },
  CashRatio: {
    min: 0,
    max: 10,
    required: false,
    description: 'Cash / Current Liabilities'
  },

  // Debt Ratios
  DebtToEquity: {
    min: 0,
    max: 15,
    required: false,
    description: 'Total Debt / Total Equity'
  },
  DebtToAssets: {
    min: 0,
    max: 1.0,
    required: false,
    description: 'Total Debt / Total Assets (decimal)'
  },
  DebtToRevenue: {
    min: 0,
    max: 20,
    required: false,
    description: 'Total Debt / Revenue'
  },
  DebtToEBITDA: {
    min: 0,
    max: 20,
    required: false,
    description: 'Total Debt / EBITDA'
  },
  NetDebtToEBITDA: {
    min: -10,
    max: 20,
    required: false,
    description: 'Net Debt / EBITDA (can be negative if cash > debt)'
  },
  InterestCoverage: {
    min: -10,
    max: 100,
    required: false,
    description: 'EBIT / Interest Expense'
  },

  // Efficiency Ratios
  AssetTurnover: {
    min: 0,
    max: 10,
    required: false,
    description: 'Revenue / Total Assets'
  },
  InventoryTurnover: {
    min: 0,
    max: 100,
    required: false,
    description: 'Cost of Goods Sold / Inventory'
  },
  ReceivablesTurnover: {
    min: 0,
    max: 100,
    required: false,
    description: 'Revenue / Accounts Receivable'
  },
  PayablesTurnover: {
    min: 0,
    max: 100,
    required: false,
    description: 'Purchases / Accounts Payable'
  },

  // Growth Ratios (as decimals: 0.15 = 15% growth)
  RevenueGrowth: {
    min: -1.0,
    max: 5.0,
    required: false,
    description: 'YoY Revenue Growth (decimal)'
  },
  EPSGrowth: {
    min: -1.0,
    max: 5.0,
    required: false,
    description: 'YoY EPS Growth (decimal)'
  },
  BookValueGrowth: {
    min: -1.0,
    max: 5.0,
    required: false,
    description: 'YoY Book Value Growth (decimal)'
  },
  IGR: {
    min: -0.5,
    max: 1.0,
    required: false,
    description: 'Internal Growth Rate (decimal)'
  },
  SGR: {
    min: -0.5,
    max: 1.0,
    required: false,
    description: 'Sustainable Growth Rate (decimal)'
  },

  // Dividend Ratios
  DividendYield: {
    min: 0,
    max: 0.25,
    required: false,
    description: 'Annual Dividend / Price (decimal, 0.05 = 5%)'
  },
  PayoutRatio: {
    min: 0,
    max: 2.0,
    required: false,
    description: 'Dividends / Earnings (decimal, can exceed 1.0)'
  },

  // Price and Market Data
  Price: {
    min: 0.01,
    max: 1000000,
    required: true,
    description: 'Current stock price (must be positive)'
  },
  MarketCap: {
    min: 1000000, // $1M minimum
    max: 5000000000000, // $5T maximum
    required: false,
    description: 'Market Capitalization in base currency'
  },
  Beta: {
    min: -5.0,
    max: 5.0,
    required: false,
    description: 'Stock beta (volatility vs market)'
  }
};

/**
 * Check if a ratio value is within acceptable range
 */
export function isWithinRange(ratioName: string, value: number | null | undefined): boolean {
  if (value === null || value === undefined) {
    return true; // Null values are acceptable (missing data)
  }

  const range = RATIO_RANGES[ratioName];
  if (!range) {
    // Unknown ratio, accept it
    return true;
  }

  return value >= range.min && value <= range.max;
}

/**
 * Get validation message for out-of-range value
 */
export function getRangeValidationMessage(ratioName: string, value: number): string {
  const range = RATIO_RANGES[ratioName];
  if (!range) {
    return `Unknown ratio: ${ratioName}`;
  }

  return `${ratioName} value ${value} is outside acceptable range [${range.min}, ${range.max}]. ${range.description || ''}`;
}
