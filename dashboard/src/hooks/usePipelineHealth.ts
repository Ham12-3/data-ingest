"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { REFETCH_INTERVALS } from "@/lib/constants";
import type { HealthResponse, ComponentsHealthResponse } from "@/types/api";
import type { PipelineMetrics } from "@/types/metrics";

export function useHealthCheck() {
  return useQuery<HealthResponse>({
    queryKey: ["health"],
    queryFn: async () => {
      const { data } = await api.get("/health");
      return data;
    },
    refetchInterval: REFETCH_INTERVALS.health,
  });
}

export function useComponentsHealth() {
  return useQuery<ComponentsHealthResponse>({
    queryKey: ["health", "components"],
    queryFn: async () => {
      const { data } = await api.get("/health/components");
      return data;
    },
    refetchInterval: REFETCH_INTERVALS.health,
  });
}

export function usePipelineMetrics() {
  return useQuery<PipelineMetrics>({
    queryKey: ["metrics"],
    queryFn: async () => {
      const { data } = await api.get("/metrics");
      return data;
    },
    refetchInterval: REFETCH_INTERVALS.metrics,
  });
}
