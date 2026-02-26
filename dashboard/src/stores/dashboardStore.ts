import { create } from "zustand";
import type { TimeRangeValue } from "@/lib/constants";
import type { Alert, PipelineMetrics, PipelineHealth } from "@/types/metrics";
import type { SSEConnectionState } from "@/types/api";

interface DashboardState {
  timeRange: TimeRangeValue;
  selectedNodeId: string | null;
  metrics: PipelineMetrics | null;
  health: PipelineHealth | null;
  alerts: Alert[];
  sseState: SSEConnectionState;

  setTimeRange: (range: TimeRangeValue) => void;
  setSelectedNodeId: (id: string | null) => void;
  setMetrics: (metrics: PipelineMetrics) => void;
  setHealth: (health: PipelineHealth) => void;
  addAlert: (alert: Alert) => void;
  setSseState: (state: Partial<SSEConnectionState>) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  timeRange: "15m",
  selectedNodeId: null,
  metrics: null,
  health: null,
  alerts: [],
  sseState: {
    connected: false,
    reconnecting: false,
    error: null,
    retryCount: 0,
  },

  setTimeRange: (timeRange) => set({ timeRange }),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  setMetrics: (metrics) => set({ metrics }),
  setHealth: (health) => set({ health }),
  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts].slice(0, 50),
    })),
  setSseState: (partial) =>
    set((state) => ({ sseState: { ...state.sseState, ...partial } })),
}));
