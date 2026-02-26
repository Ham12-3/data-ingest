import type { PipelineHealth, PipelineMetrics, Alert } from "@/types/metrics";
import type { QualityResults, QualityTrend } from "@/types/quality";
import type { DeadLetterPage } from "@/types/api";
import type { UserFeatures, FeatureHistory } from "@/types/features";
import type { KafkaTopic, FlinkJob } from "@/types/pipeline";

function randBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function isoMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function generateSparkline(base: number, points = 15, variance = 0.2) {
  return Array.from({ length: points }, (_, i) => ({
    timestamp: isoMinutesAgo(points - i),
    value: base * (1 + (Math.random() - 0.5) * variance),
  }));
}

export function generateMockMetrics(): PipelineMetrics {
  const now = Date.now();
  const throughputHistory = Array.from({ length: 30 }, (_, i) => {
    const t = new Date(now - (30 - i) * 60_000);
    const ingested = randBetween(3800, 4200);
    const validated = ingested * randBetween(0.92, 0.98);
    const processed = validated * randBetween(0.95, 0.99);
    const features_written = processed * randBetween(0.97, 1.0);
    return {
      time: t.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      ingested: Math.round(ingested),
      validated: Math.round(validated),
      processed: Math.round(processed),
      features_written: Math.round(features_written),
    };
  });

  return {
    events_per_second: randBetween(3950, 4100),
    avg_latency_ms: randBetween(18, 35),
    error_rate: randBetween(0.2, 0.8),
    features_written_per_second: randBetween(3700, 3900),
    throughput_history: throughputHistory,
    latency_distribution: [
      { range: "0-10ms", count: Math.round(randBetween(3500, 4500)) },
      { range: "10-20ms", count: Math.round(randBetween(2500, 3500)) },
      { range: "20-50ms", count: Math.round(randBetween(1500, 2500)) },
      { range: "50-100ms", count: Math.round(randBetween(800, 1200)) },
      { range: "100-200ms", count: Math.round(randBetween(300, 700)) },
      { range: "200-500ms", count: Math.round(randBetween(100, 300)) },
      { range: "500ms+", count: Math.round(randBetween(20, 80)) },
    ],
    latency_percentiles: {
      p50: randBetween(15, 22),
      p90: randBetween(45, 65),
      p95: randBetween(80, 120),
      p99: randBetween(180, 280),
    },
    sparklines: {
      events_per_second: generateSparkline(4000),
      avg_latency: generateSparkline(25, 15, 0.3),
      error_rate: generateSparkline(0.5, 15, 0.4),
      features_written: generateSparkline(3800),
    },
  };
}

export function generateMockHealth(): PipelineHealth {
  return {
    status: "healthy",
    uptime_percentage: 99.87,
    last_incident: isoMinutesAgo(480),
    components: [
      {
        name: "Kafka",
        status: "healthy",
        metrics: {
          brokers: 3,
          topics: 8,
          total_lag: 142,
          throughput: "4.1K msg/s",
        },
        last_check: new Date().toISOString(),
      },
      {
        name: "Flink",
        status: "healthy",
        metrics: {
          jobs_running: 2,
          records_per_sec: 3850,
          checkpoint_duration: "245ms",
          parallelism: 4,
        },
        last_check: new Date().toISOString(),
      },
      {
        name: "Redis",
        status: "healthy",
        metrics: {
          connected_clients: 24,
          memory_used: "2.1 GB",
          hit_rate: "94.3%",
          ops_per_sec: 8200,
        },
        last_check: new Date().toISOString(),
      },
      {
        name: "PostgreSQL",
        status: "degraded",
        metrics: {
          active_connections: 42,
          query_latency: "78ms",
          transactions_per_sec: 320,
          cache_hit_rate: "89.1%",
        },
        last_check: new Date().toISOString(),
      },
    ],
    alerts: generateMockAlerts(),
  };
}

export function generateMockAlerts(): Alert[] {
  return [
    {
      id: "alert-1",
      severity: "warning",
      message: "PostgreSQL query latency above threshold (78ms > 50ms)",
      component: "PostgreSQL",
      timestamp: isoMinutesAgo(12),
      resolved: false,
    },
    {
      id: "alert-2",
      severity: "info",
      message: "Kafka consumer lag spike detected on raw-events topic",
      component: "Kafka",
      timestamp: isoMinutesAgo(28),
      resolved: true,
    },
    {
      id: "alert-3",
      severity: "warning",
      message: "Flink checkpoint duration exceeded 500ms",
      component: "Flink",
      timestamp: isoMinutesAgo(45),
      resolved: true,
    },
    {
      id: "alert-4",
      severity: "error",
      message: "Dead letter queue size exceeded 500 events in last hour",
      component: "Validator",
      timestamp: isoMinutesAgo(120),
      resolved: true,
    },
    {
      id: "alert-5",
      severity: "info",
      message: "Redis memory usage at 85% capacity",
      component: "Redis",
      timestamp: isoMinutesAgo(200),
      resolved: true,
    },
  ];
}

