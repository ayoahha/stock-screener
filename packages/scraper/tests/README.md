# Scraper Tests

## Test Strategy

### Unit Tests (yahoo-finance-unit.test.ts)
✅ **Passing: 15/15 tests**

Tests parsing logic, data structures, and helper functions without network access:
- Data structure validation
- Ratio parsing helpers (percentages, market cap, etc.)
- Currency detection logic
- Error handling
- European stock support (.PA, .DE suffixes)

### E2E Tests (yahoo-finance.test.ts)
⚠️ **Requires network access**

Full browser automation tests using Playwright:
- Actual web scraping of Yahoo Finance
- Tests with real tickers (CAP.PA, MC.PA, AIR.PA, BMW.DE, etc.)
- Performance benchmarks
- Error handling with real invalid tickers

**Note:** E2E tests require:
1. Internet access to download Playwright browsers
2. Internet access to reach finance.yahoo.com
3. Run with: `pnpm test:e2e` (to be added)

## Running Tests

```bash
# Run unit tests only (no network required)
pnpm test yahoo-finance-unit.test.ts

# Run all tests (requires network)
pnpm test

# Watch mode
pnpm test:watch
```

## TDD Progress

✅ RED Phase: Tests written and failing
✅ GREEN Phase: Implementation complete, unit tests passing
🔄 REFACTOR Phase: To be done after full integration testing

## Next Steps

1. ✅ Yahoo Finance scraper (unit tests passing)
2. 🔄 Ticker resolver implementation
3. 🔄 Cache manager (Supabase integration)
4. 🔄 FMP API provider
5. 🔄 Fallback orchestrator
