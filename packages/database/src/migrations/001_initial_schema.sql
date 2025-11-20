-- Migration initiale Stock Screener
-- Version: 1.0.0
-- Description: Création des tables pour watchlists et profils de scoring personnalisés

-- ============================================================================
-- Table: user_settings
-- Description: Paramètres utilisateur (sans auth en v1, un seul user fictif)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Préférences générales
  default_scoring_profile VARCHAR(50) DEFAULT 'value', -- 'value' | 'growth' | 'dividend'
  theme VARCHAR(20) DEFAULT 'dark', -- 'light' | 'dark'

  -- Métadonnées
  settings JSONB DEFAULT '{}'::JSONB
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON user_settings(updated_at);

-- RLS désactivé en v1 (pas d'auth)
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Table: watchlists
-- Description: Listes de surveillance de tickers
-- ============================================================================
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Données de la watchlist
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tickers TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array de tickers (ex: ['AAPL', 'CAP.PA'])

  -- Métadonnées
  metadata JSONB DEFAULT '{}'::JSONB,

  -- Contraintes
  CONSTRAINT watchlist_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_watchlists_updated_at ON watchlists(updated_at);
CREATE INDEX IF NOT EXISTS idx_watchlists_tickers ON watchlists USING GIN(tickers);

-- RLS désactivé en v1
ALTER TABLE watchlists DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Table: custom_scoring_profiles
-- Description: Profils de scoring personnalisés (poids et seuils des ratios)
-- ============================================================================
CREATE TABLE IF NOT EXISTS custom_scoring_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Identification
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  base_profile VARCHAR(50) NOT NULL DEFAULT 'value', -- 'value' | 'growth' | 'dividend'

  -- Configuration des ratios (JSON)
  -- Structure: { "ratios": [{ "name": "PE", "weight": 0.2, "thresholds": {...} }, ...] }
  config JSONB NOT NULL DEFAULT '{
    "ratios": [
      {
        "name": "PE",
        "weight": 0.2,
        "thresholds": {
          "excellent": 10,
          "good": 15,
          "fair": 20,
          "expensive": 25
        }
      },
      {
        "name": "PB",
        "weight": 0.15,
        "thresholds": {
          "excellent": 1,
          "good": 1.5,
          "fair": 2.5,
          "expensive": 3.5
        }
      },
      {
        "name": "PEG",
        "weight": 0.15,
        "thresholds": {
          "excellent": 0.5,
          "good": 1,
          "fair": 1.5,
          "expensive": 2
        }
      },
      {
        "name": "ROE",
        "weight": 0.15,
        "thresholds": {
          "excellent": 20,
          "good": 15,
          "fair": 10,
          "expensive": 5
        },
        "inverse": true
      },
      {
        "name": "DebtToEquity",
        "weight": 0.1,
        "thresholds": {
          "excellent": 0.5,
          "good": 1,
          "fair": 1.5,
          "expensive": 2
        }
      },
      {
        "name": "DividendYield",
        "weight": 0.1,
        "thresholds": {
          "excellent": 4,
          "good": 3,
          "fair": 2,
          "expensive": 1
        },
        "inverse": true
      },
      {
        "name": "RevenueGrowth",
        "weight": 0.15,
        "thresholds": {
          "excellent": 20,
          "good": 10,
          "fair": 5,
          "expensive": 0
        },
        "inverse": true
      }
    ]
  }'::JSONB,

  -- Métadonnées
  is_active BOOLEAN DEFAULT true,

  -- Contraintes
  CONSTRAINT scoring_profile_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_custom_scoring_profiles_name ON custom_scoring_profiles(name);
CREATE INDEX IF NOT EXISTS idx_custom_scoring_profiles_active ON custom_scoring_profiles(is_active);

-- RLS désactivé en v1
ALTER TABLE custom_scoring_profiles DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Table: stock_cache
-- Description: Cache des données financières scrapées (évite requêtes répétées)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_cache (
  ticker VARCHAR(20) PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Données financières (JSON)
  data JSONB NOT NULL,

  -- Source des données
  source VARCHAR(50) NOT NULL, -- 'yahoo' | 'fmp' | 'polygon' | 'scraping'

  -- Métadonnées
  fetch_duration_ms INTEGER,
  error_count INTEGER DEFAULT 0
);

-- Index
CREATE INDEX IF NOT EXISTS idx_stock_cache_expires_at ON stock_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_stock_cache_source ON stock_cache(source);
CREATE INDEX IF NOT EXISTS idx_stock_cache_updated_at ON stock_cache(updated_at);

-- RLS désactivé en v1
ALTER TABLE stock_cache DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Fonctions et triggers
-- ============================================================================

-- Fonction: mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers updated_at pour toutes les tables
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

-- ============================================================================
-- Données de seed (profils par défaut)
-- ============================================================================

-- Profil Value par défaut
INSERT INTO custom_scoring_profiles (name, description, base_profile, config)
VALUES (
  'Value (Default)',
  'Profil Value classique : focus sur PE, PB, et dividendes',
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

-- Profil Growth par défaut
INSERT INTO custom_scoring_profiles (name, description, base_profile, config)
VALUES (
  'Growth (Default)',
  'Profil Growth : focus sur croissance revenue/EPS et PEG',
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

-- Profil Dividend par défaut
INSERT INTO custom_scoring_profiles (name, description, base_profile, config)
VALUES (
  'Dividend (Default)',
  'Profil Dividend : focus sur rendement dividende et stabilité',
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

-- User settings par défaut (un seul user en v1 sans auth)
INSERT INTO user_settings (id, default_scoring_profile, theme)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'value',
  'dark'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Vues utiles
-- ============================================================================

-- Vue: stock_cache valide (non expiré)
CREATE OR REPLACE VIEW valid_stock_cache AS
SELECT *
FROM stock_cache
WHERE expires_at > NOW();

-- ============================================================================
-- Comments pour documentation
-- ============================================================================

COMMENT ON TABLE user_settings IS 'Paramètres utilisateur globaux (v1: sans auth, un seul user)';
COMMENT ON TABLE watchlists IS 'Listes de surveillance de tickers';
COMMENT ON TABLE custom_scoring_profiles IS 'Profils de scoring personnalisés avec poids et seuils des ratios';
COMMENT ON TABLE stock_cache IS 'Cache des données financières scrapées pour éviter requêtes répétées';
COMMENT ON VIEW valid_stock_cache IS 'Vue des données de cache non expirées';
