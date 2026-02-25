"use client";

import { useState, useCallback, useMemo } from "react";
import { DeadLetterTable } from "@/components/dead-letter/DeadLetterTable";
import { EventDetailModal } from "@/components/dead-letter/EventDetailModal";
import { ReplayControls } from "@/components/dead-letter/ReplayControls";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useDeadLetterEvents, useReplayEvents } from "@/hooks/useDeadLetter";
import { AlertCircle, TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/formatters";
import type { DeadLetterEvent } from "@/types/quality";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const ERROR_COLORS = ["#ef4444", "#f59e0b", "#8b5cf6", "#3b82f6", "#10b981"];

export default function DeadLetterPage() {
  const { data, isLoading } = useDeadLetterEvents(100);
  const replayMutation = useReplayEvents();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewEvent, setViewEvent] = useState<DeadLetterEvent | null>(null);

  const events = data?.events ?? [];
  const totalCount = data?.total_count ?? 0;

  const errorBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      const key = e.error_field ?? "unknown";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [events]);

  const toggleSelect = useCallback((eventId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === events.length) {
        return new Set();
      }
      return new Set(events.map((e) => e.original_event.event_id));
    });
  }, [events]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dead Letter Queue</h1>
        <p className="mt-1 text-sm text-slate-400">
          View and replay failed events from the validation pipeline
        </p>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
            Total DLQ Events
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-100">
            {formatNumber(totalCount)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <TrendingUp className="h-3.5 w-3.5" />
            Error Breakdown
          </div>
          {errorBreakdown.length > 0 ? (
            <div className="mt-2 h-20">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={errorBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={35}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {errorBreakdown.map((_, i) => (
                      <Cell key={i} fill={ERROR_COLORS[i % ERROR_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#e2e8f0",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No errors</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-5">
          <div className="text-xs text-slate-500">Error Types</div>
          <div className="mt-2 space-y-1">
            {errorBreakdown.slice(0, 3).map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: ERROR_COLORS[i] }}
                  />
                  <span className="font-mono text-slate-300 truncate max-w-[120px]">{item.name}</span>
                </div>
                <span className="tabular-nums text-slate-400">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Replay Controls */}
      <ReplayControls
        selectedCount={selectedIds.size}
        totalCount={totalCount}
        onReplaySelected={() => replayMutation.mutate()}
        onReplayAll={() => replayMutation.mutate()}
        isReplaying={replayMutation.isPending}
      />

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner label="Loading dead letter events..." className="py-12" />
      ) : (
        <ErrorBoundary fallbackTitle="Failed to load dead letter events">
          <DeadLetterTable
            events={events}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            onViewEvent={setViewEvent}
          />
        </ErrorBoundary>
      )}

      {/* Event Detail Modal */}
      <EventDetailModal
        event={viewEvent}
        onClose={() => setViewEvent(null)}
      />
    </div>
  );
}
