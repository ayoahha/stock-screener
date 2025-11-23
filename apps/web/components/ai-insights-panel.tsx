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
    <div className="bg-gradient-to-br from-purple-50/80 via-blue-50/80 to-indigo-50/80 rounded-xl border-2 border-purple-200/60 overflow-hidden shadow-card-elevated animate-fade-in">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 px-6 py-5 relative overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
        </div>

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/25 backdrop-blur-sm rounded-xl shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-white tracking-tight">
                Analyse IA - {ticker}
              </h3>
              <p className="text-purple-100 text-sm font-medium">
                Profil: {stockType === 'value' ? 'Value' : stockType === 'growth' ? 'Croissance' : 'Rendement'}
              </p>
            </div>
          </div>

          {analysis.metadata && (
            <div className="text-right text-purple-100 text-xs font-medium bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm">
              <p>Modèle: {analysis.metadata.model}</p>
              <p>Coût: ${analysis.metadata.cost.toFixed(4)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Content */}
      <div className="p-8 space-y-6">
        {/* Summary */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-purple-100/50 shadow-sm">
          <h4 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-100">
              <Info className="w-4 h-4 text-purple-600" />
            </div>
            Résumé
          </h4>
          <p className="text-foreground/90 leading-relaxed">
            {analysis.summary}
          </p>
        </div>

        {/* Strengths & Weaknesses Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-green-100/50 shadow-sm">
            <h4 className="font-display font-bold text-green-700 mb-4 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-100">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              Points Forts
            </h4>
            <ul className="space-y-2.5">
              {analysis.strengths.map((strength, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-foreground/80">
                  <span className="text-green-600 font-bold mt-0.5 text-base">•</span>
                  <span className="leading-relaxed">{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-orange-100/50 shadow-sm">
            <h4 className="font-display font-bold text-orange-700 mb-4 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-100">
                <XCircle className="w-4 h-4 text-orange-600" />
              </div>
              Points Faibles
            </h4>
            <ul className="space-y-2.5">
              {analysis.weaknesses.map((weakness, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-foreground/80">
                  <span className="text-orange-600 font-bold mt-0.5 text-base">•</span>
                  <span className="leading-relaxed">{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Red Flags */}
        {analysis.redFlags.length > 0 && (
          <div className="bg-red-50/80 backdrop-blur-sm border-2 border-red-200 rounded-xl p-5 shadow-sm">
            <h4 className="font-display font-bold text-red-800 mb-3 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-100">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              Drapeaux Rouges
            </h4>
            <ul className="space-y-2.5">
              {analysis.redFlags.map((flag, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-red-800">
                  <span className="mt-0.5 text-base">🚩</span>
                  <span className="leading-relaxed font-medium">{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Industry Context */}
        <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200 rounded-xl p-5 shadow-sm">
          <h4 className="font-display font-bold text-blue-800 mb-3 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-100">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            Contexte Sectoriel
          </h4>
          <p className="text-blue-900 text-sm leading-relaxed">
            {analysis.industryContext}
          </p>
        </div>

        {/* Investment Thesis */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-gray-200/50 shadow-sm">
          <h4 className="font-display font-bold text-foreground mb-3">
            Thèse d'Investissement
          </h4>
          <p className="text-foreground/90 leading-relaxed text-sm">
            {analysis.investmentThesis}
          </p>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-purple-200/30 pt-5">
          <div className="flex items-start gap-3 p-4 bg-amber-50/50 rounded-lg border border-amber-200/50">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <p className="text-xs text-amber-900 leading-relaxed">
              <span className="font-bold">Avertissement :</span> Cette analyse est générée par IA et à titre informatif uniquement.
              Ce n'est pas un conseil financier. Vérifiez toutes les données de manière indépendante avant d'investir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
