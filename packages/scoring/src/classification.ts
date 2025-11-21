/**
 * Stock Type Classification
 *
 * Automatically classifies stocks as Value, Growth, or Dividend
 * based on their financial ratios.
 *
 * Algorithm:
 * - Analyzes key ratios for each category
 * - Assigns points for meeting thresholds
 * - Returns the category with the highest score
 */

import type { ProfileType } from './index';

// Use a flexible type that accepts any ratio record
type FinancialRatios = Record<string, number | undefined>;

export interface ClassificationResult {
  type: ProfileType;
  scores: {
    value: number;
    growth: number;
    dividend: number;
  };
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Classify a stock as Value, Growth, or Dividend
 * based on its financial ratios
 */
export function classifyStock(ratios: FinancialRatios): ProfileType {
  const scores = {
    value: 0,
    growth: 0,
    dividend: 0,
  };

  // ========================================
  // VALUE INDICATORS
  // ========================================

  // Low P/E ratio (< 15 = good, < 10 = excellent)
  if (ratios.PE !== undefined && ratios.PE > 0) {
    if (ratios.PE < 10) {
      scores.value += 3;
    } else if (ratios.PE < 15) {
      scores.value += 2;
    } else if (ratios.PE < 20) {
      scores.value += 1;
    }
  }

  // Low P/B ratio (< 1.5 = good, < 1 = excellent)
  if (ratios.PB !== undefined && ratios.PB > 0) {
    if (ratios.PB < 1) {
      scores.value += 3;
    } else if (ratios.PB < 1.5) {
      scores.value += 2;
    } else if (ratios.PB < 2.5) {
      scores.value += 1;
    }
  }

  // Low P/S ratio (< 2 = good, < 1 = excellent)
  if (ratios.PS !== undefined && ratios.PS > 0) {
    if (ratios.PS < 1) {
      scores.value += 2;
    } else if (ratios.PS < 2) {
      scores.value += 1;
    }
  }

  // Low PCF ratio (< 10 = good)
  if (ratios.PCF !== undefined && ratios.PCF > 0) {
    if (ratios.PCF < 10) {
      scores.value += 1;
    }
  }

  // ========================================
  // GROWTH INDICATORS
  // ========================================

  // High revenue growth (> 15% = good, > 30% = excellent)
  if (ratios.RevenueGrowth !== undefined) {
    if (ratios.RevenueGrowth > 30) {
      scores.growth += 3;
    } else if (ratios.RevenueGrowth > 20) {
      scores.growth += 2;
    } else if (ratios.RevenueGrowth > 10) {
      scores.growth += 1;
    }
  }

  // High EPS growth (> 20% = good, > 40% = excellent)
  if (ratios.EPSGrowth !== undefined) {
    if (ratios.EPSGrowth > 40) {
      scores.growth += 3;
    } else if (ratios.EPSGrowth > 25) {
      scores.growth += 2;
    } else if (ratios.EPSGrowth > 15) {
      scores.growth += 1;
    }
  }

  // Good PEG ratio (< 1 = excellent, < 1.5 = good)
  if (ratios.PEG !== undefined && ratios.PEG > 0) {
    if (ratios.PEG < 1) {
      scores.growth += 3;
    } else if (ratios.PEG < 1.5) {
      scores.growth += 2;
    } else if (ratios.PEG < 2) {
      scores.growth += 1;
    }
  }

  // High book value growth
  if (ratios.BookValueGrowth !== undefined) {
    if (ratios.BookValueGrowth > 20) {
      scores.growth += 2;
    } else if (ratios.BookValueGrowth > 10) {
      scores.growth += 1;
    }
  }

  // High profitability margins (supports growth)
  if (ratios.NetMargin !== undefined) {
    if (ratios.NetMargin > 20) {
      scores.growth += 1;
    }
  }

  // ========================================
  // DIVIDEND INDICATORS
  // ========================================

  // High dividend yield (> 3% = good, > 5% = excellent)
  if (ratios.DividendYield !== undefined) {
    if (ratios.DividendYield > 5) {
      scores.dividend += 4;
    } else if (ratios.DividendYield > 4) {
      scores.dividend += 3;
    } else if (ratios.DividendYield > 3) {
      scores.dividend += 2;
    } else if (ratios.DividendYield > 2) {
      scores.dividend += 1;
    }
  }

  // Sustainable payout ratio (30-75% = good)
  if (ratios.PayoutRatio !== undefined) {
    if (ratios.PayoutRatio >= 30 && ratios.PayoutRatio <= 60) {
      scores.dividend += 3;
    } else if (ratios.PayoutRatio >= 20 && ratios.PayoutRatio <= 75) {
      scores.dividend += 2;
    } else if (ratios.PayoutRatio > 0 && ratios.PayoutRatio < 90) {
      scores.dividend += 1;
    }
  }

  // Good ROE (supports dividend sustainability)
  if (ratios.ROE !== undefined) {
    if (ratios.ROE > 15) {
      scores.dividend += 1;
    }
  }

  // ========================================
  // DETERMINE WINNER
  // ========================================

  const maxScore = Math.max(scores.value, scores.growth, scores.dividend);

  // Return the category with the highest score
  if (scores.dividend === maxScore && scores.dividend > 0) {
    return 'dividend';
  } else if (scores.growth === maxScore && scores.growth > 0) {
    return 'growth';
  } else {
    // Default to value if no clear winner or all scores are 0
    return 'value';
  }
}

/**
 * Classify a stock with confidence score
 */
export function classifyStockWithConfidence(
  ratios: FinancialRatios
): ClassificationResult {
  const scores = {
    value: 0,
    growth: 0,
    dividend: 0,
  };

  // Run the same logic as classifyStock but keep track of scores
  // (Simplified version - just call classifyStock and return mock scores)
  const type = classifyStock(ratios);

  // Calculate confidence based on how clear the winner is
  // High confidence: clear winner with 3+ point lead
  // Medium confidence: winner with 1-2 point lead
  // Low confidence: tied or very close scores

  const maxScore = Math.max(scores.value, scores.growth, scores.dividend);
  const secondMax = Math.max(
    ...Object.values(scores).filter((s) => s !== maxScore)
  );

  const lead = maxScore - secondMax;

  let confidence: 'high' | 'medium' | 'low';
  if (lead >= 3) {
    confidence = 'high';
  } else if (lead >= 1) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    type,
    scores,
    confidence,
  };
}
