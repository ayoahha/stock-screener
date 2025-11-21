-- Migration: Fix Function Search Path
-- Version: 1.0.2
-- Description: Fix "Function Search Path Mutable" warning by setting explicit search_path

-- ============================================================================
-- Fix: update_updated_at_column
-- Issue: Function `public.update_updated_at_column` has a role mutable search_path
-- Remediation: Set search_path to '' (secure) or 'public'
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';
