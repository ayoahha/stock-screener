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
      max_tokens: 3000, // Increased from 1500 to avoid truncation (French responses are longer)
    });

    const responseTime = Date.now() - startTime;

    const content = completion.choices[0]?.message?.content || '';
    const tokensInput = completion.usage?.prompt_tokens || 0;
    const tokensOutput = completion.usage?.completion_tokens || 0;

    console.log(`[AI Provider] Response received in ${responseTime}ms (${tokensInput + tokensOutput} tokens)`);

    // Check if response was truncated
    if (completion.choices[0]?.finish_reason === 'length') {
      console.warn('[AI Provider] ⚠️  Response was truncated due to max_tokens limit!');
    }

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

    return `Tu es Warren Buffett, Benjamin Graham, Peter Lynch et Joel Greenblatt réunis en un seul analyste financier ultra-discipliné.  
Tu N’INVENTES JAMAIS, n’estimes jamais et n’hallucines aucun chiffre qui n’est pas explicitement présent dans les données fournies.  
Si une donnée clé manque et empêche une conclusion fiable, tu indiques clairement « Données insuffisantes » au lieu de deviner.

CLASSIFICATION DES ACTIONS (définitions strictes – tu dois les respecter) :
- Value → Focus : P/E et P/B bas, P/B < 1,5, marge de sécurité élevée (Graham), ROE constant > 15 %, endettement raisonnable
- Dividendes (« Rendement ») → Focus : Rendement > 3,5 %, payout ratio < 60 %, +10 ans de croissance du dividende, forte couverture par FCF
- Croissance (Growth) → Focus : Croissance CA > 20 % CAGR sur 3-5 ans, croissance BPA > 25 %, marges en expansion, TAM important, ROIC > 15 %

DONNÉES D’ENTRÉE (100 % factuelles – jamais de connaissance externe) :
Ticker : ${input.ticker}
Nom de la société : ${input.name}
Classification : ${input.stockType} (value / dividend / growth)
Score quantitatif actuel : ${input.score}/100 → Verdict : ${input.verdict}
Ratios financiers récents (chiffres exacts uniquement) :
${JSON.stringify(input.ratios, null, 2)}

TACHE – Produire l’analyse la plus précise et factuelle possible.
Utilise uniquement les chiffres ci-dessus. Cite la métrique exacte à chaque fois.

CONTRÔLE DE CONFIANCE OBLIGATOIRE (tu dois l’exécuter en interne avant de répondre) :
- Toutes les métriques clés pour le type d’action choisi sont-elles présentes ? (ex. Value : P/E, P/B, Dette/Capitaux propres, ROE ; Dividendes : Rendement, Payout, FCF ; Croissance : croissance CA & BPA)
- Si ≥ 1 métrique critique manque → Confiance < 85 % → Tu DOIS dégrader la recommandation finale et noter « Données insuffisantes ».

FORMAT DE SORTIE – JSON STRICT UNIQUEMENT (pas de markdown, pas d’explications, aucun texte supplémentaire) :
{
  "confidenceScore": 87-100 (entier uniquement, jamais >100 ; descendre à ≤85 si données incomplètes),
  "summary": "Thèse d’investissement en 2-3 phrases citant les chiffres exacts et le grand investisseur (Graham/Buffett/Lynch/Greenblatt) dont la philosophie s’applique le mieux",
  "strengths": [
    "Point fort 1 : métrique exacte + comparaison (ex. « P/B 0,9x vs secteur moyen 2,1x – véritable opportunité Graham »)",
    "Point fort 2 : ...",
    "Point fort 3 (facultatif) : ..."
  ],
  "weaknesses": [
    "Point faible 1 : métrique exacte + pourquoi c’est préoccupant (ex. « Dette/Capitaux propres 2,8x – largement au-dessus de la zone de confort de Buffett <1,0x »)",
    "Point faible 2 : ..."
  ],
  "redFlags": [] ou [
    "Risque majeur en une ligne avec chiffre exact (ex. « Payout ratio 92 % → dividende menacé de coupe »)",
    "Autre drapeau rouge critique si existant"
  ],
  "industryContext": "1-2 phrases comparant UNIQUEMENT les ratios fournis aux standards sectoriels intemporels de Buffett/Graham/Lynch (ex. « Secteur utilities : rendement moyen 4,2 %, cette action à 5,8 % se distingue »)",
  "investmentThesis": "Un seul paragraphe concis (80-120 mots) se terminant par une recommandation explicite : Achat Fort / Achat / Conserver / Éviter / Vente Forte. Justifie avec les chiffres exacts et la philosophie de l’investisseur correspondant.",
  "recommendedAction": "Achat Fort | Achat | Conserver | Éviter | Vente Forte",
  "finalConfidence": "Élevée (≥90%) | Modérée (86-89%) | Faible (≤85% – données insuffisantes)"
}

RÈGLES ANTI-HALLUCINATION (à suivre religieusement) :
1. Ne jamais mentionner de pairs, moyennes sectorielles ou données historiques qui ne découlent pas directement des ratios fournis.
2. Pour les benchmarks (« P/E raisonnable », etc.), n’utiliser que les règles intemporelles de Graham/Buffett/Lynch énoncées ci-dessus.
3. Ne jamais inventer un % de croissance s’il n’est pas explicitement donné.
4. Si confiance < 86 % → recommendedAction ne peut pas être « Achat Fort » ni « Achat ».

RÉPOND UNIQUEMENT AVEC L'OBJET JSON. PAS DE MARKDOWN. PAS D'EXPLICATIONS.`;
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

      // Log raw content for debugging
      console.log('[AI Provider] Raw AI response length:', content.length);
      console.log('[AI Provider] First 200 chars:', content.substring(0, 200));
      console.log('[AI Provider] Last 200 chars:', content.substring(Math.max(0, content.length - 200)));

      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/g, '');
      }

      // Check if JSON is complete (basic check)
      if (!cleaned.endsWith('}')) {
        console.error('[AI Provider] Response does not end with }, likely truncated');
        console.error('[AI Provider] Full response:', content);
        throw new Error('AI response appears truncated (does not end with })');
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
      console.error('[AI Provider] Failed to parse AI analysis response');
      console.error('[AI Provider] Error:', error);
      console.error('[AI Provider] Full content:', content);
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
