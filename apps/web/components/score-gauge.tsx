'use client';

import { getVerdictLabel, getVerdictColor, type ScoreVerdict } from '@stock-screener/scoring';

interface ScoreGaugeProps {
  score: number;
  verdict: ScoreVerdict;
}

export function ScoreGauge({ score, verdict }: ScoreGaugeProps) {
  const verdictLabel = getVerdictLabel(verdict);
  const verdictColor = getVerdictColor(verdict);

  // Calculate percentage for circular progress (reduced size: radius = 90)
  const percentage = score;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center py-6 animate-fade-in">
      {/* Circular Score Gauge - Reduced size */}
      <div className="relative w-60 h-60 mb-6">
        {/* Subtle glow effect based on score */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-20 transition-all duration-1000"
          style={{ backgroundColor: verdictColor }}
        />

        <svg className="transform -rotate-90 w-60 h-60 relative z-10">
          {/* Background circle with refined styling */}
          <circle
            cx="120"
            cy="120"
            r={radius}
            stroke="hsl(var(--border))"
            strokeWidth="18"
            fill="none"
            opacity="0.3"
          />
          {/* Progress circle with enhanced animation */}
          <circle
            cx="120"
            cy="120"
            r={radius}
            stroke={verdictColor}
            strokeWidth="18"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.1))',
            }}
          />
        </svg>

        {/* Score Text - Enhanced typography */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <div
            className="text-6xl font-display font-bold tabular-nums tracking-tight"
            style={{ color: verdictColor }}
          >
            {score}
          </div>
          <div className="text-lg text-muted-foreground mt-1 font-medium">/100</div>
        </div>
      </div>

      {/* Verdict Label - Refined styling */}
      <div className="text-center mb-6">
        <div
          className="inline-block px-6 py-3 rounded-xl text-white font-bold text-xl shadow-lg transition-all duration-300 hover:scale-105"
          style={{
            backgroundColor: verdictColor,
            boxShadow: `0 4px 14px ${verdictColor}40`
          }}
        >
          {verdictLabel}
        </div>
      </div>

      {/* Score Legend - Improved visual design */}
      <div className="w-full max-w-sm">
        <div className="flex justify-between text-xs font-medium text-muted-foreground mb-2 px-1">
          <span>0</span>
          <span>20</span>
          <span>40</span>
          <span>60</span>
          <span>75</span>
          <span>90</span>
          <span>100</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden flex shadow-inner-soft">
          <div className="flex-1 bg-score-too-expensive"></div>
          <div className="flex-1 bg-score-expensive"></div>
          <div className="flex-1 bg-score-fair"></div>
          <div className="flex-1 bg-score-good-deal"></div>
          <div className="flex-1 bg-score-excellent-deal"></div>
          <div className="flex-1 bg-score-exceptional"></div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mt-3 text-center">
          <span className="font-medium">Trop cher</span>
          <span className="font-medium">Correct</span>
          <span className="font-medium">Excellente</span>
        </div>
      </div>
    </div>
  );
}
