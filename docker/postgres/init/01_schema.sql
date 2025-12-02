-- Stock Screener Database Schema
-- Combined migrations for PostgreSQL (Docker setup)
-- This file runs automatically when the container is first created

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Table: user_settings
-- Description: User settings (v1: single user, no auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- General preferences
  default_scoring_profile VARCHAR(50) DEFAULT 'value', -- 'value' | 'growth' | 'dividend'
  theme VARCHAR(20) DEFAULT 'dark', -- 'light' | 'dark'

  -- Metadata
  settings JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON user_settings(updated_at);

-- ============================================================================
-- Table: watchlists
-- Description: Stock watchlists
-- ============================================================================
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Watchlist data
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tickers TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,

  CONSTRAINT watchlist_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255)
);

CREATE INDEX IF NOT EXISTS idx_watchlists_updated_at ON watchlists(updated_at);
CREATE INDEX IF NOT EXISTS idx_watchlists_tickers ON watchlists USING GIN(tickers);

-- ============================================================================
-- Table: custom_scoring_profiles
-- Description: Custom scoring profiles for stock analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS custom_scoring_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Identification
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  base_profile VARCHAR(50) NOT NULL DEFAULT 'value',

  -- Configuration (JSON)
  config JSONB NOT NULL DEFAULT '{
    "ratios": [
      {"name": "PE", "weight": 0.2, "thresholds": {"excellent": 10, "good": 15, "fair": 20, "expensive": 25}},
      {"name": "PB", "weight": 0.15, "thresholds": {"excellent": 1, "good": 1.5, "fair": 2.5, "expensive": 3.5}},
      {"name": "PEG", "weight": 0.15, "thresholds": {"excellent": 0.5, "good": 1, "fair": 1.5, "expensive": 2}},
      {"name": "ROE", "weight": 0.15, "thresholds": {"excellent": 20, "good": 15, "fair": 10, "expensive": 5}, "inverse": true},
      {"name": "DebtToEquity", "weight": 0.1, "thresholds": {"excellent": 0.5, "good": 1, "fair": 1.5, "expensive": 2}},
      {"name": "DividendYield", "weight": 0.1, "thresholds": {"excellent": 4, "good": 3, "fair": 2, "expensive": 1}, "inverse": true},
      {"name": "RevenueGrowth", "weight": 0.15, "thresholds": {"excellent": 20, "good": 10, "fair": 5, "expensive": 0}, "inverse": true}
    ]
  }'::JSONB,

  -- Metadata
  is_active BOOLEAN DEFAULT true,

  CONSTRAINT scoring_profile_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255)
);

CREATE INDEX IF NOT EXISTS idx_custom_scoring_profiles_name ON custom_scoring_profiles(name);
CREATE INDEX IF NOT EXISTS idx_custom_scoring_profiles_active ON custom_scoring_profiles(is_active);

-- ============================================================================
-- Table: stock_cache
-- Description: Cache for scraped financial data
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_cache (
  ticker VARCHAR(20) PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Financial data (JSON)
  data JSONB NOT NULL,

  -- Data source
  source VARCHAR(50) NOT NULL, -- 'yahoo' | 'fmp' | 'polygon' | 'scraping'

  -- Metadata
  fetch_duration_ms INTEGER,
  error_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_stock_cache_expires_at ON stock_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_stock_cache_source ON stock_cache(source);
CREATE INDEX IF NOT EXISTS idx_stock_cache_updated_at ON stock_cache(updated_at);

-- ============================================================================
-- Table: stock_history
-- Description: History of all researched stocks with ratios and scores
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Stock identification
  ticker VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,

  -- Price data
  price NUMERIC(12, 4),
  currency VARCHAR(10),
  source VARCHAR(50) NOT NULL, -- 'yahoo' | 'fmp' | 'polygon' | 'scraping'

  -- Financial ratios (stored as JSON for flexibility)
  ratios JSONB NOT NULL DEFAULT '{}'::JSONB,

  -- Scoring and classification
  score INTEGER, -- 0-100
  verdict VARCHAR(50), -- 'EXCELLENT_DEAL' | 'GOOD_DEAL' | 'FAIR' | 'EXPENSIVE' | 'TOO_EXPENSIVE' | 'EXCEPTIONAL'
  stock_type VARCHAR(20) NOT NULL DEFAULT 'value', -- 'value' | 'growth' | 'dividend'

  -- Fetch metadata
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fetch_count INTEGER DEFAULT 1,

  CONSTRAINT stock_history_ticker_length CHECK (char_length(ticker) >= 1 AND char_length(ticker) <= 20),
  CONSTRAINT stock_history_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
  CONSTRAINT stock_history_score_range CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  CONSTRAINT stock_history_stock_type_valid CHECK (stock_type IN ('value', 'growth', 'dividend'))
);

