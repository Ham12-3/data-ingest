"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ThroughputDataPoint } from "@/types/metrics";

interface ThroughputChartProps {
  data?: ThroughputDataPoint[];
}

const MOCK_DATA: ThroughputDataPoint[] = Array.from({ length: 10 }, (_, i) => ({
  time: `${String(i).padStart(2, "0")}:00`,
  ingested: 4000,
  validated: 3800,
  processed: 3700,
  features_written: 3650,
}));

const SERIES = [
  { key: "ingested" as const, color: "#3b82f6", label: "Ingested" },
  { key: "validated" as const, color: "#8b5cf6", label: "Validated" },
  { key: "processed" as const, color: "#10b981", label: "Processed" },
  { key: "features_written" as const, color: "#f59e0b", label: "Features Written" },
];

export function ThroughputChart({ data = MOCK_DATA }: ThroughputChartProps) {
  return (
    <div className="h-[320px] w-full rounded-xl border bg-white p-6 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Pipeline Throughput</h3>
        <p className="text-sm text-zinc-500">events/sec per stage</p>
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {SERIES.map(({ key, color }) => (
                <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickFormatter={(v) => `${(v / 1000).toFixed(1)}K`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#f4f4f5",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
            {SERIES.map(({ key, color, label }) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                name={label}
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${key})`}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
