'use client';

import { useState } from 'react';
import { StockSearch } from '@/components/stock-search';
import { ScoreGauge } from '@/components/score-gauge';
import { RatioBreakdown } from '@/components/ratio-breakdown';
import { TabNavigation } from '@/components/tab-navigation';
import { Card } from '@/components/ui/card';
import { SkeletonCard, SkeletonGauge } from '@/components/ui/skeleton';
import { DataSourceBadge } from '@/components/data-source-badge';
import { AIInsightsButton } from '@/components/ai-insights-button';
import { trpc } from '@/lib/trpc/client';
import { Loader2, AlertCircle, Search, History, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [selectedProfile, _setSelectedProfile] = useState<
    'value' | 'growth' | 'dividend'
  >('value');

  // Fetch stock data when ticker is selected
  const {
    data: stockData,
    isLoading: isLoadingStock,
    error: stockError,
  } = trpc.stock.fetch.useQuery(
    { ticker: selectedTicker! },
    { enabled: !!selectedTicker }
  );

  // Calculate score when stock data is available
  const {
    data: scoringResult,
    isLoading: isLoadingScore,
    error: scoreError,
  } = trpc.scoring.calculate.useQuery(
    {
      ratios: (stockData?.ratios ?? {}) as Record<string, number | undefined>,
      profileType: selectedProfile,
    },
    { enabled: !!stockData }
  );

  // Get stock classification for AI analysis
  const {
    data: classification,
  } = trpc.scoring.classify.useQuery(
    {
      ratios: (stockData?.ratios ?? {}) as Record<string, number | undefined>,
    },
    { enabled: !!stockData }
  );

  const isLoading = isLoadingStock || isLoadingScore;
  const error = stockError || scoreError;

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Enhanced Header with gradient accent */}
      <header className="mb-8" role="banner">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-gold to-brand-gold-light shadow-glow-gold" aria-hidden="true">
            <TrendingUp className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-5xl font-display font-bold text-foreground tracking-tight">
            Stock Screener
          </h1>
        </div>
        <p className="text-muted-foreground text-lg ml-14">
          Analyse de valeur pour actions européennes • Focus France & Allemagne
        </p>
      </header>

      {/* Tab Navigation */}
      <nav aria-label="Navigation principale">
        <TabNavigation
          tabs={[
            { label: 'Recherche', href: '/dashboard', icon: <Search className="h-5 w-5" /> },
            { label: 'Historique', href: '/historique', icon: <History className="h-5 w-5" /> },
          ]}
        />
      </nav>

      <main id="main-content">
        {/* Search Section */}
        <div className="mb-8">
          <StockSearch onStockSelected={(ticker) => setSelectedTicker(ticker)} />
        </div>

      {/* Enhanced Error Display */}
      {error && (
        <div className="mb-8 animate-fade-in">
          <Card variant="elevated" className="p-6 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-1">
                  Erreur lors du chargement
                </h3>
                <p className="text-red-700 dark:text-red-300">
                  {error.message || 'Une erreur est survenue'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Enhanced Loading State with Skeletons */}
      {isLoading && selectedTicker && (
        <div className="mb-8 animate-fade-in">
          <Card variant="gradient" className="p-6 mb-8">
            <div className="flex items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
              <div>
                <p className="text-lg font-semibold text-foreground">
                  Chargement des données...
                </p>
                <p className="text-sm text-muted-foreground">
                  Analyse de {selectedTicker} en cours
                </p>
              </div>
            </div>
          </Card>

          {/* Loading Skeletons */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-1">
              <Card variant="elevated" className="p-8">
                <h2 className="text-2xl font-display font-semibold mb-6">Score Global</h2>
                <SkeletonGauge />
              </Card>
            </div>
            <div className="xl:col-span-2">
              <Card variant="elevated" className="p-8">
                <h2 className="text-2xl font-display font-semibold mb-6">Ratios Financiers</h2>
                <div className="space-y-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[...Array(3)].map((_, j) => (
                        <SkeletonCard key={j} />
                      ))}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Stock Info Card */}
      {stockData && (
        <div className="mb-8 animate-fade-in">
          <Card variant="gradient" className="p-6 border-l-4 border-brand-gold">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Ticker
                </p>
                <p className="text-2xl font-display font-bold text-foreground">
                  {stockData.ticker}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Nom
                </p>
                <p className="text-xl font-semibold text-foreground">
                  {stockData.name}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Prix
                </p>
                <p className="text-2xl font-display font-bold text-foreground tabular-nums">
                  {stockData.price.toFixed(2)} <span className="text-base text-muted-foreground">{stockData.currency}</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Source
                </p>
                <DataSourceBadge
                  source={stockData.source}
                  confidence={stockData.confidence}
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Dashboard Grid - Enhanced design */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in">
        {/* Left Column: Score Gauge */}
        <div className="xl:col-span-1">
          <Card variant="elevated" className="p-8 bg-gradient-to-br from-white to-gray-50/30 dark:from-card dark:to-muted/30">
            <h2 className="text-2xl font-display font-semibold mb-6 border-b border-border pb-3">
              Score Global
            </h2>
            {scoringResult ? (
              <ScoreGauge
                score={scoringResult.score}
                verdict={scoringResult.verdict}
              />
            ) : (
              <div className="text-center py-16">
                <div className="inline-block p-4 rounded-full bg-muted/30 mb-4">
                  <Search className="h-12 w-12 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-medium">
                  Sélectionnez une action pour voir le score
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Ratio Breakdown */}
        <div className="xl:col-span-2">
          <Card variant="elevated" className="p-8">
            <h2 className="text-2xl font-display font-semibold mb-6 border-b border-border pb-3">
              Ratios Financiers
            </h2>
            {stockData ? (
              <RatioBreakdown
                ratios={stockData.ratios}
                breakdown={scoringResult?.breakdown}
              />
            ) : (
              <div className="text-center py-16">
                <div className="inline-block p-4 rounded-full bg-muted/30 mb-4">
                  <TrendingUp className="h-12 w-12 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-medium">
                  Sélectionnez une action pour voir les ratios
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

        {/* AI Insights Section - Enhanced */}
        {stockData && scoringResult && classification && (
          <div className="mt-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Card variant="elevated" className="p-8 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-200/50 dark:border-purple-800/50">
              <h2 className="text-2xl font-display font-semibold mb-6 border-b border-border pb-3">
                Analyse IA Qualitative
              </h2>
              <AIInsightsButton
                ticker={stockData.ticker}
                name={stockData.name}
                ratios={stockData.ratios as Record<string, number | null>}
                stockType={classification.stockType}
                score={scoringResult.score}
                verdict={scoringResult.verdict}
              />
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