export function generateMockQuality(): QualityResults {
  return {
    overall_score: 94.2,
    total_checks: 48,
    passed: 43,
    failed: 3,
    warning: 2,
    pass_rate: 89.6,
    last_check_time: isoMinutesAgo(5),
    next_scheduled: new Date(Date.now() + 25 * 60_000).toISOString(),
    expectations: [
      {
        id: "exp-1",
        name: "event_count_not_null",
        expectation_type: "expect_column_values_to_not_be_null",
        status: "pass",
        observed_value: "0 nulls",
        expected_range: "0 nulls",
        checked_at: isoMinutesAgo(5),
      },
      {
        id: "exp-2",
        name: "user_id_format",
        expectation_type: "expect_column_values_to_match_regex",
        status: "pass",
        observed_value: "100%",
        expected_range: ">= 99%",
        checked_at: isoMinutesAgo(5),
      },
      {
        id: "exp-3",
        name: "event_value_range",
        expectation_type: "expect_column_values_to_be_between",
        status: "fail",
        observed_value: "max=10432",
        expected_range: "0 to 10000",
        checked_at: isoMinutesAgo(5),
        details: { outlier_count: 12, threshold_exceeded: "10000" },
      },
      {
        id: "exp-4",
        name: "latency_threshold",
        expectation_type: "expect_column_mean_to_be_between",
        status: "warning",
        observed_value: "48ms",
        expected_range: "< 50ms",
        checked_at: isoMinutesAgo(5),
      },
      {
        id: "exp-5",
        name: "schema_validity",
        expectation_type: "expect_table_columns_to_match_ordered_list",
        status: "pass",
        observed_value: "12 columns",
        expected_range: "12 columns",
        checked_at: isoMinutesAgo(5),
      },
      {
        id: "exp-6",
        name: "throughput_minimum",
        expectation_type: "expect_column_values_to_be_between",
        status: "pass",
        observed_value: "3920 ev/s",
        expected_range: ">= 1000 ev/s",
        checked_at: isoMinutesAgo(5),
      },
      {
        id: "exp-7",
        name: "duplicate_events",
        expectation_type: "expect_column_values_to_be_unique",
        status: "fail",
        observed_value: "0.08% duplicates",
        expected_range: "0%",
        checked_at: isoMinutesAgo(5),
        details: { duplicate_count: 31 },
      },
      {
        id: "exp-8",
        name: "timestamp_monotonic",
        expectation_type: "expect_column_values_to_be_increasing",
        status: "pass",
        observed_value: "monotonic",
        expected_range: "monotonic",
        checked_at: isoMinutesAgo(5),
      },
    ],
  };
}

export function generateMockQualityTrend(): QualityTrend {
  const data = Array.from({ length: 48 }, (_, i) => {
    const total = 48;
    const pass_count = Math.round(randBetween(40, 46));
    const fail_count = Math.round(randBetween(1, 5));
    const warning_count = total - pass_count - fail_count;
    return {
      timestamp: isoMinutesAgo((48 - i) * 30),
      pass_count,
      fail_count,
      warning_count: Math.max(0, warning_count),
      pass_rate: (pass_count / total) * 100,
    };
  });
  return { data, hours: 24 };
}

export function generateMockDeadLetter(): DeadLetterPage {
  const errorTypes = [
    "SchemaValidationError",
    "NullValueError",
    "TypeMismatchError",
    "RangeExceededError",
    "DuplicateEventError",
  ];

  const items = Array.from({ length: 20 }, (_, i) => ({
    event_id: `evt-${Math.random().toString(36).slice(2, 10)}`,
    user_id: `user_${Math.floor(randBetween(1000, 9999))}`,
    error_type: errorTypes[Math.floor(Math.random() * errorTypes.length)],
    error_message: "Validation failed: value out of expected range",
    original_timestamp: isoMinutesAgo(randBetween(5, 1440)),
    failed_at: isoMinutesAgo(randBetween(1, 60)),
    original_event: {
      user_id: `user_${Math.floor(randBetween(1000, 9999))}`,
      event_type: "purchase",
      value: Math.round(randBetween(0, 15000)),
      timestamp: isoMinutesAgo(randBetween(5, 1440)),
      session_id: `sess_${Math.random().toString(36).slice(2, 10)}`,
    },
    stack_trace: `ValidationError: value 10432 exceeds maximum threshold 10000\n  at Validator.validate (validator.py:142)\n  at FlinkProcessor.process (processor.py:87)\n  at Job.run (job.py:234)`,
  }));

  return {
    items,
    total: 347,
    page: 0,
    page_size: 20,
    has_next: true,
  };
}

