"use client";

import { useState } from "react";
import { PipelineFlowDiagram } from "@/components/pipeline/PipelineFlowDiagram";
import { StageDetailPanel } from "@/components/pipeline/StageDetailPanel";
import { KafkaTopicTable } from "@/components/pipeline/KafkaTopicTable";
import { FlinkJobStatus } from "@/components/pipeline/FlinkJobStatus";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useDashboardStore } from "@/stores/dashboardStore";
import { useRealtimeMetrics } from "@/hooks/useRealtimeMetrics";
import {
  generateMockKafkaTopics,
  generateMockFlinkJobs,
} from "@/lib/mockData";
import type { PipelineNode } from "@/types/pipeline";

// Build a static node list for detail panel lookups
const PIPELINE_NODES: PipelineNode[] = [
  { id: "producer", label: "Producer", type: "producer", status: "healthy", throughput: 4000, x: 0, y: 0 },
  { id: "kafka-raw", label: "raw-events", type: "kafka", status: "healthy", throughput: 3980, x: 0, y: 0 },
  { id: "validator", label: "Validator", type: "processor", status: "healthy", throughput: 3900, x: 0, y: 0 },
  { id: "kafka-validated", label: "validated-events", type: "kafka", status: "healthy", throughput: 3850, x: 0, y: 0 },
  { id: "flink", label: "Flink", type: "processor", status: "healthy", throughput: 3800, x: 0, y: 0 },
  { id: "kafka-features", label: "computed-features", type: "kafka", status: "healthy", throughput: 3750, x: 0, y: 0 },
  { id: "feast", label: "Feast Writer", type: "feast", status: "healthy", throughput: 3700, x: 0, y: 0 },
  { id: "redis", label: "Redis", type: "store", status: "healthy", throughput: 3700, x: 0, y: 0 },
  { id: "postgres", label: "PostgreSQL", type: "store", status: "degraded", throughput: 3700, x: 0, y: 0 },
  { id: "dlq", label: "Dead Letter Queue", type: "dlq", status: "healthy", throughput: 12, x: 0, y: 0 },
];

const kafkaTopics = generateMockKafkaTopics();
const flinkJobs = generateMockFlinkJobs();

export default function PipelinePage() {
  useRealtimeMetrics();

  const selectedNodeId = useDashboardStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useDashboardStore((s) => s.setSelectedNodeId);
  const health = useDashboardStore((s) => s.health);

  const nodeStatuses: Record<string, "healthy" | "degraded" | "error" | "unknown"> = {};
  if (health) {
    health.components.forEach((c) => {
      const id = c.name.toLowerCase().replace(/\s+/g, "-");
      nodeStatuses[id] = c.status;
    });
  }

  const selectedNode = PIPELINE_NODES.find((n) => n.id === selectedNodeId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Real-time data flow and stage metrics
        </p>
      </div>

      <ErrorBoundary label="Pipeline flow diagram">
        <PipelineFlowDiagram
          nodeStatuses={nodeStatuses}
          selectedNodeId={selectedNodeId}
          onNodeSelect={setSelectedNodeId}
        />
      </ErrorBoundary>

      {selectedNode && (
        <ErrorBoundary label="Stage detail panel">
          <StageDetailPanel
            node={selectedNode}
            kafkaTopics={kafkaTopics}
            flinkJobs={flinkJobs}
            onClose={() => setSelectedNodeId(null)}
          />
        </ErrorBoundary>
      )}

      <div className="grid gap-6">
        <ErrorBoundary label="Kafka topic table">
          <KafkaTopicTable topics={kafkaTopics} />
        </ErrorBoundary>

        <ErrorBoundary label="Flink job status">
          <FlinkJobStatus jobs={flinkJobs} />
        </ErrorBoundary>
      </div>
    </div>
  );
}
