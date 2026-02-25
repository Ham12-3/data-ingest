"use client";

import { cn } from "@/lib/utils";
import { SEVERITY_COLORS } from "@/lib/constants";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { Info, AlertTriangle, XCircle, Bell } from "lucide-react";
import type { Alert } from "@/types/metrics";

interface RecentAlertsProps {
  alerts?: Alert[];
  className?: string;
}

const severityIcons = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  critical: XCircle,
};

const defaultAlerts: Alert[] = [
  {
    id: "1",
    severity: "warning",
    message: "Consumer lag exceeding 500 on raw-events topic",
    component: "Kafka",
    timestamp: new Date(Date.now() - 120_000).toISOString(),
    acknowledged: false,
  },
  {
    id: "2",
    severity: "info",
    message: "Flink checkpoint completed in 1.2s",
    component: "Flink",
    timestamp: new Date(Date.now() - 300_000).toISOString(),
    acknowledged: true,
  },
  {
    id: "3",
    severity: "error",
    message: "Dead letter queue size exceeded 1000 events",
    component: "Validator",
    timestamp: new Date(Date.now() - 600_000).toISOString(),
    acknowledged: false,
  },
  {
    id: "4",
    severity: "info",
    message: "Feature store write latency normalized",
    component: "Feast",
    timestamp: new Date(Date.now() - 900_000).toISOString(),
    acknowledged: true,
  },
  {
    id: "5",
    severity: "warning",
    message: "Validation pass rate dropped below 95%",
    component: "Validator",
    timestamp: new Date(Date.now() - 1_500_000).toISOString(),
    acknowledged: false,
  },
];

export function RecentAlerts({ alerts, className }: RecentAlertsProps) {
  const displayAlerts = alerts ?? defaultAlerts;

  return (
    <div className={cn("rounded-xl border border-slate-700/50 bg-slate-800/50 p-6", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-100">Recent Alerts</h3>
        </div>
        <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-300">
          {displayAlerts.length}
        </span>
      </div>

      <div className="space-y-1">
        {displayAlerts.map((alert) => {
          const Icon = severityIcons[alert.severity];
          return (
            <div
              key={alert.id}
              className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-slate-700/30"
            >
              <Icon
                className={cn("mt-0.5 h-4 w-4 flex-shrink-0", SEVERITY_COLORS[alert.severity])}
                aria-label={alert.severity}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate">{alert.message}</p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                  <span>{alert.component}</span>
                  <span>·</span>
                  <TimeAgo date={alert.timestamp} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
