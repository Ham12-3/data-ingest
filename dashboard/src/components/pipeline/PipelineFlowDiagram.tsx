"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  Radio,
  Server,
  ShieldCheck,
  Cpu,
  Database,
  HardDrive,
  AlertCircle,
} from "lucide-react";
import type { PipelineStage } from "@/types/pipeline";

interface PipelineFlowDiagramProps {
  onSelectStage?: (stageId: string | null) => void;
  selectedStage?: string | null;
  className?: string;
}

const stages: PipelineStage[] = [
  { id: "producer", name: "Producer", type: "producer", status: "healthy", throughput: 3200, x: 0, y: 1 },
  { id: "kafka-raw", name: "Kafka: raw-events", type: "kafka", status: "healthy", throughput: 3200, x: 1, y: 1 },
  { id: "validator", name: "Validator", type: "validator", status: "healthy", throughput: 3100, x: 2, y: 1 },
  { id: "kafka-validated", name: "Kafka: validated", type: "kafka", status: "healthy", throughput: 3050, x: 3, y: 1 },
  { id: "flink", name: "Flink Processing", type: "flink", status: "healthy", throughput: 3000, x: 4, y: 1 },
  { id: "kafka-features", name: "Kafka: features", type: "kafka", status: "healthy", throughput: 2900, x: 5, y: 1 },
  { id: "feast", name: "Feast Writer", type: "feast", status: "healthy", throughput: 2900, x: 6, y: 1 },
  { id: "stores", name: "Redis + PostgreSQL", type: "store", status: "healthy", throughput: 2900, x: 7, y: 1 },
];

const dlqStage: PipelineStage = {
  id: "dlq",
  name: "Dead Letter Queue",
  type: "kafka",
  status: "degraded",
  throughput: 150,
  x: 2,
  y: 2,
};

const stageIcons = {
  producer: Radio,
  kafka: Server,
  validator: ShieldCheck,
  flink: Cpu,
  feast: Database,
  store: HardDrive,
};

export function PipelineFlowDiagram({
  onSelectStage,
  selectedStage,
  className,
}: PipelineFlowDiagramProps) {
  const handleClick = useCallback(
    (id: string) => {
      onSelectStage?.(selectedStage === id ? null : id);
    },
    [onSelectStage, selectedStage]
  );

  return (
    <div className={cn("rounded-xl border border-slate-700/50 bg-slate-800/50 p-6", className)}>
      <h3 className="mb-6 text-lg font-semibold text-slate-100">Pipeline Flow</h3>

      {/* Main Flow */}
      <div className="overflow-x-auto">
        <div className="flex items-center gap-2 min-w-[900px] pb-4">
          {stages.map((stage, i) => {
            const Icon = stageIcons[stage.type];
            const isSelected = selectedStage === stage.id;

            return (
              <div key={stage.id} className="flex items-center">
                <button
                  onClick={() => handleClick(stage.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all min-w-[120px]",
                    isSelected
                      ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30"
                      : "border-slate-700 bg-slate-900 hover:border-slate-600"
                  )}
                  aria-label={`Select ${stage.name}`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-slate-400" />
                    <StatusBadge status={stage.status} size="sm" showIcon={false} />
                  </div>
                  <span className="text-xs font-medium text-slate-200 text-center leading-tight">
                    {stage.name}
                  </span>
                  <span className="text-[10px] tabular-nums text-slate-500">
                    {stage.throughput.toLocaleString()} evt/s
                  </span>
                </button>

                {/* Connection arrow */}
                {i < stages.length - 1 && (
                  <div className="flex items-center px-1">
                    <div className="h-px w-6 bg-slate-600" />
                    <div className="h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-slate-600" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* DLQ Branch */}
        <div className="ml-[268px] flex items-start gap-2 mt-2">
          <div className="flex flex-col items-center">
            <div className="h-6 w-px bg-amber-500/50" />
            <div className="h-0 w-0 border-x-[4px] border-t-[6px] border-x-transparent border-t-amber-500/50" />
          </div>
          <button
            onClick={() => handleClick(dlqStage.id)}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 transition-all",
              selectedStage === dlqStage.id
                ? "border-blue-500 bg-blue-500/10"
                : "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
            )}
            aria-label="Select Dead Letter Queue"
          >
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <div className="text-left">
              <p className="text-xs font-medium text-slate-200">{dlqStage.name}</p>
              <p className="text-[10px] text-amber-500">{dlqStage.throughput} evt/s</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
