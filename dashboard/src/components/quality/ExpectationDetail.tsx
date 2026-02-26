"use client";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { TimeAgo } from "@/components/shared/TimeAgo";
import type { ValidationExpectation } from "@/types/quality";

interface ExpectationDetailProps {
  expectation: ValidationExpectation;
}

export function ExpectationDetail({ expectation }: ExpectationDetailProps) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm dark:bg-zinc-950 dark:border-zinc-800 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono font-semibold">{expectation.name}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{expectation.expectation_type}</p>
        </div>
        <StatusBadge status={expectation.status} />
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-zinc-500 mb-0.5">Observed Value</dt>
          <dd className="font-medium tabular-nums">{expectation.observed_value}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500 mb-0.5">Expected Range</dt>
          <dd className="font-medium">{expectation.expected_range}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500 mb-0.5">Last Checked</dt>
          <dd>
            <TimeAgo timestamp={expectation.checked_at} />
          </dd>
        </div>
      </dl>

      {expectation.details && (
        <div>
          <p className="text-xs font-medium text-zinc-500 mb-2">Details</p>
          <pre className="rounded-lg bg-zinc-50 p-3 text-xs font-mono text-zinc-700 overflow-auto dark:bg-zinc-900 dark:text-zinc-300">
            {JSON.stringify(expectation.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
