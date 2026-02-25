"use client";

import { useSettingsStore } from "@/stores/settingsStore";
import { Sun, Moon, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const {
    theme,
    setTheme,
    refreshInterval,
    setRefreshInterval,
    alertThresholds,
    setAlertThresholds,
    producerConfig,
    setProducerConfig,
  } = useSettingsStore();

  const handleExport = () => {
    const config = {
      producerConfig,
      alertThresholds,
      refreshInterval,
      theme,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pipeline-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure pipeline parameters and dashboard preferences
        </p>
      </div>

      {/* Producer Configuration */}
      <section className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Producer Configuration</h2>
        <p className="mt-1 text-sm text-slate-400">Control event generation rate</p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="flex items-center justify-between text-sm text-slate-300">
              <span>Events per second</span>
              <span className="tabular-nums font-medium text-blue-400">{producerConfig.eventsPerSec}</span>
            </label>
            <input
              type="range"
              min={10}
              max={5000}
              step={10}
              value={producerConfig.eventsPerSec}
              onChange={(e) => setProducerConfig({ eventsPerSec: Number(e.target.value) })}
              className="mt-2 w-full accent-blue-600"
              aria-label="Events per second"
            />
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>10</span>
              <span>5,000</span>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-300">Event Type Distribution</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {Object.entries(producerConfig.eventTypes).map(([type, pct]) => (
                <div key={type} className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2">
                  <span className="text-sm capitalize text-slate-300">{type.replace("_", " ")}</span>
                  <span className="text-sm tabular-nums text-slate-400">{pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Alert Thresholds */}
      <section className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Alert Thresholds</h2>
        <p className="mt-1 text-sm text-slate-400">Configure when alerts are triggered</p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="flex items-center justify-between text-sm text-slate-300">
              <span>Error Rate Threshold</span>
              <span className="tabular-nums font-medium text-rose-400">{alertThresholds.errorRate}%</span>
            </label>
            <input
              type="range"
              min={0.5}
              max={20}
              step={0.5}
              value={alertThresholds.errorRate}
              onChange={(e) => setAlertThresholds({ errorRate: Number(e.target.value) })}
              className="mt-2 w-full accent-rose-600"
              aria-label="Error rate threshold percentage"
            />
          </div>

          <div>
            <label className="flex items-center justify-between text-sm text-slate-300">
              <span>Latency Threshold</span>
              <span className="tabular-nums font-medium text-amber-400">{alertThresholds.latencyMs}ms</span>
            </label>
            <input
              type="range"
              min={50}
              max={5000}
              step={50}
              value={alertThresholds.latencyMs}
              onChange={(e) => setAlertThresholds({ latencyMs: Number(e.target.value) })}
              className="mt-2 w-full accent-amber-600"
              aria-label="Latency threshold in milliseconds"
            />
          </div>

          <div>
            <label className="flex items-center justify-between text-sm text-slate-300">
              <span>DLQ Size Threshold</span>
              <span className="tabular-nums font-medium text-amber-400">{alertThresholds.dlqSize}</span>
            </label>
            <input
              type="range"
              min={100}
              max={10000}
              step={100}
              value={alertThresholds.dlqSize}
              onChange={(e) => setAlertThresholds({ dlqSize: Number(e.target.value) })}
              className="mt-2 w-full accent-amber-600"
              aria-label="Dead letter queue size threshold"
            />
          </div>
        </div>
      </section>

      {/* Dashboard Preferences */}
      <section className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Dashboard Preferences</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="flex items-center justify-between text-sm text-slate-300">
              <span>Refresh Interval</span>
              <span className="tabular-nums font-medium text-blue-400">{refreshInterval / 1000}s</span>
            </label>
            <input
              type="range"
              min={1000}
              max={30000}
              step={1000}
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="mt-2 w-full accent-blue-600"
              aria-label="Dashboard refresh interval in seconds"
            />
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>1s</span>
              <span>30s</span>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm text-slate-300">Theme</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setTheme("light");
                  document.documentElement.classList.remove("dark");
                }}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                  theme === "light"
                    ? "border-blue-500 bg-blue-500/10 text-blue-400"
                    : "border-slate-700 text-slate-400 hover:border-slate-600"
                )}
              >
                <Sun className="h-4 w-4" />
                Light
              </button>
              <button
                onClick={() => {
                  setTheme("dark");
                  document.documentElement.classList.add("dark");
                }}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                  theme === "dark"
                    ? "border-blue-500 bg-blue-500/10 text-blue-400"
                    : "border-slate-700 text-slate-400 hover:border-slate-600"
                )}
              >
                <Moon className="h-4 w-4" />
                Dark
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Export */}
      <section className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Export Configuration</h2>
        <p className="mt-1 text-sm text-slate-400">Download your pipeline configuration as JSON</p>

        <button
          onClick={handleExport}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          <Download className="h-4 w-4" />
          Export Config
        </button>
      </section>
    </div>
  );
}
