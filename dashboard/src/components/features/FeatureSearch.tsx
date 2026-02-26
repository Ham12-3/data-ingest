"use client";

import { useState } from "react";
import { Search, Filter } from "lucide-react";
import type { FeatureView } from "@/types/features";

const FEATURE_VIEWS: { label: string; value: FeatureView | "all" }[] = [
  { label: "All Views", value: "all" },
  { label: "Realtime", value: "realtime" },
  { label: "Hourly", value: "hourly" },
  { label: "Session", value: "session" },
  { label: "Derived", value: "derived" },
];

interface FeatureSearchProps {
  onSearch: (userId: string) => void;
  onFilterChange: (view: FeatureView | "all") => void;
  isLoading?: boolean;
}

export function FeatureSearch({
  onSearch,
  onFilterChange,
  isLoading,
}: FeatureSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedView, setSelectedView] = useState<FeatureView | "all">("all");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  }

  function handleViewChange(view: FeatureView | "all") {
    setSelectedView(view);
    onFilterChange(view);
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by user ID..."
            aria-label="Search by user ID"
            className="w-full rounded-lg border bg-white py-2.5 pl-9 pr-4 text-sm outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
          />
        </div>
        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? "Searching…" : "Search"}
        </button>
      </form>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-zinc-400 flex-shrink-0" />
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by feature view"
        >
          {FEATURE_VIEWS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => handleViewChange(value)}
              aria-pressed={selectedView === value}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedView === value
                  ? "bg-blue-500 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
