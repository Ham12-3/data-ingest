"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { REFETCH_INTERVALS } from "@/lib/constants";
import type { QualityResults, QualityTrendPoint } from "@/types/quality";

export function useQualityResults() {
  return useQuery<QualityResults>({
    queryKey: ["quality", "results"],
    queryFn: async () => {
      const { data } = await api.get("/quality/results");
      return data;
    },
    refetchInterval: REFETCH_INTERVALS.quality,
  });
}

export function useQualityTrend(hours = 24) {
  return useQuery<QualityTrendPoint[]>({
    queryKey: ["quality", "trend", hours],
    queryFn: async () => {
      const { data } = await api.get("/quality/trend", {
        params: { hours },
      });
      return data;
    },
    refetchInterval: REFETCH_INTERVALS.quality,
  });
}
