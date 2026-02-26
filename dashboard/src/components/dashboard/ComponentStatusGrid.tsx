"use client";

import type { ElementType } from "react";
import { Server, Zap, Database, HardDrive } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import type { ComponentHealth } from "@/types/metrics";

const componentIcons: Record<string, ElementType> = {
  Kafka: Server,
  Flink: Zap,
  Redis: Database,
  PostgreSQL: HardDrive,
};

function ComponentCard({ component }: { component: ComponentHealth }) {
  const Icon = componentIcons[component.name] ?? Server;

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
            <Icon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
          </div>
          <span className="font-semibold text-sm">{component.name}</span>
        </div>
        <StatusBadge status={component.status} size="sm" />
      </div>

      <dl className="space-y-1.5">
        {Object.entries(component.metrics)
          .slice(0, 3)
          .map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <dt className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">
                {key.replace(/_/g, " ")}
              </dt>
              <dd className="text-xs font-medium tabular-nums">{value}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

interface ComponentStatusGridProps {
  components: ComponentHealth[];
  className?: string;
}

export function ComponentStatusGrid({
  components,
  className,
}: ComponentStatusGridProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-base font-semibold">Component Health</h3>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {components.map((component) => (
          <ComponentCard key={component.name} component={component} />
        ))}
      </div>
    </div>
  );
}
