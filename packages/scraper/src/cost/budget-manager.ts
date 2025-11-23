/**
 * AI Budget Manager
 *
 * Enforces spending limits and tracks costs:
 * - Monthly budget: $5.00
 * - Daily budget: $0.50 (safety limit)
 * - Per-call limit: $0.01
 * - Allocation: 80% data fetch, 15% analysis, 5% buffer
 *
 * Logs all usage to database for monitoring and analytics
 */

import { createServerClient } from '@stock-screener/database';

export interface BudgetConfig {
  maxMonthlyUSD: number;
  maxDailyUSD: number;
  maxCostPerCall: number;
  allocation: {
    dataFetch: number; // 0.80 (80%)
    analysis: number; // 0.15 (15%)
    buffer: number; // 0.05 (5%)
  };
}

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  currentSpend: number;
  remainingBudget: number;
  currentMonthSpend?: number;
  currentDaySpend?: number;
}

export interface UsageLogData {
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

/**
 * Budget Manager for AI costs
 */
export class BudgetManager {
  private config: BudgetConfig;

  constructor(config?: Partial<BudgetConfig>) {
    this.config = {
      maxMonthlyUSD: config?.maxMonthlyUSD ?? 5.00,
      maxDailyUSD: config?.maxDailyUSD ?? 0.50,
      maxCostPerCall: config?.maxCostPerCall ?? 0.01,
      allocation: {
        dataFetch: config?.allocation?.dataFetch ?? 0.80,
        analysis: config?.allocation?.analysis ?? 0.15,
        buffer: config?.allocation?.buffer ?? 0.05
      }
    };
  }

  /**
   * Check if we can make an AI request within budget limits
   */
  async canMakeRequest(purpose: 'data_fetch' | 'analysis'): Promise<BudgetCheckResult> {
    const supabase = createServerClient();

    try {
      // Get current month spend
      const { data: monthData } = await (supabase as any)
        .from('ai_current_month_spend')
        .select('*')
        .single();

      const currentMonthSpend = parseFloat(monthData?.total_cost || '0');

      // Check monthly budget
      if (currentMonthSpend >= this.config.maxMonthlyUSD) {
        return {
          allowed: false,
          reason: `Monthly budget exceeded: $${currentMonthSpend.toFixed(2)} / $${this.config.maxMonthlyUSD.toFixed(2)}`,
          currentSpend: currentMonthSpend,
          remainingBudget: 0,
          currentMonthSpend
        };
      }

      // Get today's spend
      const todaySpend = await this.getTodaySpend();

      // Check daily budget
      if (todaySpend >= this.config.maxDailyUSD) {
        return {
          allowed: false,
          reason: `Daily budget exceeded: $${todaySpend.toFixed(2)} / $${this.config.maxDailyUSD.toFixed(2)}`,
          currentSpend: currentMonthSpend,
          remainingBudget: this.config.maxMonthlyUSD - currentMonthSpend,
          currentMonthSpend,
          currentDaySpend: todaySpend
        };
      }

      // Check purpose-specific allocation
      const purposeSpend = purpose === 'data_fetch'
        ? parseFloat(monthData?.data_fetch_cost || '0')
        : parseFloat(monthData?.analysis_cost || '0');

      const purposeAllocation = purpose === 'data_fetch'
        ? this.config.allocation.dataFetch
        : this.config.allocation.analysis;

      const purposeLimit = this.config.maxMonthlyUSD * purposeAllocation;

      if (purposeSpend >= purposeLimit) {
        return {
          allowed: false,
          reason: `${purpose} budget allocation exceeded: $${purposeSpend.toFixed(2)} / $${purposeLimit.toFixed(2)}`,
          currentSpend: currentMonthSpend,
          remainingBudget: this.config.maxMonthlyUSD - currentMonthSpend,
          currentMonthSpend
        };
      }

      // All checks passed
      return {
        allowed: true,
        currentSpend: currentMonthSpend,
        remainingBudget: this.config.maxMonthlyUSD - currentMonthSpend,
        currentMonthSpend,
        currentDaySpend: todaySpend
      };
    } catch (error) {
      console.error('[BudgetManager] Error checking budget:', error);
      // On error, be conservative and allow (don't block user due to DB issues)
      return {
        allowed: true,
        currentSpend: 0,
        remainingBudget: this.config.maxMonthlyUSD,
        reason: 'Budget check failed, allowing request'
      };
    }
  }

  /**
   * Check if a specific cost would exceed per-call limit
   */
  isCallTooExpensive(estimatedCost: number): boolean {
    return estimatedCost > this.config.maxCostPerCall;
  }

  /**
   * Log AI usage to database
   */
  async logUsage(data: UsageLogData): Promise<void> {
    const supabase = createServerClient();

    try {
      await (supabase as any).from('ai_usage_log').insert({
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

      console.log(`[BudgetManager] Logged usage: ${data.ticker} - ${data.purpose} - $${data.costUSD.toFixed(4)}`);
    } catch (error) {
      console.error('[BudgetManager] Failed to log usage:', error);
      // Don't throw - logging failure shouldn't block the app
    }
  }

  /**
   * Get current month statistics
   */
  async getMonthStats(): Promise<{
    totalCost: number;
    totalCalls: number;
    dataFetchCost: number;
    analysisCost: number;
    successfulCalls: number;
    failedCalls: number;
    avgConfidence: number;
    acceptanceRate: number;
  }> {
    const supabase = createServerClient();

    try {
      const { data } = await (supabase as any)
        .from('ai_current_month_spend')
        .select('*')
        .single();

      return {
        totalCost: parseFloat(data?.total_cost || '0'),
        totalCalls: parseInt(data?.total_calls || '0'),
        dataFetchCost: parseFloat(data?.data_fetch_cost || '0'),
        analysisCost: parseFloat(data?.analysis_cost || '0'),
        successfulCalls: parseInt(data?.successful_calls || '0'),
        failedCalls: parseInt(data?.failed_calls || '0'),
        avgConfidence: parseFloat(data?.avg_confidence || '0'),
        acceptanceRate: parseFloat(data?.acceptance_rate || '0')
      };
    } catch (error) {
      console.error('[BudgetManager] Error getting month stats:', error);
      return {
        totalCost: 0,
        totalCalls: 0,
        dataFetchCost: 0,
        analysisCost: 0,
        successfulCalls: 0,
        failedCalls: 0,
        avgConfidence: 0,
        acceptanceRate: 0
      };
    }
  }

  /**
   * Get today's spend
   */
  private async getTodaySpend(): Promise<number> {
    const supabase = createServerClient();

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data } = await (supabase as any)
        .from('ai_usage_log')
        .select('cost_usd')
        .gte('created_at', today + 'T00:00:00.000Z')
        .lt('created_at', today + 'T23:59:59.999Z');

      if (!data || data.length === 0) {
        return 0;
      }

      return data.reduce((sum: number, row: any) => sum + parseFloat(row.cost_usd), 0);
    } catch (error) {
      console.error('[BudgetManager] Error getting today spend:', error);
      return 0;
    }
  }

  /**
   * Get budget configuration
   */
  getConfig(): BudgetConfig {
    return { ...this.config };
  }
}
