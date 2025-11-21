-- Migration Stock History
-- Version: 1.1.0
-- Description: Création de la table stock_history pour conserver l'historique des recherches

-- ============================================================================
-- Table: stock_history
-- Description: Historique de toutes les actions recherchées avec leurs ratios et scores
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Identification de l'action
  ticker VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,

  -- Données de prix
  price NUMERIC(12, 4),
  currency VARCHAR(10),
  source VARCHAR(50) NOT NULL, -- 'yahoo' | 'fmp' | 'polygon' | 'scraping'

  -- Ratios financiers (stockés en JSON pour flexibilité)
  ratios JSONB NOT NULL DEFAULT '{}'::JSONB,

  -- Scoring et classification
  score INTEGER, -- 0-100
  verdict VARCHAR(50), -- 'EXCELLENT_DEAL' | 'GOOD_DEAL' | 'FAIR' | 'EXPENSIVE' | 'TOO_EXPENSIVE' | 'EXCEPTIONAL'
  stock_type VARCHAR(20) NOT NULL DEFAULT 'value', -- 'value' | 'growth' | 'dividend'

  -- Métadonnées de fetch
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fetch_count INTEGER DEFAULT 1,

  -- Contraintes
  CONSTRAINT stock_history_ticker_length CHECK (char_length(ticker) >= 1 AND char_length(ticker) <= 20),
  CONSTRAINT stock_history_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
  CONSTRAINT stock_history_score_range CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  CONSTRAINT stock_history_stock_type_valid CHECK (stock_type IN ('value', 'growth', 'dividend'))
);

-- ============================================================================
-- Index pour performances
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_stock_history_ticker ON stock_history(ticker);
CREATE INDEX IF NOT EXISTS idx_stock_history_last_fetched ON stock_history(last_fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_history_stock_type ON stock_history(stock_type);
CREATE INDEX IF NOT EXISTS idx_stock_history_score ON stock_history(score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_stock_history_name ON stock_history(name);
CREATE INDEX IF NOT EXISTS idx_stock_history_updated_at ON stock_history(updated_at DESC);

-- Index GIN pour recherche full-text sur ticker et nom
CREATE INDEX IF NOT EXISTS idx_stock_history_search ON stock_history
  USING GIN(to_tsvector('english', ticker || ' ' || name));

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger: mise à jour automatique de updated_at
CREATE TRIGGER update_stock_history_updated_at
  BEFORE UPDATE ON stock_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction: auto-incrémentation du fetch_count et mise à jour de last_fetched_at
CREATE OR REPLACE FUNCTION increment_fetch_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger: auto-incrémentation lors des updates
CREATE TRIGGER stock_history_increment_fetch
  BEFORE UPDATE ON stock_history
  FOR EACH ROW
  EXECUTE FUNCTION increment_fetch_count();

-- ============================================================================
-- RLS (désactivé en v1 sans auth)
-- ============================================================================
ALTER TABLE stock_history DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Vues utiles
-- ============================================================================

-- Vue: Statistiques globales de l'historique
CREATE OR REPLACE VIEW stock_history_stats AS
SELECT
  COUNT(*) AS total_stocks,
  COUNT(*) FILTER (WHERE stock_type = 'value') AS value_stocks,
  COUNT(*) FILTER (WHERE stock_type = 'growth') AS growth_stocks,
  COUNT(*) FILTER (WHERE stock_type = 'dividend') AS dividend_stocks,
  ROUND(AVG(score), 2) AS average_score,
  MAX(last_fetched_at) AS last_update
FROM stock_history;

-- Vue: Stocks récemment mis à jour
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

-- ============================================================================
-- Comments pour documentation
-- ============================================================================
COMMENT ON TABLE stock_history IS 'Historique de toutes les actions recherchées avec ratios, scores et classification';
COMMENT ON COLUMN stock_history.ticker IS 'Code ticker de l''action (ex: AAPL, CAP.PA)';
COMMENT ON COLUMN stock_history.stock_type IS 'Classification automatique: value, growth, ou dividend';
COMMENT ON COLUMN stock_history.score IS 'Score global 0-100 calculé selon le profil';
COMMENT ON COLUMN stock_history.verdict IS 'Verdict d''investissement basé sur le score';
COMMENT ON COLUMN stock_history.ratios IS 'Tous les ratios financiers stockés en JSON';
COMMENT ON COLUMN stock_history.fetch_count IS 'Nombre de fois où cette action a été recherchée/mise à jour';
COMMENT ON COLUMN stock_history.first_added_at IS 'Date de la première recherche (ne change jamais)';
COMMENT ON COLUMN stock_history.last_fetched_at IS 'Date de la dernière mise à jour des données';
COMMENT ON VIEW stock_history_stats IS 'Statistiques agrégées de l''historique (totaux par type, score moyen)';
COMMENT ON VIEW recent_stock_updates IS 'Les 20 dernières actions mises à jour';
