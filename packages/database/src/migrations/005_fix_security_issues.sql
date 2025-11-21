-- Migration: Fix Security Issues
-- Version: 1.1.1
-- Description: Fixes security linter warnings for stock_history table and views

-- ============================================================================
-- Fix 1: Recreate views with SECURITY INVOKER instead of SECURITY DEFINER
-- ============================================================================

-- Drop existing views first
DROP VIEW IF EXISTS stock_history_stats;
DROP VIEW IF EXISTS recent_stock_updates;

-- Recreate stock_history_stats view with SECURITY INVOKER
CREATE OR REPLACE VIEW stock_history_stats
WITH (security_invoker = true)
AS
SELECT
  COUNT(*) AS total_stocks,
  COUNT(*) FILTER (WHERE stock_type = 'value') AS value_stocks,
  COUNT(*) FILTER (WHERE stock_type = 'growth') AS growth_stocks,
  COUNT(*) FILTER (WHERE stock_type = 'dividend') AS dividend_stocks,
  ROUND(AVG(score), 2) AS average_score,
  MAX(last_fetched_at) AS last_update
FROM stock_history;

-- Recreate recent_stock_updates view with SECURITY INVOKER
CREATE OR REPLACE VIEW recent_stock_updates
WITH (security_invoker = true)
AS
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

-- ============================================================================
-- Fix 2: Enable RLS on stock_history table
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Fix 3: Add permissive policy for v1 (no auth)
-- ============================================================================

-- Since v1 has no authentication, we create a permissive policy that allows
-- all operations. This is more secure than disabling RLS entirely, and allows
-- for future auth implementation without schema changes.

-- Policy: Allow all SELECT operations
CREATE POLICY "Allow public read access"
  ON stock_history
  FOR SELECT
  USING (true);

-- Policy: Allow all INSERT operations
CREATE POLICY "Allow public insert access"
  ON stock_history
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow all UPDATE operations
CREATE POLICY "Allow public update access"
  ON stock_history
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Allow all DELETE operations
CREATE POLICY "Allow public delete access"
  ON stock_history
  FOR DELETE
  USING (true);

-- ============================================================================
-- Update comments
-- ============================================================================

COMMENT ON VIEW stock_history_stats IS 'Statistiques agrégées de l''historique (totaux par type, score moyen) - SECURITY INVOKER';
COMMENT ON VIEW recent_stock_updates IS 'Les 20 dernières actions mises à jour - SECURITY INVOKER';
COMMENT ON TABLE stock_history IS 'Historique de toutes les actions recherchées avec ratios, scores et classification - RLS enabled with permissive policies for v1';
