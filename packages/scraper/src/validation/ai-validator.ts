/**
 * AI Data Validation Framework
 *
 * Implements 4-level strict validation for AI-generated financial data:
 * 1. Range Validation: Check if ratios are within acceptable bounds
 * 2. Cross-Ratio Consistency: Verify mathematical relationships
 * 3. Ticker-Specific Rules: Currency, price reasonableness
 * 4. Confidence Scoring: Calculate final confidence based on all checks
 *
 * Strict Mode: Reject data if final confidence < 80%
 */

import type { FinancialRatios } from '../index';
import type { AIStockData } from '../providers/ai-provider';
import { isWithinRange, getRangeValidationMessage, RATIO_RANGES } from './ratio-ranges';

export interface ValidationResult {
  isValid: boolean;
  finalConfidence: number;
  warnings: string[];
  errors: string[];
  ratiosWithIssues: string[];
  shouldAccept: boolean; // true if finalConfidence >= 0.80
}

/**
 * Validate AI-generated stock data (strict mode)
 */
export function validateAIData(data: AIStockData, ticker: string): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const ratiosWithIssues: string[] = [];

  // Level 1: Range Validation
  const rangeResults = validateRanges(data, ticker);
  warnings.push(...rangeResults.warnings);
  errors.push(...rangeResults.errors);
  ratiosWithIssues.push(...rangeResults.ratiosWithIssues);

  // Level 2: Cross-Ratio Consistency
  const consistencyResults = validateConsistency(data.ratios);
  warnings.push(...consistencyResults.warnings);
  errors.push(...consistencyResults.errors);

  // Level 3: Ticker-Specific Rules
  const tickerResults = validateTickerSpecific(ticker, data);
  warnings.push(...tickerResults.warnings);
  errors.push(...tickerResults.errors);

  // Level 4: Calculate Final Confidence
  const finalConfidence = calculateConfidence(data, warnings, errors);

  // Strict Mode: Accept only if confidence >= 0.80
  const STRICT_THRESHOLD = 0.80;
  const shouldAccept = finalConfidence >= STRICT_THRESHOLD;

  return {
    isValid: errors.length === 0,
    finalConfidence,
    warnings,
    errors,
    ratiosWithIssues,
    shouldAccept
  };
}

/**
 * Level 1: Range Validation
 */
function validateRanges(data: AIStockData, _ticker: string): {
  warnings: string[];
  errors: string[];
  ratiosWithIssues: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  const ratiosWithIssues: string[] = [];

  // Check price (required)
  if (!data.price || data.price <= 0) {
    errors.push('Price is required and must be > 0');
    ratiosWithIssues.push('Price');
  } else if (!isWithinRange('Price', data.price)) {
    errors.push(getRangeValidationMessage('Price', data.price));
    ratiosWithIssues.push('Price');
  }

  // Check all ratios
  for (const [key, value] of Object.entries(data.ratios)) {
    if (value !== null && value !== undefined && !isWithinRange(key, value)) {
      const range = RATIO_RANGES[key];
      if (range?.required) {
        errors.push(getRangeValidationMessage(key, value));
      } else {
        warnings.push(getRangeValidationMessage(key, value));
      }
      ratiosWithIssues.push(key);
    }
  }

  return { warnings, errors, ratiosWithIssues };
}

/**
 * Level 2: Cross-Ratio Consistency
 */
function validateConsistency(ratios: FinancialRatios): {
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check 1: ROE consistency with NetMargin
  // If ROE is very high but NetMargin is low, something's suspicious
  if (ratios.ROE && ratios.NetMargin) {
    if (ratios.ROE > 0.25 && ratios.NetMargin < 0.05) {
      warnings.push(`ROE (${(ratios.ROE * 100).toFixed(1)}%) inconsistent with low NetMargin (${(ratios.NetMargin * 100).toFixed(1)}%)`);
    }
  }

  // Check 2: PEG ratio consistency
  // PEG should be approximately PE / (EPSGrowth * 100)
  if (ratios.PEG && ratios.PE && ratios.EPSGrowth) {
    const expectedPEG = ratios.PE / (ratios.EPSGrowth * 100);
    const deviation = Math.abs(ratios.PEG - expectedPEG) / (expectedPEG || 1);
    if (deviation > 0.3) {
      warnings.push(`PEG (${ratios.PEG.toFixed(2)}) inconsistent with PE (${ratios.PE.toFixed(1)}) and EPSGrowth (${(ratios.EPSGrowth * 100).toFixed(1)}%)`);
    }
  }

  // Check 3: Current ratio vs Quick ratio
  // Current ratio should always be >= Quick ratio
  if (ratios.CurrentRatio && ratios.QuickRatio) {
    if (ratios.QuickRatio > ratios.CurrentRatio) {
      errors.push(`Quick ratio (${ratios.QuickRatio.toFixed(2)}) cannot exceed Current ratio (${ratios.CurrentRatio.toFixed(2)})`);
    }
  }

  // Check 4: Margin hierarchy
  // Gross Margin >= Operating Margin >= Net Margin
  if (ratios.GrossMargin && ratios.OperatingMargin) {
    if (ratios.OperatingMargin > ratios.GrossMargin) {
      warnings.push(`Operating margin (${(ratios.OperatingMargin * 100).toFixed(1)}%) exceeds gross margin (${(ratios.GrossMargin * 100).toFixed(1)}%)`);
    }
  }
  if (ratios.OperatingMargin && ratios.NetMargin) {
    if (ratios.NetMargin > ratios.OperatingMargin) {
      warnings.push(`Net margin (${(ratios.NetMargin * 100).toFixed(1)}%) exceeds operating margin (${(ratios.OperatingMargin * 100).toFixed(1)}%)`);
    }
  }

  // Check 5: Dividend payout vs yield
  // If payout ratio is 0, dividend yield should also be 0
  if (ratios.PayoutRatio === 0 && ratios.DividendYield && ratios.DividendYield > 0.001) {
    warnings.push(`Dividend yield (${(ratios.DividendYield * 100).toFixed(2)}%) present despite 0% payout ratio`);
  }

  return { warnings, errors };
}

