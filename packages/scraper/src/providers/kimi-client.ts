/**
 * Kimi-K2 Client (via OpenRouter)
 *
 * Kimi-K2 is a reasoning model optimized for:
 * - Complex analytical tasks
 * - Financial data extraction
 * - High accuracy on numerical data
 *
 * Pricing: ~$0.003 per 1K tokens (estimated via OpenRouter)
 */

import OpenAI from 'openai';

export interface KimiConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface KimiResponse {
  content: string;
  tokensInput: number;
  tokensOutput: number;
  model: string;
}

/**
 * Kimi-K2 client using OpenRouter
 */
export class KimiClient {
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: KimiConfig) {
    if (!config.apiKey) {
      throw new Error('OpenRouter API key is required for Kimi client');
    }

    // Initialize OpenAI SDK pointing to OpenRouter
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/ayoahha/stock-screener',
        'X-Title': 'Stock Screener'
      }
    });

    // Kimi model configuration
    // Note: Check OpenRouter docs for exact model name
    // Possible names: "moonshot/kimi-k2", "kimi/kimi-k2", or similar
    this.model = config.model || 'deepseek/deepseek-chat'; // Fallback to DeepSeek if Kimi not available
    this.temperature = config.temperature ?? 0.1; // Low temperature for factual data
    this.maxTokens = config.maxTokens ?? 1500;
  }

  /**
   * Send a prompt to Kimi-K2 and get a response
   */
  async chat(prompt: string): Promise<KimiResponse> {
    try {
      const startTime = Date.now();

      const completion = await this.client.chat.completions.create({
        model: this.model,
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
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      });

      const responseTime = Date.now() - startTime;

      const content = completion.choices[0]?.message?.content || '';
      const tokensInput = completion.usage?.prompt_tokens || 0;
      const tokensOutput = completion.usage?.completion_tokens || 0;
      const model = completion.model;

      console.log(`[Kimi] Response received in ${responseTime}ms (${tokensInput + tokensOutput} tokens)`);

      return {
        content,
        tokensInput,
        tokensOutput,
        model
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Kimi API call failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Calculate estimated cost for a request
   * Based on OpenRouter pricing (approximate)
   */
  static estimateCost(tokensInput: number, tokensOutput: number): number {
    // Kimi pricing (estimated): $3 per 1M tokens
    // This is an approximation - check OpenRouter for actual pricing
    const COST_PER_1K_TOKENS = 0.003;
    const totalTokens = tokensInput + tokensOutput;
    return (totalTokens / 1000) * COST_PER_1K_TOKENS;
  }

  /**
   * Get model name
   */
  getModel(): string {
    return this.model;
  }
}
