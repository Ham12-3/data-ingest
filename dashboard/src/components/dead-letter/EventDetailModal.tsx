"use client";

import { useEffect, useRef } from "react";
import { X, RotateCcw } from "lucide-react";
import { TimeAgo } from "@/components/shared/TimeAgo";
import type { DeadLetterEvent } from "@/types/api";

interface EventDetailModalProps {
  event: DeadLetterEvent | null;
  isReplaying?: boolean;
  onClose: () => void;
  onReplay: (eventId: string) => void;
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="overflow-auto rounded-lg bg-zinc-50 p-4 text-xs font-mono text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 max-h-64">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export function EventDetailModal({
  event,
  isReplaying,
  onClose,
  onReplay,
}: EventDetailModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!event) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKey);
  }, [event, onClose]);

  if (!event) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Event detail: ${event.event_id}`}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-4xl rounded-xl border bg-white shadow-2xl outline-none dark:bg-zinc-950 dark:border-zinc-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="font-semibold">Event Detail</h2>
            <p className="mt-0.5 font-mono text-xs text-zinc-500">{event.event_id}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-xs text-zinc-500">
              <p>Failed <TimeAgo timestamp={event.failed_at} /></p>
              <p className="font-medium text-zinc-700 dark:text-zinc-300">{event.error_type}</p>
            </div>
            <button
              onClick={() => onReplay(event.event_id)}
              disabled={isReplaying}
              className="flex items-center gap-1.5 rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {isReplaying ? "Replaying…" : "Replay"}
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body: two-panel layout */}
        <div className="grid grid-cols-2 gap-0 divide-x dark:divide-zinc-800 max-h-[70vh] overflow-auto">
          {/* Left: original event */}
          <div className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Original Event
            </h3>
            <JsonBlock data={event.original_event} />
            <div className="mt-3 space-y-1 text-xs text-zinc-500">
              <p><span className="font-medium">User:</span> {event.user_id}</p>
              <p>
                <span className="font-medium">Original time:</span>{" "}
                <TimeAgo timestamp={event.original_timestamp} />
              </p>
            </div>
          </div>

          {/* Right: error details */}
          <div className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-rose-600 dark:text-rose-400">
              Error Details
            </h3>
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-800/50 dark:bg-rose-900/10">
              <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
                {event.error_type}
              </p>
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                {event.error_message}
              </p>
            </div>
            {event.stack_trace && (
              <>
                <p className="mb-2 text-xs font-medium text-zinc-500">Stack Trace</p>
                <pre className="overflow-auto rounded-lg bg-zinc-900 p-3 text-xs font-mono text-zinc-300 max-h-40 whitespace-pre-wrap">
                  {event.stack_trace}
                </pre>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
