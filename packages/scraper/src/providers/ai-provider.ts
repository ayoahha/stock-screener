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
import OpenAI from 'openai';

export interface AIProviderConfig {
  apiKey: string;
  primaryModel: string;
  fallbackModel?: string;
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
  private client: OpenAI;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;

    // Initialize OpenAI client pointing to OpenRouter
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/ayoahha/stock-screener',
        'X-Title': 'Stock Screener'
      }
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
    let modelToUse = this.config.primaryModel;
    let response: { content: string; tokensInput: number; tokensOutput: number; model: string };

    // Try primary model first
    try {
      console.log(`[AI Provider] Using model ${modelToUse} for ${ticker}`);
      response = await this.chat(prompt, modelToUse);
    } catch (error) {
      // Try fallback model if primary fails
      if (this.config.fallbackModel) {
        console.warn(`[AI Provider] Primary model failed, trying fallback: ${error instanceof Error ? error.message : 'Unknown error'}`);
        modelToUse = this.config.fallbackModel;
        response = await this.chat(prompt, modelToUse);
      } else {
        throw error;
      }
    }

    // Parse response
    const data = this.parseDataResponse(response.content, ticker);

    // Estimate cost (rough estimate: $0.0002 per 1K tokens average)
    const cost = ((response.tokensInput + response.tokensOutput) / 1000) * 0.0002;

    return {
      data,
      tokensInput: response.tokensInput,
      tokensOutput: response.tokensOutput,
      model: response.model,
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

    // Use primary model for analysis
    const response = await this.chat(prompt, this.config.primaryModel);

    // Parse response
    const analysis = this.parseAnalysisResponse(response.content);

    // Estimate cost
    const cost = ((response.tokensInput + response.tokensOutput) / 1000) * 0.0002;

    return {
      analysis,
      tokensInput: response.tokensInput,
      tokensOutput: response.tokensOutput,
      model: response.model,
      cost
    };
  }

  /**
   * Generic chat method
   */
  private async chat(prompt: string, model: string): Promise<{
    content: string;
    tokensInput: number;
    tokensOutput: number;
    model: string;
  }> {
    const startTime = Date.now();

    const completion = await this.client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a financial data API. Respond ONLY with valid JSON. No explanations, no markdown, no preamble.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1500,
    });

    const responseTime = Date.now() - startTime;

    const content = completion.choices[0]?.message?.content || '';
    const tokensInput = completion.usage?.prompt_tokens || 0;
    const tokensOutput = completion.usage?.completion_tokens || 0;

    console.log(`[AI Provider] Response received in ${responseTime}ms (${tokensInput + tokensOutput} tokens)`);

    return {
      content,
      tokensInput,
      tokensOutput,
      model: completion.model
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
   * Build prompt for qualitative analysis (French output)
   */
  private buildAnalysisPrompt(input: {
    ticker: string;
    name: string;
    ratios: Record<string, number | null>;
    stockType: string;
    score: number;
    verdict: string;
  }): string {
    const stockTypeLabel = input.stockType === 'value' ? 'valorisation' : input.stockType === 'growth' ? 'croissance' : 'dividende';

    return `Vous êtes un analyste financier spécialisé dans les actions de type ${stockTypeLabel}. Analysez cette action :

DONNÉES DE L'ACTION :
Ticker : ${input.ticker}
Nom : ${input.name}
Type d'action : ${input.stockType} (value/growth/dividend)
Score actuel : ${input.score}/100 (${input.verdict})

RATIOS FINANCIERS :
${JSON.stringify(input.ratios, null, 2)}

EXIGENCES DE L'ANALYSE :
1. Résumé : 2-3 phrases résumant la thèse d'investissement
2. Points forts : 2-3 points positifs (spécifiques à l'investissement ${stockTypeLabel})
3. Points faibles : 2-3 préoccupations (avec des chiffres)
4. Drapeaux rouges : Risques majeurs (s'il y en a)
5. Contexte sectoriel : Comment se compare-t-elle aux pairs ?
6. Thèse d'investissement : Pourquoi acheter/éviter ? (1 paragraphe)

FORMAT DE SORTIE (JSON UNIQUEMENT) :
{
  "summary": "Résumé bref en 2-3 phrases",
  "strengths": [
    "Point fort spécifique avec données (ex : 'ROE de 18% dépasse la moyenne du secteur de 12%')",
    "Autre point fort"
  ],
  "weaknesses": [
    "Préoccupation spécifique avec données",
    "Autre préoccupation"
  ],
  "redFlags": [
    "Risque majeur s'il y en a (ex : 'Dette/Capitaux propres 3.2x - insoutenable')"
  ],
  "industryContext": "1-2 phrases comparant aux normes du secteur",
  "investmentThesis": "1 paragraphe avec recommandation achat/conserver/éviter et raisonnement"
}

DOMAINES D'INTÉRÊT PAR TYPE D'ACTION :
- Value : ratios PE/PB, rendement du dividende, marge de sécurité
- Growth : croissance du chiffre d'affaires/BPA, marges, opportunité de marché
- Dividend : rendement, ratio de distribution, durabilité de la croissance du dividende

RÉPONDEZ UNIQUEMENT AVEC L'OBJET JSON. PAS DE MARKDOWN. PAS D'EXPLICATIONS.`;
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
