"use client";

import { useState } from "react";
import { FeatureSearch } from "@/components/features/FeatureSearch";
import { FeatureTable } from "@/components/features/FeatureTable";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useUserFeatures } from "@/hooks/useFeatures";

export default function FeaturesPage() {
  const [searchUserId, setSearchUserId] = useState("");
  const { data, isLoading, error } = useUserFeatures(searchUserId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Feature Store Browser</h1>
        <p className="mt-1 text-sm text-slate-400">
          Search and explore features for any user in the online store
        </p>
      </div>

      <FeatureSearch onSearch={setSearchUserId} />

      <ErrorBoundary fallbackTitle="Failed to load features">
        {isLoading && searchUserId && (
          <LoadingSpinner label={`Loading features for ${searchUserId}...`} className="py-12" />
        )}
        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center">
            <p className="text-sm text-rose-400">
              Failed to load features for &quot;{searchUserId}&quot;. Please verify the user ID and try again.
            </p>
          </div>
        )}
        {!isLoading && <FeatureTable data={data} />}
      </ErrorBoundary>
    </div>
  );
}
