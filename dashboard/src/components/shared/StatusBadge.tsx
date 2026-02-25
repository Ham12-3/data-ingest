"use client";

import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/constants";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";

type Status = "healthy" | "degraded" | "error" | "unknown";

interface StatusBadgeProps {
  status: Status;
  label?: string;
  showIcon?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const statusIcons = {
  healthy: CheckCircle2,
  degraded: AlertTriangle,
  error: XCircle,
  unknown: HelpCircle,
};

const statusLabels: Record<Status, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  error: "Error",
  unknown: "Unknown",
};

export function StatusBadge({
  status,
  label,
  showIcon = true,
  size = "sm",
  className,
}: StatusBadgeProps) {
  const colors = STATUS_COLORS[status];
  const Icon = statusIcons[status];
  const displayLabel = label || statusLabels[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        colors.bgLight,
        colors.text,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        status === "error" && "animate-pulse",
        className
      )}
      role="status"
      aria-label={`Status: ${displayLabel}`}
    >
      {showIcon && (
        <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-4 w-4")} aria-hidden="true" />
      )}
      {displayLabel}
    </span>
  );
}
