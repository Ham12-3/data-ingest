"use client";

import { useEffect } from "react";
import { Activity, Clock, AlertTriangle, Database, Wifi, WifiOff } from "lucide-react";
import { PipelineHealthBanner } from "@/components/dashboard/PipelineHealthBanner";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ThroughputChart } from "@/components/dashboard/ThroughputChart";
import { LatencyHistogram } from "@/components/dashboard/LatencyHistogram";
import { ComponentStatusGrid } from "@/components/dashboard/ComponentStatusGrid";
import { RecentAlerts } from "@/components/dashboard/RecentAlerts";
import { LoadingOverlay } from "@/components/shared/LoadingSpinner";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useRealtimeMetrics } from "@/hooks/useRealtimeMetrics";
import { usePipelineHealth } from "@/hooks/usePipelineHealth";
import { useDashboardStore } from "@/stores/dashboardStore";
import { formatRate, formatLatency, formatPercentage } from "@/lib/formatters";
import { TIME_RANGES } from "@/lib/constants";

function SSEIndicator() {
  const sseState = useDashboardStore((s) => s.sseState);

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {sseState.connected ? (
        <>
          <Wifi className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-emerald-600 dark:text-emerald-400">Live</span>
        </>
      ) : sseState.reconnecting ? (
        <>
          <div className="h-3.5 w-3.5 animate-spin rounded-full border border-amber-400 border-t-transparent" />
          <span className="text-amber-600 dark:text-amber-400">Reconnecting…</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-zinc-500">Mock data</span>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const sseState = useRealtimeMetrics();
  const { isLoading: healthLoading } = usePipelineHealth();

  const metrics = useDashboardStore((s) => s.metrics);
  const health = useDashboardStore((s) => s.health);
  const alerts = useDashboardStore((s) => s.alerts);
  const timeRange = useDashboardStore((s) => s.timeRange);
  const setTimeRange = useDashboardStore((s) => s.setTimeRange);

  if (!metrics || !health) {
    return <LoadingOverlay label="Loading pipeline metrics…" />;
  }

  const allAlerts = [...alerts, ...(health.alerts ?? [])];

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Real-time pipeline overview
          </p>
        </div>
        <div className="flex items-center gap-4">
          <SSEIndicator />
          {/* Time range selector */}
          <div className="flex items-center gap-1 rounded-lg border p-0.5 dark:border-zinc-700">
            {TIME_RANGES.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setTimeRange(value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  timeRange === value
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Health Banner */}
      <ErrorBoundary label="Pipeline health banner">
        <PipelineHealthBanner
          status={
            health.status === "error" ? "failing" : health.status === "degraded" ? "degraded" : "healthy"
          }
          lastCheck={new Date().toLocaleTimeString()}
        />
      </ErrorBoundary>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ErrorBoundary>
          <MetricCard
            title="Events / sec"
            value={formatRate(metrics.events_per_second, "")}
            description="Current throughput"
            icon={Activity}
            trend={{ value: 3.2, isUp: true }}
            chartData={metrics.sparklines.events_per_second}
            chartColor="#3b82f6"
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <MetricCard
            title="Avg Latency"
            value={formatLatency(metrics.avg_latency_ms)}
            description="Processing latency"
            icon={Clock}
            trend={{ value: 2.1, isUp: false }}
            chartData={metrics.sparklines.avg_latency}
            chartColor="#8b5cf6"
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <MetricCard
            title="Error Rate"
            value={formatPercentage(metrics.error_rate)}
            description="Last 5 minutes"
            icon={AlertTriangle}
            trend={{ value: 0.4, isUp: false }}
            chartData={metrics.sparklines.error_rate}
            chartColor={metrics.error_rate > 5 ? "#f43f5e" : metrics.error_rate > 1 ? "#f59e0b" : "#10b981"}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <MetricCard
            title="Features / sec"
            value={formatRate(metrics.features_written_per_second, "")}
            description="Feast write throughput"
            icon={Database}
            trend={{ value: 1.8, isUp: true }}
            chartData={metrics.sparklines.features_written}
            chartColor="#10b981"
          />
        </ErrorBoundary>
      </div>

      {/* Main Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ErrorBoundary label="Throughput chart">
          <ThroughputChart data={metrics.throughput_history} />
        </ErrorBoundary>
        <ErrorBoundary label="Latency histogram">
          <LatencyHistogram
            data={metrics.latency_distribution}
            percentiles={metrics.latency_percentiles}
          />
        </ErrorBoundary>
      </div>

      {/* Bottom section */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ErrorBoundary label="Component status grid">
            <ComponentStatusGrid components={health.components} />
          </ErrorBoundary>
        </div>
        <ErrorBoundary label="Recent alerts">
          <RecentAlerts alerts={allAlerts} />
        </ErrorBoundary>
      </div>
    </div>
  );
}
