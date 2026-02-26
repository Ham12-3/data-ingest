export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const SSE_METRICS_URL = `${API_BASE_URL}/metrics/stream`;

export const REFETCH_INTERVALS = {
  health: 10_000,
  features: 30_000,
  deadLetter: 15_000,
  quality: 30_000,
  metrics: 5_000,
} as const;

export const TIME_RANGES = [
  { label: "5m", value: 5 },
  { label: "15m", value: 15 },
  { label: "1h", value: 60 },
  { label: "6h", value: 360 },
  { label: "24h", value: 1440 },
] as const;

export const PIPELINE_STAGES = [
  "Producer",
  "Kafka: raw-events",
  "Validator",
  "Kafka: validated-events",
  "Flink",
  "Kafka: computed-features",
  "Feast Writer",
  "Redis + PostgreSQL",
] as const;

export const DLQ_PAGE_SIZE = 20;

export const STATUS_COLORS = {
  healthy: {
    bg: "bg-emerald-500",
    text: "text-emerald-500",
    border: "border-emerald-500",
    bgLight: "bg-emerald-500/10",
  },
  degraded: {
    bg: "bg-amber-500",
    text: "text-amber-500",
    border: "border-amber-500",
    bgLight: "bg-amber-500/10",
  },
  error: {
    bg: "bg-rose-500",
    text: "text-rose-500",
    border: "border-rose-500",
    bgLight: "bg-rose-500/10",
  },
  unknown: {
    bg: "bg-slate-500",
    text: "text-slate-500",
    border: "border-slate-500",
    bgLight: "bg-slate-500/10",
  },
} as const;

export const SEVERITY_COLORS = {
  info: "text-blue-500",
  warning: "text-amber-500",
  error: "text-rose-500",
  critical: "text-rose-600",
} as const;
