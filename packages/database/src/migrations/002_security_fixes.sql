-- Migration: Security Fixes
-- Version: 1.0.1
-- Description: Enable RLS and fix Security Definer View

-- ============================================================================
-- 1. Enable RLS on all public tables
-- ============================================================================

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_scoring_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_cache ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Add Permissive Policies (v1: No Auth / Single User)
--    WARNING: These policies allow public access. Secure them when adding Auth.
-- ============================================================================

-- user_settings
CREATE POLICY "Allow public access to user_settings"
  ON user_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- watchlists
CREATE POLICY "Allow public access to watchlists"
  ON watchlists
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- custom_scoring_profiles
CREATE POLICY "Allow public access to custom_scoring_profiles"
  ON custom_scoring_profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- stock_cache
CREATE POLICY "Allow public access to stock_cache"
  ON stock_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. Fix Security Definer View
--    Recreate view with security_invoker = true (or just default which is invoker)
--    The previous view might have been created with default (which is invoker) 
--    but Supabase flagged it? 
--    Actually, the error said: "View `public.valid_stock_cache` is defined with the SECURITY DEFINER property"
--    So we explicitly drop and recreate it without that property, or explicitly set security_invoker.
-- ============================================================================

DROP VIEW IF EXISTS valid_stock_cache;

CREATE OR REPLACE VIEW valid_stock_cache
WITH (security_invoker = true)
AS
SELECT *
FROM stock_cache
WHERE expires_at > NOW();

COMMENT ON VIEW valid_stock_cache IS 'Vue des données de cache non expirées (Security Invoker)';
