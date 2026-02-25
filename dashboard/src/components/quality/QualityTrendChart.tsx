"use client";

import { useMemo } from "react";
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
import { cn } from "@/lib/utils";
import { formatShortTime } from "@/lib/formatters";
import type { QualityTrendPoint } from "@/types/quality";

interface QualityTrendChartProps {
  data?: QualityTrendPoint[];
  className?: string;
}

export function QualityTrendChart({ data, className }: QualityTrendChartProps) {
  const chartData = useMemo(() => {
    if (data && data.length > 0) {
      return data.map((d) => ({
        time: formatShortTime(d.timestamp),
        pass: d.pass_count,
        fail: d.fail_count,
        rate: (d.pass_rate * 100).toFixed(1),
      }));
    }
    // Default data
    const now = Date.now();
    return Array.from({ length: 24 }, (_, i) => ({
      time: new Date(now - (23 - i) * 3_600_000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      pass: Math.floor(900 + Math.random() * 100),
      fail: Math.floor(10 + Math.random() * 40),
      rate: (95 + Math.random() * 4).toFixed(1),
    }));
  }, [data]);

  return (
    <div className={cn("rounded-xl border border-slate-700/50 bg-slate-800/50 p-6", className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-100">Quality Trend</h3>
        <p className="text-sm text-slate-400">Pass/fail counts over time</p>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="passGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="failGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
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
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Area
              type="monotone"
              dataKey="pass"
              name="Passed"
              stackId="1"
              stroke="#10b981"
              fill="url(#passGradient)"
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="fail"
              name="Failed"
              stackId="1"
              stroke="#ef4444"
              fill="url(#failGradient)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
