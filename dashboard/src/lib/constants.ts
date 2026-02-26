export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const API_ENDPOINTS = {
  health: "/health",
  healthComponents: "/health/components",
  metrics: "/metrics",
  metricsStream: "/metrics/stream",
  features: (userId: string) => `/features/${userId}`,
  featuresHistory: (userId: string) => `/features/${userId}/history`,
  deadLetter: "/dead-letter/recent",
  deadLetterReplay: "/dead-letter/replay",
  qualityResults: "/quality/results",
  qualityTrend: "/quality/trend",
} as const;

export const REFRESH_INTERVALS = {
  health: 10_000,
  features: 30_000,
  deadLetter: 15_000,
  quality: 30_000,
  metrics: 5_000,
} as const;

export const TIME_RANGES = [
  { label: "5m", value: "5m", minutes: 5 },
  { label: "15m", value: "15m", minutes: 15 },
  { label: "1h", value: "1h", minutes: 60 },
  { label: "6h", value: "6h", minutes: 360 },
  { label: "24h", value: "24h", minutes: 1440 },
] as const;

export type TimeRangeValue = (typeof TIME_RANGES)[number]["value"];

export const DLQ_PAGE_SIZE = 20;

export const MAX_CHART_POINTS = 60;

export const SSE_RECONNECT_BASE_DELAY_MS = 1000;
export const SSE_RECONNECT_MAX_DELAY_MS = 30_000;
export const SSE_RECONNECT_MAX_RETRIES = 10;
