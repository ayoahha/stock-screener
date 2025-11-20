'use client';

import { getVerdictLabel, getVerdictColor, type ScoreVerdict } from '@stock-screener/scoring';

interface ScoreGaugeProps {
  score: number;
  verdict: ScoreVerdict;
}

export function ScoreGauge({ score, verdict }: ScoreGaugeProps) {
  const verdictLabel = getVerdictLabel(verdict);
  const verdictColor = getVerdictColor(verdict);

  // Calculate percentage for circular progress
  const percentage = score;
  const circumference = 2 * Math.PI * 120; // radius = 120
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* Circular Score Gauge */}
      <div className="relative w-80 h-80">
        <svg className="transform -rotate-90 w-80 h-80">
          {/* Background circle */}
          <circle
            cx="160"
            cy="160"
            r="120"
            stroke="#e5e7eb"
            strokeWidth="24"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx="160"
            cy="160"
            r="120"
            stroke={verdictColor}
            strokeWidth="24"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Score Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-7xl font-bold" style={{ color: verdictColor }}>
            {score}
          </div>
          <div className="text-2xl text-gray-400 mt-2">/100</div>
        </div>
      </div>

      {/* Verdict Label */}
      <div className="mt-8 text-center">
        <div
          className="inline-block px-8 py-4 rounded-lg text-white font-bold text-2xl"
          style={{ backgroundColor: verdictColor }}
        >
          {verdictLabel}
        </div>
      </div>

      {/* Score Legend */}
      <div className="mt-8 w-full">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>0</span>
          <span>20</span>
          <span>40</span>
          <span>60</span>
          <span>75</span>
          <span>90</span>
          <span>100</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden flex">
          <div className="flex-1 bg-red-600"></div>
          <div className="flex-1 bg-orange-500"></div>
          <div className="flex-1 bg-yellow-400"></div>
          <div className="flex-1 bg-green-500"></div>
          <div className="flex-1 bg-emerald-500"></div>
          <div className="flex-1 bg-emerald-600"></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>Trop cher</span>
          <span>Cher</span>
          <span>Correct</span>
          <span>Bonne affaire</span>
          <span>Excellente</span>
          <span>Exceptionnelle</span>
        </div>
      </div>
    </div>
  );
}
