/**
 * Router Analysis
 *
 * Procedures:
 * - analyze(ticker, ratios, stockType, score, verdict) : Generate AI qualitative analysis
 *
 * Features:
 * - On-demand AI insights (user must click button)
 * - Cost tracking per analysis
 * - Budget enforcement
 * - Strengths, weaknesses, red flags, investment thesis
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../server';

// Import AI provider and cost management (server-side only)
import { AIProvider, BudgetManager, RateLimiter } from '@stock-screener/scraper';

// Singleton instances
let aiProvider: any = null;
let budgetManager: any = null;
let rateLimiter: any = null;

export const analysisRouter = router({
  /**
   * Generate AI analysis for a stock
   * Input: ticker, ratios, stockType, name, score, verdict
   * Output: Qualitative analysis (summary, strengths, weaknesses, etc.)
   */
  analyze: publicProcedure
    .input(
      z.object({
        ticker: z.string().min(1).max(20),
        name: z.string(),
        ratios: z.record(z.number().nullable()),
        stockType: z.enum(['value', 'growth', 'dividend']),
        score: z.number().min(0).max(100),
        verdict: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        // Check if AI is enabled
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        const ENABLE_AI_ANALYSIS = process.env.ENABLE_AI_ANALYSIS !== 'false';

        if (!ENABLE_AI_ANALYSIS) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'AI analysis is disabled. Set ENABLE_AI_ANALYSIS=true to enable.',
          });
        }

        if (!OPENROUTER_API_KEY) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'OpenRouter API key not configured. Please add OPENROUTER_API_KEY to environment variables.',
          });
        }

        // Initialize AI components (lazy initialization)
        if (!aiProvider) {
          aiProvider = new AIProvider({
            apiKey: OPENROUTER_API_KEY,
            primaryModel: process.env.AI_PRIMARY_MODEL || 'deepseek/deepseek-chat',
            fallbackModel: process.env.AI_FALLBACK_MODEL,
          });
        }

        if (!budgetManager) {
          budgetManager = new BudgetManager({
            maxMonthlyUSD: parseFloat(process.env.AI_MAX_MONTHLY_BUDGET || '5.00'),
            maxDailyUSD: parseFloat(process.env.AI_MAX_DAILY_BUDGET || '0.50'),
            maxCostPerCall: parseFloat(process.env.AI_MAX_COST_PER_CALL || '0.01'),
          });
        }

        if (!rateLimiter) {
          rateLimiter = new RateLimiter();
        }

        // Check budget
        const budgetCheck = await budgetManager.canMakeRequest('analysis');
        if (!budgetCheck.allowed) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `AI budget exceeded: ${budgetCheck.reason}. Current spend: $${budgetCheck.currentSpend.toFixed(2)}`,
          });
        }

        // Check rate limit
        const rateCheck = rateLimiter.canMakeCall(`analysis_${input.ticker}`);
        if (!rateCheck.allowed) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: `Rate limit exceeded: ${rateCheck.reason}. Please wait ${Math.ceil((rateCheck.waitMs || 0) / 1000)}s.`,
          });
        }

        // Record rate limit
        rateLimiter.recordCall(`analysis_${input.ticker}`);

        // Generate analysis
        const startTime = Date.now();
        console.log(`[Analysis] Generating AI analysis for ${input.ticker}...`);

        const result = await aiProvider.generateAnalysis({
          ticker: input.ticker,
          name: input.name,
          ratios: input.ratios,
          stockType: input.stockType,
          score: input.score,
          verdict: input.verdict,
        });

        const duration = Date.now() - startTime;

        // Log usage
        await budgetManager.logUsage({
          ticker: input.ticker,
          purpose: 'analysis',
          model: result.model,
          provider: 'openrouter',
          tokensInput: result.tokensInput,
          tokensOutput: result.tokensOutput,
          costUSD: result.cost,
          success: true,
          responseTimeMs: duration,
        });

        console.log(
          `[Analysis] ✓ AI analysis completed in ${duration}ms (cost: $${result.cost.toFixed(4)})`
        );

        return {
          ...result.analysis,
          metadata: {
            model: result.model,
            tokensUsed: result.tokensInput + result.tokensOutput,
            cost: result.cost,
            timestamp: new Date().toISOString(),
          },
        };
      } catch (error) {
        console.error(`[Analysis] Error generating AI analysis for ${input.ticker}:`, error);

        // If it's already a TRPCError, rethrow it
        if (error instanceof TRPCError) {
          throw error;
        }

        // Otherwise, wrap it
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate AI analysis',
          cause: error,
        });
      }
    }),

  /**
   * Get AI usage statistics (for admin/monitoring)
   */
  getUsageStats: publicProcedure.query(async () => {
    try {
      if (!budgetManager) {
        budgetManager = new BudgetManager();
      }

      const stats = await budgetManager.getMonthStats();

      return {
        currentMonth: {
          totalCost: stats.totalCost,
          totalCalls: stats.totalCalls,
          dataFetchCost: stats.dataFetchCost,
          analysisCost: stats.analysisCost,
          successRate:
            stats.totalCalls > 0
              ? (stats.successfulCalls / stats.totalCalls) * 100
              : 0,
          avgConfidence: stats.avgConfidence,
          acceptanceRate: stats.acceptanceRate * 100,
        },
        limits: {
          monthlyBudget: parseFloat(process.env.AI_MAX_MONTHLY_BUDGET || '5.00'),
          dailyBudget: parseFloat(process.env.AI_MAX_DAILY_BUDGET || '0.50'),
          remainingBudget: Math.max(
            0,
            parseFloat(process.env.AI_MAX_MONTHLY_BUDGET || '5.00') - stats.totalCost
          ),
        },
      };
    } catch (error) {
      console.error('[Analysis] Error getting usage stats:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve usage statistics',
        cause: error,
      });
    }
  }),
});
