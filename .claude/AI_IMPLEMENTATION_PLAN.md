# AI-Enhanced Stock Screener - Implementation Plan

**Status**: Planning Phase - DO NOT IMPLEMENT YET
**Created**: 2025-11-22
**Budget**: $5.00/month
**Owner**: @ayoahha

---

## 📋 Executive Summary

### Objectives
1. Add AI as intelligent fallback when Yahoo Finance scraping fails or returns incomplete data
2. Provide on-demand qualitative stock analysis via AI
3. Maintain strict data quality standards (80% confidence threshold)
4. Stay within $5/month budget

### Key Constraints
- **Budget**: $5.00/month (~1,600 AI calls max at $0.003/call)
- **Validation**: Strict mode (reject AI data if confidence < 80%)
- **Primary use**: Personal portfolio analysis (not high-traffic production)
- **Quality over quantity**: Prefer "N/A" over hallucinated data

### Architecture Changes
```
Current:  Yahoo Scraping → FMP API → Error
Proposed: Yahoo Scraping → AI (Kimi/DeepSeek) → FMP API → Error
                            ↓
                        (on-demand) AI Qualitative Analysis
```

---

## 💰 Budget Analysis

### Cost Breakdown

**Model Pricing** (via OpenRouter):
- **Kimi-K2** (primary): ~$0.003 per 1K tokens (estimated)
- **DeepSeek Reasoner** (fallback): $0.14/$0.28 per 1M tokens (input/output)

**Per-Request Cost Estimate**:
```
Data Fetch:
  Input:  ~600 tokens (prompt + ticker context)
  Output: ~300 tokens (JSON ratios)
  Total:  ~900 tokens
  Cost:   $0.0027 per call (Kimi) or $0.0002 (DeepSeek)

Qualitative Analysis:
  Input:  ~800 tokens (prompt + ratios + context)
  Output: ~500 tokens (analysis JSON)
  Total:  ~1,300 tokens
  Cost:   $0.0039 per call (Kimi) or $0.0003 (DeepSeek)
```

**Monthly Budget Allocation**:
```
Total budget: $5.00/month

Allocation:
- Data fetching:     $4.00 (80%) → ~1,481 calls/month (Kimi) or ~20,000 (DeepSeek)
- Qualitative:       $0.75 (15%) → ~192 analyses/month (Kimi) or ~2,500 (DeepSeek)
- Buffer/overages:   $0.25 (5%)  → Safety margin

Daily limits:
- Data fetching:     ~49 calls/day (Kimi) or ~666 (DeepSeek)
- Qualitative:       ~6 analyses/day (Kimi) or ~83 (DeepSeek)
```

**Reality Check** (for personal use):
- You search 10 stocks/day = ~$0.027/day = **$0.81/month** (well within budget)
- You request 3 analyses/day = ~$0.012/day = **$0.36/month**
- **Total realistic usage: ~$1.20/month** (24% of budget)

---

## 🏗️ Technical Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Stock Data Request                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Check Cache (5-min TTL)                                 │
│     ✓ Hit → Return cached data                              │
│     ✗ Miss → Continue                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Try Yahoo Finance Scraping                              │
│     ✓ Success → Cache + Return                              │
│     ✗ Fail → Continue to AI                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Check AI Budget & Rate Limits                           │
│     - Monthly spend < $4.00?                                │
│     - Daily calls < 49?                                     │
│     - Last call > 2 seconds ago? (rate limiting)            │
│     ✓ OK → Continue                                         │
│     ✗ Exceeded → Skip to FMP                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Try AI (Kimi-K2)                                        │
│     - Send date-aware prompt                                │
│     - Parse JSON response                                   │
│     - Validate ratios (range checks)                        │
│     - Calculate confidence score                            │
│     ✓ Confidence ≥ 80% → Cache + Return                     │
│     ✗ Confidence < 80% → Reject, try DeepSeek               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Try AI (DeepSeek Reasoner - fallback)                  │
│     - Same validation as Kimi                               │
│     ✓ Confidence ≥ 80% → Cache + Return                     │
│     ✗ Confidence < 80% → Reject, try FMP                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Try FMP API (last resort)                               │
│     ✓ Success → Cache + Return                              │
│     ✗ Fail → Throw detailed error                           │
└─────────────────────────────────────────────────────────────┘
```

### New Files to Create

```
packages/scraper/src/
├── providers/
│   ├── ai-provider.ts          (NEW - AI data fetching)
│   ├── kimi-client.ts          (NEW - Kimi-K2 API wrapper)
│   ├── deepseek-client.ts      (NEW - DeepSeek API wrapper)
│   └── fallback.ts             (MODIFY - add AI in chain)
├── validation/
│   ├── ai-validator.ts         (NEW - strict validation)
│   ├── confidence-scorer.ts    (NEW - confidence calculation)
│   └── ratio-ranges.ts         (NEW - expected ratio ranges)
└── cost/
    ├── budget-manager.ts       (NEW - cost tracking)
    └── rate-limiter.ts         (NEW - API rate limiting)

packages/database/src/
├── migrations/
│   └── 005_ai_usage_tracking.sql  (NEW - cost logging)

apps/web/lib/trpc/routers/
├── analysis.ts                 (NEW - qualitative analysis)
└── stock.ts                    (MODIFY - use new fallback)

