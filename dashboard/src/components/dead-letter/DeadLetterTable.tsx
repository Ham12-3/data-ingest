"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { EmptyState } from "@/components/shared/EmptyState";
import { AlertCircle } from "lucide-react";
import type { DeadLetterEvent } from "@/types/quality";

interface DeadLetterTableProps {
  events: DeadLetterEvent[];
  selectedIds: Set<string>;
  onToggleSelect: (eventId: string) => void;
  onToggleAll: () => void;
  onViewEvent: (event: DeadLetterEvent) => void;
  className?: string;
}

export function DeadLetterTable({
  events,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onViewEvent,
  className,
}: DeadLetterTableProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="No dead letter events"
        description="All events are being processed successfully"
      />
    );
  }

  const allSelected = events.every((e) => selectedIds.has(e.original_event.event_id));

  return (
    <div className={cn("rounded-xl border border-slate-700/50 bg-slate-800/50 p-6", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="pb-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                  aria-label="Select all events"
                />
              </th>
              <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Event ID</th>
              <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">User</th>
              <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Error</th>
              <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Error Field</th>
              <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">Failed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {events.map((event) => {
              const eventId = event.original_event.event_id;
              const isSelected = selectedIds.has(eventId);

              return (
                <tr
                  key={eventId}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-slate-700/20",
                    isSelected && "bg-blue-500/5"
                  )}
                  onClick={() => onViewEvent(event)}
                >
                  <td className="py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(eventId)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                      aria-label={`Select event ${eventId}`}
                    />
                  </td>
                  <td className="py-2.5 font-mono text-xs text-slate-300">
                    {eventId.slice(0, 12)}...
                  </td>
                  <td className="py-2.5 text-slate-200">{event.original_event.user_id}</td>
                  <td className="py-2.5 text-rose-400 max-w-xs truncate">{event.error_message}</td>
                  <td className="py-2.5 font-mono text-xs text-slate-500">
                    {event.error_field ?? "—"}
                  </td>
                  <td className="py-2.5 text-right text-slate-500">
                    <TimeAgo date={event.failed_at} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
