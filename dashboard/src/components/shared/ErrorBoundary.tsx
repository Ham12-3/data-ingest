"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-8 dark:border-rose-800/50 dark:bg-rose-900/10">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
          <div className="text-center">
            <p className="font-semibold text-rose-700 dark:text-rose-400">
              {this.props.label ?? "Something went wrong"}
            </p>
            <p className="mt-1 text-sm text-rose-600/70 dark:text-rose-400/70">
              {this.state.error?.message ?? "An unexpected error occurred"}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 rounded-md bg-rose-100 px-3 py-1.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
