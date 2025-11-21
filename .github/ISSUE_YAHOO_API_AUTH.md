# Enhancement: Implement Yahoo Query API Cookie/Crumb Authentication

## 🎯 Overview

Currently, the Yahoo Finance Query API (`query1.finance.yahoo.com/v7/finance/quote`) returns **401 Unauthorized** errors because it requires cookie and crumb-based authentication. This issue documents the implementation approach for future enhancement.

## 🔴 Current Problem

**Error logs:**
```
[Yahoo Query API] HTTP 401: Request failed with status code 401
[Yahoo Query API] Retry 1/3 after 2000ms...
[Yahoo Query API] HTTP 401: Request failed with status code 401
[Yahoo Query API] Retry 2/3 after 4000ms...
[Yahoo Query API] HTTP 401: Request failed with status code 401
```

**Current behavior:**
- Yahoo Query API fails with 401 on every request
- Code retries 3 times (wasting ~30 seconds)
- Falls back to HTML scraping (which works but is slower)

**Why this matters:**
- Query API is **significantly faster** than HTML scraping (2-3s vs 50-60s)
- Reduces load on Yahoo's servers
- More reliable than parsing HTML which can change

## 🔬 Root Cause

Yahoo Finance's unofficial API requires **cookie + crumb authentication** since ~2017. Our current implementation only sends basic headers without authentication.

## ✅ Solution: Cookie/Crumb Authentication Flow

### Technical Implementation

Based on research and libraries like `yfinance`, the authentication flow is:

**Step 1: Obtain Cookie**
```typescript
async function fetchYahooCookie(): Promise<string> {
  const response = await axios.get('https://finance.yahoo.com', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    maxRedirects: 5
  });

  // Extract 'B' cookie from Set-Cookie header
  const cookies = response.headers['set-cookie'];
  const bCookie = cookies?.find(c => c.startsWith('B='));

  if (!bCookie) {
    throw new Error('Failed to obtain Yahoo cookie');
  }

  return bCookie.split(';')[0].split('=')[1];
}
```

**Step 2: Obtain Crumb**
```typescript
async function fetchYahooCrumb(cookie: string): Promise<string> {
  const response = await axios.get(
    'https://query2.finance.yahoo.com/v1/test/getcrumb',
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': `B=${cookie}`
      }
    }
  );

  return response.data.trim();
}
```

**Step 3: Cache Cookie + Crumb**
```typescript
interface YahooAuthCache {
  cookie: string;
  crumb: string;
  expiresAt: Date; // Cookies valid ~1 year, but cache for shorter period
}

let authCache: YahooAuthCache | null = null;

async function getYahooAuth(): Promise<YahooAuthCache> {
  // Check cache
  if (authCache && authCache.expiresAt > new Date()) {
    return authCache;
  }

  // Refresh authentication
  const cookie = await fetchYahooCookie();
  const crumb = await fetchYahooCrumb(cookie);

  authCache = {
    cookie,
    crumb,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Cache for 24 hours
  };

  return authCache;
}
```

**Step 4: Use in API Requests**
```typescript
export async function fetchFromYahooQueryAPI(ticker: string): Promise<StockData> {
  const auth = await getYahooAuth();

  const response = await axios.get(
    'https://query2.finance.yahoo.com/v7/finance/quote',
    {
      params: {
        symbols: ticker,
        crumb: auth.crumb
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': `B=${auth.cookie}`,
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://finance.yahoo.com'
      },
      timeout: 10000
    }
  );

  // ... rest of implementation
}
```

**Step 5: Handle Auth Failures**
```typescript
try {
  return await fetchFromYahooQueryAPI(ticker);
} catch (error) {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    // Clear auth cache and retry once
    console.log('[Yahoo Query API] 401 error - clearing auth cache and retrying...');
    authCache = null;
    return await fetchFromYahooQueryAPI(ticker);
  }
  throw error;
}
```

## 📦 Implementation Checklist

When implementing this enhancement:

- [ ] Create `packages/scraper/src/providers/yahoo-auth.ts` for authentication logic
- [ ] Add cookie/crumb fetching functions
- [ ] Implement in-memory cache with expiration
- [ ] Update `yahoo-query-api.ts` to use authentication
- [ ] Add retry logic for 401 errors (clear cache and retry once)
- [ ] Add environment variable to enable/disable Query API: `ENABLE_YAHOO_QUERY_API`
- [ ] Add rate limiting to avoid IP blocks (max N requests per minute)
- [ ] Add error handling for cookie/crumb fetch failures
- [ ] Update fallback.ts to gracefully skip Query API if auth fails
- [ ] Add tests for authentication flow
- [ ] Document in README

## ⚠️ Important Considerations

### Rate Limiting & IP Blocks
**Critical:** Yahoo Finance actively blocks aggressive scraping. Implementation MUST include:
- Rate limiting (e.g., max 10 requests per minute)
- Exponential backoff on failures
- User-configurable delays between requests
- Clear warnings in documentation about IP blocking risks

### Unofficial API Warning
Yahoo Finance **does not provide an official public API**. This implementation relies on:
- Reverse-engineered endpoints that may change without notice
- Terms of Service that prohibit automated scraping
- No guarantee of continued access

**Recommendation:** Document clearly that this is for personal/educational use only.

### Alternative: Consider Official APIs
For production use, consider official alternatives:
- **Financial Modeling Prep (FMP)** - Already implemented as fallback
- **Alpha Vantage** - Free tier available
- **Twelve Data** - Free tier available
- **Polygon.io** - Free tier for stocks

## 📊 Expected Benefits

**Performance improvement:**
- Current (HTML scraping): 50-60 seconds per stock
- With Query API: 2-5 seconds per stock
- **10-20x faster** ⚡

**Reliability:**
- Less prone to HTML layout changes
- Structured JSON response
- Fewer moving parts

## 🔗 References

- [Stack Overflow: Yahoo Finance Cookie/Crumb](https://stackoverflow.com/questions/56698011/consistently-retrieving-cookie-and-crumb-from-yahoo-finance-for-historical-data)
- [GitHub: YahooFinanceAPI (C#) with cookie/crumb](https://github.com/dennislwy/YahooFinanceAPI)
- [yfinance Python library](https://github.com/ranaroussi/yfinance) - Uses similar approach
- [Yahoo Finance API 401 errors discussion](https://github.com/ranaroussi/yfinance/issues/1592)

## 📝 Related Issues

- Current issue being fixed: Disable Yahoo Query API by default (Option B)
- Related to: Stock price retrieval improvements

## 🏷️ Labels

`enhancement`, `yahoo-finance`, `scraper`, `future-improvement`, `performance`

---

**Status:** Future enhancement - not currently implemented
**Priority:** Low (HTML scraping works reliably)
**Effort:** Medium (2-3 days development + testing)
