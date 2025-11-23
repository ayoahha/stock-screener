'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { StockSearch } from '@/components/stock-search';
import { ScoreGauge } from '@/components/score-gauge';
import { RatioBreakdown } from '@/components/ratio-breakdown';
import { TabNavigation } from '@/components/tab-navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SkeletonCard, SkeletonGauge } from '@/components/ui/skeleton';
import { DataSourceBadge } from '@/components/data-source-badge';
import { AIInsightsButton } from '@/components/ai-insights-button';
import { trpc } from '@/lib/trpc/client';
import { Loader2, AlertCircle, Search, History, TrendingUp, RefreshCw } from 'lucide-react';
import { type FinancialRatios } from '@stock-screener/scraper';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [selectedTickers, setSelectedTickers] = useState<string[] | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState({ current: 0, total: 0 });
  const [selectedProfile, _setSelectedProfile] = useState<
    'value' | 'growth' | 'dividend'
  >('value');

  // Read ticker from URL parameter and auto-select it
  useEffect(() => {
    const tickerFromUrl = searchParams.get('ticker');
    if (tickerFromUrl && !selectedTicker) {
      setSelectedTicker(tickerFromUrl);
      setIsBatchMode(false);
      setSelectedTickers(null);
      setForceRefresh(false); // Reset refresh flag
    }
  }, [searchParams, selectedTicker]);

  // SMART LOADING: Try history first (instant load, no scraping)
  const {
    data: historyData,
    isLoading: isLoadingHistory,
    isFetched: historyFetched,
  } = trpc.history.get.useQuery(
    { ticker: selectedTicker! },
    {
      enabled: !!selectedTicker && !isBatchMode && !forceRefresh,
      staleTime: Infinity, // Don't auto-refetch
    }
  );

  // Only fetch fresh data if:
  // 1. Forcing refresh, OR
  // 2. History query completed but no data found (new ticker)
  const needsFreshData = forceRefresh || (historyFetched && !historyData);

  const {
    data: freshStockData,
    isLoading: isLoadingFresh,
    error: stockError,
  } = trpc.stock.fetch.useQuery(
    { ticker: selectedTicker!, forceRefresh: true },
    { enabled: !!selectedTicker && !isBatchMode && needsFreshData }
  );

  // Use history data if available (unless forcing refresh), otherwise use fresh data
  const stockData = forceRefresh ? freshStockData : (historyData || freshStockData);

  // Batch mode: Fetch multiple stocks
  const {
    data: batchStockData,
    isLoading: isLoadingBatch,
    error: batchError,
  } = trpc.stock.search.useQuery(
    { tickers: selectedTickers! },
    { enabled: !!selectedTickers && isBatchMode }
  );

  // Calculate score when stock data is available (single mode)
  // If using history data, we already have score/verdict
  const shouldCalculateScore = !!stockData && !historyData && !isBatchMode;

  const {
    data: calculatedScoring,
    isLoading: isLoadingScore,
    error: scoreError,
  } = trpc.scoring.calculate.useQuery(
    {
      ratios: (stockData?.ratios ?? {}) as Record<string, number | undefined>,
      profileType: historyData?.stock_type || selectedProfile,
    },
    { enabled: shouldCalculateScore }
  );

  // Use score from history if available, otherwise use calculated score
  const scoringResult = historyData
    ? {
        score: historyData.score ?? 0,
        verdict: (historyData.verdict ?? 'FAIR') as 'TOO_EXPENSIVE' | 'EXPENSIVE' | 'FAIR' | 'GOOD_DEAL' | 'EXCELLENT_DEAL' | 'EXCEPTIONAL',
        breakdown: undefined
      }
    : calculatedScoring;

  // Get stock classification for AI analysis (single mode)
  const {
    data: classification,
  } = trpc.scoring.classify.useQuery(
    {
      ratios: (stockData?.ratios ?? {}) as Record<string, number | undefined>,
    },
    { enabled: !!stockData && !historyData && !isBatchMode }
  );

  // Use stock_type from history if available, otherwise use classification
  const stockType = historyData?.stock_type || classification?.stockType;

  const isLoading = isBatchMode
    ? isLoadingBatch
    : (isLoadingHistory || isLoadingFresh || isLoadingScore);
  const error = isBatchMode ? batchError : (stockError || scoreError);

  // Mutation to refresh individual stock
  const refreshMutation = trpc.history.refresh.useMutation();

  // Get tRPC utils for manual queries
  const utils = trpc.useContext();

  // Handle refresh button click
  const handleRefresh = () => {
    setForceRefresh(true);
    // Reset after triggering to allow future refreshes
    setTimeout(() => setForceRefresh(false), 100);
  };

  // Handle refresh all button click
  const handleRefreshAll = async () => {
    if (!confirm('⚠️ Voulez-vous actualiser TOUTES les actions de l\'historique?\n\nCela peut prendre plusieurs minutes (3 secondes par action pour éviter les blocages).')) {
      return;
    }

    try {
      setIsRefreshingAll(true);

      // Fetch all stocks from history using tRPC
      const historyList = await utils.history.list.fetch({ limit: 1000 });
      const stocks = historyList.items || [];

      if (stocks.length === 0) {
        alert('Aucune action dans l\'historique à actualiser');
        setIsRefreshingAll(false);
        return;
      }

      setRefreshProgress({ current: 0, total: stocks.length });

      let successCount = 0;
      let errorCount = 0;

      // Refresh each stock sequentially with rate limiting
      for (let i = 0; i < stocks.length; i++) {
        const stock = stocks[i];
        try {
          await refreshMutation.mutateAsync({
            ticker: stock.ticker,
            stockType: stock.stock_type,
          });
          successCount++;
          setRefreshProgress({ current: i + 1, total: stocks.length });

          // Rate limiting: Wait 3 seconds between requests to avoid IP bans
          if (i < stocks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } catch (error) {
          console.error(`Failed to refresh ${stock.ticker}:`, error);
          errorCount++;
          // Continue with next stock even if one fails
        }
      }

      const message = errorCount > 0
        ? `✅ Actualisation terminée:\n${successCount} succès, ${errorCount} erreur(s)`
        : `✅ Actualisation terminée: ${successCount} action(s) mises à jour`;

      alert(message);
    } catch (error) {
      console.error('Error refreshing all stocks:', error);
      alert('❌ Erreur lors de l\'actualisation globale');
    } finally {
      setIsRefreshingAll(false);
      setRefreshProgress({ current: 0, total: 0 });
    }
  };

  const handleSingleTickerSelected = (ticker: string) => {
    setIsBatchMode(false);
    setSelectedTicker(ticker);
    setSelectedTickers(null);
  };

  const handleBatchTickersSelected = (tickers: string[]) => {
    setIsBatchMode(true);
    setSelectedTickers(tickers);
    setSelectedTicker(null);
  };

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
        {/* Search Section with Refresh All Button */}
        <div className="mb-8">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <StockSearch
                onStockSelected={handleSingleTickerSelected}
                onBatchSelected={handleBatchTickersSelected}
              />
            </div>
            <Button
              variant="outline"
              size="lg"
              onClick={handleRefreshAll}
              disabled={isRefreshingAll}
              className="hover:bg-green-50 hover:border-green-400 transition-colors mb-2"
              title="Actualiser toutes les actions de l'historique"
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshingAll ? 'animate-spin' : ''}`} />
              <span className="ml-2 font-semibold">
                {isRefreshingAll
                  ? `Actualisation ${refreshProgress.current}/${refreshProgress.total}...`
                  : 'Actualiser Tout'}
              </span>
            </Button>
          </div>
          {isRefreshingAll && (
            <Card variant="elevated" className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                    Actualisation en cours...
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {refreshProgress.current} / {refreshProgress.total} actions mises à jour (délai de 3s entre chaque)
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round((refreshProgress.current / refreshProgress.total) * 100)}%
                  </div>
                </div>
              </div>
              <div className="mt-3 bg-blue-200 dark:bg-blue-900 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${(refreshProgress.current / refreshProgress.total) * 100}%` }}
                />
              </div>
            </Card>
          )}
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
      {isLoading && (selectedTicker || selectedTickers) && (
        <div className="mb-8 animate-fade-in">
          <Card variant="gradient" className="p-6 mb-8">
            <div className="flex items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
              <div>
                <p className="text-lg font-semibold text-foreground">
                  Chargement des données...
                </p>
                <p className="text-sm text-muted-foreground">
                  {isBatchMode
                    ? `Analyse de ${selectedTickers?.length} actions en cours (avec délais pour éviter les blocages)`
                    : `Analyse de ${selectedTicker} en cours`}
                </p>
              </div>
            </div>
          </Card>

          {/* Loading Skeletons - Simplified */}
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
                  {[...Array(2)].map((_, i) => (
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

      {/* Enhanced Stock Info Card - Single Mode */}
      {!isBatchMode && stockData && (
        <div className="mb-8 animate-fade-in">
          <Card variant="gradient" className="p-6 border-l-4 border-brand-gold">
            <div className="flex items-start justify-between mb-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1">
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
                    {stockData.price?.toFixed(2) || 'N/A'} {stockData.price && <span className="text-base text-muted-foreground">{stockData.currency}</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Source
                  </p>
                  <DataSourceBadge
                    source={stockData.source}
                    confidence={'confidence' in stockData ? stockData.confidence : undefined}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoadingFresh}
                className="ml-4 hover:bg-blue-50 hover:border-blue-400 transition-colors"
                title="Actualiser les données depuis la source"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingFresh ? 'animate-spin' : ''}`} />
                <span className="ml-2">Actualiser</span>
              </Button>
            </div>
            {historyData && (
              <p className="text-xs text-muted-foreground mt-2">
                Dernière mise à jour : {new Date(historyData.last_fetched_at).toLocaleString('fr-FR')}
              </p>
            )}
          </Card>
        </div>
      )}

      {/* Batch Results - Multiple Stocks */}
      {isBatchMode && batchStockData && batchStockData.length > 0 && (
        <div className="mb-8 animate-fade-in">
          <Card variant="elevated" className="p-6">
            <h2 className="text-2xl font-display font-semibold mb-4">
              Résultats ({batchStockData.length} action{batchStockData.length > 1 ? 's' : ''})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {batchStockData.map((stock) => (
                <Card
                  key={stock.ticker}
                  variant="gradient"
                  className="p-4 border-l-4 border-brand-gold cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleSingleTickerSelected(stock.ticker)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-lg font-bold text-foreground">{stock.ticker}</p>
                      <p className="text-sm text-muted-foreground truncate">{stock.name}</p>
                    </div>
                    <DataSourceBadge source={stock.source} confidence={stock.confidence} />
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-display font-bold text-foreground">
                      {stock.price.toFixed(2)} <span className="text-sm text-muted-foreground">{stock.currency}</span>
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Cliquez pour voir les détails</p>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Main Dashboard Grid - Enhanced design - Single Mode Only */}
      {!isBatchMode && (
        <>
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
                    ratios={stockData.ratios as FinancialRatios}
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
          {stockData && scoringResult && stockType && (
            <div className="mt-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <Card variant="elevated" className="p-8 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-200/50 dark:border-purple-800/50">
                <h2 className="text-2xl font-display font-semibold mb-6 border-b border-border pb-3">
                  Analyse IA Qualitative
                </h2>
                <AIInsightsButton
                  ticker={stockData.ticker}
                  name={stockData.name}
                  ratios={stockData.ratios as Record<string, number | null>}
                  stockType={stockType}
                  score={scoringResult.score}
                  verdict={scoringResult.verdict || ''}
                />
              </Card>
            </div>
          )}
        </>
      )}
      </main>
    </div>
  );
}
