"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UserFeatureCard } from "@/components/features/UserFeatureCard";
import { FeatureTable } from "@/components/features/FeatureTable";
import { FeatureTimeline } from "@/components/features/FeatureTimeline";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useUserFeatures, useFeatureHistory } from "@/hooks/useFeatures";

export default function UserFeatureDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const { data: features, isLoading: featuresLoading } = useUserFeatures(userId);
  const { data: history, isLoading: historyLoading } = useFeatureHistory(userId);

  if (featuresLoading) {
    return <LoadingSpinner label={`Loading features for ${userId}...`} className="py-20" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/features"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          aria-label="Back to features"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">User Features: {userId}</h1>
          <p className="text-sm text-slate-400">Detailed feature view and history</p>
        </div>
      </div>

      <ErrorBoundary fallbackTitle="Failed to load user features">
        {features && <UserFeatureCard data={features} />}
        {features && <FeatureTable data={features} />}
      </ErrorBoundary>

      <ErrorBoundary fallbackTitle="Failed to load feature history">
        {historyLoading && (
          <LoadingSpinner label="Loading feature history..." className="py-12" />
        )}
        {history && history.features.length > 0 && (
          <FeatureTimeline history={history.features} />
        )}
      </ErrorBoundary>
    </div>
  );
}
