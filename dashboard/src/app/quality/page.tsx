"use client";

import { QualityScoreGauge } from "@/components/quality/QualityScoreGauge";
import { QualityTrendChart } from "@/components/quality/QualityTrendChart";
import { ValidationResultsTable } from "@/components/quality/ValidationResultsTable";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useQualityResults, useQualityTrend } from "@/hooks/useQuality";
import { CheckCircle2, XCircle, Clock, Calendar } from "lucide-react";
import { formatTimeAgo } from "@/lib/formatters";
import type { ExpectationResult } from "@/types/quality";

const defaultExpectations: ExpectationResult[] = [
  { id: "1", name: "expect_column_values_to_not_be_null(user_id)", status: "pass", observed_value: "0 nulls", expected_range: "0 nulls", checked_at: new Date(Date.now() - 120_000).toISOString(), type: "completeness", details: "All 48,500 records have non-null user_id values." },
  { id: "2", name: "expect_column_values_to_match_regex(user_id, ^user_\\d+$)", status: "pass", observed_value: "100%", expected_range: "100%", checked_at: new Date(Date.now() - 120_000).toISOString(), type: "format" },
  { id: "3", name: "expect_column_values_to_be_in_set(event_type)", status: "pass", observed_value: "4 unique", expected_range: "{page_view, purchase, click, signup}", checked_at: new Date(Date.now() - 120_000).toISOString(), type: "validity" },
  { id: "4", name: "expect_column_values_to_be_between(amount, 0, 10000)", status: "fail", observed_value: "-5.00", expected_range: "[0, 10000]", checked_at: new Date(Date.now() - 120_000).toISOString(), type: "range", details: "Found 3 records with negative amount values. Likely data entry errors." },
  { id: "5", name: "expect_column_mean_to_be_between(event_count_1h, 10, 200)", status: "pass", observed_value: "45.2", expected_range: "[10, 200]", checked_at: new Date(Date.now() - 120_000).toISOString(), type: "statistical" },
  { id: "6", name: "expect_table_row_count_to_be_between(1000, 100000)", status: "pass", observed_value: "48,500", expected_range: "[1000, 100000]", checked_at: new Date(Date.now() - 120_000).toISOString(), type: "volume" },
  { id: "7", name: "expect_column_proportion_of_unique_values_to_be_between(session_id, 0.5, 1.0)", status: "pass", observed_value: "0.87", expected_range: "[0.5, 1.0]", checked_at: new Date(Date.now() - 120_000).toISOString(), type: "uniqueness" },
  { id: "8", name: "expect_column_values_to_not_be_null(timestamp)", status: "pass", observed_value: "0 nulls", expected_range: "0 nulls", checked_at: new Date(Date.now() - 120_000).toISOString(), type: "completeness" },
  { id: "9", name: "expect_column_max_to_be_between(purchase_rate_1h, 0, 1)", status: "fail", observed_value: "1.05", expected_range: "[0, 1]", checked_at: new Date(Date.now() - 120_000).toISOString(), type: "range", details: "Purchase rate exceeded 1.0 for 2 users due to race condition in windowed aggregation." },
  { id: "10", name: "expect_column_values_to_be_of_type(amount, float)", status: "pass", observed_value: "float64", expected_range: "float", checked_at: new Date(Date.now() - 120_000).toISOString(), type: "type" },
];

export default function QualityPage() {
  const { data: results, isLoading: resultsLoading } = useQualityResults();
  const { data: trend } = useQualityTrend(24);

  const expectations = results?.expectations ?? defaultExpectations;
  const score = results?.overall_score ?? 92;
  const totalChecks = results?.total_checks ?? expectations.length;
  const passed = results?.passed ?? expectations.filter((e) => e.status === "pass").length;
  const failed = results?.failed ?? expectations.filter((e) => e.status === "fail").length;
  const lastCheck = results?.last_check_time ?? new Date(Date.now() - 120_000).toISOString();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Data Quality</h1>
        <p className="mt-1 text-sm text-slate-400">
          Great Expectations validation results and quality trends
        </p>
      </div>

      {resultsLoading && <LoadingSpinner label="Loading quality results..." className="py-12" />}

      {/* Top Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="flex items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/50 p-6">
          <QualityScoreGauge score={score} />
        </div>

        <div className="grid grid-cols-2 gap-4 lg:col-span-4">
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-5">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Total Checks
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-100">{totalChecks}</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-5">
            <div className="flex items-center gap-2 text-xs text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Passed
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-400">{passed}</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-5">
            <div className="flex items-center gap-2 text-xs text-rose-500">
              <XCircle className="h-3.5 w-3.5" />
              Failed
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-rose-400">{failed}</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-5">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              Last Check
            </div>
            <p className="mt-2 text-lg font-semibold text-slate-200">{formatTimeAgo(lastCheck)}</p>
          </div>
        </div>
      </div>

      {/* Quality Trend Chart */}
      <ErrorBoundary fallbackTitle="Failed to load quality trend">
        <QualityTrendChart data={trend} />
      </ErrorBoundary>

      {/* Validation Results Table */}
      <ErrorBoundary fallbackTitle="Failed to load validation results">
        <ValidationResultsTable results={expectations} />
      </ErrorBoundary>
    </div>
  );
}
