"use client";

import { Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { QualityScoreGauge } from "@/components/quality/QualityScoreGauge";
import { QualityTrendChart } from "@/components/quality/QualityTrendChart";
import { ValidationResultsTable } from "@/components/quality/ValidationResultsTable";
import { LoadingOverlay } from "@/components/shared/LoadingSpinner";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { useQualityResults, useQualityTrend } from "@/hooks/useQuality";

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
      <div className="flex items-center gap-2.5 mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export default function QualityPage() {
  const { data: results, isLoading: resultsLoading } = useQualityResults();
  const { data: trend, isLoading: trendLoading } = useQualityTrend(24);

  if (resultsLoading || !results) {
    return <LoadingOverlay label="Loading quality results…" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Data Quality</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Great Expectations validation results
        </p>
      </div>

      {/* Top row */}
      <div className="grid gap-4 lg:grid-cols-4">
        <ErrorBoundary>
          <QualityScoreGauge score={results.overall_score} />
        </ErrorBoundary>

        <SummaryCard
          icon={CheckCircle2}
          label="Checks Passed"
          value={results.passed}
          color="text-emerald-500"
        />
        <SummaryCard
          icon={XCircle}
          label="Checks Failed"
          value={results.failed}
          color="text-rose-500"
        />
        <div className="rounded-xl border bg-white p-5 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
          <div className="flex items-center gap-2.5 mb-2">
            <Clock className="h-4 w-4 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Last Check
            </span>
          </div>
          <TimeAgo
            timestamp={results.last_check_time}
            className="text-2xl font-bold"
          />
          <p className="mt-1 text-xs text-zinc-400">
            {results.total_checks} total checks · {results.pass_rate.toFixed(1)}% pass rate
          </p>
        </div>
      </div>

      {/* Trend chart */}
      {trend && !trendLoading && (
        <ErrorBoundary label="Quality trend chart">
          <QualityTrendChart trend={trend} />
        </ErrorBoundary>
      )}

      {/* Validation results table */}
      <ErrorBoundary label="Validation results table">
        <ValidationResultsTable expectations={results.expectations} />
      </ErrorBoundary>
    </div>
  );
}
