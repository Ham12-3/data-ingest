"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatShortTime } from "@/lib/formatters";
import type { FeatureHistoryEntry } from "@/types/features";

interface FeatureTimelineProps {
  history: FeatureHistoryEntry[];
  className?: string;
}

const numericFeatures = [
  "event_count_1m",
  "unique_pages_1m",
  "event_count_5m",
  "purchase_count_5m",
  "total_spend_5m",
  "event_count_1h",
  "purchase_rate_1h",
  "avg_time_between_events_1h",
  "session_duration",
  "session_event_count",
  "purchase_frequency",
  "avg_purchase_amount",
  "user_activity_score",
] as const;

const lineColors = [
  "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316",
];

export function FeatureTimeline({ history, className }: FeatureTimelineProps) {
  const [selected, setSelected] = useState<string[]>(["event_count_1m", "event_count_5m"]);

  const chartData = useMemo(
    () =>
      history.map((entry) => ({
        time: formatShortTime(entry.event_timestamp),
        ...Object.fromEntries(
          numericFeatures.map((f) => [f, entry[f as keyof FeatureHistoryEntry]])
        ),
      })),
    [history]
  );

  const toggleFeature = (feature: string) => {
    setSelected((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  return (
    <div className={cn("rounded-xl border border-slate-700/50 bg-slate-800/50 p-6", className)}>
      <h3 className="mb-4 text-lg font-semibold text-slate-100">Feature Timeline</h3>

      <div className="mb-4 flex flex-wrap gap-2">
        {numericFeatures.map((f, i) => (
          <button
            key={f}
            onClick={() => toggleFeature(f)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              selected.includes(f)
                ? "text-white"
                : "bg-slate-900 text-slate-500 hover:text-slate-300"
            )}
            style={selected.includes(f) ? { backgroundColor: lineColors[i % lineColors.length] } : undefined}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            {selected.map((feature, i) => (
              <Line
                key={feature}
                type="monotone"
                dataKey={feature}
                stroke={lineColors[numericFeatures.indexOf(feature as typeof numericFeatures[number]) % lineColors.length]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
