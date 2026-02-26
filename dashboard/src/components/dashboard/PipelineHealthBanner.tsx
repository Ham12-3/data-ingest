"use client";

import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, formatTimeAgo } from "@/lib/formatters";

interface PipelineHealthBannerProps {
  status: "healthy" | "degraded" | "error";
  uptimeSeconds?: number;
  lastIncident?: string;
  warningCount?: number;
  className?: string;
}

const statusConfig = {
  healthy: {
    icon: CheckCircle2,
    bg: "bg-emerald-500/5 border-emerald-500/20",
    iconColor: "text-emerald-500",
    dotColor: "bg-emerald-500",
    title: "Pipeline Healthy",
    description: "All systems operational",
  },
  degraded: {
    icon: AlertTriangle,
    bg: "bg-amber-500/5 border-amber-500/20",
    iconColor: "text-amber-500",
    dotColor: "bg-amber-500",
    title: "Degraded Performance",
    description: "warnings detected",
  },
  error: {
    icon: XCircle,
    bg: "bg-rose-500/5 border-rose-500/20",
    iconColor: "text-rose-500",
    dotColor: "bg-rose-500",
    title: "Pipeline Error",
    description: "Immediate attention required",
  },
};

export function PipelineHealthBanner({
  status,
  uptimeSeconds,
  lastIncident,
  warningCount = 0,
  className,
}: PipelineHealthBannerProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const description =
    status === "degraded" && warningCount > 0
      ? `${warningCount} ${config.description}`
      : config.description;

  return (
    <div
      className={cn(
        "flex w-full items-center gap-4 rounded-xl border p-4",
        config.bg,
        className
      )}
      role="status"
      aria-label={`Pipeline status: ${config.title}`}
    >
      <div className={cn("rounded-full bg-slate-900 p-2.5", config.iconColor)}>
        <Icon className="h-6 w-6" />
      </div>

      <div className="flex flex-1 flex-col">
        <h3 className={cn("text-lg font-bold leading-none", config.iconColor)}>
          {config.title}
        </h3>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>

      <div className="flex items-center gap-6 text-sm">
        {uptimeSeconds != null && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Uptime</p>
            <p className="font-medium text-slate-200">{formatDuration(uptimeSeconds)}</p>
          </div>
        )}
        {lastIncident && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Last Incident</p>
            <p className="font-medium text-slate-200">{formatTimeAgo(lastIncident)}</p>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                config.dotColor
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                config.dotColor
              )}
            />
          </span>
          Live
        </div>
      </div>
    </div>
  );
}
