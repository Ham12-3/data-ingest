"use client";

import { useState, useMemo } from "react";
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
import { TIME_RANGES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ThroughputDataPoint } from "@/types/metrics";

interface ThroughputChartProps {
  data: ThroughputDataPoint[];
  className?: string;
}

const lines = [
  { key: "ingested", label: "Ingested", color: "#3b82f6" },
  { key: "validated", label: "Validated", color: "#10b981" },
  { key: "processed", label: "Processed", color: "#8b5cf6" },
  { key: "features_written", label: "Features Written", color: "#f59e0b" },
] as const;

export function ThroughputChart({ data, className }: ThroughputChartProps) {
  const [selectedRange, setSelectedRange] = useState(15);

  const chartData = useMemo(() => {
    if (data.length === 0) {
      const now = Date.now();
      return Array.from({ length: 30 }, (_, i) => ({
        time: new Date(now - (29 - i) * 10_000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        ingested: Math.floor(2500 + Math.random() * 1500),
        validated: Math.floor(2300 + Math.random() * 1300),
        processed: Math.floor(2100 + Math.random() * 1100),
        features_written: Math.floor(1900 + Math.random() * 900),
      }));
    }
    return data;
  }, [data]);

  return (
    <div className={cn("rounded-xl border border-slate-700/50 bg-slate-800/50 p-6", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">System Throughput</h3>
          <p className="text-sm text-slate-400">Events per second across pipeline stages</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-900 p-1">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setSelectedRange(range.value)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                selectedRange === range.value
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              )}
              aria-label={`Show last ${range.label}`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {lines.map((line) => (
                <linearGradient key={line.key} id={`gradient-${line.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={line.color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={line.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis
              dataKey="time"
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
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#e2e8f0",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }} />
            {lines.map((line) => (
              <Area
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.label}
                stroke={line.color}
                fill={`url(#gradient-${line.key})`}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
