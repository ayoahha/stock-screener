'use client';

import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { AIInsightsPanel } from './ai-insights-panel';

interface AIInsightsButtonProps {
  ticker: string;
  name: string;
  ratios: Record<string, number | null>;
  stockType: 'value' | 'growth' | 'dividend';
  score: number;
  verdict: string;
}

export function AIInsightsButton(props: AIInsightsButtonProps) {
  const [showInsights, setShowInsights] = useState(false);

  const { data, isLoading, error, refetch } = trpc.analysis.analyze.useQuery(
    {
      ticker: props.ticker,
      name: props.name,
      ratios: props.ratios,
      stockType: props.stockType,
      score: props.score,
      verdict: props.verdict,
    },
    {
      enabled: showInsights, // Only fetch when user clicks
      staleTime: 1000 * 60 * 60, // Cache for 1 hour
      retry: false, // Don't retry on failure (costs money!)
    }
  );

  const handleClick = () => {
    if (!showInsights) {
      setShowInsights(true);
    } else {
      refetch(); // Refresh analysis
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Génération des insights...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            {showInsights && data ? 'Actualiser' : 'Obtenir les insights IA'}
          </>
        )}
      </button>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800 text-sm">Erreur</p>
            <p className="text-red-700 text-sm mt-1">
              {error.message || 'Impossible de générer l\'analyse IA'}
            </p>
          </div>
        </div>
      )}

      {showInsights && data && !error && (
        <AIInsightsPanel
          analysis={data}
          ticker={props.ticker}
          stockType={props.stockType}
        />
      )}
    </div>
  );
}
