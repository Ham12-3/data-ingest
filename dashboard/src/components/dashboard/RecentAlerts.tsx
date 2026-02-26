"use client";

import type { ElementType } from "react";
import { AlertTriangle, Info, XCircle, CheckCircle2 } from "lucide-react";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { cn } from "@/lib/utils";
import type { Alert, AlertSeverity } from "@/types/metrics";

const severityConfig: Record<
  AlertSeverity,
  { icon: ElementType; color: string; bg: string }
> = {
  error: {
    icon: XCircle,
    color: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-900/20",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20",
  },
  info: {
    icon: Info,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
};

function AlertRow({ alert }: { alert: Alert }) {
  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-start gap-3 rounded-lg p-3", config.bg)}>
      <Icon className={cn("mt-0.5 h-4 w-4 flex-shrink-0", config.color)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug truncate">{alert.message}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-medium">{alert.component}</span>
          <span>·</span>
          <TimeAgo timestamp={alert.timestamp} />
          {alert.resolved && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Resolved
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface RecentAlertsProps {
  alerts: Alert[];
  className?: string;
}

export function RecentAlerts({ alerts, className }: RecentAlertsProps) {
  return (
    <div className={cn("rounded-xl border bg-white p-5 shadow-sm dark:bg-zinc-950 dark:border-zinc-800", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold">Recent Alerts</h3>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {alerts.filter((a) => !a.resolved).length} active
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            No alerts
          </p>
          <p className="text-xs text-zinc-500">All systems operating normally</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.slice(0, 8).map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}