CREATE INDEX IF NOT EXISTS idx_stock_history_ticker ON stock_history(ticker);
CREATE INDEX IF NOT EXISTS idx_stock_history_last_fetched ON stock_history(last_fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_history_stock_type ON stock_history(stock_type);
CREATE INDEX IF NOT EXISTS idx_stock_history_score ON stock_history(score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_stock_history_name ON stock_history(name);
CREATE INDEX IF NOT EXISTS idx_stock_history_updated_at ON stock_history(updated_at DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_stock_history_search ON stock_history
  USING GIN(to_tsvector('english', ticker || ' ' || name));

-- ============================================================================
-- Table: ai_usage_log
-- Description: Track AI API usage for cost monitoring
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Request details
  ticker TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('data_fetch', 'analysis')),

  -- AI model details
  model TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'openrouter',

  -- Token usage
  tokens_input INTEGER NOT NULL,
  tokens_output INTEGER NOT NULL,
  tokens_total INTEGER GENERATED ALWAYS AS (tokens_input + tokens_output) STORED,

  -- Cost (in USD)
  cost_usd DECIMAL(10, 6) NOT NULL,

  -- Result
  success BOOLEAN NOT NULL,
  confidence DECIMAL(3, 2), -- 0.00 to 1.00
  accepted BOOLEAN,
  error_message TEXT,

  -- Performance
  response_time_ms INTEGER
);

CREATE INDEX idx_ai_usage_created_at ON ai_usage_log(created_at);
CREATE INDEX idx_ai_usage_ticker ON ai_usage_log(ticker);
CREATE INDEX idx_ai_usage_purpose ON ai_usage_log(purpose);
CREATE INDEX idx_ai_usage_model ON ai_usage_log(model);

-- ============================================================================
-- Functions
-- ============================================================================

-- Function: Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-increment fetch_count
CREATE OR REPLACE FUNCTION increment_fetch_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.fetch_count = OLD.fetch_count + 1;
    NEW.last_fetched_at = NOW();
    NEW.first_added_at = OLD.first_added_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlists_updated_at
  BEFORE UPDATE ON watchlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_scoring_profiles_updated_at
  BEFORE UPDATE ON custom_scoring_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_cache_updated_at
  BEFORE UPDATE ON stock_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_history_updated_at
  BEFORE UPDATE ON stock_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for auto-incrementing fetch_count
CREATE TRIGGER stock_history_increment_fetch
  BEFORE UPDATE ON stock_history
  FOR EACH ROW
  EXECUTE FUNCTION increment_fetch_count();

-- ============================================================================
-- Views
-- ============================================================================

-- View: Valid (non-expired) stock cache
CREATE OR REPLACE VIEW valid_stock_cache AS
SELECT *
FROM stock_cache
WHERE expires_at > NOW();

-- View: Stock history statistics
CREATE OR REPLACE VIEW stock_history_stats AS
SELECT
  COUNT(*) AS total_stocks,
  COUNT(*) FILTER (WHERE stock_type = 'value') AS value_stocks,
  COUNT(*) FILTER (WHERE stock_type = 'growth') AS growth_stocks,
  COUNT(*) FILTER (WHERE stock_type = 'dividend') AS dividend_stocks,
  ROUND(AVG(score), 2) AS average_score,
  MAX(last_fetched_at) AS last_update
FROM stock_history;

-- View: Recently updated stocks
CREATE OR REPLACE VIEW recent_stock_updates AS
SELECT
  ticker,
  name,
  price,
  currency,
  score,
  verdict,
  stock_type,
  last_fetched_at,
  fetch_count
FROM stock_history
ORDER BY last_fetched_at DESC
LIMIT 20;

-- View: Current month AI spend
CREATE OR REPLACE VIEW ai_current_month_spend AS
SELECT
  SUM(cost_usd) as total_cost,
  COUNT(*) as total_calls,
  SUM(CASE WHEN purpose = 'data_fetch' THEN cost_usd ELSE 0 END) as data_fetch_cost,
  SUM(CASE WHEN purpose = 'analysis' THEN cost_usd ELSE 0 END) as analysis_cost,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_calls,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed_calls,
  AVG(CASE WHEN success AND confidence IS NOT NULL THEN confidence ELSE NULL END) as avg_confidence,
  SUM(CASE WHEN accepted THEN 1 ELSE 0 END)::FLOAT / NULLIF(SUM(CASE WHEN confidence IS NOT NULL THEN 1 ELSE 0 END), 0) as acceptance_rate
FROM ai_usage_log
WHERE created_at >= DATE_TRUNC('month', NOW());

-- View: Daily AI stats
CREATE OR REPLACE VIEW ai_daily_stats AS
SELECT
  DATE(created_at) as date,
  purpose,
  model,
  COUNT(*) as call_count,
  SUM(tokens_total) as total_tokens,
  SUM(cost_usd) as total_cost,
  AVG(CASE WHEN success THEN confidence ELSE NULL END) as avg_confidence,
  SUM(CASE WHEN success THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as success_rate,
  SUM(CASE WHEN accepted THEN 1 ELSE 0 END)::FLOAT / NULLIF(SUM(CASE WHEN confidence IS NOT NULL THEN 1 ELSE 0 END), 0) as acceptance_rate,
  AVG(response_time_ms) as avg_response_time_ms
FROM ai_usage_log
GROUP BY DATE(created_at), purpose, model
ORDER BY date DESC, purpose;

-- ============================================================================
-- Seed Data
-- ============================================================================

-- Default scoring profiles
INSERT INTO custom_scoring_profiles (name, description, base_profile, config)
VALUES (
  'Value (Default)',
  'Classic Value profile: focus on PE, PB, and dividends',
  'value',
  '{
    "ratios": [
      {"name": "PE", "weight": 0.25, "thresholds": {"excellent": 10, "good": 15, "fair": 20, "expensive": 25}},
      {"name": "PB", "weight": 0.25, "thresholds": {"excellent": 1, "good": 1.5, "fair": 2.5, "expensive": 3.5}},
      {"name": "DividendYield", "weight": 0.2, "thresholds": {"excellent": 4, "good": 3, "fair": 2, "expensive": 1}, "inverse": true},
      {"name": "DebtToEquity", "weight": 0.15, "thresholds": {"excellent": 0.5, "good": 1, "fair": 1.5, "expensive": 2}},
      {"name": "ROE", "weight": 0.15, "thresholds": {"excellent": 15, "good": 10, "fair": 5, "expensive": 0}, "inverse": true}
    ]
  }'::JSONB
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO custom_scoring_profiles (name, description, base_profile, config)
VALUES (
  'Growth (Default)',
  'Growth profile: focus on revenue/EPS growth and PEG',
  'growth',
  '{
    "ratios": [
      {"name": "RevenueGrowth", "weight": 0.3, "thresholds": {"excellent": 30, "good": 20, "fair": 10, "expensive": 5}, "inverse": true},
      {"name": "EPSGrowth", "weight": 0.3, "thresholds": {"excellent": 25, "good": 15, "fair": 8, "expensive": 3}, "inverse": true},
      {"name": "PEG", "weight": 0.25, "thresholds": {"excellent": 0.5, "good": 1, "fair": 1.5, "expensive": 2}},
      {"name": "ROE", "weight": 0.15, "thresholds": {"excellent": 20, "good": 15, "fair": 10, "expensive": 5}, "inverse": true}
    ]
  }'::JSONB
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO custom_scoring_profiles (name, description, base_profile, config)
VALUES (
  'Dividend (Default)',
  'Dividend profile: focus on yield and stability',
  'dividend',
  '{
    "ratios": [
      {"name": "DividendYield", "weight": 0.35, "thresholds": {"excellent": 5, "good": 4, "fair": 3, "expensive": 2}, "inverse": true},
      {"name": "PayoutRatio", "weight": 0.25, "thresholds": {"excellent": 50, "good": 60, "fair": 75, "expensive": 90}},
      {"name": "DebtToEquity", "weight": 0.2, "thresholds": {"excellent": 0.5, "good": 1, "fair": 1.5, "expensive": 2}},
      {"name": "PE", "weight": 0.2, "thresholds": {"excellent": 12, "good": 18, "fair": 25, "expensive": 30}}
    ]
  }'::JSONB
)
ON CONFLICT (name) DO NOTHING;

-- Default user settings (single user v1)
INSERT INTO user_settings (id, default_scoring_profile, theme)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'value',
  'dark'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE user_settings IS 'User settings (v1: single user, no auth)';
COMMENT ON TABLE watchlists IS 'Stock watchlists';
COMMENT ON TABLE custom_scoring_profiles IS 'Custom scoring profiles with ratio weights and thresholds';
COMMENT ON TABLE stock_cache IS 'Cache for scraped financial data';
COMMENT ON TABLE stock_history IS 'History of all researched stocks with ratios, scores and classification';
COMMENT ON TABLE ai_usage_log IS 'AI API usage tracking for cost monitoring';
COMMENT ON VIEW valid_stock_cache IS 'Non-expired cache entries';
COMMENT ON VIEW stock_history_stats IS 'Aggregate statistics for stock history';
COMMENT ON VIEW recent_stock_updates IS '20 most recently updated stocks';
