"use client";

import { cn } from "@/lib/utils";
import type { HealthStatus } from "@/types/metrics";

interface StatusBadgeProps {
  status: HealthStatus | "pass" | "fail" | "warning" | "unknown";
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

const statusConfig = {
  healthy: {
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800",
    label: "Healthy",
    pulse: false,
  },
  pass: {
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800",
    label: "Pass",
    pulse: false,
  },
  degraded: {
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    label: "Degraded",
    pulse: false,
  },
  warning: {
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    label: "Warning",
    pulse: false,
  },
  error: {
    dot: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    border: "border-rose-200 dark:border-rose-800",
    label: "Error",
    pulse: true,
  },
  fail: {
    dot: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    border: "border-rose-200 dark:border-rose-800",
    label: "Fail",
    pulse: true,
  },
  unknown: {
    dot: "bg-zinc-400",
    text: "text-zinc-500 dark:text-zinc-400",
    bg: "bg-zinc-50 dark:bg-zinc-900/20",
    border: "border-zinc-200 dark:border-zinc-700",
    label: "Unknown",
    pulse: false,
  },
};

export function StatusBadge({
  status,
  label,
  size = "md",
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.unknown;
  const displayLabel = label ?? config.label;

  return (
    <span
      role="status"
      aria-label={`Status: ${displayLabel}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        config.bg,
        config.border,
        config.text,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        className
      )}
    >
      <span className="relative flex h-2 w-2 flex-shrink-0">
        {config.pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              config.dot
            )}
          />
        )}
        <span
          className={cn("relative inline-flex h-2 w-2 rounded-full", config.dot)}
        />
      </span>
      {displayLabel}
    </span>
  );
}
