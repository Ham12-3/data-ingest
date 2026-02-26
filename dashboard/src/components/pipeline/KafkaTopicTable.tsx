"use client";

import { ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import { formatRate, formatBytes } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { KafkaTopic } from "@/types/pipeline";

function LagBadge({ lag }: { lag: number }) {
  const color =
    lag > 1000
      ? "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-900/20 dark:border-rose-800"
      : lag > 100
      ? "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800"
      : "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums",
        color
      )}
    >
      {lag.toLocaleString()}
    </span>
  );
}

type SortField = keyof KafkaTopic;

interface KafkaTopicTableProps {
  topics: KafkaTopic[];
}

export function KafkaTopicTable({ topics }: KafkaTopicTableProps) {
  const [sortField, setSortField] = useState<SortField>("consumer_lag");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...topics].sort((a, b) => {
    const va = a[sortField];
    const vb = b[sortField];
    const cmp =
      typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb));
    return sortAsc ? cmp : -cmp;
  });

  function handleSort(field: SortField) {
    if (field === sortField) setSortAsc((v) => !v);
    else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (field !== sortField)
      return <span className="inline-block h-3 w-3 opacity-0" />;
    return sortAsc ? (
      <ArrowUp className="inline h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="inline h-3 w-3 ml-1" />
    );
  }

  const columns: { key: SortField; label: string }[] = [
    { key: "name", label: "Topic" },
    { key: "partitions", label: "Partitions" },
    { key: "messages_in_per_sec", label: "In/s" },
    { key: "messages_out_per_sec", label: "Out/s" },
    { key: "consumer_lag", label: "Lag" },
    { key: "size_bytes", label: "Size" },
  ];

  return (
    <div className="rounded-xl border bg-white shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
      <div className="flex items-center justify-between px-5 py-4 border-b dark:border-zinc-800">
        <h3 className="text-base font-semibold">Kafka Topics</h3>
        <span className="text-xs text-zinc-500">{topics.length} topics</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b dark:border-zinc-800">
              {columns.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="cursor-pointer px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 select-none"
                >
                  {label}
                  <SortIcon field={key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((topic) => (
              <tr
                key={topic.name}
                className="border-b last:border-0 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs font-medium">
                  {topic.name}
                </td>
                <td className="px-4 py-3 tabular-nums">{topic.partitions}</td>
                <td className="px-4 py-3 tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatRate(topic.messages_in_per_sec, "")}
                </td>
                <td className="px-4 py-3 tabular-nums text-blue-600 dark:text-blue-400">
                  {formatRate(topic.messages_out_per_sec, "")}
                </td>
                <td className="px-4 py-3">
                  <LagBadge lag={topic.consumer_lag} />
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-500">
                  {formatBytes(topic.size_bytes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