export function generateMockUserFeatures(userId: string): UserFeatures {
  return {
    user_id: userId,
    total_events: Math.round(randBetween(1200, 8500)),
    last_active: isoMinutesAgo(randBetween(1, 120)),
    risk_score: randBetween(0.1, 0.85),
    features: [
      {
        name: "purchase_count_1h",
        value: Math.round(randBetween(0, 15)),
        last_updated: isoMinutesAgo(randBetween(0, 5)),
        feature_view: "realtime",
      },
      {
        name: "avg_session_duration_24h",
        value: parseFloat(randBetween(120, 3600).toFixed(1)),
        last_updated: isoMinutesAgo(randBetween(0, 60)),
        feature_view: "hourly",
      },
      {
        name: "total_spend_7d",
        value: parseFloat(randBetween(0, 500).toFixed(2)),
        last_updated: isoMinutesAgo(randBetween(0, 60)),
        feature_view: "derived",
      },
      {
        name: "page_views_session",
        value: Math.round(randBetween(1, 40)),
        last_updated: isoMinutesAgo(randBetween(0, 30)),
        feature_view: "session",
      },
      {
        name: "click_through_rate",
        value: parseFloat(randBetween(0.01, 0.35).toFixed(4)),
        last_updated: isoMinutesAgo(randBetween(0, 5)),
        feature_view: "realtime",
      },
      {
        name: "cart_abandonment_rate",
        value: parseFloat(randBetween(0, 0.9).toFixed(3)),
        last_updated: isoMinutesAgo(randBetween(0, 60)),
        feature_view: "derived",
      },
    ],
  };
}

export function generateMockFeatureHistory(
  userId: string,
  featureName: string
): FeatureHistory {
  return {
    user_id: userId,
    feature_name: featureName,
    history: Array.from({ length: 48 }, (_, i) => ({
      timestamp: isoMinutesAgo((48 - i) * 30),
      value: parseFloat(randBetween(0, 100).toFixed(2)),
    })),
  };
}

export function generateMockKafkaTopics(): KafkaTopic[] {
  return [
    {
      name: "raw-events",
      partitions: 12,
      messages_in_per_sec: randBetween(3800, 4200),
      messages_out_per_sec: randBetween(3700, 4100),
      consumer_lag: Math.round(randBetween(50, 200)),
      size_bytes: Math.round(randBetween(1e9, 5e9)),
      retention_hours: 24,
    },
    {
      name: "validated-events",
      partitions: 12,
      messages_in_per_sec: randBetween(3600, 3900),
      messages_out_per_sec: randBetween(3500, 3850),
      consumer_lag: Math.round(randBetween(20, 80)),
      size_bytes: Math.round(randBetween(800e6, 2e9)),
      retention_hours: 12,
    },
    {
      name: "computed-features",
      partitions: 8,
      messages_in_per_sec: randBetween(3400, 3700),
      messages_out_per_sec: randBetween(3300, 3600),
      consumer_lag: Math.round(randBetween(10, 50)),
      size_bytes: Math.round(randBetween(500e6, 1.5e9)),
      retention_hours: 6,
    },
    {
      name: "dead-letter",
      partitions: 4,
      messages_in_per_sec: randBetween(5, 30),
      messages_out_per_sec: randBetween(0, 5),
      consumer_lag: Math.round(randBetween(100, 500)),
      size_bytes: Math.round(randBetween(50e6, 200e6)),
      retention_hours: 72,
    },
    {
      name: "alerts",
      partitions: 2,
      messages_in_per_sec: randBetween(0, 5),
      messages_out_per_sec: randBetween(0, 5),
      consumer_lag: Math.round(randBetween(0, 10)),
      size_bytes: Math.round(randBetween(10e6, 50e6)),
      retention_hours: 168,
    },
  ];
}

export function generateMockFlinkJobs(): FlinkJob[] {
  return [
    {
      job_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      name: "feature-engineering-pipeline",
      status: "RUNNING",
      parallelism: 4,
      records_per_second: Math.round(randBetween(3400, 3800)),
      watermark: isoMinutesAgo(0.1),
      last_checkpoint: isoMinutesAgo(2),
      checkpoint_duration_ms: Math.round(randBetween(180, 320)),
      uptime_ms: 8 * 3600 * 1000 + Math.round(randBetween(0, 3600 * 1000)),
      checkpoint_history: Array.from({ length: 10 }, (_, i) => ({
        duration_ms: Math.round(randBetween(150, 450)),
        size_bytes: Math.round(randBetween(10e6, 50e6)),
        timestamp: isoMinutesAgo((10 - i) * 2),
      })),
    },
    {
      job_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      name: "dead-letter-processor",
      status: "RUNNING",
      parallelism: 2,
      records_per_second: Math.round(randBetween(10, 40)),
      watermark: isoMinutesAgo(0.5),
      last_checkpoint: isoMinutesAgo(3),
      checkpoint_duration_ms: Math.round(randBetween(80, 150)),
      uptime_ms: 6 * 3600 * 1000 + Math.round(randBetween(0, 3600 * 1000)),
      checkpoint_history: Array.from({ length: 10 }, (_, i) => ({
        duration_ms: Math.round(randBetween(60, 180)),
        size_bytes: Math.round(randBetween(1e6, 5e6)),
        timestamp: isoMinutesAgo((10 - i) * 3),
      })),
    },
  ];
}
