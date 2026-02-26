"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { DeadLetterTable } from "@/components/dead-letter/DeadLetterTable";
import { EventDetailModal } from "@/components/dead-letter/EventDetailModal";
import { ReplayControls } from "@/components/dead-letter/ReplayControls";
import { LoadingOverlay } from "@/components/shared/LoadingSpinner";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useDeadLetter, useReplayEvents } from "@/hooks/useDeadLetter";
import { DLQ_PAGE_SIZE } from "@/lib/constants";
import type { DeadLetterEvent } from "@/types/api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const PIE_COLORS = ["#f43f5e", "#f59e0b", "#8b5cf6", "#3b82f6", "#10b981"];

function DLQSummaryBar({ events }: { events: DeadLetterEvent[] }) {
  const counts: Record<string, number> = {};
  events.forEach((e) => {
    counts[e.error_type] = (counts[e.error_type] ?? 0) + 1;
  });
  const pieData = Object.entries(counts).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-6 flex-wrap">
        <div>
          <p className="text-3xl font-bold tabular-nums">{events.length}</p>
          <p className="text-sm text-zinc-500">events on this page</p>
        </div>
        <div className="h-32 w-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={50}
                dataKey="value"
                paddingAngle={2}
              >
                {pieData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={PIE_COLORS[i % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#f4f4f5",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px" }}
                formatter={(value) =>
                  value.replace("Error", "").trim()
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function DeadLetterPage() {
  const { data, isLoading, page, setPage } = useDeadLetter();
  const replayMutation = useReplayEvents();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeEvent, setActiveEvent] = useState<DeadLetterEvent | null>(null);

  if (isLoading || !data) {
    return <LoadingOverlay label="Loading dead letter queue…" />;
  }

  function handleSelectToggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAll(checked: boolean) {
    if (checked) setSelectedIds(new Set(data.items.map((e) => e.event_id)));
    else setSelectedIds(new Set());
  }

  function handleReplaySelected() {
    replayMutation.mutate(Array.from(selectedIds), {
      onSuccess: () => setSelectedIds(new Set()),
    });
  }

  function handleReplayAll() {
    replayMutation.mutate(data.items.map((e) => e.event_id), {
      onSuccess: () => setSelectedIds(new Set()),
    });
  }

  function handleSingleReplay(eventId: string) {
    replayMutation.mutate([eventId]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dead Letter Queue</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Failed events awaiting replay or inspection
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800/50 dark:bg-amber-900/10">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
            {data.total.toLocaleString()} total events
          </span>
        </div>
      </div>

      <ErrorBoundary label="DLQ summary">
        <DLQSummaryBar events={data.items} />
      </ErrorBoundary>

      <ErrorBoundary label="Replay controls">
        <ReplayControls
          selectedCount={selectedIds.size}
          totalCount={data.total}
          isReplaying={replayMutation.isPending}
          onReplaySelected={handleReplaySelected}
          onReplayAll={handleReplayAll}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      </ErrorBoundary>

      <ErrorBoundary label="Dead letter table">
        <DeadLetterTable
          events={data.items}
          total={data.total}
          page={page}
          pageSize={DLQ_PAGE_SIZE}
          selectedIds={selectedIds}
          onPageChange={setPage}
          onSelectToggle={handleSelectToggle}
          onSelectAll={handleSelectAll}
          onRowClick={setActiveEvent}
        />
      </ErrorBoundary>

      <EventDetailModal
        event={activeEvent}
        isReplaying={replayMutation.isPending}
        onClose={() => setActiveEvent(null)}
        onReplay={handleSingleReplay}
      />
    </div>
  );
}
