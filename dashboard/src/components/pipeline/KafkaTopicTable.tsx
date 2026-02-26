"use client";

import { cn } from "@/lib/utils";
import { formatNumber, formatBytes } from "@/lib/formatters";
import type { KafkaTopicInfo } from "@/types/pipeline";

interface KafkaTopicTableProps {
  className?: string;
}

const defaultTopics: KafkaTopicInfo[] = [
  { name: "raw-events", partitions: 6, messagesPerSecIn: 3200, messagesPerSecOut: 3200, consumerLag: 45, sizeBytes: 2_500_000_000 },
  { name: "validated-events", partitions: 6, messagesPerSecIn: 3050, messagesPerSecOut: 3050, consumerLag: 12, sizeBytes: 1_800_000_000 },
  { name: "computed-features", partitions: 6, messagesPerSecIn: 2900, messagesPerSecOut: 2900, consumerLag: 8, sizeBytes: 900_000_000 },
  { name: "dead-letter-queue", partitions: 3, messagesPerSecIn: 150, messagesPerSecOut: 0, consumerLag: 1500, sizeBytes: 450_000_000 },
];

function lagColor(lag: number): string {
  if (lag < 100) return "text-emerald-400";
  if (lag < 1000) return "text-amber-400";
  return "text-rose-400";
}

export function KafkaTopicTable({ className }: KafkaTopicTableProps) {
  return (
    <div className={cn("rounded-xl border border-slate-700/50 bg-slate-800/50 p-6", className)}>
      <h3 className="mb-4 text-lg font-semibold text-slate-100">Kafka Topics</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Topic</th>
              <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">Partitions</th>
              <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">In/sec</th>
              <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">Out/sec</th>
              <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">Consumer Lag</th>
              <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">Size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {defaultTopics.map((topic) => (
              <tr key={topic.name} className="hover:bg-slate-700/20">
                <td className="py-3 font-mono text-sm text-slate-200">{topic.name}</td>
                <td className="py-3 text-right tabular-nums text-slate-300">{topic.partitions}</td>
                <td className="py-3 text-right tabular-nums text-slate-300">{formatNumber(topic.messagesPerSecIn)}</td>
                <td className="py-3 text-right tabular-nums text-slate-300">{formatNumber(topic.messagesPerSecOut)}</td>
                <td className={cn("py-3 text-right tabular-nums font-medium", lagColor(topic.consumerLag))}>
                  {formatNumber(topic.consumerLag)}
                </td>
                <td className="py-3 text-right tabular-nums text-slate-300">{formatBytes(topic.sizeBytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
