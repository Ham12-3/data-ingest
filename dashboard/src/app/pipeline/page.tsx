"use client";

import { useState } from "react";
import { PipelineFlowDiagram } from "@/components/pipeline/PipelineFlowDiagram";
import { StageDetailPanel } from "@/components/pipeline/StageDetailPanel";
import { KafkaTopicTable } from "@/components/pipeline/KafkaTopicTable";
import { FlinkJobStatus } from "@/components/pipeline/FlinkJobStatus";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function PipelinePage() {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Pipeline Status</h1>
        <p className="mt-1 text-sm text-slate-400">
          Visual representation of your data pipeline flow and component status
        </p>
      </div>

      <ErrorBoundary fallbackTitle="Failed to load pipeline diagram">
        <PipelineFlowDiagram
          selectedStage={selectedStage}
          onSelectStage={setSelectedStage}
        />
      </ErrorBoundary>

      {selectedStage && (
        <ErrorBoundary fallbackTitle="Failed to load stage details">
          <StageDetailPanel
            stageId={selectedStage}
            onClose={() => setSelectedStage(null)}
          />
        </ErrorBoundary>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ErrorBoundary fallbackTitle="Failed to load Kafka topics">
          <KafkaTopicTable />
        </ErrorBoundary>
        <ErrorBoundary fallbackTitle="Failed to load Flink status">
          <FlinkJobStatus />
        </ErrorBoundary>
      </div>
    </div>
  );
}
