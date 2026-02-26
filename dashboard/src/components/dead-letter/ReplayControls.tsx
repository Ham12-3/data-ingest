"use client";

import { RotateCcw, RotateCw } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useState } from "react";

interface ReplayControlsProps {
  selectedCount: number;
  totalCount: number;
  onReplaySelected: () => void;
  onReplayAll: () => void;
  isReplaying: boolean;
  className?: string;
}

export function ReplayControls({
  selectedCount,
  totalCount,
  onReplaySelected,
  onReplayAll,
  isReplaying,
  className,
}: ReplayControlsProps) {
  const [confirmType, setConfirmType] = useState<"selected" | "all" | null>(null);

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setConfirmType("selected")}
          disabled={selectedCount === 0 || isReplaying}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="h-4 w-4" />
          Replay Selected ({selectedCount})
        </button>
        <button
          onClick={() => setConfirmType("all")}
          disabled={totalCount === 0 || isReplaying}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCw className="h-4 w-4" />
          Replay All
        </button>

        {isReplaying && (
          <div className="flex items-center gap-2 text-sm text-blue-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            Replaying events...
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmType === "selected"}
        onClose={() => setConfirmType(null)}
        onConfirm={() => {
          onReplaySelected();
          setConfirmType(null);
        }}
        title="Replay Selected Events"
        description={`Are you sure you want to replay ${selectedCount} selected event(s)? They will be re-sent to the raw-events topic for reprocessing.`}
        confirmLabel="Replay Events"
        variant="default"
        loading={isReplaying}
      />

      <ConfirmDialog
        open={confirmType === "all"}
        onClose={() => setConfirmType(null)}
        onConfirm={() => {
          onReplayAll();
          setConfirmType(null);
        }}
        title="Replay All Events"
        description={`Are you sure you want to replay all ${totalCount} dead letter event(s)? This will re-send them to the raw-events topic for reprocessing.`}
        confirmLabel="Replay All"
        variant="danger"
        loading={isReplaying}
      />
    </div>
  );
}
