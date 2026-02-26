"use client";

import { useState } from "react";
import { RotateCcw, Trash2, CheckCircle2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface ReplayControlsProps {
  selectedCount: number;
  totalCount: number;
  isReplaying?: boolean;
  onReplaySelected: () => void;
  onReplayAll: () => void;
  onClearSelection: () => void;
}

export function ReplayControls({
  selectedCount,
  totalCount,
  isReplaying,
  onReplaySelected,
  onReplayAll,
  onClearSelection,
}: ReplayControlsProps) {
  const [confirmDialog, setConfirmDialog] = useState<
    null | "selected" | "all"
  >(null);

  function handleConfirm() {
    if (confirmDialog === "selected") onReplaySelected();
    else if (confirmDialog === "all") onReplayAll();
    setConfirmDialog(null);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border bg-blue-50 px-3 py-2 text-sm dark:bg-blue-900/20 dark:border-blue-800">
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-blue-700 dark:text-blue-300">
              {selectedCount} selected
            </span>
            <button
              onClick={onClearSelection}
              className="text-xs text-blue-500 hover:underline"
            >
              Clear
            </button>
          </div>
        )}

        <button
          onClick={() => setConfirmDialog("selected")}
          disabled={selectedCount === 0 || isReplaying}
          className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" />
          Replay Selected ({selectedCount})
        </button>

        <button
          onClick={() => setConfirmDialog("all")}
          disabled={isReplaying}
          className="flex items-center gap-1.5 rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" />
          Replay All ({totalCount.toLocaleString()})
        </button>

        {isReplaying && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-500" />
            Replaying events…
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDialog !== null}
        variant="danger"
        title={
          confirmDialog === "all"
            ? `Replay All ${totalCount.toLocaleString()} Events`
            : `Replay ${selectedCount} Selected Event${selectedCount !== 1 ? "s" : ""}`
        }
        description={
          confirmDialog === "all"
            ? `This will re-submit all ${totalCount.toLocaleString()} dead letter events back into the pipeline. This action may take several minutes.`
            : `This will re-submit ${selectedCount} event${selectedCount !== 1 ? "s" : ""} back into the pipeline for reprocessing.`
        }
        confirmLabel="Confirm Replay"
        isLoading={isReplaying}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmDialog(null)}
      />
    </>
  );
}
