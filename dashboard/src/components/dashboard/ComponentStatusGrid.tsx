"use client";

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Database, Server, Cpu, HardDrive } from "lucide-react";
import type { ComponentsHealthResponse } from "@/types/api";

interface ComponentStatusGridProps {
  healthData?: ComponentsHealthResponse;
  className?: string;
}

interface ComponentCardData {
  name: string;
  icon: typeof Server;
  status: "healthy" | "degraded" | "error" | "unknown";
  metrics: { label: string; value: string | number }[];
}

export function ComponentStatusGrid({ healthData, className }: ComponentStatusGridProps) {
  const components: ComponentCardData[] = [
    {
      name: "Kafka",
      icon: Server,
      status: healthData?.components.kafka.status === "healthy" ? "healthy" : "error",
      metrics: [
        { label: "Brokers", value: healthData?.components.kafka.brokers ?? "—" },
        { label: "Topics", value: healthData?.components.kafka.topics ?? "—" },
        { label: "Total Lag", value: "—" },
      ],
    },
    {
      name: "Flink",
      icon: Cpu,
      status: "healthy",
      metrics: [
        { label: "Job Status", value: "RUNNING" },
        { label: "Records/sec", value: "—" },
        { label: "Checkpoint", value: "—" },
      ],
    },
    {
      name: "Redis",
      icon: Database,
      status: healthData?.components.redis.status === "healthy" ? "healthy" : "error",
      metrics: [
        { label: "Status", value: healthData?.components.redis.message ?? "—" },
        { label: "Memory", value: "—" },
        { label: "Hit Rate", value: "—" },
      ],
    },
    {
      name: "PostgreSQL",
      icon: HardDrive,
      status: healthData?.components.postgresql.status === "healthy" ? "healthy" : "error",
      metrics: [
        { label: "Status", value: healthData?.components.postgresql.message ?? "—" },
        { label: "Connections", value: "—" },
        { label: "Latency", value: "—" },
      ],
    },
  ];

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {components.map((comp) => (
        <div
          key={comp.name}
          className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <comp.icon className="h-5 w-5 text-slate-400" aria-hidden="true" />
              <h4 className="font-semibold text-slate-100">{comp.name}</h4>
            </div>
            <StatusBadge status={comp.status} />
          </div>
          <div className="mt-3 space-y-2">
            {comp.metrics.map((m) => (
              <div key={m.label} className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{m.label}</span>
                <span className="font-medium text-slate-200">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
