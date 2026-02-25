"use client";

import { useEffect, useRef } from "react";
import { X, RotateCcw } from "lucide-react";
import type { DeadLetterEvent } from "@/types/quality";
import { formatTimestamp } from "@/lib/formatters";

interface EventDetailModalProps {
  event: DeadLetterEvent | null;
  onClose: () => void;
  onReplay?: (event: DeadLetterEvent) => void;
}

export function EventDetailModal({ event, onClose, onReplay }: EventDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (event) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [event]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!event) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-0 flex h-full w-full items-center justify-center bg-transparent p-0 backdrop:bg-black/60"
      aria-labelledby="event-detail-title"
    >
      <div className="w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div>
            <h3 id="event-detail-title" className="text-lg font-semibold text-slate-100">
              Event Detail
            </h3>
            <p className="font-mono text-xs text-slate-500">
              {event.original_event.event_id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onReplay && (
              <button
                onClick={() => onReplay(event)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
              >
                <RotateCcw className="h-4 w-4" />
                Replay This Event
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-2 divide-x divide-slate-700 overflow-y-auto max-h-[calc(80vh-73px)]">
          {/* Left: Original Event */}
          <div className="p-6">
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Original Event
            </h4>
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-300 leading-relaxed">
              {JSON.stringify(event.original_event, null, 2)}
            </pre>
          </div>

          {/* Right: Error Details */}
          <div className="p-6">
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Error Details
            </h4>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500">Error Message</p>
                <p className="mt-1 text-sm font-medium text-rose-400">{event.error_message}</p>
              </div>
              {event.error_field && (
                <div>
                  <p className="text-xs text-slate-500">Error Field</p>
                  <p className="mt-1 font-mono text-sm text-slate-200">{event.error_field}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500">Failed At</p>
                <p className="mt-1 text-sm text-slate-200">{formatTimestamp(event.failed_at)}</p>
              </div>
              {event.correlation_id && (
                <div>
                  <p className="text-xs text-slate-500">Correlation ID</p>
                  <p className="mt-1 font-mono text-sm text-slate-200">{event.correlation_id}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
