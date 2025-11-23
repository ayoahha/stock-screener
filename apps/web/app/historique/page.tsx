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
  const [searchQuery, setSearchQuery] = useState('');
  const [stockTypeFilter, setStockTypeFilter] = useState<StockType | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

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
    onSuccess: () => {
      refetch();
    },
  });

  const handleRefresh = async (ticker: string, stockType: StockType) => {
    await refreshMutation.mutateAsync({ ticker, stockType });
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
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-gold to-brand-gold-light shadow-glow-gold">
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
      <TabNavigation
        tabs={[
          { label: 'Recherche', href: '/dashboard', icon: <Search className="h-5 w-5" /> },
          { label: 'Historique', href: '/historique', icon: <History className="h-5 w-5" /> },
        ]}
      />

      {/* Enhanced Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card variant="interactive" className="p-5 bg-gradient-to-br from-white to-blue-50/30 border-l-4 border-blue-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Total
                </p>
                <p className="text-3xl font-display font-bold text-foreground tabular-nums">
                  {stats.total_stocks || 0}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card variant="interactive" className="p-5 bg-gradient-to-br from-white to-indigo-50/30 border-l-4 border-indigo-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Value
                </p>
                <p className="text-3xl font-display font-bold text-foreground tabular-nums">
                  {stats.value_stocks || 0}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-indigo-100">
                <TrendingDown className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </Card>

          <Card variant="interactive" className="p-5 bg-gradient-to-br from-white to-green-50/30 border-l-4 border-green-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Croissance
                </p>
                <p className="text-3xl font-display font-bold text-foreground tabular-nums">
                  {stats.growth_stocks || 0}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </Card>

          <Card variant="interactive" className="p-5 bg-gradient-to-br from-white to-amber-50/30 border-l-4 border-amber-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Rendement
                </p>
                <p className="text-3xl font-display font-bold text-foreground tabular-nums">
                  {stats.dividend_stocks || 0}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-amber-100">
                <DollarSign className="h-5 w-5 text-amber-600" />
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
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Rechercher
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Ticker ou nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border focus:ring-accent"
              />
            </div>
          </div>

          {/* Stock Type Filter */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Type d'action
            </label>
            <select
              value={stockTypeFilter}
              onChange={(e) => setStockTypeFilter(e.target.value as StockType | 'all')}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-accent transition-all"
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
        <Card variant="elevated" className="p-6 bg-red-50 border-red-200 mb-8 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-900 mb-1">
                Erreur lors du chargement
              </h3>
              <p className="text-red-700">{error.message || 'Une erreur est survenue'}</p>
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

      {/* Enhanced History Table */}
      {!isLoading && historyData && (
        <Card variant="elevated" className="overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                <tr>
                  <th
                    className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => handleSort('ticker')}
                  >
                    <div className="flex items-center gap-2">
                      Ticker
                      <SortIcon field="ticker" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Nom
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Prix
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => handleSort('score')}
                  >
                    <div className="flex items-center gap-2">
                      Score
                      <SortIcon field="score" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Source
                  </th>
                  <th
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
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : stock.score >= 60
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : stock.score >= 40
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
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
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRefresh(stock.ticker, stock.stock_type)}
                            disabled={refreshMutation.isPending}
                            className="hover:bg-blue-50 hover:border-blue-400 transition-colors disabled:opacity-50"
                          >
                            <RefreshCw
                              className={`h-3.5 w-3.5 ${
                                refreshMutation.isPending ? 'animate-spin text-blue-600' : ''
                              }`}
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
      )}
    </div>
  );
}
