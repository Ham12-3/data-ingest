"use client";

import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    direction: "up" | "down" | "flat";
  };
  sparklineData?: { value: number }[];
  status?: "healthy" | "degraded" | "error";
  chartColor?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  sparklineData,
  status,
  chartColor = "#3b82f6",
  className,
}: MetricCardProps) {
  const trendColor =
    trend?.direction === "up"
      ? "text-emerald-500"
      : trend?.direction === "down"
        ? "text-rose-500"
        : "text-slate-400";

  const TrendIcon =
    trend?.direction === "up"
      ? ArrowUpRight
      : trend?.direction === "down"
        ? ArrowDownRight
        : Minus;

  const statusBorderColor =
    status === "error"
      ? "border-rose-500/30"
      : status === "degraded"
        ? "border-amber-500/30"
        : "border-slate-700/50";

  return (
    <div
      className={cn(
        "rounded-xl border bg-slate-800/50 p-5 transition-colors",
        statusBorderColor,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums text-slate-100">
              {value}
            </span>
            {unit && <span className="text-sm text-slate-400">{unit}</span>}
          </div>
        </div>
        <div className="rounded-lg bg-blue-500/10 p-2">
          <Icon className="h-5 w-5 text-blue-400" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        {trend && (
          <div className={cn("flex items-center gap-1 text-sm font-medium", trendColor)}>
            <TrendIcon className="h-4 w-4" aria-hidden="true" />
            <span>{trend.value}%</span>
            <span className="text-xs text-slate-500">vs prev</span>
          </div>
        )}

        {sparklineData && sparklineData.length > 1 && (
          <div className="h-10 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={chartColor}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
