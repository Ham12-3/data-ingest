"use client";

import { useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
      <div className="mb-5 border-b pb-4 dark:border-zinc-800">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <label className="font-medium">{label}</label>
        <span className="tabular-nums text-zinc-500">
          {value.toLocaleString()}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500"
        aria-label={label}
      />
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{min.toLocaleString()}{unit}</span>
        <span>{max.toLocaleString()}{unit}</span>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const {
    theme,
    refreshInterval,
    alertThresholds,
    producerConfig,
    setTheme,
    setRefreshInterval,
    setAlertThresholds,
    setProducerConfig,
  } = useSettingsStore();

  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function exportConfig() {
    const config = {
      alertThresholds,
      producerConfig,
      refreshInterval,
      theme,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pipeline-config.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Pipeline configuration and preferences
        </p>
      </div>

      {/* Appearance */}
      <SectionCard title="Appearance" description="Theme and display preferences">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Theme</label>
            <div className="flex gap-3">
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  aria-pressed={theme === t}
                  className={cn(
                    "flex-1 rounded-lg border py-2.5 text-sm font-medium capitalize transition-colors",
                    theme === t
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <SliderField
            label="Dashboard refresh interval"
            value={refreshInterval / 1000}
            min={2}
            max={60}
            step={1}
            unit="s"
            onChange={(v) => setRefreshInterval(v * 1000)}
          />
        </div>
      </SectionCard>

      {/* Alert thresholds */}
      <SectionCard
        title="Alert Thresholds"
        description="Configure when alerts are triggered"
      >
        <div className="space-y-5">
          <SliderField
            label="Error rate threshold"
            value={alertThresholds.errorRatePercent}
            min={0.1}
            max={10}
            step={0.1}
            unit="%"
            onChange={(v) => setAlertThresholds({ errorRatePercent: v })}
          />
          <SliderField
            label="Latency threshold"
            value={alertThresholds.latencyMs}
            min={10}
            max={1000}
            step={10}
            unit="ms"
            onChange={(v) => setAlertThresholds({ latencyMs: v })}
          />
          <SliderField
            label="Dead letter queue size threshold"
            value={alertThresholds.dlqSize}
            min={10}
            max={5000}
            step={10}
            unit=" events"
            onChange={(v) => setAlertThresholds({ dlqSize: v })}
          />
        </div>
      </SectionCard>

      {/* Producer configuration */}
      <SectionCard
        title="Producer Configuration"
        description="Simulated event producer settings"
      >
        <div className="space-y-5">
          <SliderField
            label="Events per second"
            value={producerConfig.eventsPerSecond}
            min={100}
            max={10000}
            step={100}
            unit=" ev/s"
            onChange={(v) => setProducerConfig({ eventsPerSecond: v })}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium">Event type distribution</p>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ["Purchase", "purchaseRatio"],
                  ["View", "viewRatio"],
                  ["Click", "clickRatio"],
                ] as const
              ).map(([label, key]) => (
                <div key={key}>
                  <label className="block text-xs text-zinc-500 mb-1">
                    {label}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={producerConfig[key]}
                    onChange={(e) =>
                      setProducerConfig({ [key]: Number(e.target.value) })
                    }
                    className="w-full rounded-md border px-3 py-1.5 text-sm dark:bg-zinc-900 dark:border-zinc-700"
                    aria-label={`${label} ratio`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Export */}
      <SectionCard title="Export" description="Download current configuration">
        <button
          onClick={exportConfig}
          className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          <Download className="h-4 w-4" />
          Download pipeline-config.json
        </button>
      </SectionCard>

      {/* Save button */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => {
            setRefreshInterval(5000);
            setAlertThresholds({ errorRatePercent: 1, latencyMs: 100, dlqSize: 100 });
          }}
          className="flex items-center gap-1.5 rounded-md px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset defaults
        </button>
        <button
          onClick={handleSave}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium text-white transition-colors",
            saved ? "bg-emerald-500" : "bg-blue-500 hover:bg-blue-600"
          )}
        >
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
