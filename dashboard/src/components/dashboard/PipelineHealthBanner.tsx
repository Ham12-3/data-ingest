"use client";

import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineHealthBannerProps {
  status: "healthy" | "degraded" | "failing";
  lastCheck?: string;
  className?: string;
}

const statusMap = {
  healthy: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-500",
    bg: "bg-green-50 dark:bg-green-900/10",
    border: "border-green-100 dark:border-green-900/20",
    title: "System Healthy",
    description: "All components are operating normally. No active alerts.",
  },
  degraded: {
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/10",
    border: "border-amber-100 dark:border-amber-900/20",
    title: "System Degraded",
    description: "High latency detected in Flink processing nodes. Investigating...",
  },
  failing: {
    icon: XCircle,
    color: "text-red-600 dark:text-red-500",
    bg: "bg-red-50 dark:bg-red-900/10",
    border: "border-red-100 dark:border-red-900/20",
    title: "System Failing",
    description: "Kafka connection timeout. Manual intervention required.",
  },
};

export function PipelineHealthBanner({
  status,
  lastCheck,
  className,
}: PipelineHealthBannerProps) {
  const config = statusMap[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex w-full items-center gap-4 rounded-xl border p-4 shadow-sm",
        config.bg,
        config.border,
        className
      )}
    >
      <div className={cn("rounded-full p-2 bg-white dark:bg-zinc-950", config.color)}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex flex-1 flex-col">
        <h3 className={cn("text-lg font-bold leading-none tracking-tight", config.color)}>
          {config.title}
        </h3>
        <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {config.description}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          <span className="relative flex h-2 w-2">
            <span className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              status === "healthy" ? "bg-green-500" : status === "degraded" ? "bg-amber-500" : "bg-red-500"
            )}></span>
            <span className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              status === "healthy" ? "bg-green-600" : status === "degraded" ? "bg-amber-600" : "bg-red-600"
            )}></span>
          </span>
          Live Status
        </div>
        {lastCheck && (
          <p className="text-xs text-zinc-400">Last checked: {lastCheck}</p>
        )}
      </div>
    </div>
  );
}
