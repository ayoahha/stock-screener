'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TabNavigation } from '@/components/tab-navigation';
import { StockTypeBadge, type StockType } from '@/components/stock-type-badge';
import { DataSourceBadge, type DataSource } from '@/components/data-source-badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SkeletonTable } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { trpc } from '@/lib/trpc/client';
import {
  Search,
  History,
  RefreshCw,
  Eye,
  Loader2,
  AlertCircle,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Database } from '@stock-screener/database';

type SortField = 'lastFetched' | 'score' | 'name' | 'ticker';
type SortOrder = 'asc' | 'desc';
type StockHistoryItem = Database['public']['Tables']['stock_history']['Row'];
type StockHistoryStats = Database['public']['Views']['stock_history_stats']['Row'];

export default function HistoriquePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [stockTypeFilter, setStockTypeFilter] = useState<StockType | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [confirmRefresh, setConfirmRefresh] = useState<{ ticker: string; stockType: StockType } | null>(null);

  // Fetch history list
  const {
    data: historyData,
    isLoading,
    error,
    refetch,
  } = trpc.history.list.useQuery({
    filters: {
      searchQuery: searchQuery || undefined,
      stockType: stockTypeFilter !== 'all' ? stockTypeFilter : undefined,
    },
    sort: sortField,
    order: sortOrder,
    limit: 100,
  });

  // Fetch stats
  const { data: stats } = trpc.history.stats.useQuery() as { data: StockHistoryStats | undefined };

  // Refresh mutation
  const refreshMutation = trpc.history.refresh.useMutation({
    onSuccess: (_, variables) => {
      refetch();
      addToast({
        type: 'success',
        title: 'Données actualisées',
        description: `${variables.ticker} a été mis à jour avec succès`,
      });
    },
    onError: (error, variables) => {
      addToast({
        type: 'error',
        title: 'Erreur de mise à jour',
        description: `Impossible de mettre à jour ${variables.ticker}: ${error.message}`,
      });
    },
  });

  const handleRefreshClick = (ticker: string, stockType: StockType) => {
    setConfirmRefresh({ ticker, stockType });
  };

  const handleConfirmRefresh = async () => {
    if (confirmRefresh) {
      await refreshMutation.mutateAsync(confirmRefresh);
    }
  };

  const handleView = (ticker: string) => {
    router.push(`/dashboard?ticker=${ticker}`);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return (
      <ArrowUpDown
        className={`h-4 w-4 ${
          sortOrder === 'asc' ? 'text-blue-600' : 'text-blue-600 rotate-180'
        }`}
      />
    );
  };

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Enhanced Header */}
      <header className="mb-8" role="banner">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-gold to-brand-gold-light shadow-glow-gold" aria-hidden="true">
            <BarChart3 className="h-7 w-7 text-white" />
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
        {/* Enhanced Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card variant="interactive" className="p-5 bg-gradient-to-br from-white to-blue-50/30 dark:from-card dark:to-blue-950/30 border-l-4 border-blue-500 dark:border-blue-400">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Total
                </p>
                <p className="text-3xl font-display font-bold text-foreground tabular-nums">
                  {stats.total_stocks || 0}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/50">
                <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>

          <Card variant="interactive" className="p-5 bg-gradient-to-br from-white to-indigo-50/30 dark:from-card dark:to-indigo-950/30 border-l-4 border-indigo-500 dark:border-indigo-400">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Value
                </p>
                <p className="text-3xl font-display font-bold text-foreground tabular-nums">
                  {stats.value_stocks || 0}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/50">
                <TrendingDown className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </Card>

          <Card variant="interactive" className="p-5 bg-gradient-to-br from-white to-green-50/30 dark:from-card dark:to-green-950/30 border-l-4 border-green-500 dark:border-green-400">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Croissance
                </p>
                <p className="text-3xl font-display font-bold text-foreground tabular-nums">
                  {stats.growth_stocks || 0}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950/50">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>

          <Card variant="interactive" className="p-5 bg-gradient-to-br from-white to-amber-50/30 dark:from-card dark:to-amber-950/30 border-l-4 border-amber-500 dark:border-amber-400">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Rendement
                </p>
                <p className="text-3xl font-display font-bold text-foreground tabular-nums">
                  {stats.dividend_stocks || 0}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/50">
                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Enhanced Filters */}
      <Card variant="gradient" className="p-6 mb-8 border-l-4 border-brand-gold">
        <h3 className="text-lg font-display font-semibold text-foreground mb-4">
          Filtres
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="stock-search" className="block text-sm font-medium text-muted-foreground mb-2">
              Rechercher
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="stock-search"
                type="text"
                placeholder="Ticker ou nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border focus:ring-accent"
                aria-label="Rechercher une action par ticker ou nom"
              />
            </div>
          </div>

          {/* Stock Type Filter */}
          <div>
            <label htmlFor="stock-type-filter" className="block text-sm font-medium text-muted-foreground mb-2">
              Type d'action
            </label>
            <select
              id="stock-type-filter"
              value={stockTypeFilter}
              onChange={(e) => setStockTypeFilter(e.target.value as StockType | 'all')}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-accent transition-all"
              aria-label="Filtrer par type d'action"
            >
              <option value="all">Tous</option>
              <option value="value">Value</option>
              <option value="growth">Croissance</option>
              <option value="dividend">Rendement</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Enhanced Error Display */}
      {error && (
        <Card variant="elevated" className="p-6 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50 mb-8 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-1">
                Erreur lors du chargement
              </h3>
              <p className="text-red-700 dark:text-red-300">{error.message || 'Une erreur est survenue'}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Enhanced Loading State with Skeleton */}
      {isLoading && (
        <div className="animate-fade-in">
          <Card variant="gradient" className="p-6 mb-8">
            <div className="flex items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
              <div>
                <p className="text-lg font-semibold text-foreground">
                  Chargement de l'historique...
                </p>
                <p className="text-sm text-muted-foreground">
                  Récupération des données
                </p>
              </div>
            </div>
          </Card>
          <SkeletonTable rows={8} />
        </div>
      )}

      {/* Enhanced History Table - Desktop View */}
      {!isLoading && historyData && (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 animate-fade-in">
            {historyData.items.length === 0 ? (
              <Card variant="elevated" className="p-16">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="p-4 rounded-full bg-muted/30">
                    <History className="h-12 w-12 text-muted-foreground/40" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground mb-1">
                      Aucune action dans l'historique
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Recherchez une action pour commencer
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              historyData.items.map((stock: StockHistoryItem) => (
                <Card
                  key={stock.ticker}
                  variant="interactive"
                  className="p-4"
                  onClick={() => handleView(stock.ticker)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Voir les détails de ${stock.ticker} - ${stock.name}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleView(stock.ticker);
                    }
                  }}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-lg font-bold text-foreground font-mono">
                          {stock.ticker}
                        </p>
                        <p className="text-sm text-muted-foreground">{stock.name}</p>
                      </div>
                      {stock.score !== null && (
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold shadow-sm ${
                            stock.score >= 75
                              ? 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700'
                              : stock.score >= 60
                              ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                              : stock.score >= 40
                              ? 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700'
                              : 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700'
                          }`}
                        >
                          {stock.score}/100
                        </span>
                      )}
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Prix</p>
                        {stock.price ? (
                          <p className="font-semibold text-foreground tabular-nums">
                            {stock.price.toFixed(2)} {stock.currency}
                          </p>
                        ) : (
                          <p className="text-muted-foreground">-</p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground">Type</p>
                        <StockTypeBadge type={stock.stock_type} />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="text-xs text-muted-foreground">
                        {formatDistance(new Date(stock.last_fetched_at), new Date(), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRefreshClick(stock.ticker, stock.stock_type);
                        }}
                        disabled={refreshMutation.isPending}
                        aria-label={`Actualiser les données de ${stock.ticker}`}
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${
                            refreshMutation.isPending ? 'animate-spin' : ''
                          }`}
                          aria-hidden="true"
                        />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <Card variant="elevated" className="overflow-hidden animate-fade-in hidden md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border" aria-label="Historique des actions analysées">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-muted dark:to-muted/70">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => handleSort('ticker')}
                  >
                    <div className="flex items-center gap-2">
                      Ticker
                      <SortIcon field="ticker" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Nom
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Prix
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => handleSort('score')}
                  >
                    <div className="flex items-center gap-2">
                      Score
                      <SortIcon field="score" />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Source
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => handleSort('lastFetched')}
                  >
                    <div className="flex items-center gap-2">
                      Dernière MAJ
                      <SortIcon field="lastFetched" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {historyData.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 rounded-full bg-muted/30">
                          <History className="h-12 w-12 text-muted-foreground/40" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-foreground mb-1">
                            Aucune action dans l'historique
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Recherchez une action pour commencer
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  historyData.items.map((stock: StockHistoryItem) => (
                    <tr
                      key={stock.ticker}
                      className="hover:bg-muted/20 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-foreground font-mono">
                          {stock.ticker}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-foreground">
                          {stock.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {stock.price ? (
                          <span className="text-sm font-semibold text-foreground tabular-nums">
                            {stock.price.toFixed(2)} <span className="text-muted-foreground">{stock.currency}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {stock.score !== null ? (
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold shadow-sm ${
                              stock.score >= 75
                                ? 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700'
                                : stock.score >= 60
                                ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                                : stock.score >= 40
                                ? 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700'
                                : 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700'
                            }`}
                          >
                            {stock.score}/100
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <StockTypeBadge type={stock.stock_type} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {stock.source ? (
                          <DataSourceBadge
                            source={stock.source as DataSource}
                            confidence={(stock as any).confidence || undefined}
                          />
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-muted-foreground">
                          {formatDistance(new Date(stock.last_fetched_at), new Date(), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(stock.ticker)}
                            className="hover:bg-brand-gold/10 hover:border-brand-gold transition-colors"
                            aria-label={`Voir les détails de ${stock.ticker}`}
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRefreshClick(stock.ticker, stock.stock_type)}
                            disabled={refreshMutation.isPending}
                            className="hover:bg-blue-50 hover:border-blue-400 transition-colors disabled:opacity-50"
                            aria-label={`Actualiser les données de ${stock.ticker}`}
                          >
                            <RefreshCw
                              className={`h-3.5 w-3.5 ${
                                refreshMutation.isPending ? 'animate-spin text-blue-600' : ''
                              }`}
                              aria-hidden="true"
                            />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
        </>
      )}
      </main>

      {/* Confirmation Dialog for Refresh */}
      <ConfirmDialog
        open={!!confirmRefresh}
        onOpenChange={(open) => !open && setConfirmRefresh(null)}
        title="Actualiser les données"
        description={`Voulez-vous actualiser les données pour ${confirmRefresh?.ticker} ? Cette action récupérera les dernières informations disponibles.`}
        confirmLabel="Actualiser"
        cancelLabel="Annuler"
        onConfirm={handleConfirmRefresh}
      />
    </div>
  );
}
