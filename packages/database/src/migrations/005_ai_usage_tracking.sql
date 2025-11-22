-- Migration: AI Usage Tracking
-- Purpose: Track AI API usage, costs, and performance for budget management
-- Created: 2025-11-22

-- AI usage log table
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

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
  confidence DECIMAL(3, 2), -- 0.00 to 1.00 (for data_fetch only)
  accepted BOOLEAN, -- Was data accepted (confidence >= 0.80)?
  error_message TEXT,

  -- Performance
  response_time_ms INTEGER
);

-- Indexes for efficient querying
CREATE INDEX idx_ai_usage_created_at ON ai_usage_log(created_at);
CREATE INDEX idx_ai_usage_ticker ON ai_usage_log(ticker);
CREATE INDEX idx_ai_usage_purpose ON ai_usage_log(purpose);
CREATE INDEX idx_ai_usage_model ON ai_usage_log(model);

-- View: Current month spend and statistics
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

-- View: Daily usage statistics
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

-- View: Top cost drivers (most expensive tickers)
CREATE OR REPLACE VIEW ai_top_cost_drivers AS
SELECT
  ticker,
  COUNT(*) as call_count,
  SUM(cost_usd) as total_cost,
  AVG(CASE WHEN success THEN confidence ELSE NULL END) as avg_confidence,
  MAX(created_at) as last_call
FROM ai_usage_log
WHERE success = true
GROUP BY ticker
ORDER BY total_cost DESC
LIMIT 20;

-- View: Model comparison
CREATE OR REPLACE VIEW ai_model_comparison AS
SELECT
  model,
  COUNT(*) as call_count,
  SUM(cost_usd) as total_cost,
  AVG(cost_usd) as avg_cost_per_call,
  AVG(tokens_total) as avg_tokens,
  AVG(CASE WHEN success THEN confidence ELSE NULL END) as avg_confidence,
  SUM(CASE WHEN success THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as success_rate,
  AVG(response_time_ms) as avg_response_time_ms
FROM ai_usage_log
GROUP BY model
ORDER BY total_cost DESC;

-- Comment on table
COMMENT ON TABLE ai_usage_log IS 'Tracks all AI API calls for cost monitoring, budget enforcement, and performance analysis';
COMMENT ON COLUMN ai_usage_log.purpose IS 'Type of AI request: data_fetch (financial ratios) or analysis (qualitative insights)';
COMMENT ON COLUMN ai_usage_log.confidence IS 'AI confidence score (0.00-1.00) for data_fetch requests only';
COMMENT ON COLUMN ai_usage_log.accepted IS 'Whether AI data met validation threshold (confidence >= 0.80)';
