import { CheckCircle, XCircle, AlertTriangle, TrendingUp, Info } from 'lucide-react';

interface AIAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  redFlags: string[];
  industryContext: string;
  investmentThesis: string;
  metadata?: {
    model: string;
    tokensUsed: number;
    cost: number;
    timestamp: string;
  };
}

interface AIInsightsPanelProps {
  analysis: AIAnalysis;
  ticker: string;
  stockType: 'value' | 'growth' | 'dividend';
}

export function AIInsightsPanel({ analysis, ticker, stockType }: AIInsightsPanelProps) {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Analyse IA - {ticker}
              </h3>
              <p className="text-purple-100 text-sm">
                Profil: {stockType === 'value' ? 'Value' : stockType === 'growth' ? 'Croissance' : 'Rendement'}
              </p>
            </div>
          </div>

          {analysis.metadata && (
            <div className="text-right text-purple-100 text-xs">
              <p>Modèle: {analysis.metadata.model}</p>
              <p>Coût: ${analysis.metadata.cost.toFixed(4)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Summary */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-purple-600" />
            Résumé
          </h4>
          <p className="text-gray-700 leading-relaxed">
            {analysis.summary}
          </p>
        </div>

        {/* Strengths & Weaknesses Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Strengths */}
          <div>
            <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Points Forts
            </h4>
            <ul className="space-y-2">
              {analysis.strengths.map((strength, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-green-600 font-bold mt-0.5">•</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div>
            <h4 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Points Faibles
            </h4>
            <ul className="space-y-2">
              {analysis.weaknesses.map((weakness, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-orange-600 font-bold mt-0.5">•</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Red Flags */}
        {analysis.redFlags.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Drapeaux Rouges
            </h4>
            <ul className="space-y-1.5">
              {analysis.redFlags.map((flag, i) => (
                <li key={i} className="flex gap-2 text-sm text-red-700">
                  <span className="mt-0.5">🚩</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Industry Context */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">
            Contexte Sectoriel
          </h4>
          <p className="text-blue-900 text-sm leading-relaxed">
            {analysis.industryContext}
          </p>
        </div>

        {/* Investment Thesis */}
        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-900 mb-2">
            Thèse d'Investissement
          </h4>
          <p className="text-gray-700 leading-relaxed text-sm">
            {analysis.investmentThesis}
          </p>
        </div>

        {/* Disclaimer */}
        <div className="border-t pt-4 text-xs text-gray-500">
          <p className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Cette analyse est générée par IA et à titre informatif uniquement.
              Ce n'est pas un conseil financier. Vérifiez toutes les données de manière indépendante avant d'investir.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
