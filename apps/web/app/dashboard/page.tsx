'use client';

import { useState } from 'react';
import { StockSearch } from '@/components/stock-search';
import { ScoreGauge } from '@/components/score-gauge';
import { RatioBreakdown } from '@/components/ratio-breakdown';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc/client';
import { Loader2, AlertCircle } from 'lucide-react';

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

  const isLoading = isLoadingStock || isLoadingScore;
  const error = stockError || scoreError;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Stock Screener
        </h1>
        <p className="text-gray-600">
          Analyse de valeur pour actions européennes • Focus France & Allemagne
        </p>
      </header>

      {/* Search Section */}
      <div className="mb-8">
        <StockSearch onStockSelected={(ticker) => setSelectedTicker(ticker)} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-8">
          <Card className="p-6 bg-red-50 border-red-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 mb-1">
                  Erreur lors du chargement
                </h3>
                <p className="text-red-700">
                  {error.message || 'Une erreur est survenue'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {isLoading && selectedTicker && (
        <div className="mb-8">
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-lg text-gray-600">
                Chargement des données pour {selectedTicker}...
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Main Dashboard Grid - Optimized for 34" screen */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Score Gauge (Large) */}
        <div className="xl:col-span-1">
          <Card className="p-8">
            <h2 className="text-2xl font-semibold mb-6">Score Global</h2>
            {scoringResult ? (
              <ScoreGauge
                score={scoringResult.score}
                verdict={scoringResult.verdict}
              />
            ) : (
              <div className="text-center py-16 text-gray-400">
                <p>Sélectionnez une action pour voir le score</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Ratio Breakdown (Wide) */}
        <div className="xl:col-span-2">
          <Card className="p-8">
            <h2 className="text-2xl font-semibold mb-6">Ratios Financiers</h2>
            {stockData ? (
              <RatioBreakdown
                ratios={stockData.ratios}
                breakdown={scoringResult?.breakdown}
              />
            ) : (
              <div className="text-center py-16 text-gray-400">
                <p>Sélectionnez une action pour voir les ratios</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Stock Info Card */}
      {stockData && (
        <div className="mt-8">
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-500">Ticker</p>
                <p className="text-xl font-semibold">{stockData.ticker}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Nom</p>
                <p className="text-xl font-semibold">{stockData.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Prix</p>
                <p className="text-xl font-semibold">
                  {stockData.price.toFixed(2)} {stockData.currency}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Source</p>
                <p className="text-xl font-semibold uppercase">{stockData.source}</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
