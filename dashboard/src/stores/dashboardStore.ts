import { create } from "zustand";
import type { ThroughputDataPoint, Alert, MetricEvent, ComponentHealth } from "@/types/metrics";

interface RealtimeMetrics {
  eventsPerSec: number;
  avgLatency: number;
  errorRate: number;
  featuresWrittenPerSec: number;
  eventsPerSecHistory: { value: number }[];
  latencyHistory: { value: number }[];
  errorRateHistory: { value: number }[];
  featuresHistory: { value: number }[];
}

interface DashboardState {
  timeRange: number;
  setTimeRange: (range: number) => void;

  sseConnected: boolean;
  setSseConnected: (connected: boolean) => void;

  realtime: RealtimeMetrics;
  pushMetricEvent: (event: MetricEvent) => void;

  throughputData: ThroughputDataPoint[];
  pushThroughputPoint: (point: ThroughputDataPoint) => void;

  alerts: Alert[];
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;

  components: ComponentHealth[];
  setComponents: (components: ComponentHealth[]) => void;
}

const MAX_SPARKLINE_POINTS = 30;
const MAX_THROUGHPUT_POINTS = 120;

function pushToHistory(arr: { value: number }[], value: number) {
  const next = [...arr, { value }];
  return next.length > MAX_SPARKLINE_POINTS ? next.slice(-MAX_SPARKLINE_POINTS) : next;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  timeRange: 15,
  setTimeRange: (range) => set({ timeRange: range }),

  sseConnected: false,
  setSseConnected: (connected) => set({ sseConnected: connected }),

  realtime: {
    eventsPerSec: 0,
    avgLatency: 0,
    errorRate: 0,
    featuresWrittenPerSec: 0,
    eventsPerSecHistory: [],
    latencyHistory: [],
    errorRateHistory: [],
    featuresHistory: [],
  },
  pushMetricEvent: (event) =>
    set((state) => {
      const rt = { ...state.realtime };
      switch (event.type) {
        case "throughput":
          rt.eventsPerSec = event.value;
          rt.eventsPerSecHistory = pushToHistory(rt.eventsPerSecHistory, event.value);
          break;
        case "latency":
          rt.avgLatency = event.value;
          rt.latencyHistory = pushToHistory(rt.latencyHistory, event.value);
          break;
        case "error_rate":
          rt.errorRate = event.value;
          rt.errorRateHistory = pushToHistory(rt.errorRateHistory, event.value);
          break;
        case "features_written":
          rt.featuresWrittenPerSec = event.value;
          rt.featuresHistory = pushToHistory(rt.featuresHistory, event.value);
          break;
      }
      return { realtime: rt };
    }),

  throughputData: [],
  pushThroughputPoint: (point) =>
    set((state) => {
      const next = [...state.throughputData, point];
      return {
        throughputData: next.length > MAX_THROUGHPUT_POINTS ? next.slice(-MAX_THROUGHPUT_POINTS) : next,
      };
    }),

  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts].slice(0, 50),
    })),

  components: [],
  setComponents: (components) => set({ components }),
}));
