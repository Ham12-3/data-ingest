"use client";

import { useState } from "react";
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
import { format, parseISO } from "date-fns";
import type { FeatureHistory } from "@/types/features";
import { cn } from "@/lib/utils";

const LINE_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#06b6d4",
];

function mergeHistories(histories: FeatureHistory[]) {
  const tsMap: Record<string, Record<string, number>> = {};

  for (const h of histories) {
    for (const point of h.history) {
      const ts = format(parseISO(point.timestamp), "HH:mm");
      if (!tsMap[ts]) tsMap[ts] = {};
      tsMap[ts][h.feature_name] = point.value;
    }
  }

  return Object.entries(tsMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, vals]) => ({ time, ...vals }));
}

interface FeatureTimelineProps {
  histories: FeatureHistory[];
  availableFeatures: string[];
}

export function FeatureTimeline({ histories, availableFeatures }: FeatureTimelineProps) {
  const [selected, setSelected] = useState<string[]>(
    availableFeatures.slice(0, 2)
  );

  const activeHistories = histories.filter((h) =>
    selected.includes(h.feature_name)
  );
  const chartData = mergeHistories(activeHistories);

  function toggleFeature(name: string) {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]
    );
  }

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <h3 className="text-base font-semibold">Feature Timeline</h3>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Toggle features"
        >
          {availableFeatures.map((name, i) => {
            const isSelected = selected.includes(name);
            const color = LINE_COLORS[i % LINE_COLORS.length];
            return (
              <button
                key={name}
                onClick={() => toggleFeature(name)}
                aria-pressed={isSelected}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all border",
                  isSelected
                    ? "text-white border-transparent"
                    : "text-zinc-500 bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700"
                )}
                style={
                  isSelected ? { backgroundColor: color, borderColor: color } : {}
                }
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="font-mono">{name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selected.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-zinc-400">
          Select at least one feature to display
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e5e7eb"
                className="dark:stroke-zinc-800"
              />
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
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--tw-bg-opacity, #fff)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              />
              {selected.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
