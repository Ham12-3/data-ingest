import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AlertThresholds {
  errorRatePercent: number;
  latencyMs: number;
  dlqSize: number;
}

interface ProducerConfig {
  eventsPerSecond: number;
  purchaseRatio: number;
  viewRatio: number;
  clickRatio: number;
}

interface SettingsState {
  theme: "light" | "dark";
  refreshInterval: number;
  alertThresholds: AlertThresholds;
  producerConfig: ProducerConfig;

  setTheme: (theme: "light" | "dark") => void;
  setRefreshInterval: (ms: number) => void;
  setAlertThresholds: (thresholds: Partial<AlertThresholds>) => void;
  setProducerConfig: (config: Partial<ProducerConfig>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      refreshInterval: 5000,
      alertThresholds: {
        errorRatePercent: 1,
        latencyMs: 100,
        dlqSize: 100,
      },
      producerConfig: {
        eventsPerSecond: 4000,
        purchaseRatio: 0.2,
        viewRatio: 0.5,
        clickRatio: 0.3,
      },

      setTheme: (theme) => set({ theme }),
      setRefreshInterval: (refreshInterval) => set({ refreshInterval }),
      setAlertThresholds: (partial) =>
        set((state) => ({
          alertThresholds: { ...state.alertThresholds, ...partial },
        })),
      setProducerConfig: (partial) =>
        set((state) => ({
          producerConfig: { ...state.producerConfig, ...partial },
        })),
    }),
    {
      name: "feature-stream-settings",
    }
  )
);
