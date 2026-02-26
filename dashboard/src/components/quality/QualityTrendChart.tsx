"use client";

import { useState } from "react";
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
import { format, parseISO } from "date-fns";
import type { QualityTrend } from "@/types/quality";
import { cn } from "@/lib/utils";

const TIME_OPTS = [
  { label: "6h", hours: 6 },
  { label: "12h", hours: 12 },
  { label: "24h", hours: 24 },
];

interface QualityTrendChartProps {
  trend: QualityTrend;
  onHoursChange?: (hours: number) => void;
}

export function QualityTrendChart({ trend, onHoursChange }: QualityTrendChartProps) {
  const [selectedHours, setSelectedHours] = useState(24);

  const chartData = trend.data.map((d) => ({
    time: format(parseISO(d.timestamp), "HH:mm"),
    Pass: d.pass_count,
    Fail: d.fail_count,
    Warning: d.warning_count,
    rate: d.pass_rate.toFixed(1),
  }));

  function handleHoursChange(h: number) {
    setSelectedHours(h);
    onHoursChange?.(h);
  }

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold">Quality Trend</h3>
        <div className="flex items-center gap-1 rounded-lg border p-0.5 dark:border-zinc-700">
          {TIME_OPTS.map(({ label, hours }) => (
            <button
              key={label}
              onClick={() => handleHoursChange(hours)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                selectedHours === hours
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gPass" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gFail" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gWarn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              interval="preserveStartEnd"
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
            <Area type="monotone" dataKey="Pass" stroke="#10b981" fill="url(#gPass)" strokeWidth={2} stackId="a" />
            <Area type="monotone" dataKey="Warning" stroke="#f59e0b" fill="url(#gWarn)" strokeWidth={2} stackId="a" />
            <Area type="monotone" dataKey="Fail" stroke="#f43f5e" fill="url(#gFail)" strokeWidth={2} stackId="a" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
