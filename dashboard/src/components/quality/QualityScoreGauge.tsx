"use client";

import { cn } from "@/lib/utils";

interface QualityScoreGaugeProps {
  score: number;
  className?: string;
}

export function QualityScoreGauge({ score, className }: QualityScoreGaugeProps) {
  const color = score > 90 ? "#10b981" : score > 70 ? "#f59e0b" : "#ef4444";
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="relative h-32 w-32">
        <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100" aria-label={`Quality score: ${score}%`}>
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums text-slate-100">{score}</span>
          <span className="text-xs text-slate-500">/ 100</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-300">Quality Score</p>
    </div>
  );
}
