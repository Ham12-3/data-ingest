"use client";

import { Activity, Clock, AlertTriangle, Database } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PipelineHealthBanner } from "@/components/dashboard/PipelineHealthBanner";
import { ThroughputChart } from "@/components/dashboard/ThroughputChart";
import { LatencyHistogram } from "@/components/dashboard/LatencyHistogram";
import { ComponentStatusGrid } from "@/components/dashboard/ComponentStatusGrid";
import { RecentAlerts } from "@/components/dashboard/RecentAlerts";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useRealtimeMetrics } from "@/hooks/useRealtimeMetrics";
import { useHealthCheck, useComponentsHealth, usePipelineMetrics } from "@/hooks/usePipelineHealth";
import { useDashboardStore } from "@/stores/dashboardStore";
import { formatNumber, formatDecimal } from "@/lib/formatters";
import { Wifi, WifiOff } from "lucide-react";

export default function DashboardPage() {
  useRealtimeMetrics();

  const { data: health } = useHealthCheck();
  const { data: components } = useComponentsHealth();
  const { data: metrics } = usePipelineMetrics();

  const realtime = useDashboardStore((s) => s.realtime);
  const sseConnected = useDashboardStore((s) => s.sseConnected);
  const throughputData = useDashboardStore((s) => s.throughputData);

  const pipelineStatus: "healthy" | "degraded" | "error" =
    health?.status === "healthy"
      ? "healthy"
      : health?.status === "degraded"
        ? "degraded"
        : health?.status
          ? "error"
          : "healthy";

  const errorRateStatus =
    realtime.errorRate > 5 ? "error" : realtime.errorRate > 1 ? "degraded" : "healthy";

  return (
    <div className="space-y-6">
      {/* SSE Connection Indicator */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {sseConnected ? (
          <>
            <Wifi className="h-3 w-3 text-emerald-500" />
            <span>Real-time connected</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 text-rose-500" />
            <span>Connecting to real-time stream...</span>
          </>
        )}
      </div>

      {/* Health Banner */}
      <ErrorBoundary fallbackTitle="Failed to load health status">
        <PipelineHealthBanner
          status={pipelineStatus}
          uptimeSeconds={health?.uptime_seconds ?? metrics?.pipeline_uptime_seconds}
        />
      </ErrorBoundary>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Events / sec"
          value={formatNumber(realtime.eventsPerSec || (metrics?.events_ingested_total ? Math.floor(metrics.events_ingested_total / Math.max(metrics.pipeline_uptime_seconds, 1)) : 0))}
          unit="evt/s"
          icon={Activity}
          trend={{ value: 12.5, direction: "up" }}
          sparklineData={realtime.eventsPerSecHistory}
          chartColor="#3b82f6"
        />
        <MetricCard
          title="Avg Latency"
          value={formatDecimal(realtime.avgLatency || 42)}
          unit="ms"
          icon={Clock}
          trend={{ value: 3.2, direction: "down" }}
          sparklineData={realtime.latencyHistory}
          chartColor="#8b5cf6"
        />
        <MetricCard
          title="Error Rate"
          value={formatDecimal(realtime.errorRate || (metrics ? (1 - metrics.validation_pass_rate) * 100 : 0), 1)}
          unit="%"
          icon={AlertTriangle}
          status={errorRateStatus}
          trend={{ value: 0.8, direction: "up" }}
          sparklineData={realtime.errorRateHistory}
          chartColor="#ef4444"
        />
        <MetricCard
          title="Features Written / sec"
          value={formatNumber(realtime.featuresWrittenPerSec || 0)}
          unit="feat/s"
          icon={Database}
          trend={{ value: 5.1, direction: "up" }}
          sparklineData={realtime.featuresHistory}
          chartColor="#10b981"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ErrorBoundary fallbackTitle="Failed to load throughput chart">
          <ThroughputChart data={throughputData} />
        </ErrorBoundary>
        <ErrorBoundary fallbackTitle="Failed to load latency histogram">
          <LatencyHistogram />
        </ErrorBoundary>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ErrorBoundary fallbackTitle="Failed to load component status">
            <ComponentStatusGrid healthData={components} />
          </ErrorBoundary>
        </div>
        <ErrorBoundary fallbackTitle="Failed to load alerts">
          <RecentAlerts />
        </ErrorBoundary>
      </div>
    </div>
  );
}
