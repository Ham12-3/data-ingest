"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ExpectationResult } from "@/types/quality";

interface ValidationResultsTableProps {
  results: ExpectationResult[];
  className?: string;
}

export function ValidationResultsTable({ results, className }: ValidationResultsTableProps) {
  const [filter, setFilter] = useState<"all" | "pass" | "fail">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = results.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  return (
    <div className={cn("rounded-xl border border-slate-700/50 bg-slate-800/50 p-6", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-100">Validation Results</h3>
        <div className="flex gap-1 rounded-lg bg-slate-900 p-1">
          {(["all", "pass", "fail"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                filter === f
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 w-8"></th>
              <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Expectation</th>
              <th className="pb-3 text-center text-xs font-medium uppercase tracking-wider text-slate-400">Status</th>
              <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">Observed</th>
              <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">Expected</th>
              <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">Checked</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filtered.map((result) => (
              <>
                <tr
                  key={result.id}
                  className="cursor-pointer hover:bg-slate-700/20"
                  onClick={() => setExpandedId(expandedId === result.id ? null : result.id)}
                >
                  <td className="py-2.5">
                    {expandedId === result.id ? (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    )}
                  </td>
                  <td className="py-2.5 font-mono text-xs text-slate-200">{result.name}</td>
                  <td className="py-2.5 text-center">
                    <StatusBadge
                      status={result.status === "pass" ? "healthy" : "error"}
                      label={result.status === "pass" ? "Pass" : "Fail"}
                    />
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-slate-300">{String(result.observed_value)}</td>
                  <td className="py-2.5 text-right text-slate-400">{result.expected_range}</td>
                  <td className="py-2.5 text-right text-slate-500">
                    <TimeAgo date={result.checked_at} />
                  </td>
                </tr>
                {expandedId === result.id && result.details && (
                  <tr key={`${result.id}-detail`}>
                    <td colSpan={6} className="bg-slate-900/50 px-8 py-3">
                      <p className="text-xs text-slate-400">{result.details}</p>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
