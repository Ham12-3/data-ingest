import { formatDistanceToNow, format, parseISO } from "date-fns";

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat("en-US", options).format(value);
}

export function formatRate(value: number, unit = "/s"): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M${unit}`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K${unit}`;
  return `${value.toFixed(1)}${unit}`;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824)
    return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function formatDuration(ms: number): string {
  if (ms >= 3_600_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`;
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`;
  return `${ms}ms`;
}

export function formatUptime(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(1)}ms`;
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatTimestamp(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, HH:mm:ss");
  } catch {
    return iso;
  }
}

export function formatTimeAgo(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function formatScore(score: number): string {
  return score.toFixed(1);
}
