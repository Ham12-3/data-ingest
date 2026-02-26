"use client";

import { useEffect, useRef, useCallback } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";
import { generateMockMetrics, generateMockHealth } from "@/lib/mockData";
import {
  SSE_RECONNECT_BASE_DELAY_MS,
  SSE_RECONNECT_MAX_DELAY_MS,
  SSE_RECONNECT_MAX_RETRIES,
} from "@/lib/constants";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function useRealtimeMetrics() {
  const esRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { setMetrics, setHealth, addAlert, setSseState, sseState } =
    useDashboardStore();

  const startMockPolling = useCallback(() => {
    if (mockIntervalRef.current) return;
    setMetrics(generateMockMetrics());
    setHealth(generateMockHealth());
    mockIntervalRef.current = setInterval(() => {
      setMetrics(generateMockMetrics());
    }, 2000);
  }, [setMetrics, setHealth]);

  const cleanup = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(
    (retryCount = 0) => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      let es: EventSource;
      try {
        es = new EventSource(`${API_URL}/metrics/stream`);
        esRef.current = es;
      } catch {
        setSseState({ connected: false, reconnecting: false, error: "SSE unavailable" });
        startMockPolling();
        return;
      }

      es.onopen = () => {
        setSseState({ connected: true, reconnecting: false, error: null, retryCount: 0 });
      };

      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === "metrics") setMetrics(parsed.data);
          else if (parsed.type === "health") setHealth(parsed.data);
          else if (parsed.type === "alert") addAlert(parsed.data);
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        setSseState({ connected: false });

        if (retryCount >= SSE_RECONNECT_MAX_RETRIES) {
          setSseState({ error: "Max reconnection attempts reached", reconnecting: false });
          startMockPolling();
          return;
        }

        const delay = Math.min(
          SSE_RECONNECT_BASE_DELAY_MS * Math.pow(2, retryCount),
          SSE_RECONNECT_MAX_DELAY_MS
        );
        setSseState({ reconnecting: true, retryCount: retryCount + 1 });
        retryTimeoutRef.current = setTimeout(() => connect(retryCount + 1), delay);
      };
    },
    [setMetrics, setHealth, addAlert, setSseState, startMockPolling]
  );

  useEffect(() => {
    connect(0);
    return cleanup;
  }, [connect, cleanup]);

  return sseState;
}
