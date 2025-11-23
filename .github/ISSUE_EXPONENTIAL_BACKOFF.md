# Feature Request: Implement Exponential Backoff for Scraping Failures

## Summary

Add exponential backoff retry logic to the scraping layer to handle temporary failures more gracefully and reduce the risk of IP bans when services are temporarily unavailable.

## Problem

Currently, when a scraping request fails, the system immediately moves to the next fallback provider without implementing any backoff strategy. This can lead to:

1. **Unnecessary fallback chains**: Temporary network issues or rate limits trigger expensive fallback providers (AI, FMP) when a simple retry with delay would succeed
2. **IP ban risk**: Repeated rapid failures can look like aggressive scraping to providers like Yahoo Finance
3. **Poor user experience**: Transient errors result in failed requests instead of successful retries

## Current Behavior

The fallback orchestrator (`packages/scraper/src/providers/fallback.ts`) tries providers in sequence:
1. Yahoo Finance Query API (if enabled)
2. Yahoo Finance HTML Scraping
3. AI Provider (DeepSeek/Kimi)
4. FMP API

If a provider fails, it immediately moves to the next one with no retry logic.

## Proposed Solution

Implement exponential backoff with configurable parameters:

```typescript
interface ExponentialBackoffConfig {
  initialDelayMs: number;      // e.g., 1000 (1 second)
  maxDelayMs: number;          // e.g., 30000 (30 seconds)
  maxRetries: number;          // e.g., 3
  backoffMultiplier: number;   // e.g., 2
  jitter: boolean;             // Add randomness to avoid thundering herd
}
```

### Retry Logic

For each provider in the fallback chain:
1. **First attempt**: Try immediately
2. **First retry**: Wait `initialDelayMs` (e.g., 1s)
3. **Second retry**: Wait `initialDelayMs * backoffMultiplier` (e.g., 2s)
4. **Third retry**: Wait `initialDelayMs * backoffMultiplier^2` (e.g., 4s)
5. **Max retries reached**: Move to next provider

### Jitter

Add random jitter to prevent multiple concurrent requests from retrying at the exact same time:
```typescript
const delay = baseDelay * (0.5 + Math.random() * 0.5);
```

## Implementation Checklist

- [ ] Create `ExponentialBackoff` class in `packages/scraper/src/utils/exponential-backoff.ts`
- [ ] Add configurable retry parameters via environment variables:
  - `SCRAPING_RETRY_INITIAL_DELAY_MS` (default: 1000)
  - `SCRAPING_RETRY_MAX_DELAY_MS` (default: 30000)
  - `SCRAPING_RETRY_MAX_ATTEMPTS` (default: 3)
  - `SCRAPING_RETRY_BACKOFF_MULTIPLIER` (default: 2)
  - `SCRAPING_RETRY_JITTER` (default: true)
- [ ] Integrate exponential backoff into `fetchWithFallback` function
- [ ] Add retry attempt logging for debugging
- [ ] Distinguish between retryable and non-retryable errors:
  - **Retryable**: Network timeouts, 429 (rate limit), 503 (service unavailable)
  - **Non-retryable**: 404 (not found), 401 (unauthorized), validation errors
- [ ] Add metrics tracking for retry success rates
- [ ] Update documentation in `.claude/CLAUDE.md`
- [ ] Add unit tests for exponential backoff logic

## Benefits

1. **Improved reliability**: Temporary failures don't immediately fail the entire request
2. **Cost reduction**: Fewer unnecessary AI/FMP API calls when Yahoo Finance is just temporarily slow
3. **Better rate limit handling**: Exponential backoff respects rate limits naturally
4. **Reduced IP ban risk**: Gradual backoff looks less like aggressive scraping
5. **Better observability**: Retry logs help identify chronic vs. transient issues

## Configuration Example

```env
# .env.local
SCRAPING_RETRY_INITIAL_DELAY_MS=1000
SCRAPING_RETRY_MAX_DELAY_MS=30000
SCRAPING_RETRY_MAX_ATTEMPTS=3
SCRAPING_RETRY_BACKOFF_MULTIPLIER=2
SCRAPING_RETRY_JITTER=true
```

## Related Issues

- Rate limiting for scraping layer (implemented in current PR)
- Yahoo Finance authentication improvements

## Priority

**Medium** - This is an enhancement that improves reliability but isn't blocking core functionality.

## Labels

- `enhancement`
- `scraper`
- `reliability`
