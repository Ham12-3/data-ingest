"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import type { LatencyBucket, LatencyPercentiles } from "@/types/metrics";

interface LatencyHistogramProps {
  data?: LatencyBucket[];
  percentiles?: LatencyPercentiles;
  className?: string;
}

const defaultData: LatencyBucket[] = [
  { range: "0-10ms", count: 4200 },
  { range: "10-25ms", count: 8100 },
  { range: "25-50ms", count: 5600 },
  { range: "50-75ms", count: 3200 },
  { range: "75-100ms", count: 1800 },
  { range: "100-250ms", count: 900 },
  { range: "250-500ms", count: 320 },
  { range: "500ms+", count: 80 },
];

const defaultPercentiles: LatencyPercentiles = {
  p50: 22,
  p90: 78,
  p95: 145,
  p99: 380,
};

export function LatencyHistogram({ data, percentiles, className }: LatencyHistogramProps) {
  const chartData = data ?? defaultData;
  const pct = percentiles ?? defaultPercentiles;

  const percentileLabels = useMemo(
    () => [
      { label: "p50", value: pct.p50, color: "#10b981" },
      { label: "p90", value: pct.p90, color: "#f59e0b" },
      { label: "p95", value: pct.p95, color: "#f97316" },
      { label: "p99", value: pct.p99, color: "#ef4444" },
    ],
    [pct]
  );

  return (
    <div className={cn("rounded-xl border border-slate-700/50 bg-slate-800/50 p-6", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Processing Latency</h3>
          <p className="text-sm text-slate-400">Distribution of event processing times</p>
        </div>
        <div className="flex gap-3">
          {percentileLabels.map((p) => (
            <div key={p.label} className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">{p.label}</p>
              <p className="text-sm font-semibold" style={{ color: p.color }}>
                {p.value}ms
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis
              dataKey="range"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <Tooltip
              cursor={{ fill: "rgba(59, 130, 246, 0.05)" }}
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#e2e8f0",
              }}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
