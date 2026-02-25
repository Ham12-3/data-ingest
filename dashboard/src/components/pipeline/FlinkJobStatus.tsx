"use client";

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatNumber, formatDuration, formatLatency } from "@/lib/formatters";
import type { FlinkJobInfo } from "@/types/pipeline";

interface FlinkJobStatusProps {
  className?: string;
}

const defaultJob: FlinkJobInfo = {
  jobId: "flink-feature-compute-001",
  name: "Feature Engineering Pipeline",
  status: "RUNNING",
  parallelism: 4,
  recordsPerSec: 3000,
  lastCheckpoint: new Date(Date.now() - 60_000).toISOString(),
  checkpointDuration: 1200,
  uptime: 15720,
};

const statusMap: Record<string, "healthy" | "degraded" | "error" | "unknown"> = {
  RUNNING: "healthy",
  RESTARTING: "degraded",
  STOPPED: "unknown",
  FAILED: "error",
};

export function FlinkJobStatus({ className }: FlinkJobStatusProps) {
  const job = defaultJob;

  return (
    <div className={cn("rounded-xl border border-slate-700/50 bg-slate-800/50 p-6", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-100">Flink Job Status</h3>
        <StatusBadge status={statusMap[job.status] ?? "unknown"} label={job.status} />
      </div>

      <div className="mb-3">
        <p className="text-sm text-slate-200">{job.name}</p>
        <p className="font-mono text-xs text-slate-500">{job.jobId}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-900 p-3">
          <p className="text-xs text-slate-500">Parallelism</p>
          <p className="mt-1 text-lg font-semibold text-slate-100">{job.parallelism}</p>
        </div>
        <div className="rounded-lg bg-slate-900 p-3">
          <p className="text-xs text-slate-500">Records/sec</p>
          <p className="mt-1 text-lg font-semibold text-slate-100">{formatNumber(job.recordsPerSec)}</p>
        </div>
        <div className="rounded-lg bg-slate-900 p-3">
          <p className="text-xs text-slate-500">Checkpoint Duration</p>
          <p className="mt-1 text-lg font-semibold text-slate-100">{formatLatency(job.checkpointDuration)}</p>
        </div>
        <div className="rounded-lg bg-slate-900 p-3">
          <p className="text-xs text-slate-500">Uptime</p>
          <p className="mt-1 text-lg font-semibold text-slate-100">{formatDuration(job.uptime)}</p>
        </div>
      </div>
    </div>
  );
}
