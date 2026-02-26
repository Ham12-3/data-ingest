"use client";

import { use, useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { UserFeatureCard } from "@/components/features/UserFeatureCard";
import { FeatureTimeline } from "@/components/features/FeatureTimeline";
import { LoadingOverlay } from "@/components/shared/LoadingSpinner";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useUserFeatures } from "@/hooks/useFeatures";
import { generateMockFeatureHistory } from "@/lib/mockData";
import type { FeatureView } from "@/types/features";
import type { FeatureHistory } from "@/types/features";
import { cn } from "@/lib/utils";

const VIEW_TABS: { label: string; value: FeatureView | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Realtime", value: "realtime" },
  { label: "Hourly", value: "hourly" },
  { label: "Session", value: "session" },
  { label: "Derived", value: "derived" },
];

function FeatureHistoriesLoader({
  userId,
  featureNames,
}: {
  userId: string;
  featureNames: string[];
}) {
  const [histories, setHistories] = useState<FeatureHistory[]>([]);

  useEffect(() => {
    const mocks = featureNames.map((name) =>
      generateMockFeatureHistory(userId, name)
    );
    setHistories(mocks);
  }, [userId, featureNames]);

  if (featureNames.length === 0) {
    return <p className="text-sm text-zinc-500">No features to display.</p>;
  }

  return <FeatureTimeline histories={histories} availableFeatures={featureNames} />;
}

export default function UserFeaturePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const { data, isLoading, error } = useUserFeatures(userId);
  const [activeTab, setActiveTab] = useState<FeatureView | "all">("all");

  if (isLoading) return <LoadingOverlay label="Loading user features…" />;
  if (!data || error) {
    return (
      <div className="rounded-xl border bg-rose-50 p-8 text-center dark:bg-rose-900/10">
        <p className="text-rose-600 dark:text-rose-400">
          Could not load features for user <strong>{userId}</strong>
        </p>
      </div>
    );
  }

  const filteredFeatures =
    activeTab === "all"
      ? data.features
      : data.features.filter((f) => f.feature_view === activeTab);

  const featureNames = filteredFeatures.map((f) => f.name);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/features"
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <ErrorBoundary label="User feature card">
        <UserFeatureCard userFeatures={data} />
      </ErrorBoundary>

      {/* Feature view tabs */}
      <div
        className="flex gap-1 border-b dark:border-zinc-800"
        role="tablist"
        aria-label="Feature views"
      >
        {VIEW_TABS.map(({ label, value }) => (
          <button
            key={value}
            role="tab"
            aria-selected={activeTab === value}
            onClick={() => setActiveTab(value)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === value
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            {label}
            <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
              {value === "all"
                ? data.features.length
                : data.features.filter((f) => f.feature_view === value).length}
            </span>
          </button>
        ))}
      </div>

      {/* Feature values table */}
      <div className="rounded-xl border bg-white shadow-sm dark:bg-zinc-950 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Feature</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Value</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">View</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredFeatures.map((f) => (
              <tr
                key={f.name}
                className="border-b last:border-0 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <td className="px-4 py-3 font-mono text-xs font-medium">{f.name}</td>
                <td className="px-4 py-3 tabular-nums">{String(f.value)}</td>
                <td className="px-4 py-3 capitalize text-zinc-500">{f.feature_view}</td>
                <td className="px-4 py-3 text-zinc-500 text-xs">
                  {new Date(f.last_updated).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Timeline */}
      <ErrorBoundary label="Feature timeline">
        <FeatureHistoriesLoader userId={userId} featureNames={featureNames.slice(0, 6)} />
      </ErrorBoundary>
    </div>
  );
}
