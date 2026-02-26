"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { LatencyBucket, LatencyPercentiles } from "@/types/metrics";

interface LatencyHistogramProps {
  data?: LatencyBucket[];
  percentiles?: LatencyPercentiles;
}

const MOCK_DATA: LatencyBucket[] = [
  { range: "0-10ms", count: 4000 },
  { range: "10-20ms", count: 3000 },
  { range: "20-50ms", count: 2000 },
  { range: "50-100ms", count: 2780 },
  { range: "100-200ms", count: 1890 },
  { range: "200-500ms", count: 390 },
  { range: "500ms+", count: 90 },
];

export function LatencyHistogram({
  data = MOCK_DATA,
  percentiles,
}: LatencyHistogramProps) {
  return (
    <div className="h-[320px] w-full rounded-xl border bg-white p-6 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Processing Latency</h3>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {percentiles && (
            <>
              <span>p50: <span className="font-medium text-blue-500">{percentiles.p50.toFixed(0)}ms</span></span>
              <span>p95: <span className="font-medium text-amber-500">{percentiles.p95.toFixed(0)}ms</span></span>
              <span>p99: <span className="font-medium text-rose-500">{percentiles.p99.toFixed(0)}ms</span></span>
            </>
          )}
        </div>
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="range"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#6b7280" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickFormatter={(v) => `${(v / 1000).toFixed(1)}K`}
            />
            <Tooltip
              cursor={{ fill: "rgba(59, 130, 246, 0.05)" }}
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#f4f4f5",
              }}
            />
            <Bar
              dataKey="count"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              name="Events"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
