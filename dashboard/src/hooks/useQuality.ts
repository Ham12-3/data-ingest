import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { generateMockQuality, generateMockQualityTrend } from "@/lib/mockData";
import { REFRESH_INTERVALS } from "@/lib/constants";

export function useQualityResults() {
  return useQuery({
    queryKey: ["quality-results"],
    queryFn: async () => {
      try {
        return await api.getQualityResults();
      } catch {
        return generateMockQuality();
      }
    },
    refetchInterval: REFRESH_INTERVALS.quality,
    staleTime: REFRESH_INTERVALS.quality / 2,
  });
}

export function useQualityTrend(hours = 24) {
  return useQuery({
    queryKey: ["quality-trend", hours],
    queryFn: async () => {
      try {
        return await api.getQualityTrend(hours);
      } catch {
        return generateMockQualityTrend();
      }
    },
    refetchInterval: REFRESH_INTERVALS.quality,
    staleTime: REFRESH_INTERVALS.quality / 2,
  });
}
