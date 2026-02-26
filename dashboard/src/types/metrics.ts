export interface PipelineMetrics {
  events_ingested_total: number;
  events_validated_total: {
    passed: number;
    failed: number;
  };
  events_processed_total: number;
  dead_letter_queue_size: number;
  validation_pass_rate: number;
  pipeline_uptime_seconds: number;
  timestamp: string;
}

export interface MetricEvent {
  type: "throughput" | "latency" | "error_rate" | "features_written";
  value: number;
  timestamp: string;
  metadata?: Record<string, number | string>;
}

export interface ThroughputDataPoint {
  time: string;
  ingested: number;
  validated: number;
  processed: number;
  features_written: number;
}

export interface LatencyBucket {
  range: string;
  count: number;
}

export interface LatencyPercentiles {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface ComponentHealth {
  name: string;
  status: "healthy" | "degraded" | "error" | "unknown";
  metrics: Record<string, string | number>;
  lastCheck: string;
}

export interface Alert {
  id: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  component: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface SparklinePoint {
  value: number;
}