apps/web/components/
├── StockAnalysisButton.tsx     (NEW - on-demand analysis)
├── AIInsightsPanel.tsx         (NEW - analysis display)
└── DataSourceBadge.tsx         (NEW - show data source)
```

---

## 🧠 Prompt Engineering Strategy

### Data Fetching Prompt (Kimi-K2)

**Objectives**:
1. Get current financial data (Q4 2025 or latest)
2. Enforce JSON-only output
3. Handle European tickers (.PA, .DE, etc.)
4. Return null for unavailable data (no guessing)

**Prompt Template**:
```javascript
const currentDate = new Date().toISOString().split('T')[0];
const currentYear = new Date().getFullYear();
const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

const prompt = `You are a financial data API. Extract the MOST RECENT financial ratios for stock ticker: ${ticker}

CRITICAL CONTEXT:
- Current Date: ${currentDate}
- Current Period: ${currentQuarter} ${currentYear}
- Data Freshness: Use ${currentYear} data or late ${currentYear - 1} data ONLY
- Source Priority: Official exchange data > Analyst estimates > Historical averages
- European Stocks: Tickers ending in .PA (France/Euronext), .DE (Germany), .MI (Italy) use EUR currency

STRICT OUTPUT FORMAT (JSON ONLY - NO EXPLANATIONS):
{
  "ticker": "${ticker}",
  "name": "Full Company Name",
  "price": <current stock price as number>,
  "currency": "EUR" | "USD" | "GBP",
  "dataDate": "YYYY-MM-DD",
  "confidence": <0.0 to 1.0>,
  "ratios": {
    "PE": <number> | null,
    "PB": <number> | null,
    "PEG": <number> | null,
    "PS": <number> | null,
    "ROE": <decimal 0-1> | null,
    "ROA": <decimal 0-1> | null,
    "ROIC": <decimal 0-1> | null,
    "GrossMargin": <decimal 0-1> | null,
    "OperatingMargin": <decimal 0-1> | null,
    "NetMargin": <decimal 0-1> | null,
    "CurrentRatio": <number> | null,
    "QuickRatio": <number> | null,
    "DebtToEquity": <number> | null,
    "DebtToEBITDA": <number> | null,
    "InterestCoverage": <number> | null,
    "DividendYield": <decimal 0-1> | null,
    "PayoutRatio": <decimal 0-1> | null,
    "RevenueGrowth": <decimal> | null,
    "EPSGrowth": <decimal> | null,
    "Beta": <number> | null,
    "MarketCap": <number> | null
  },
  "notes": "Brief explanation of data quality/source if needed"
}

VALIDATION RULES (STRICT):
- PE: 0 to 500 (null if negative earnings)
- PB: 0 to 50
- ROE/ROA/ROIC: -1.0 to 2.0 (as decimals: 0.15 = 15%)
- Margins: 0.0 to 1.0 (as decimals: 0.25 = 25%)
- DividendYield: 0.0 to 0.25 (as decimals: 0.05 = 5%)
- DebtToEquity: 0 to 15
- CurrentRatio: 0 to 10
- Price: Must be > 0
- Currency: Must match ticker suffix (.PA → EUR, .DE → EUR, .L → GBP, else → USD)

IF DATA UNAVAILABLE:
- Set ratio to null (NOT zero, NOT estimate)
- Reduce confidence score accordingly
- Note in "notes" field

CONFIDENCE SCORING:
- 1.0 = All data from official ${currentYear} filings
- 0.9 = Mix of official + recent estimates
- 0.8 = Some data from ${currentYear - 1} (acceptable)
- 0.7 = Significant estimates/older data (reject)
- < 0.7 = Poor data quality (reject)

RESPOND WITH ONLY THE JSON OBJECT. NO MARKDOWN. NO EXPLANATIONS.`;
```

### Qualitative Analysis Prompt (On-Demand)

**Objectives**:
1. Provide actionable investment insights
2. Identify strengths, weaknesses, red flags
3. Industry context
4. Keep response concise (cost efficiency)

**Prompt Template**:
```javascript
const prompt = `You are a financial analyst specializing in ${stockType} stocks. Analyze this stock:

STOCK DATA:
Ticker: ${ticker}
Name: ${name}
Stock Type: ${stockType} (value/growth/dividend)
Current Score: ${score}/100 (${verdict})

FINANCIAL RATIOS:
${JSON.stringify(ratios, null, 2)}

ANALYSIS REQUIREMENTS:
1. Summary: 2-3 sentence investment thesis
2. Strengths: 2-3 positive highlights (specific to ${stockType} investing)
3. Weaknesses: 2-3 concerns (with numbers)
4. Red Flags: Major risks (if any)
5. Industry Context: How does this compare to peers?
6. Investment Thesis: Why buy/avoid? (1 paragraph)

OUTPUT FORMAT (JSON ONLY):
{
  "summary": "Brief 2-3 sentence overview",
  "strengths": [
    "Specific strength with data (e.g., 'ROE of 18% exceeds industry avg of 12%')",
    "Another strength"
  ],
  "weaknesses": [
    "Specific concern with data",
    "Another concern"
  ],
  "redFlags": [
    "Major risk if any (e.g., 'Debt/Equity 3.2x - unsustainable')"
  ],
  "industryContext": "1-2 sentences comparing to sector norms",
  "investmentThesis": "1 paragraph buy/hold/avoid recommendation with reasoning"
}

FOCUS AREAS BY STOCK TYPE:
- Value: PE/PB ratios, dividend yield, margin of safety
- Growth: Revenue/EPS growth, margins, market opportunity
- Dividend: Yield, payout ratio, dividend growth sustainability

RESPOND WITH ONLY THE JSON OBJECT. NO MARKDOWN. NO EXPLANATIONS.`;
```

---

## ✅ Validation Framework (Strict Mode)

### Level 1: Range Validation

```typescript
const RATIO_RANGES = {
  PE: { min: 0, max: 500, required: false },
  PB: { min: 0, max: 50, required: false },
  ROE: { min: -1.0, max: 2.0, required: false },
  ROA: { min: -0.5, max: 1.0, required: false },
  GrossMargin: { min: 0, max: 1.0, required: false },
  NetMargin: { min: -0.5, max: 1.0, required: false },
  CurrentRatio: { min: 0, max: 10, required: false },
  DebtToEquity: { min: 0, max: 15, required: false },
  DividendYield: { min: 0, max: 0.25, required: false },
  Price: { min: 0.01, max: 1000000, required: true }
};

