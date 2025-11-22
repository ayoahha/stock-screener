/**
 * DeepSeek Reasoner Client (via OpenRouter)
 *
 * DeepSeek-V3 Reasoner is optimized for:
 * - Reasoning-intensive tasks
 * - Mathematical/financial computations
 * - Cost-effective inference
 *
 * Pricing: $0.14/$0.28 per 1M tokens (input/output)
 * ~15x cheaper than Kimi-K2
 */

import OpenAI from 'openai';

export interface DeepSeekConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface DeepSeekResponse {
  content: string;
  tokensInput: number;
  tokensOutput: number;
  model: string;
}

/**
 * DeepSeek Reasoner client using OpenRouter
 */
export class DeepSeekClient {
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: DeepSeekConfig) {
    if (!config.apiKey) {
      throw new Error('OpenRouter API key is required for DeepSeek client');
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

    // DeepSeek model configuration
    // OpenRouter model name: "deepseek/deepseek-chat" (default)
    // Can be overridden via config.model parameter
    this.model = config.model || 'deepseek/deepseek-chat';
    this.temperature = config.temperature ?? 0.1; // Low temperature for factual data
    this.maxTokens = config.maxTokens ?? 1500;
  }

  /**
   * Send a prompt to DeepSeek Reasoner and get a response
   */
  async chat(prompt: string): Promise<DeepSeekResponse> {
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

      console.log(`[DeepSeek] Response received in ${responseTime}ms (${tokensInput + tokensOutput} tokens)`);

      return {
        content,
        tokensInput,
        tokensOutput,
        model
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`DeepSeek API call failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Calculate estimated cost for a request
   * Based on OpenRouter pricing for DeepSeek Reasoner
   */
  static estimateCost(tokensInput: number, tokensOutput: number): number {
    // DeepSeek Reasoner pricing (as of 2025):
    // Input:  $0.14 per 1M tokens = $0.00014 per 1K tokens
    // Output: $0.28 per 1M tokens = $0.00028 per 1K tokens
    const COST_INPUT_PER_1K = 0.00014;
    const COST_OUTPUT_PER_1K = 0.00028;

    const inputCost = (tokensInput / 1000) * COST_INPUT_PER_1K;
    const outputCost = (tokensOutput / 1000) * COST_OUTPUT_PER_1K;

    return inputCost + outputCost;
  }

  /**
   * Get model name
   */
  getModel(): string {
    return this.model;
  }
}
