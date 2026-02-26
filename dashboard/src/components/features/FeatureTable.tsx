"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import type { FeatureRow, FeatureView } from "@/types/features";

const viewColors: Record<FeatureView, string> = {
  realtime: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800",
  hourly: "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/20 dark:border-purple-800",
  session: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800",
  derived: "text-teal-600 bg-teal-50 border-teal-200 dark:text-teal-400 dark:bg-teal-900/20 dark:border-teal-800",
};

function ViewBadge({ view }: { view: FeatureView }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        viewColors[view]
      )}
    >
      {view}
    </span>
  );
}

interface FeatureTableProps {
  rows: FeatureRow[];
  filterView?: FeatureView | "all";
}

export function FeatureTable({ rows, filterView = "all" }: FeatureTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered =
    filterView === "all"
      ? rows
      : rows.filter((r) => r.feature_view === filterView);

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-12 text-center dark:bg-zinc-950 dark:border-zinc-800">
        <p className="text-sm text-zinc-500">No features match the current filter.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm dark:bg-zinc-950 dark:border-zinc-800 overflow-hidden">
      <table className="w-full text-sm" role="table">
        <thead>
          <tr className="border-b dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <th className="w-8 px-4 py-3" />
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
              User ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
              Feature Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
              Current Value
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
              Last Updated
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
              View
            </th>
            <th className="w-8 px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {filtered.map((row, idx) => {
            const key = `${row.user_id}-${row.feature_name}-${idx}`;
            const isExpanded = expanded === key;

            return (
              <Fragment key={key}>
                <tr
                  className="border-b last:border-0 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : key)}
                >
                  <td className="px-4 py-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-zinc-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zinc-400" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-medium">
                    {row.user_id}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.feature_name}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium">
                    {String(row.current_value)}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    <TimeAgo timestamp={row.last_updated} />
                  </td>
                  <td className="px-4 py-3">
                    <ViewBadge view={row.feature_view} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/features/${row.user_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-500 hover:text-blue-600"
                      aria-label={`View details for ${row.user_id}`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-zinc-50 dark:bg-zinc-900/30">
                    <td colSpan={7} className="px-8 py-3">
                      <p className="text-xs text-zinc-500">
                        Feature history sparkline would appear here — click the user
                        link to see the full timeline.
                      </p>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