function validateRange(ratio: string, value: number): boolean {
  const range = RATIO_RANGES[ratio];
  if (!range) return true; // Unknown ratio, accept
  return value >= range.min && value <= range.max;
}
```

### Level 2: Cross-Ratio Consistency

```typescript
function validateConsistency(ratios: FinancialRatios): string[] {
  const warnings: string[] = [];

  // ROE should be roughly NetMargin * AssetTurnover * Leverage
  // If ROE is very high but NetMargin is low, suspicious
  if (ratios.ROE > 0.25 && ratios.NetMargin && ratios.NetMargin < 0.05) {
    warnings.push('ROE inconsistent with NetMargin');
  }

  // PEG should be PE / (EPSGrowth * 100)
  if (ratios.PEG && ratios.PE && ratios.EPSGrowth) {
    const expectedPEG = ratios.PE / (ratios.EPSGrowth * 100);
    if (Math.abs(ratios.PEG - expectedPEG) / expectedPEG > 0.3) {
      warnings.push('PEG ratio inconsistent with PE and growth');
    }
  }

  // Current ratio should be >= Quick ratio
  if (ratios.CurrentRatio && ratios.QuickRatio) {
    if (ratios.QuickRatio > ratios.CurrentRatio) {
      warnings.push('Quick ratio exceeds current ratio (impossible)');
    }
  }

  return warnings;
}
```

### Level 3: Ticker-Specific Rules

```typescript
function validateTickerSpecific(
  ticker: string,
  data: StockData
): string[] {
  const warnings: string[] = [];

  // Currency validation
  if (ticker.endsWith('.PA') || ticker.endsWith('.DE') || ticker.endsWith('.MI')) {
    if (data.currency !== 'EUR') {
      warnings.push(`Currency should be EUR for ${ticker}`);
    }
  }

  if (ticker.endsWith('.L')) {
    if (data.currency !== 'GBP') {
      warnings.push(`Currency should be GBP for ${ticker}`);
    }
  }

  // Price reasonableness (European stocks rarely > 1000 EUR)
  if (ticker.endsWith('.PA') && data.price > 1000) {
    warnings.push('Price seems unusually high for French stock');
  }

  return warnings;
}
```

### Level 4: Confidence Scoring

```typescript
function calculateConfidence(
  data: StockData,
  validationWarnings: string[]
): number {
  let confidence = data.confidence || 0.9; // Start with AI's self-assessment

  // Penalties
  confidence -= validationWarnings.length * 0.05; // -5% per warning

  // Data completeness bonus
  const totalRatios = 20; // Expected ratios
  const providedRatios = Object.values(data.ratios).filter(v => v !== null).length;
  const completeness = providedRatios / totalRatios;
  confidence *= completeness;

  // Data freshness check
  if (data.dataDate) {
    const dataAge = Date.now() - new Date(data.dataDate).getTime();
    const daysOld = dataAge / (1000 * 60 * 60 * 24);
    if (daysOld > 90) confidence -= 0.1; // -10% if data > 3 months old
    if (daysOld > 180) confidence -= 0.2; // -20% if data > 6 months old
  }

  return Math.max(0, Math.min(1, confidence));
}
```

### Strict Mode Threshold

```typescript
const STRICT_CONFIDENCE_THRESHOLD = 0.80;

function shouldAcceptAIData(
  data: StockData,
  finalConfidence: number
): boolean {
  return finalConfidence >= STRICT_CONFIDENCE_THRESHOLD;
}
```

---

## 💰 Cost Management

### Budget Tracking Schema

```sql
-- packages/database/src/migrations/005_ai_usage_tracking.sql

