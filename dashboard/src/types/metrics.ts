export interface MetricDataPoint {
  timestamp: string;
  value: number;
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

export interface PipelineMetrics {
  events_per_second: number;
  avg_latency_ms: number;
  error_rate: number;
  features_written_per_second: number;
  throughput_history: ThroughputDataPoint[];
  latency_distribution: LatencyBucket[];
  latency_percentiles: LatencyPercentiles;
  sparklines: {
    events_per_second: MetricDataPoint[];
    avg_latency: MetricDataPoint[];
    error_rate: MetricDataPoint[];
    features_written: MetricDataPoint[];
  };
}

export type AlertSeverity = 'info' | 'warning' | 'error';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  message: string;
  component: string;
  timestamp: string;
  resolved: boolean;
}

export type HealthStatus = 'healthy' | 'degraded' | 'error' | 'unknown';

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  metrics: Record<string, string | number>;
  last_check: string;
}

export interface PipelineHealth {
  status: HealthStatus;
  uptime_percentage: number;
  last_incident: string | null;
  components: ComponentHealth[];
  alerts: Alert[];
}

export type MetricEventType = 'metrics' | 'alert' | 'health' | 'ping';

export interface MetricEvent {
  type: MetricEventType;
  data: PipelineMetrics | Alert | PipelineHealth;
  timestamp: string;
}
