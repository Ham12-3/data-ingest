"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { cn } from "@/lib/utils";
import type { ValidationExpectation, ExpectationStatus } from "@/types/quality";

type FilterStatus = ExpectationStatus | "all";

interface ValidationResultsTableProps {
  expectations: ValidationExpectation[];
}

export function ValidationResultsTable({ expectations }: ValidationResultsTableProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered =
    filterStatus === "all"
      ? expectations
      : expectations.filter((e) => e.status === filterStatus);

  return (
    <div className="rounded-xl border bg-white shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
      <div className="flex items-center justify-between px-5 py-4 border-b dark:border-zinc-800 flex-wrap gap-3">
        <h3 className="text-base font-semibold">Validation Results</h3>
        <div
          className="flex items-center gap-2"
          role="group"
          aria-label="Filter by status"
        >
          {(["all", "pass", "fail", "warning"] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              aria-pressed={filterStatus === s}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                filterStatus === s
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <th className="w-8 px-4 py-3" />
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Expectation</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Observed</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Expected</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Checked</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((exp) => {
              const isExpanded = expanded === exp.id;
              return (
                <Fragment key={exp.id}>
                  <tr
                    onClick={() => setExpanded(isExpanded ? null : exp.id)}
                    className="border-b last:border-0 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-zinc-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-zinc-400" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-mono text-xs font-medium">{exp.name}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{exp.expectation_type}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={exp.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium">{exp.observed_value}</td>
                    <td className="px-4 py-3 text-zinc-500">{exp.expected_range}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      <TimeAgo timestamp={exp.checked_at} />
                    </td>
                  </tr>
                  {isExpanded && exp.details && (
                    <tr className="bg-zinc-50 dark:bg-zinc-900/30">
                      <td colSpan={6} className="px-8 py-3">
                        <pre className="text-xs font-mono text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                          {JSON.stringify(exp.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
