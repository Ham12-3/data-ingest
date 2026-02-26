"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { cn } from "@/lib/utils";
import type { DeadLetterEvent } from "@/types/api";

const ERROR_TYPE_COLORS: Record<string, string> = {
  SchemaValidationError: "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-900/20 dark:border-rose-800",
  NullValueError: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800",
  TypeMismatchError: "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/20 dark:border-purple-800",
  RangeExceededError: "text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/20 dark:border-orange-800",
  DuplicateEventError: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800",
};

function ErrorTypeBadge({ errorType }: { errorType: string }) {
  const color = ERROR_TYPE_COLORS[errorType] ??
    "text-zinc-600 bg-zinc-50 border-zinc-200 dark:text-zinc-400 dark:bg-zinc-900 dark:border-zinc-700";
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", color)}>
      {errorType}
    </span>
  );
}

interface DeadLetterTableProps {
  events: DeadLetterEvent[];
  total: number;
  page: number;
  pageSize: number;
  selectedIds: Set<string>;
  onPageChange: (page: number) => void;
  onSelectToggle: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onRowClick: (event: DeadLetterEvent) => void;
}

export function DeadLetterTable({
  events,
  total,
  page,
  pageSize,
  selectedIds,
  onPageChange,
  onSelectToggle,
  onSelectAll,
  onRowClick,
}: DeadLetterTableProps) {
  const totalPages = Math.ceil(total / pageSize);
  const allSelected = events.length > 0 && events.every((e) => selectedIds.has(e.event_id));

  return (
    <div className="rounded-xl border bg-white shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  aria-label="Select all events"
                  className="h-4 w-4 rounded border-zinc-300 text-blue-500 dark:border-zinc-600"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Event ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">User ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Error Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Message</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Original Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Failed At</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr
                key={event.event_id}
                onClick={() => onRowClick(event)}
                className={cn(
                  "border-b last:border-0 dark:border-zinc-800 cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50",
                  selectedIds.has(event.event_id) && "bg-blue-50/50 dark:bg-blue-900/10"
                )}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(event.event_id)}
                    onChange={() => onSelectToggle(event.event_id)}
                    aria-label={`Select event ${event.event_id}`}
                    className="h-4 w-4 rounded border-zinc-300 text-blue-500 dark:border-zinc-600"
                  />
                </td>
                <td className="px-4 py-3 font-mono text-xs">{event.event_id.slice(0, 8)}…</td>
                <td className="px-4 py-3 font-mono text-xs font-medium">{event.user_id}</td>
                <td className="px-4 py-3">
                  <ErrorTypeBadge errorType={event.error_type} />
                </td>
                <td className="px-4 py-3 max-w-xs truncate text-xs text-zinc-600 dark:text-zinc-400">
                  {event.error_message}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  <TimeAgo timestamp={event.original_timestamp} />
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  <TimeAgo timestamp={event.failed_at} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3 border-t dark:border-zinc-800">
        <p className="text-xs text-zinc-500">
          {total.toLocaleString()} total events · Page {page + 1} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
