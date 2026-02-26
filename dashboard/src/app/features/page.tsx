"use client";

import { useState, useCallback } from "react";
import { Database } from "lucide-react";
import { FeatureSearch } from "@/components/features/FeatureSearch";
import { FeatureTable } from "@/components/features/FeatureTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingOverlay } from "@/components/shared/LoadingSpinner";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useUserFeatures } from "@/hooks/useFeatures";
import type { FeatureView } from "@/types/features";
import type { FeatureRow } from "@/types/features";

function FeatureResults({
  userId,
  filterView,
}: {
  userId: string;
  filterView: FeatureView | "all";
}) {
  const { data, isLoading, error } = useUserFeatures(userId);

  if (isLoading) return <LoadingOverlay label="Loading features…" />;
  if (error || !data)
    return (
      <EmptyState
        icon={Database}
        title="Failed to load features"
        description="Could not retrieve features for this user."
      />
    );

  const rows: FeatureRow[] = data.features.map((f) => ({
    user_id: data.user_id,
    feature_name: f.name,
    current_value: f.value,
    last_updated: f.last_updated,
    feature_view: f.feature_view,
  }));

  return <FeatureTable rows={rows} filterView={filterView} />;
}

export default function FeaturesPage() {
  const [searchedUserId, setSearchedUserId] = useState<string | null>(null);
  const [filterView, setFilterView] = useState<FeatureView | "all">("all");

  const handleSearch = useCallback((userId: string) => {
    setSearchedUserId(userId);
  }, []);

  const handleFilterChange = useCallback((view: FeatureView | "all") => {
    setFilterView(view);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feature Store</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Browse and inspect real-time feature values
        </p>
      </div>

      <ErrorBoundary label="Feature search">
        <FeatureSearch
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          isLoading={false}
        />
      </ErrorBoundary>

      {!searchedUserId ? (
        <EmptyState
          icon={Database}
          title="Search for a user"
          description="Enter a user ID to browse their feature values across all feature views."
        />
      ) : (
        <ErrorBoundary label="Feature table">
          <FeatureResults userId={searchedUserId} filterView={filterView} />
        </ErrorBoundary>
      )}
    </div>
  );
}
