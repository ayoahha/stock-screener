'use client';

import { type FinancialRatios } from '@stock-screener/scraper';
import { type RatioScore } from '@stock-screener/scoring';

interface RatioBreakdownProps {
  ratios: FinancialRatios;
  breakdown?: RatioScore[];
}

export function RatioBreakdown({ ratios, breakdown }: RatioBreakdownProps) {
  const ratioGroups = [
    {
      title: 'Valorisation',
      ratios: [
        { key: 'PE', label: 'P/E Ratio', format: (v: number) => v.toFixed(2) },
        { key: 'PB', label: 'P/B Ratio', format: (v: number) => v.toFixed(2) },
        { key: 'PS', label: 'P/S Ratio', format: (v: number) => v.toFixed(2) },
        { key: 'PEG', label: 'PEG Ratio', format: (v: number) => v.toFixed(2) },
      ],
    },
    {
      title: 'Profitabilité',
      ratios: [
        { key: 'ROE', label: 'ROE', format: (v: number) => `${(v * 100).toFixed(1)}%` },
        { key: 'ROA', label: 'ROA', format: (v: number) => `${(v * 100).toFixed(1)}%` },
        {
          key: 'ROIC',
          label: 'ROIC',
          format: (v: number) => `${(v * 100).toFixed(1)}%`,
          tooltip: 'Retour sur capital investi. Mesure l\'efficacité d\'utilisation du capital (dette + équité - trésorerie).'
        },
        { key: 'GrossMargin', label: 'Marge Brute', format: (v: number) => `${(v * 100).toFixed(1)}%` },
        { key: 'OperatingMargin', label: 'Marge Opérationnelle', format: (v: number) => `${(v * 100).toFixed(1)}%` },
        { key: 'NetMargin', label: 'Marge Nette', format: (v: number) => `${(v * 100).toFixed(1)}%` },
      ],
    },
    {
      title: 'Dette',
      ratios: [
        { key: 'DebtToEquity', label: 'Dette/Capitaux', format: (v: number) => v.toFixed(2) },
        { key: 'DebtToEBITDA', label: 'Dette/EBITDA', format: (v: number) => v.toFixed(2) },
        { key: 'CurrentRatio', label: 'Ratio de Liquidité', format: (v: number) => v.toFixed(2) },
        {
          key: 'QuickRatio',
          label: 'Ratio Rapide',
          format: (v: number) => v.toFixed(2),
          tooltip: 'Ratio de liquidité réduite. Utilise le Ratio de Liquidité comme valeur de secours si les données détaillées ne sont pas disponibles.'
        },
      ],
    },
    {
      title: 'Dividendes',
      ratios: [
        { key: 'DividendYield', label: 'Rendement Dividende', format: (v: number) => `${(v * 100).toFixed(2)}%` },
        { key: 'PayoutRatio', label: 'Taux Distribution', format: (v: number) => `${(v * 100).toFixed(1)}%` },
      ],
    },
    {
      title: 'Croissance',
      ratios: [
        { key: 'RevenueGrowth', label: 'Croissance CA', format: (v: number) => `${(v * 100).toFixed(1)}%` },
        { key: 'EPSGrowth', label: 'Croissance EPS', format: (v: number) => `${(v * 100).toFixed(1)}%` },
        {
          key: 'SGR',
          label: 'Croissance Valeur Comptable (SGR)',
          format: (v: number) => `${(v * 100).toFixed(1)}%`,
          tooltip: 'Taux de croissance soutenable. Valeur négative = ROE très élevé (>100%), indiquant un fort effet de levier.'
        },
      ],
    },
    {
      title: 'Autres',
      ratios: [
        { key: 'MarketCap', label: 'Capitalisation', format: (v: number) => formatMarketCap(v) },
        { key: 'Beta', label: 'Bêta', format: (v: number) => v.toFixed(2) },
      ],
    },
  ];

  const getScoreForRatio = (key: string): number | undefined => {
    return breakdown?.find((b) => b.ratio === key)?.score;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'bg-emerald-600';
    if (score >= 75) return 'bg-emerald-500';
    if (score >= 60) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-400';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-600';
  };

  return (
    <div className="space-y-8">
      {ratioGroups.map((group) => (
        <div key={group.title}>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">{group.title}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.ratios.map((ratio) => {
              const value = ratios[ratio.key as keyof FinancialRatios];
              const score = getScoreForRatio(ratio.key);

              const ratioWithTooltip = ratio as typeof ratio & { tooltip?: string };

              return (
                <div
                  key={ratio.key}
                  className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                  title={ratioWithTooltip.tooltip}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-500">{ratio.label}</p>
                        {ratioWithTooltip.tooltip && (
                          <span className="text-gray-400 cursor-help" title={ratioWithTooltip.tooltip}>
                            ℹ️
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {value !== undefined ? ratio.format(value) : 'N/A'}
                      </p>
                    </div>
                    {score !== undefined && (
                      <div className="flex flex-col items-end">
                        <div
                          className={`${getScoreColor(score)} text-white text-xs font-bold px-2 py-1 rounded`}
                        >
                          {score}/100
                        </div>
                      </div>
                    )}
                  </div>
                  {score !== undefined && (
                    <div className="mt-2">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getScoreColor(score)}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatMarketCap(value: number): string {
  if (value >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  return value.toFixed(0);
}
