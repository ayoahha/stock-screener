/**
 * AI Provider for Stock Data Fetching
 *
 * Uses AI models (Kimi-K2 or DeepSeek) to fetch financial ratios
 * when traditional sources (Yahoo, FMP) fail or return incomplete data.
 *
 * Features:
 * - Date-aware prompts (enforce current year data)
 * - Strict validation (confidence >= 80%)
 * - Cost tracking
 * - Fallback between models
 */

import type { StockData } from '../index';
import { KimiClient, type KimiResponse } from './kimi-client';
import { DeepSeekClient, type DeepSeekResponse } from './deepseek-client';

export interface AIProviderConfig {
  apiKey: string;
  primaryModel: 'kimi' | 'deepseek';
  fallbackModel?: 'kimi' | 'deepseek';
  kimiModelId?: string;
  deepseekModelId?: string;
}

export interface AIStockData extends StockData {
  confidence: number;
  dataDate: string;
  notes?: string;
}

/**
 * AI Provider for fetching stock financial data
 */
export class AIProvider {
  private kimiClient?: KimiClient;
  private deepseekClient: DeepSeekClient;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;

    // Initialize clients based on configuration
    try {
      this.kimiClient = new KimiClient({
        apiKey: config.apiKey,
        model: config.kimiModelId, // Use custom model ID if provided
        temperature: 0.1,
        maxTokens: 1500
      });
    } catch (error) {
      console.warn('[AI Provider] Kimi client initialization failed, will use DeepSeek only');
    }

    this.deepseekClient = new DeepSeekClient({
      apiKey: config.apiKey,
      model: config.deepseekModelId, // Use custom model ID if provided
      temperature: 0.1,
      maxTokens: 1500
    });
  }

  /**
   * Fetch stock data using AI
   */
  async fetchStockData(ticker: string): Promise<{
    data: AIStockData;
    tokensInput: number;
    tokensOutput: number;
    model: string;
    cost: number;
  }> {
    const prompt = this.buildDataFetchPrompt(ticker);
    let response: KimiResponse | DeepSeekResponse;
    let model: string;
    let cost: number;

    // Try primary model first
    try {
      if (this.config.primaryModel === 'kimi' && this.kimiClient) {
        console.log(`[AI Provider] Using Kimi-K2 for ${ticker}`);
        response = await this.kimiClient.chat(prompt);
        model = response.model;
        cost = KimiClient.estimateCost(response.tokensInput, response.tokensOutput);
      } else {
        console.log(`[AI Provider] Using DeepSeek for ${ticker}`);
        response = await this.deepseekClient.chat(prompt);
        model = response.model;
        cost = DeepSeekClient.estimateCost(response.tokensInput, response.tokensOutput);
      }
    } catch (error) {
      // Try fallback model if primary fails
      if (this.config.fallbackModel) {
        console.warn(`[AI Provider] Primary model failed, trying fallback: ${error instanceof Error ? error.message : 'Unknown error'}`);

        if (this.config.fallbackModel === 'deepseek') {
          response = await this.deepseekClient.chat(prompt);
          model = response.model;
          cost = DeepSeekClient.estimateCost(response.tokensInput, response.tokensOutput);
        } else if (this.config.fallbackModel === 'kimi' && this.kimiClient) {
          response = await this.kimiClient.chat(prompt);
          model = response.model;
          cost = KimiClient.estimateCost(response.tokensInput, response.tokensOutput);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    // Parse response
    const data = this.parseDataResponse(response.content, ticker);

    return {
      data,
      tokensInput: response.tokensInput,
      tokensOutput: response.tokensOutput,
      model,
      cost
    };
  }

  /**
   * Generate qualitative analysis for a stock
   */
  async generateAnalysis(input: {
    ticker: string;
    name: string;
    ratios: Record<string, number | null>;
    stockType: 'value' | 'growth' | 'dividend';
    score: number;
    verdict: string;
  }): Promise<{
    analysis: AIAnalysis;
    tokensInput: number;
    tokensOutput: number;
    model: string;
    cost: number;
  }> {
    const prompt = this.buildAnalysisPrompt(input);
    let response: KimiResponse | DeepSeekResponse;
    let model: string;
    let cost: number;

    // Always use DeepSeek for analysis (cheaper)
    response = await this.deepseekClient.chat(prompt);
    model = response.model;
    cost = DeepSeekClient.estimateCost(response.tokensInput, response.tokensOutput);

    // Parse response
    const analysis = this.parseAnalysisResponse(response.content);

    return {
      analysis,
      tokensInput: response.tokensInput,
      tokensOutput: response.tokensOutput,
      model,
      cost
    };
  }

  /**
   * Build date-aware prompt for stock data fetching
   */
  private buildDataFetchPrompt(ticker: string): string {
    const currentDate = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

    return `You are a financial data API. Extract the MOST RECENT financial ratios for stock ticker: ${ticker}

CRITICAL CONTEXT:
- Current Date: ${currentDate}
- Current Period: Q${currentQuarter} ${currentYear}
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
  }

  /**
   * Build prompt for qualitative analysis
   */
  private buildAnalysisPrompt(input: {
    ticker: string;
    name: string;
    ratios: Record<string, number | null>;
    stockType: string;
    score: number;
    verdict: string;
  }): string {
    return `You are a financial analyst specializing in ${input.stockType} stocks. Analyze this stock:

STOCK DATA:
Ticker: ${input.ticker}
Name: ${input.name}
Stock Type: ${input.stockType} (value/growth/dividend)
Current Score: ${input.score}/100 (${input.verdict})

FINANCIAL RATIOS:
${JSON.stringify(input.ratios, null, 2)}

ANALYSIS REQUIREMENTS:
1. Summary: 2-3 sentence investment thesis
2. Strengths: 2-3 positive highlights (specific to ${input.stockType} investing)
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
  }

  /**
   * Parse AI response for stock data
   */
  private parseDataResponse(content: string, ticker: string): AIStockData {
    try {
      // Remove markdown code blocks if present
      let cleaned = content.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleaned);

      return {
        ticker: parsed.ticker || ticker,
        name: parsed.name || ticker,
        price: parseFloat(parsed.price) || 0,
        currency: parsed.currency || 'USD',
        ratios: parsed.ratios || {},
        source: 'ai' as const,
        fetchedAt: new Date(),
        confidence: parsed.confidence || 0.5,
        dataDate: parsed.dataDate || new Date().toISOString().split('T')[0],
        notes: parsed.notes
      };
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }

  /**
   * Parse AI response for analysis
   */
  private parseAnalysisResponse(content: string): AIAnalysis {
    try {
      // Remove markdown code blocks if present
      let cleaned = content.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleaned);

      return {
        summary: parsed.summary || '',
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        redFlags: parsed.redFlags || [],
        industryContext: parsed.industryContext || '',
        investmentThesis: parsed.investmentThesis || ''
      };
    } catch (error) {
      throw new Error(`Failed to parse AI analysis response: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }
}

export interface AIAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  redFlags: string[];
  industryContext: string;
  investmentThesis: string;
}
