"use client";

import { User, Activity, Clock, ShieldAlert } from "lucide-react";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { formatPercentage } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { UserFeatures } from "@/types/features";

function RiskBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct < 30
      ? "bg-emerald-500"
      : pct < 65
      ? "bg-amber-500"
      : "bg-rose-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums">{formatPercentage(pct, 0)}</span>
    </div>
  );
}

interface UserFeatureCardProps {
  userFeatures: UserFeatures;
}

export function UserFeatureCard({ userFeatures }: UserFeatureCardProps) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold font-mono truncate">{userFeatures.user_id}</h2>
          <div className="mt-2 grid grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                <Activity className="h-3 w-3" />
                Total Events
              </div>
              <p className="text-base font-semibold tabular-nums">
                {userFeatures.total_events.toLocaleString()}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                <Clock className="h-3 w-3" />
                Last Active
              </div>
              <TimeAgo
                timestamp={userFeatures.last_active}
                className="text-base font-semibold"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                <ShieldAlert className="h-3 w-3" />
                Risk Score
              </div>
              <RiskBar score={userFeatures.risk_score} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
