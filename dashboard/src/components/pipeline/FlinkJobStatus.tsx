"use client";

import { Zap, Clock, CheckSquare } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { formatRate, formatUptime, formatDuration, formatBytes } from "@/lib/formatters";
import type { FlinkJob } from "@/types/pipeline";
import type { HealthStatus } from "@/types/metrics";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

const flinkStatusToHealth: Record<string, HealthStatus> = {
  RUNNING: "healthy",
  FAILED: "error",
  CANCELED: "unknown",
  FINISHED: "unknown",
};

interface FlinkJobStatusProps {
  jobs: FlinkJob[];
}

function CheckpointMiniChart({ history }: { history: FlinkJob["checkpoint_history"] }) {
  const data = history.map((h, i) => ({
    i: i + 1,
    duration: h.duration_ms,
  }));

  return (
    <div className="h-12">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <XAxis dataKey="i" hide />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <div className="rounded bg-zinc-900 px-2 py-1 text-xs text-white">
                  {payload[0].value}ms
                </div>
              ) : null
            }
          />
          <Bar dataKey="duration" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function JobCard({ job }: { job: FlinkJob }) {
  const status = flinkStatusToHealth[job.status] ?? "unknown";

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-purple-50 p-2 dark:bg-purple-900/20">
            <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">{job.name}</p>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">{job.job_id.slice(0, 8)}…</p>
          </div>
        </div>
        <StatusBadge status={status} label={job.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs mb-4">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <Zap className="h-3 w-3" />
          <span>{formatRate(job.records_per_second, " rec/s")}</span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-500">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">P×{job.parallelism}</span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-500">
          <Clock className="h-3 w-3" />
          <span>{formatUptime(job.uptime_ms)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-500">
          <CheckSquare className="h-3 w-3" />
          <TimeAgo timestamp={job.last_checkpoint} />
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs text-zinc-500">Checkpoint durations (last 10)</span>
          <span className="text-xs font-medium tabular-nums">{job.checkpoint_duration_ms}ms avg</span>
        </div>
        <CheckpointMiniChart history={job.checkpoint_history} />
      </div>
    </div>
  );
}

export function FlinkJobStatus({ jobs }: FlinkJobStatusProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">Flink Jobs</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {jobs.map((job) => (
          <JobCard key={job.job_id} job={job} />
        ))}
      </div>
    </div>
  );
}