CREATE TABLE ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Request details
  ticker TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('data_fetch', 'analysis')),

  -- AI model details
  model TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'openrouter'

  -- Token usage
  tokens_input INTEGER NOT NULL,
  tokens_output INTEGER NOT NULL,
  tokens_total INTEGER GENERATED ALWAYS AS (tokens_input + tokens_output) STORED,

  -- Cost (in USD)
  cost_usd DECIMAL(10, 6) NOT NULL,

  -- Result
  success BOOLEAN NOT NULL,
  confidence DECIMAL(3, 2), -- 0.00 to 1.00
  accepted BOOLEAN, -- Was data accepted (confidence >= 0.80)?
  error_message TEXT,

  -- Metadata
  response_time_ms INTEGER
);

CREATE INDEX idx_ai_usage_created_at ON ai_usage_log(created_at);
CREATE INDEX idx_ai_usage_ticker ON ai_usage_log(ticker);
CREATE INDEX idx_ai_usage_purpose ON ai_usage_log(purpose);

-- View: Current month spend
CREATE VIEW ai_current_month_spend AS
SELECT
  SUM(cost_usd) as total_cost,
  COUNT(*) as total_calls,
  SUM(CASE WHEN purpose = 'data_fetch' THEN cost_usd ELSE 0 END) as data_fetch_cost,
  SUM(CASE WHEN purpose = 'analysis' THEN cost_usd ELSE 0 END) as analysis_cost,
  AVG(CASE WHEN success THEN confidence ELSE NULL END) as avg_confidence
FROM ai_usage_log
WHERE created_at >= DATE_TRUNC('month', NOW());

-- View: Daily usage stats
CREATE VIEW ai_daily_stats AS
SELECT
  DATE(created_at) as date,
  purpose,
  model,
  COUNT(*) as call_count,
  SUM(tokens_total) as total_tokens,
  SUM(cost_usd) as total_cost,
  AVG(CASE WHEN success THEN confidence ELSE NULL END) as avg_confidence,
  SUM(CASE WHEN accepted THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as acceptance_rate
FROM ai_usage_log
GROUP BY DATE(created_at), purpose, model
ORDER BY date DESC, purpose;
```

### Budget Manager Implementation

```typescript
// packages/scraper/src/cost/budget-manager.ts

interface BudgetConfig {
  maxMonthlyUSD: number;      // 5.00
  maxDailyUSD: number;        // 0.50 (safety limit)
  maxCostPerCall: number;     // 0.01 (abort if single call exceeds)

  allocation: {
    dataFetch: number;        // 0.80 (80% of budget)
    analysis: number;         // 0.15 (15% of budget)
    buffer: number;           // 0.05 (5% safety)
  };
}

export class BudgetManager {
  private config: BudgetConfig = {
    maxMonthlyUSD: 5.00,
    maxDailyUSD: 0.50,
    maxCostPerCall: 0.01,
    allocation: {
      dataFetch: 0.80,
      analysis: 0.15,
      buffer: 0.05
    }
  };

  async canMakeRequest(purpose: 'data_fetch' | 'analysis'): Promise<{
    allowed: boolean;
    reason?: string;
    currentSpend: number;
    remainingBudget: number;
  }> {
    const supabase = createServerClient();

    // Get current month spend
    const { data } = await supabase
      .from('ai_current_month_spend')
      .select('*')
      .single();

    const currentSpend = data?.total_cost || 0;
    const remainingBudget = this.config.maxMonthlyUSD - currentSpend;

    // Check monthly budget
    if (currentSpend >= this.config.maxMonthlyUSD) {
      return {
        allowed: false,
        reason: 'Monthly budget exceeded',
        currentSpend,
        remainingBudget: 0
      };
    }

    // Check daily budget
    const todaySpend = await this.getTodaySpend();
    if (todaySpend >= this.config.maxDailyUSD) {
      return {
        allowed: false,
        reason: 'Daily budget exceeded',
        currentSpend,
        remainingBudget
      };
    }

    // Check purpose-specific allocation
    const purposeSpend = purpose === 'data_fetch'
      ? data?.data_fetch_cost || 0
      : data?.analysis_cost || 0;

    const purposeLimit = this.config.maxMonthlyUSD * this.config.allocation[purpose === 'data_fetch' ? 'dataFetch' : 'analysis'];

    if (purposeSpend >= purposeLimit) {
      return {
        allowed: false,
        reason: `${purpose} budget allocation exceeded`,
        currentSpend,
        remainingBudget
      };
    }

    return {
      allowed: true,
      currentSpend,
      remainingBudget
    };
  }

  async logUsage(data: {
    ticker: string;
    purpose: 'data_fetch' | 'analysis';
    model: string;
    provider: string;
    tokensInput: number;
    tokensOutput: number;
    costUSD: number;
    success: boolean;
    confidence?: number;
    accepted?: boolean;
    errorMessage?: string;
    responseTimeMs: number;
  }): Promise<void> {
    const supabase = createServerClient();

    await supabase.from('ai_usage_log').insert({
      ticker: data.ticker,
      purpose: data.purpose,
      model: data.model,
      provider: data.provider,
      tokens_input: data.tokensInput,
      tokens_output: data.tokensOutput,
      cost_usd: data.costUSD,
      success: data.success,
      confidence: data.confidence,
      accepted: data.accepted,
      error_message: data.errorMessage,
      response_time_ms: data.responseTimeMs
    });
  }

  private async getTodaySpend(): Promise<number> {
    const supabase = createServerClient();

    const { data } = await supabase
      .from('ai_usage_log')
      .select('cost_usd')
      .gte('created_at', new Date().toISOString().split('T')[0]);

    return data?.reduce((sum, row) => sum + parseFloat(row.cost_usd), 0) || 0;
  }
}
```

### Rate Limiter

```typescript
// packages/scraper/src/cost/rate-limiter.ts

export class RateLimiter {
  private lastCallTime: Map<string, number> = new Map();
  private callCounts: Map<string, number> = new Map();

  private readonly MIN_CALL_INTERVAL_MS = 2000; // 2 seconds between calls
  private readonly MAX_CALLS_PER_HOUR = 100;

  async canMakeCall(key: string = 'global'): Promise<{
    allowed: boolean;
    waitMs?: number;
  }> {
    const now = Date.now();

    // Check minimum interval
    const lastCall = this.lastCallTime.get(key) || 0;
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall < this.MIN_CALL_INTERVAL_MS) {
      return {
        allowed: false,
        waitMs: this.MIN_CALL_INTERVAL_MS - timeSinceLastCall
      };
    }

    // Check hourly rate limit
    const hourKey = `${key}_${Math.floor(now / 3600000)}`;
    const hourlyCount = this.callCounts.get(hourKey) || 0;

    if (hourlyCount >= this.MAX_CALLS_PER_HOUR) {
      return {
        allowed: false,
        waitMs: 3600000 - (now % 3600000) // Wait until next hour
      };
    }

    return { allowed: true };
  }

  recordCall(key: string = 'global'): void {
    const now = Date.now();
    this.lastCallTime.set(key, now);

    const hourKey = `${key}_${Math.floor(now / 3600000)}`;
    this.callCounts.set(hourKey, (this.callCounts.get(hourKey) || 0) + 1);

    // Cleanup old entries
    this.cleanup();
  }

  private cleanup(): void {
    const now = Date.now();
    const currentHour = Math.floor(now / 3600000);

    for (const [key, _] of this.callCounts) {
      const hour = parseInt(key.split('_').pop() || '0');
      if (hour < currentHour - 2) { // Keep last 2 hours
        this.callCounts.delete(key);
      }
    }
  }
}
```

---

## 🎨 UI Components

### 1. Data Source Badge

```typescript
// apps/web/components/DataSourceBadge.tsx

