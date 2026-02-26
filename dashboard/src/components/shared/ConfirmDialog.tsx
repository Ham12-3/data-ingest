"use client";

import { useEffect, useRef } from "react";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-desc"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-md rounded-xl border bg-white p-6 shadow-xl outline-none dark:bg-zinc-900 dark:border-zinc-700"
      >
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-md p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          {variant === "danger" && (
            <div className="rounded-full bg-rose-50 p-2 dark:bg-rose-900/20">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
            </div>
          )}
          <div className="flex-1">
            <h2
              id="dialog-title"
              className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {title}
            </h2>
            <p
              id="dialog-desc"
              className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400"
            >
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-md border px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50",
              variant === "danger"
                ? "bg-rose-500 hover:bg-rose-600"
                : "bg-blue-500 hover:bg-blue-600"
            )}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
