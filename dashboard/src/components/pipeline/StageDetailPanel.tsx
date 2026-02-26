"use client";

import { X } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatRate, formatBytes } from "@/lib/formatters";
import type { PipelineNode } from "@/types/pipeline";
import type { KafkaTopic, FlinkJob } from "@/types/pipeline";

interface StageDetailPanelProps {
  node: PipelineNode;
  kafkaTopics: KafkaTopic[];
  flinkJobs: FlinkJob[];
  onClose: () => void;
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0 dark:border-zinc-800">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function StageDetailPanel({
  node,
  kafkaTopics,
  flinkJobs,
  onClose,
}: StageDetailPanelProps) {
  const kafkaTopic = kafkaTopics.find((t) => t.name.includes(node.id.replace("kafka-", "")));
  const flinkJob = flinkJobs[0];

  return (
    <div className="rounded-xl border bg-white shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
      <div className="flex items-center justify-between px-5 py-4 border-b dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="font-semibold">{node.label}</span>
          <StatusBadge status={node.status} size="sm" />
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 font-medium">
            General
          </p>
          <MetricRow label="Type" value={node.type} />
          <MetricRow label="Throughput" value={formatRate(node.throughput)} />
        </div>

        {node.type === "kafka" && kafkaTopic && (
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 font-medium">
              Topic Details
            </p>
            <MetricRow label="Partitions" value={kafkaTopic.partitions} />
            <MetricRow label="Messages In/s" value={formatRate(kafkaTopic.messages_in_per_sec, "")} />
            <MetricRow label="Messages Out/s" value={formatRate(kafkaTopic.messages_out_per_sec, "")} />
            <MetricRow label="Consumer Lag" value={kafkaTopic.consumer_lag.toLocaleString()} />
            <MetricRow label="Size" value={formatBytes(kafkaTopic.size_bytes)} />
            <MetricRow label="Retention" value={`${kafkaTopic.retention_hours}h`} />
          </div>
        )}

        {node.type === "processor" && node.id === "flink" && flinkJob && (
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 font-medium">
              Flink Details
            </p>
            <MetricRow label="Job Name" value={flinkJob.name} />
            <MetricRow label="Status" value={flinkJob.status} />
            <MetricRow label="Parallelism" value={flinkJob.parallelism} />
            <MetricRow label="Records/s" value={formatRate(flinkJob.records_per_second, "")} />
            <MetricRow label="Checkpoint Duration" value={`${flinkJob.checkpoint_duration_ms}ms`} />
          </div>
        )}

        {node.metadata &&
          Object.keys(node.metadata).length > 0 && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 font-medium">
                Additional Metrics
              </p>
              {Object.entries(node.metadata).map(([k, v]) => (
                <MetricRow
                  key={k}
                  label={k.replace(/_/g, " ")}
                  value={v}
                />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
