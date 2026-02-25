"use client";

import { cn } from "@/lib/utils";
import { User, Activity, Clock, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TimeAgo } from "@/components/shared/TimeAgo";
import type { UserFeatures } from "@/types/features";
import { formatDecimal } from "@/lib/formatters";

interface UserFeatureCardProps {
  data: UserFeatures;
  className?: string;
}

export function UserFeatureCard({ data, className }: UserFeatureCardProps) {
  const { features } = data;
  const riskScore = features.user_activity_score;
  const riskStatus: "healthy" | "degraded" | "error" =
    riskScore > 7 ? "error" : riskScore > 4 ? "degraded" : "healthy";

  return (
    <div className={cn("rounded-xl border border-slate-700/50 bg-slate-800/50 p-6", className)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-500/10 p-3">
            <User className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">{data.user_id}</h2>
            <p className="text-sm text-slate-400">
              Retrieved <TimeAgo date={data.retrieved_at} />
            </p>
          </div>
        </div>
        <StatusBadge
          status={features.is_power_user ? "healthy" : "unknown"}
          label={features.is_power_user ? "Power User" : "Regular User"}
          size="md"
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-slate-900 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Activity className="h-3 w-3" />
            Events (1h)
          </div>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-100">
            {features.event_count_1h}
          </p>
        </div>
        <div className="rounded-lg bg-slate-900 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-3 w-3" />
            Session Duration
          </div>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-100">
            {Math.floor(features.session_duration / 60)}m
          </p>
        </div>
        <div className="rounded-lg bg-slate-900 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-3 w-3" />
            Activity Score
          </div>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-100">
            {formatDecimal(riskScore, 1)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-900 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            Purchase Freq
          </div>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-100">
            {formatDecimal(features.purchase_frequency, 2)}
          </p>
        </div>
      </div>
    </div>
  );
}
