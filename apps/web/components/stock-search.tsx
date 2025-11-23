'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface StockSearchProps {
  onStockSelected: (ticker: string) => void;
  onBatchSelected?: (tickers: string[]) => void;
}

export function StockSearch({ onStockSelected, onBatchSelected }: StockSearchProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const trimmedQuery = query.trim().toUpperCase();

      // Check if query contains comma-separated tickers
      if (trimmedQuery.includes(',')) {
        // Parse comma-separated tickers
        const tickers = trimmedQuery
          .split(',')
          .map(t => t.trim())
          .filter(t => t.length > 0);

        if (tickers.length > 10) {
          alert('Maximum 10 tickers allowed at once');
          return;
        }

        if (tickers.length > 1 && onBatchSelected) {
          // Batch mode
          onBatchSelected(tickers);
        } else if (tickers.length === 1 && tickers[0]) {
          // Single ticker
          onStockSelected(tickers[0]);
        }
      } else {
        // Single ticker mode (original behavior)
        if (
          trimmedQuery.includes('.') ||
          trimmedQuery.length <= 5 ||
          /^[A-Z]+$/.test(trimmedQuery)
        ) {
          // Looks like a ticker, use directly
          onStockSelected(trimmedQuery);
        } else {
          // Try to resolve company name to ticker
          // For now, just use the query directly
          // In a future enhancement, we could use trpc.stock.resolve here
          onStockSelected(trimmedQuery);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card className="p-6">
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Rechercher une action (ex: CAP.PA ou CAP.PA,MC.PA,AIR.PA pour plusieurs)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 h-12 text-lg"
              disabled={loading}
            />
          </div>
        </div>
        <Button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          size="lg"
          className="px-8"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Recherche...
            </>
          ) : (
            'Analyser'
          )}
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 flex gap-2 flex-wrap">
        <p className="text-sm text-gray-500 w-full mb-1">Exemples :</p>
        {['CAP.PA', 'MC.PA', 'AIR.PA', 'BMW.DE', 'AAPL'].map((ticker) => (
          <Button
            key={ticker}
            variant="outline"
            size="sm"
            onClick={() => {
              setQuery(ticker);
              onStockSelected(ticker);
            }}
          >
            {ticker}
          </Button>
        ))}
      </div>
    </Card>
  );
}