/**
 * Level 3: Ticker-Specific Rules
 */
function validateTickerSpecific(ticker: string, data: AIStockData): {
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Currency validation based on ticker suffix
  const expectedCurrency = getExpectedCurrency(ticker);
  if (data.currency !== expectedCurrency) {
    warnings.push(`Currency ${data.currency} unexpected for ticker ${ticker} (expected ${expectedCurrency})`);
  }

  // Price reasonableness for European stocks
  if (ticker.endsWith('.PA') || ticker.endsWith('.DE')) {
    // European stocks rarely exceed 1000 EUR
    if (data.price > 1000) {
      warnings.push(`Price ${data.price} ${data.currency} seems unusually high for European stock`);
    }
  }

  // Very low prices might indicate unit errors (cents vs dollars)
  if (data.price < 0.1 && !ticker.includes('PENNY')) {
    warnings.push(`Price ${data.price} ${data.currency} seems unusually low - possible unit error?`);
  }

  // Data freshness check
  if (data.dataDate) {
    const dataAge = Date.now() - new Date(data.dataDate).getTime();
    const daysOld = dataAge / (1000 * 60 * 60 * 24);

    if (daysOld > 90) {
      warnings.push(`Data is ${Math.floor(daysOld)} days old (data date: ${data.dataDate})`);
    }

    if (daysOld > 180) {
      errors.push(`Data is stale (${Math.floor(daysOld)} days old) - rejecting`);
    }

    // Check if data date is in the future
    if (daysOld < 0) {
      errors.push(`Data date ${data.dataDate} is in the future - invalid`);
    }
  }

  return { warnings, errors };
}

/**
 * Level 4: Calculate Final Confidence Score
 */
function calculateConfidence(
  data: AIStockData,
  warnings: string[],
  errors: string[]
): number {
  let confidence = data.confidence || 0.5; // Start with AI's self-assessment

  // Major penalties for errors
  confidence -= errors.length * 0.15; // -15% per error

  // Minor penalties for warnings
  confidence -= warnings.length * 0.05; // -5% per warning

  // Data completeness bonus
  const totalExpectedRatios = 20; // Core ratios we expect
  const providedRatios = Object.values(data.ratios).filter(v => v !== null && v !== undefined).length;
  const completeness = providedRatios / totalExpectedRatios;

  // Adjust confidence based on completeness
  // If less than 50% complete, penalize
  if (completeness < 0.5) {
    confidence -= (0.5 - completeness); // Up to -50%
  }

  // Data freshness bonus/penalty
  if (data.dataDate) {
    const currentYear = new Date().getFullYear();
    const dataYear = new Date(data.dataDate).getFullYear();

    if (dataYear === currentYear) {
      // Current year data: +5% bonus
      confidence += 0.05;
    } else if (dataYear === currentYear - 1) {
      // Last year data: acceptable, no change
    } else {
      // Older data: -10% penalty
      confidence -= 0.10;
    }
  }

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Get expected currency based on ticker suffix
 */
function getExpectedCurrency(ticker: string): string {
  if (ticker.endsWith('.PA') || ticker.endsWith('.DE') || ticker.endsWith('.MI') || ticker.endsWith('.AS')) {
    return 'EUR';
  }
  if (ticker.endsWith('.L')) {
    return 'GBP';
  }
  if (ticker.endsWith('.TO')) {
    return 'CAD';
  }
  if (ticker.endsWith('.HK')) {
    return 'HKD';
  }
  return 'USD'; // Default
}
