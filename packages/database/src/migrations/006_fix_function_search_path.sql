-- Migration: Fix Function Search Path
-- Version: 1.1.2
-- Description: Fixes search_path warning for increment_fetch_count function

-- ============================================================================
-- Fix: Recreate increment_fetch_count function with explicit search_path
-- ============================================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS increment_fetch_count();

-- Recreate with explicit search_path set to 'public'
CREATE OR REPLACE FUNCTION increment_fetch_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si c'est une mise à jour (pas une insertion)
  IF TG_OP = 'UPDATE' THEN
    NEW.fetch_count = OLD.fetch_count + 1;
    NEW.last_fetched_at = NOW();
    -- Conserver first_added_at de l'ancien enregistrement
    NEW.first_added_at = OLD.first_added_at;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Comment for documentation
-- ============================================================================

COMMENT ON FUNCTION increment_fetch_count() IS 'Auto-increment fetch_count and update last_fetched_at on stock_history updates - search_path secured';