import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Layers, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DataSourceBadgeProps {
  source: 'yahoo' | 'fmp' | 'ai' | 'yahoo+ai';
  confidence?: number;
}

export function DataSourceBadge({ source, confidence }: DataSourceBadgeProps) {
  const badges = {
    yahoo: {
      icon: Check,
      label: 'Yahoo Finance',
      variant: 'success' as const,
      description: 'Live data from Yahoo Finance'
    },
    fmp: {
      icon: Check,
      label: 'FMP API',
      variant: 'default' as const,
      description: 'Data from Financial Modeling Prep'
    },
    ai: {
      icon: Sparkles,
      label: 'AI-Sourced',
      variant: 'secondary' as const,
      description: 'Generated by AI when traditional sources unavailable'
    },
    'yahoo+ai': {
      icon: Layers,
      label: 'Hybrid',
      variant: 'default' as const,
      description: 'Combined Yahoo Finance and AI data'
    }
  };

  const config = badges[source];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger>
            <Badge variant={config.variant} className="gap-1">
              <Icon className="w-3 h-3" />
              {config.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.description}</p>
            {confidence && confidence < 0.9 && (
              <p className="text-xs text-yellow-600 mt-1">
                Confidence: {(confidence * 100).toFixed(0)}%
              </p>
            )}
          </TooltipContent>
        </Tooltip>

        {confidence && confidence < 0.9 && (
          <Tooltip>
            <TooltipTrigger>
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Some data may be estimated or incomplete</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
```

### 2. AI Analysis Button (On-Demand)

```typescript
// apps/web/components/StockAnalysisButton.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { AIInsightsPanel } from './AIInsightsPanel';

interface StockAnalysisButtonProps {
  ticker: string;
  ratios: Record<string, number | null>;
  stockType: 'value' | 'growth' | 'dividend';
  name: string;
  score: number;
  verdict: string;
}

export function StockAnalysisButton(props: StockAnalysisButtonProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);

  const { data, isLoading, refetch } = trpc.analysis.analyze.useQuery(
    {
      ticker: props.ticker,
      ratios: props.ratios,
      stockType: props.stockType,
      name: props.name,
      score: props.score,
      verdict: props.verdict
    },
    {
      enabled: showAnalysis, // Only fetch when user clicks
      staleTime: 1000 * 60 * 60, // Cache for 1 hour
    }
  );

  const handleClick = () => {
    if (!showAnalysis) {
      setShowAnalysis(true);
    } else {
      refetch(); // Refresh analysis
    }
  };

  return (
    <div>
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating Insights...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            {showAnalysis ? 'Refresh' : 'Get AI Insights'}
          </>
        )}
      </Button>

      {showAnalysis && data && (
        <AIInsightsPanel analysis={data} className="mt-4" />
      )}
    </div>
  );
}
```

### 3. AI Insights Panel

```typescript
// apps/web/components/AIInsightsPanel.tsx

import { Card } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface AIAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  redFlags: string[];
  industryContext: string;
  investmentThesis: string;
}

