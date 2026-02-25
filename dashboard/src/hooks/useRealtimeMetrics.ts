"use client";

import { useEffect, useRef, useCallback } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";
import { SSE_METRICS_URL } from "@/lib/constants";
import type { MetricEvent } from "@/types/metrics";

const MAX_RETRIES = 10;
const BASE_DELAY = 1000;

export function useRealtimeMetrics() {
  const pushMetricEvent = useDashboardStore((s) => s.pushMetricEvent);
  const setSseConnected = useDashboardStore((s) => s.setSseConnected);
  const retriesRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const es = new EventSource(SSE_METRICS_URL);
      eventSourceRef.current = es;

      es.onopen = () => {
        setSseConnected(true);
        retriesRef.current = 0;
      };

      es.onmessage = (event) => {
        try {
          const data: MetricEvent = JSON.parse(event.data);
          pushMetricEvent(data);
        } catch {
          // ignore malformed events
        }
      };

      es.onerror = () => {
        es.close();
        setSseConnected(false);

        if (retriesRef.current < MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, retriesRef.current);
          retriesRef.current++;
          setTimeout(connect, delay);
        }
      };
    } catch {
      setSseConnected(false);
    }
  }, [pushMetricEvent, setSseConnected]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);
}
