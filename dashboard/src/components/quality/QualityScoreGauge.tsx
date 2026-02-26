"use client";

import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface QualityScoreGaugeProps {
  score: number;
  className?: string;
}

export function QualityScoreGauge({ score, className }: QualityScoreGaugeProps) {
  const color =
    score >= 90
      ? "#10b981"
      : score >= 70
      ? "#f59e0b"
      : "#f43f5e";

  const label =
    score >= 90 ? "Excellent" : score >= 70 ? "Needs Attention" : "Poor";

  const data = [{ value: score, fill: color }];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border bg-white p-6 shadow-sm dark:bg-zinc-950 dark:border-zinc-800",
        className
      )}
    >
      <h3 className="mb-2 text-base font-semibold">Quality Score</h3>
      <div className="relative h-40 w-40">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="70%"
            outerRadius="100%"
            data={data}
            startAngle={225}
            endAngle={-45}
          >
            {/* Background track */}
            <RadialBar
              background={{ fill: "#e4e4e7" }}
              dataKey="value"
              cornerRadius={8}
              max={100}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums">{score.toFixed(1)}</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
        </div>
      </div>
    </div>
  );
}
