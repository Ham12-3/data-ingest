"use client";

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { X } from "lucide-react";

interface StageDetailPanelProps {
  stageId: string;
  onClose: () => void;
  className?: string;
}

const stageDetails: Record<string, { title: string; metrics: { label: string; value: string }[]; description: string }> = {
  producer: {
    title: "Event Producer",
    description: "Generates and sends raw user events to Kafka",
    metrics: [
      { label: "Events/sec", value: "3,200" },
      { label: "Batch Size", value: "100" },
      { label: "Compression", value: "snappy" },
      { label: "Acks", value: "all" },
    ],
  },
  "kafka-raw": {
    title: "Kafka: raw-events",
    description: "Raw event ingestion topic",
    metrics: [
      { label: "Partitions", value: "6" },
      { label: "In Rate", value: "3,200/s" },
      { label: "Out Rate", value: "3,200/s" },
      { label: "Consumer Lag", value: "45" },
      { label: "Replication", value: "3" },
      { label: "Size", value: "2.4 GB" },
    ],
  },
  validator: {
    title: "Event Validator",
    description: "Validates schema and business rules, routes to DLQ on failure",
    metrics: [
      { label: "Throughput", value: "3,100/s" },
      { label: "Pass Rate", value: "97.0%" },
      { label: "Avg Latency", value: "2ms" },
      { label: "DLQ Rate", value: "100/s" },
    ],
  },
  "kafka-validated": {
    title: "Kafka: validated-events",
    description: "Validated events ready for processing",
    metrics: [
      { label: "Partitions", value: "6" },
      { label: "In Rate", value: "3,050/s" },
      { label: "Out Rate", value: "3,050/s" },
      { label: "Consumer Lag", value: "12" },
    ],
  },
  flink: {
    title: "Flink Processing",
    description: "Computes real-time features using windowed aggregations",
    metrics: [
      { label: "Job Status", value: "RUNNING" },
      { label: "Parallelism", value: "4" },
      { label: "Records/sec", value: "3,000" },
      { label: "Checkpoint", value: "1.2s" },
      { label: "Watermark Lag", value: "500ms" },
      { label: "Uptime", value: "4h 23m" },
    ],
  },
  "kafka-features": {
    title: "Kafka: computed-features",
    description: "Computed feature vectors for Feast ingestion",
    metrics: [
      { label: "Partitions", value: "6" },
      { label: "In Rate", value: "2,900/s" },
      { label: "Out Rate", value: "2,900/s" },
      { label: "Consumer Lag", value: "8" },
    ],
  },
  feast: {
    title: "Feast Feature Writer",
    description: "Writes computed features to online and offline stores",
    metrics: [
      { label: "Online Write", value: "2.1ms" },
      { label: "Offline Write", value: "15ms" },
      { label: "Throughput", value: "2,900/s" },
      { label: "Online Store", value: "Redis" },
      { label: "Offline Store", value: "PostgreSQL" },
    ],
  },
  stores: {
    title: "Redis + PostgreSQL",
    description: "Feature storage for online serving and offline training",
    metrics: [
      { label: "Redis Memory", value: "1.2 GB" },
      { label: "Redis Hit Rate", value: "99.2%" },
      { label: "PG Connections", value: "12/100" },
      { label: "PG Query Latency", value: "3ms" },
    ],
  },
  dlq: {
    title: "Dead Letter Queue",
    description: "Failed events awaiting investigation or replay",
    metrics: [
      { label: "Queue Size", value: "1,500" },
      { label: "Rate", value: "150/s" },
      { label: "Top Error", value: "Missing amount" },
      { label: "Oldest Event", value: "2h ago" },
    ],
  },
};

export function StageDetailPanel({ stageId, onClose, className }: StageDetailPanelProps) {
  const details = stageDetails[stageId];
  if (!details) return null;

  return (
    <div className={cn("rounded-xl border border-slate-700/50 bg-slate-800/50 p-6", className)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-100">{details.title}</h3>
            <StatusBadge status="healthy" />
          </div>
          <p className="mt-1 text-sm text-slate-400">{details.description}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
          aria-label="Close detail panel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {details.metrics.map((m) => (
          <div key={m.label} className="rounded-lg bg-slate-900 p-3">
            <p className="text-xs text-slate-500">{m.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-100">{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
