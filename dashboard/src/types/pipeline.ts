export type StageStatus = 'healthy' | 'degraded' | 'error' | 'unknown';

export type NodeType = 'producer' | 'kafka' | 'processor' | 'feast' | 'store' | 'dlq';

export interface KafkaTopic {
  name: string;
  partitions: number;
  messages_in_per_sec: number;
  messages_out_per_sec: number;
  consumer_lag: number;
  size_bytes: number;
  retention_hours: number;
}

export interface CheckpointInfo {
  duration_ms: number;
  size_bytes: number;
  timestamp: string;
}

export interface FlinkJob {
  job_id: string;
  name: string;
  status: 'RUNNING' | 'FAILED' | 'CANCELED' | 'FINISHED';
  parallelism: number;
  records_per_second: number;
  watermark: string;
  last_checkpoint: string;
  checkpoint_duration_ms: number;
  uptime_ms: number;
  checkpoint_history: CheckpointInfo[];
}

export interface PipelineNode {
  id: string;
  label: string;
  type: NodeType;
  status: StageStatus;
  throughput: number;
  x: number;
  y: number;
  metadata?: Record<string, string | number>;
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  throughput?: number;
}

export interface PipelineTopology {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}
