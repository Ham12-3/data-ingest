"use client";

import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isUp: boolean;
  };
  chartData?: any[];
  chartColor?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  chartData,
  chartColor = "#3b82f6",
  className,
}: MetricCardProps) {
  return (
    <div className={cn("rounded-xl border bg-white p-6 shadow-sm dark:bg-zinc-950", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
          <h2 className="text-2xl font-bold tracking-tight">{value}</h2>
        </div>
        <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
          <Icon className="h-5 w-5 text-blue-600 dark:text-blue-500" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          {trend && (
            <div
              className={cn(
                "flex items-center text-sm font-medium",
                trend.isUp ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
              )}
            >
              {trend.isUp ? (
                <ArrowUpRight className="mr-1 h-4 w-4" />
              ) : (
                <ArrowDownRight className="mr-1 h-4 w-4" />
              )}
              {trend.value}%
            </div>
          )}
          <p className="text-xs text-zinc-500 dark:text-zinc-500">{description}</p>
        </div>

        {chartData && (
          <div className="h-10 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={chartColor}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
