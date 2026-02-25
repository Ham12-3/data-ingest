import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;

  refreshInterval: number;
  setRefreshInterval: (ms: number) => void;

  alertThresholds: {
    errorRate: number;
    latencyMs: number;
    dlqSize: number;
  };
  setAlertThresholds: (thresholds: Partial<SettingsState["alertThresholds"]>) => void;

  producerConfig: {
    eventsPerSec: number;
    eventTypes: Record<string, number>;
  };
  setProducerConfig: (config: Partial<SettingsState["producerConfig"]>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),

      refreshInterval: 2000,
      setRefreshInterval: (ms) => set({ refreshInterval: ms }),

      alertThresholds: {
        errorRate: 5,
        latencyMs: 500,
        dlqSize: 1000,
      },
      setAlertThresholds: (thresholds) =>
        set((state) => ({
          alertThresholds: { ...state.alertThresholds, ...thresholds },
        })),

      producerConfig: {
        eventsPerSec: 100,
        eventTypes: {
          page_view: 50,
          purchase: 20,
          click: 20,
          signup: 10,
        },
      },
      setProducerConfig: (config) =>
        set((state) => ({
          producerConfig: { ...state.producerConfig, ...config },
        })),
    }),
    {
      name: "featurestream-settings",
    }
  )
);
