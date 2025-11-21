'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TabNavigation } from '@/components/tab-navigation';
import { StockTypeBadge, type StockType } from '@/components/stock-type-badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc/client';
import {
  Search,
  History,
  RefreshCw,
  Eye,
  Loader2,
  AlertCircle,
  ArrowUpDown,
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
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Stock Screener</h1>
        <p className="text-gray-600">
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

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold">{stats.total_stocks || 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Value</p>
            <p className="text-2xl font-bold">{stats.value_stocks || 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Croissance</p>
            <p className="text-2xl font-bold">{stats.growth_stocks || 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Rendement</p>
            <p className="text-2xl font-bold">{stats.dividend_stocks || 0}</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Ticker ou nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Stock Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type d'action
            </label>
            <select
              value={stockTypeFilter}
              onChange={(e) => setStockTypeFilter(e.target.value as StockType | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous</option>
              <option value="value">Value</option>
              <option value="growth">Croissance</option>
              <option value="dividend">Rendement</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-6 bg-red-50 border-red-200 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-1">
                Erreur lors du chargement
              </h3>
              <p className="text-red-700">{error.message || 'Une erreur est survenue'}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-lg text-gray-600">Chargement de l'historique...</p>
          </div>
        </Card>
      )}

      {/* History Table */}
      {!isLoading && historyData && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('ticker')}
                  >
                    <div className="flex items-center gap-2">
                      Ticker
                      <SortIcon field="ticker" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Nom
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('score')}
                  >
                    <div className="flex items-center gap-2">
                      Score
                      <SortIcon field="score" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('lastFetched')}
                  >
                    <div className="flex items-center gap-2">
                      Dernière mise à jour
                      <SortIcon field="lastFetched" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historyData.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Aucune action dans l'historique.
                      <br />
                      Recherchez une action pour commencer.
                    </td>
                  </tr>
                ) : (
                  historyData.items.map((stock: StockHistoryItem) => (
                    <tr key={stock.ticker} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {stock.ticker}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stock.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stock.price ? (
                          <>
                            {stock.price.toFixed(2)} {stock.currency}
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {stock.score !== null ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              stock.score >= 75
                                ? 'bg-green-100 text-green-800'
                                : stock.score >= 60
                                ? 'bg-blue-100 text-blue-800'
                                : stock.score >= 40
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {stock.score}/100
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <StockTypeBadge type={stock.stock_type} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDistance(new Date(stock.last_fetched_at), new Date(), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(stock.ticker)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRefresh(stock.ticker, stock.stock_type)}
                            disabled={refreshMutation.isPending}
                          >
                            <RefreshCw
                              className={`h-4 w-4 ${
                                refreshMutation.isPending ? 'animate-spin' : ''
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
