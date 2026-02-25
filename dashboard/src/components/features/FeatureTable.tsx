"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { EmptyState } from "@/components/shared/EmptyState";
import { Database } from "lucide-react";
import type { UserFeatures } from "@/types/features";

interface FeatureTableProps {
  data?: UserFeatures;
  className?: string;
}

interface FeatureRow {
  name: string;
  value: string | number | boolean;
  view: string;
}

function categorizeFeature(name: string): string {
  if (name.includes("1m")) return "realtime";
  if (name.includes("5m")) return "realtime";
  if (name.includes("1h")) return "hourly";
  if (name.includes("session")) return "session";
  return "derived";
}

function formatValue(val: string | number | boolean): string {
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number") return val % 1 === 0 ? val.toString() : val.toFixed(4);
  return String(val);
}

export function FeatureTable({ data, className }: FeatureTableProps) {
  if (!data) {
    return (
      <EmptyState
        icon={Database}
        title="No features loaded"
        description="Search for a user ID to view their features"
      />
    );
  }

  const rows: FeatureRow[] = Object.entries(data.features).map(([name, value]) => ({
    name,
    value: value as string | number | boolean,
    view: categorizeFeature(name),
  }));

  return (
    <div className={cn("rounded-xl border border-slate-700/50 bg-slate-800/50 p-6", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-100">
          Features for{" "}
          <Link href={`/features/${data.user_id}`} className="text-blue-400 hover:underline">
            {data.user_id}
          </Link>
        </h3>
        <div className="text-xs text-slate-500">
          Retrieved <TimeAgo date={data.retrieved_at} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Feature</th>
              <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">Value</th>
              <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {rows.map((row) => (
              <tr key={row.name} className="hover:bg-slate-700/20">
                <td className="py-2.5 font-mono text-sm text-slate-200">{row.name}</td>
                <td className="py-2.5 text-right tabular-nums text-slate-300">
                  {formatValue(row.value)}
                </td>
                <td className="py-2.5 text-right">
                  <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                    {row.view}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
