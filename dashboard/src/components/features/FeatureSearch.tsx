"use client";

import { useState, useCallback } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeatureView } from "@/types/features";

interface FeatureSearchProps {
  onSearch: (userId: string) => void;
  onFilterChange?: (view: FeatureView | "all") => void;
  className?: string;
}

const featureViews: { label: string; value: FeatureView | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Realtime", value: "realtime" },
  { label: "Hourly", value: "hourly" },
  { label: "Session", value: "session" },
  { label: "Derived", value: "derived" },
];

export function FeatureSearch({ onSearch, onFilterChange, className }: FeatureSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedView, setSelectedView] = useState<FeatureView | "all">("all");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        onSearch(query.trim());
      }
    },
    [query, onSearch]
  );

  const handleFilterChange = useCallback(
    (view: FeatureView | "all") => {
      setSelectedView(view);
      onFilterChange?.(view);
    },
    [onFilterChange]
  );

  return (
    <div className={cn("rounded-xl border border-slate-700/50 bg-slate-800/50 p-6", className)}>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by user_id (e.g., user_42)"
            className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500"
            aria-label="Search features by user ID"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          Search
        </button>
      </form>

      <div className="mt-4 flex gap-2">
        {featureViews.map((view) => (
          <button
            key={view.value}
            onClick={() => handleFilterChange(view.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              selectedView === view.value
                ? "bg-blue-600 text-white"
                : "bg-slate-900 text-slate-400 hover:text-slate-200"
            )}
          >
            {view.label}
          </button>
        ))}
      </div>
    </div>
  );
}
