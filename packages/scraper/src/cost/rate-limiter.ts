/**
 * Rate Limiter for AI API Calls
 *
 * Prevents excessive API usage and potential abuse:
 * - Minimum 2 seconds between calls (avoid burst spam)
 * - Maximum 100 calls per hour
 * - Per-ticker tracking to prevent repeated failed attempts
 *
 * Protects against:
 * - Accidental loops
 * - Rapid retry storms
 * - Cost overruns from bugs
 */

export interface RateLimitConfig {
  minCallIntervalMs: number; // Minimum time between calls
  maxCallsPerHour: number; // Maximum calls in 1 hour window
  maxRetriesPerTicker: number; // Max retries for same ticker in 1 hour
}

export interface RateLimitResult {
  allowed: boolean;
  waitMs?: number;
  reason?: string;
}

/**
 * Rate Limiter for AI API calls
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private lastCallTime: number = 0;
  private callTimestamps: number[] = [];
  private tickerAttempts: Map<string, number[]> = new Map();

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      minCallIntervalMs: config?.minCallIntervalMs ?? 2000, // 2 seconds
      maxCallsPerHour: config?.maxCallsPerHour ?? 100,
      maxRetriesPerTicker: config?.maxRetriesPerTicker ?? 3
    };
  }

  /**
   * Check if we can make a call now
   */
  canMakeCall(ticker?: string): RateLimitResult {
    const now = Date.now();

    // Check 1: Minimum interval between any calls
    const timeSinceLastCall = now - this.lastCallTime;
    if (this.lastCallTime > 0 && timeSinceLastCall < this.config.minCallIntervalMs) {
      const waitMs = this.config.minCallIntervalMs - timeSinceLastCall;
      return {
        allowed: false,
        waitMs,
        reason: `Rate limit: minimum ${this.config.minCallIntervalMs}ms between calls`
      };
    }

    // Check 2: Hourly rate limit
    this.cleanupOldTimestamps();
    if (this.callTimestamps.length >= this.config.maxCallsPerHour) {
      const oldestCallTime = this.callTimestamps[0];
      const waitMs = 3600000 - (now - (oldestCallTime || 0)); // Time until oldest call expires
      return {
        allowed: false,
        waitMs: Math.max(0, waitMs),
        reason: `Hourly limit reached: ${this.config.maxCallsPerHour} calls per hour`
      };
    }

    // Check 3: Per-ticker retry limit
    if (ticker) {
      const attempts = this.getTickerAttempts(ticker);
      this.cleanupTickerAttempts(ticker);
      const recentAttempts = attempts.filter(t => now - t < 3600000); // Last hour

      if (recentAttempts.length >= this.config.maxRetriesPerTicker) {
        return {
          allowed: false,
          reason: `Too many attempts for ticker ${ticker}: ${recentAttempts.length} in last hour`
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Record a call
   */
  recordCall(ticker?: string): void {
    const now = Date.now();

    this.lastCallTime = now;
    this.callTimestamps.push(now);

    if (ticker) {
      const attempts = this.getTickerAttempts(ticker);
      attempts.push(now);
      this.tickerAttempts.set(ticker, attempts);
    }

    // Cleanup old data
    this.cleanupOldTimestamps();
  }

  /**
   * Reset rate limiter (for testing)
   */
  reset(): void {
    this.lastCallTime = 0;
    this.callTimestamps = [];
    this.tickerAttempts.clear();
  }

  /**
   * Get current stats
   */
  getStats(): {
    callsLastHour: number;
    lastCallAgo: number;
    tickersTracked: number;
  } {
    this.cleanupOldTimestamps();
    const now = Date.now();

    return {
      callsLastHour: this.callTimestamps.length,
      lastCallAgo: this.lastCallTime > 0 ? now - this.lastCallTime : -1,
      tickersTracked: this.tickerAttempts.size
    };
  }

  /**
   * Get attempts for a specific ticker
   */
  private getTickerAttempts(ticker: string): number[] {
    return this.tickerAttempts.get(ticker) || [];
  }

  /**
   * Remove timestamps older than 1 hour
   */
  private cleanupOldTimestamps(): void {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    this.callTimestamps = this.callTimestamps.filter(t => t > oneHourAgo);
  }

  /**
   * Remove old attempts for a ticker
   */
  private cleanupTickerAttempts(ticker: string): void {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    const attempts = this.getTickerAttempts(ticker);
    const recentAttempts = attempts.filter(t => t > oneHourAgo);

    if (recentAttempts.length > 0) {
      this.tickerAttempts.set(ticker, recentAttempts);
    } else {
      this.tickerAttempts.delete(ticker);
    }
  }
}