interface AIInsightsPanelProps {
  analysis: AIAnalysis;
  className?: string;
}

export function AIInsightsPanel({ analysis, className }: AIInsightsPanelProps) {
  return (
    <Card className={`bg-gradient-to-br from-purple-50 to-blue-50 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-lg">AI Investment Analysis</h3>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-700 mb-6 leading-relaxed">
        {analysis.summary}
      </p>

      {/* Strengths & Weaknesses */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="font-medium text-green-700 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Strengths
          </h4>
          <ul className="space-y-2">
            {analysis.strengths.map((strength, i) => (
              <li key={i} className="text-sm text-gray-700 flex gap-2">
                <span className="text-green-600">•</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-medium text-red-700 mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Weaknesses
          </h4>
          <ul className="space-y-2">
            {analysis.weaknesses.map((weakness, i) => (
              <li key={i} className="text-sm text-gray-700 flex gap-2">
                <span className="text-red-600">•</span>
                <span>{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Red Flags */}
      {analysis.redFlags.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Red Flags
          </h4>
          <ul className="space-y-1">
            {analysis.redFlags.map((flag, i) => (
              <li key={i} className="text-sm text-red-700 flex gap-2">
                <span>🚩</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Industry Context */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-800 mb-2">Industry Context</h4>
        <p className="text-sm text-gray-700 leading-relaxed">
          {analysis.industryContext}
        </p>
      </div>

      {/* Investment Thesis */}
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-800 mb-2">Investment Thesis</h4>
        <p className="text-sm text-gray-700 leading-relaxed">
          {analysis.investmentThesis}
        </p>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 pt-4 border-t text-xs text-gray-500">
        <p>
          ⚠️ This analysis is AI-generated and for informational purposes only.
          Not financial advice. Verify all data independently before investing.
        </p>
      </div>
    </Card>
  );
}
```

---

## 📅 Implementation Timeline

### Week 1: Core Infrastructure
**Days 1-2**: Setup & Dependencies
- [ ] Install OpenAI SDK (`pnpm add openai`)
- [ ] Create OpenRouter account
- [ ] Test Kimi-K2 and DeepSeek Reasoner API access
- [ ] Set up environment variables
- [ ] Create database migration (`005_ai_usage_tracking.sql`)
- [ ] Run migration in Supabase

**Days 3-5**: AI Provider Implementation
- [ ] Create `packages/scraper/src/providers/kimi-client.ts`
- [ ] Create `packages/scraper/src/providers/deepseek-client.ts`
- [ ] Create `packages/scraper/src/providers/ai-provider.ts`
- [ ] Implement date-aware prompts
- [ ] Test with 5-10 sample tickers (CAP.PA, AIR.PA, SAF.PA, etc.)
- [ ] Measure actual token usage and costs

**Days 6-7**: Validation & Cost Management
- [ ] Create `packages/scraper/src/validation/ai-validator.ts`
- [ ] Create `packages/scraper/src/validation/confidence-scorer.ts`
- [ ] Create `packages/scraper/src/cost/budget-manager.ts`
- [ ] Create `packages/scraper/src/cost/rate-limiter.ts`
- [ ] Test validation with edge cases
- [ ] Verify budget enforcement works

### Week 2: Integration & UI
**Days 8-10**: Fallback Chain Integration
- [ ] Modify `packages/scraper/src/providers/fallback.ts`
- [ ] Add AI as 2nd priority (after Yahoo, before FMP)
- [ ] Test complete fallback chain:
  - Yahoo success → use Yahoo
  - Yahoo fail → try AI → accept if confidence >= 80%
  - AI reject → try FMP
  - All fail → error
- [ ] Verify auto-save to `stock_history` works with AI data

**Days 11-12**: Data Source UI
- [ ] Create `apps/web/components/DataSourceBadge.tsx`
- [ ] Update stock display components to show badge
- [ ] Add confidence warnings (< 90%)
- [ ] Add AI data disclaimer
- [ ] Test UI with different data sources

**Days 13-14**: Qualitative Analysis (On-Demand)
- [ ] Create `apps/web/lib/trpc/routers/analysis.ts`
- [ ] Create `apps/web/components/StockAnalysisButton.tsx`
- [ ] Create `apps/web/components/AIInsightsPanel.tsx`
- [ ] Wire up to dashboard/historique pages
- [ ] Test with 3-5 stocks
- [ ] Verify cost tracking for analysis calls

### Week 3: Testing & Refinement
**Days 15-17**: Comprehensive Testing
- [ ] Test 20+ European stocks (.PA, .DE, .MI)
- [ ] Test 10+ US stocks (AAPL, MSFT, etc.)
- [ ] Test obscure/small-cap tickers
- [ ] Monitor actual costs (should be < $1 for testing)
- [ ] Check validation strictness (false positives/negatives)
- [ ] Verify budget limits work (artificially lower limit to test)

**Days 18-19**: Prompt Refinement
- [ ] Analyze failed validations (confidence < 80%)
- [ ] Refine prompts based on common errors
- [ ] A/B test Kimi vs DeepSeek accuracy
- [ ] Optimize token usage (reduce prompt length if possible)
- [ ] Document prompt evolution in comments

**Days 20-21**: Documentation & Cleanup
- [ ] Update `.claude/WORKFLOW.md` with AI fallback info
- [ ] Document environment variables in `.env.example`
- [ ] Add comments to complex validation logic
- [ ] Create user guide for AI insights feature
- [ ] Run `pnpm type-check` across all packages
- [ ] Final cost review (should be < $2 for 3 weeks testing)

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// packages/scraper/tests/ai-provider.test.ts

describe('AI Provider', () => {
  it('should fetch valid data for French stock CAP.PA', async () => {
    const data = await fetchFromAI('CAP.PA', { model: 'kimi' });

    expect(data.ticker).toBe('CAP.PA');
    expect(data.currency).toBe('EUR');
    expect(data.price).toBeGreaterThan(0);
    expect(data.confidence).toBeGreaterThan(0);
  });

  it('should return null for unavailable ratios', async () => {
    const data = await fetchFromAI('OBSCURE.PA', { model: 'kimi' });

    // Some ratios should be null for obscure stocks
    const nullCount = Object.values(data.ratios).filter(v => v === null).length;
    expect(nullCount).toBeGreaterThan(0);
  });

  it('should validate price range', () => {
    const data = { price: -10 } as StockData;
    const validation = validateRange('Price', data.price);

    expect(validation).toBe(false);
  });
});

describe('Budget Manager', () => {
  it('should reject requests when budget exceeded', async () => {
    const manager = new BudgetManager();

    // Simulate budget exhaustion
    await manager.logUsage({
      ticker: 'TEST',
      purpose: 'data_fetch',
      costUSD: 5.00, // Exhaust budget
      // ...
    });

    const result = await manager.canMakeRequest('data_fetch');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('budget exceeded');
  });
});
```

### Integration Tests

```typescript
// packages/scraper/tests/fallback-chain.test.ts

describe('Fallback Chain with AI', () => {
  it('should use Yahoo first, AI on failure', async () => {
    // Mock Yahoo to fail
    jest.spyOn(yahooModule, 'scrapeYahooFinance')
      .mockRejectedValue(new Error('Yahoo timeout'));

    const data = await fetchWithFallback('CAP.PA');

    expect(data.source).toBe('ai');
    expect(data.confidence).toBeGreaterThanOrEqual(0.80);
  });

  it('should reject low-confidence AI data', async () => {
    // Mock Yahoo to fail
    jest.spyOn(yahooModule, 'scrapeYahooFinance')
      .mockRejectedValue(new Error('Yahoo timeout'));

    // Mock AI to return low confidence
    jest.spyOn(aiModule, 'fetchFromAI')
      .mockResolvedValue({ confidence: 0.65 } as StockData);

    // Should fallback to FMP
    const data = await fetchWithFallback('CAP.PA');

    expect(data.source).toBe('fmp');
  });
});
```

### Manual Test Cases

**Test Scenarios**:
1. **Normal Yahoo Success**: Search "CAP.PA" → should use Yahoo, no AI call
2. **Yahoo Fail, AI Success**: Disconnect internet briefly → search "AIR.PA" → should use AI
3. **AI Low Confidence**: Search obscure ticker → AI returns confidence 0.65 → should use FMP
4. **Budget Exceeded**: Make 50+ searches → should hit daily limit → fallback to FMP
5. **AI Analysis**: Click "Get AI Insights" on LVMH → should show strengths/weaknesses
6. **Cost Tracking**: Check database → verify all AI calls logged with correct costs

---

## 📊 Success Metrics

### Key Performance Indicators

1. **Data Availability**: % of successful stock fetches
   - Target: > 95% (same as current)
   - Measure: Total successful / total requests

2. **AI Usage Rate**: % of requests using AI
   - Target: 20-40% (Yahoo fails this often for EU stocks)
   - Measure: AI calls / total requests

3. **AI Acceptance Rate**: % of AI data accepted (confidence >= 80%)
   - Target: > 70% (need good prompts)
   - Measure: Accepted AI calls / total AI calls

4. **Cost Efficiency**: Average cost per stock fetch
   - Target: < $0.003 per stock
   - Measure: Total monthly cost / total monthly fetches

5. **Monthly Budget Adherence**:
   - Target: < $5.00/month
   - Measure: Sum of all AI costs in current month

6. **User Satisfaction** (qualitative):
   - AI insights provide value?
   - Data source transparency sufficient?
   - Confidence in AI-sourced data?

### Monthly Review Checklist

At end of each month:
- [ ] Check total spend (should be < $5)
- [ ] Review AI acceptance rate (> 70%?)
- [ ] Analyze rejected AI calls (common patterns?)
- [ ] Review qualitative analysis quality (manually check 5-10 examples)
- [ ] Adjust prompts if needed
- [ ] Consider switching models if DeepSeek consistently better than Kimi

---

## 🚨 Risk Mitigation

### Risk 1: AI Hallucinations
**Mitigation**:
- ✅ Strict validation (confidence >= 80%)
- ✅ Range checks on all ratios
- ✅ Cross-ratio consistency validation
- ✅ Clear UI warnings for AI data
- ✅ Prefer "N/A" over suspicious values

### Risk 2: Budget Overruns
**Mitigation**:
- ✅ Hard limits ($5/month, $0.50/day)
- ✅ Rate limiting (2s between calls, 100/hour)
- ✅ Real-time cost tracking in database
- ✅ Fallback to free sources (FMP) when budget exceeded
- ✅ On-demand analysis (not automatic)

### Risk 3: Model Unavailability
**Mitigation**:
- ✅ Two AI models (Kimi primary, DeepSeek fallback)
- ✅ FMP as final fallback
- ✅ Graceful degradation (app still works without AI)

### Risk 4: Stale Data
**Mitigation**:
- ✅ Date-aware prompts (enforce 2025 data)
- ✅ Validate `dataDate` field
- ✅ Penalize confidence for old data (> 90 days)

### Risk 5: User Mistrust
**Mitigation**:
- ✅ Transparent data source badges
- ✅ Confidence scores visible
- ✅ Clear disclaimers
- ✅ Option to "verify with Yahoo" (manual refresh)

---

## 🔧 Configuration Files

### Environment Variables

```bash
# .env.local (add to existing file)

# OpenRouter API Key (REQUIRED for AI features)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx

# AI Model Configuration
AI_PRIMARY_MODEL=moonshot/kimi-k2        # Primary model
AI_FALLBACK_MODEL=deepseek/deepseek-reasoner  # Fallback if primary fails

# AI Feature Flags
ENABLE_AI_FALLBACK=true                  # Enable AI in data fetching fallback chain
ENABLE_AI_ANALYSIS=true                  # Enable on-demand qualitative analysis

# AI Budget Limits (USD)
AI_MAX_MONTHLY_BUDGET=5.00               # Hard monthly limit
AI_MAX_DAILY_BUDGET=0.50                 # Hard daily limit
AI_MAX_COST_PER_CALL=0.01                # Abort if single call exceeds this

# AI Validation
AI_CONFIDENCE_THRESHOLD=0.80             # Minimum confidence to accept AI data (strict mode)

# AI Rate Limiting
AI_MIN_CALL_INTERVAL_MS=2000             # Minimum 2s between calls
AI_MAX_CALLS_PER_HOUR=100                # Max calls per hour
```

### TypeScript Types

```typescript
// packages/scraper/src/types/ai.ts (NEW)

export interface AIModelConfig {
  provider: 'openrouter';
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface AIResponse {
  ticker: string;
  name: string;
  price: number;
  currency: string;
  dataDate: string;
  confidence: number;
  ratios: Record<string, number | null>;
  notes?: string;
}

export interface AIAnalysisResponse {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  redFlags: string[];
  industryContext: string;
  investmentThesis: string;
}

export interface AIUsageLog {
  ticker: string;
  purpose: 'data_fetch' | 'analysis';
  model: string;
  provider: string;
  tokensInput: number;
  tokensOutput: number;
  costUSD: number;
  success: boolean;
  confidence?: number;
  accepted?: boolean;
  errorMessage?: string;
  responseTimeMs: number;
}
```

---

## 📝 Next Steps

### Before Implementation Begins

1. **Review this plan** - Make any adjustments needed
2. **Get OpenRouter API key** - Sign up at https://openrouter.ai
3. **Test API access** - Verify Kimi-K2 and DeepSeek are available
4. **Estimate real costs** - Make 10 test calls, measure actual token usage
5. **Create git branch** - `feature/ai-enhanced-fallback-[issue]`

### Implementation Order

1. ✅ Week 1: Core infrastructure (AI clients, validation, cost management)
2. ✅ Week 2: Integration (fallback chain, UI badges, analysis feature)
3. ✅ Week 3: Testing, refinement, documentation

### Post-Implementation

1. **Monitor for 1 month** - Track costs, accuracy, user feedback
2. **Iterate on prompts** - Improve based on real usage data
3. **Consider enhancements**:
   - Portfolio-level analysis (AI compares all your stocks)
   - Sector comparison (AI ranks stock vs peers)
   - Risk assessment (AI flags portfolio concentration risks)

---

## ✅ Approval Checklist

Before proceeding with implementation, confirm:

- [ ] **Budget**: $5/month limit is acceptable
- [ ] **Models**: Kimi-K2 primary, DeepSeek fallback is correct approach
- [ ] **Validation**: Strict mode (80% threshold) is desired
- [ ] **Analysis**: On-demand button (not automatic) is preferred
- [ ] **Timeline**: 3 weeks is reasonable
- [ ] **Architecture**: Fallback chain (Yahoo → AI → FMP) makes sense
- [ ] **UI**: Data source badges + disclaimers are sufficient
- [ ] **Risks**: All mitigation strategies are acceptable

---

## 📞 Questions to Resolve

1. **OpenRouter Model Names**: Are "moonshot/kimi-k2" and "deepseek/deepseek-reasoner" the correct model IDs on OpenRouter?
2. **Cache Strategy**: Should AI data be cached the same as Yahoo (5 min TTL)? Or longer/shorter?
3. **Retry Logic**: If Kimi fails (timeout/error), should we retry once before trying DeepSeek?
4. **Historical Data**: Should we track AI accuracy over time (compare AI predictions to later Yahoo data)?
5. **Analysis Caching**: Should qualitative analysis be cached (1 hour)? Or always fresh?

---

**Status**: ⏸️ AWAITING APPROVAL

Once approved, implementation will begin following the 3-week timeline outlined above.
