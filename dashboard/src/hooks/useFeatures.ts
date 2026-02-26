import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  generateMockUserFeatures,
  generateMockFeatureHistory,
} from "@/lib/mockData";
import { REFRESH_INTERVALS } from "@/lib/constants";

export function useUserFeatures(userId: string) {
  return useQuery({
    queryKey: ["features", userId],
    queryFn: async () => {
      try {
        return await api.getFeatures(userId);
      } catch {
        return generateMockUserFeatures(userId);
      }
    },
    enabled: !!userId,
    refetchInterval: REFRESH_INTERVALS.features,
    staleTime: REFRESH_INTERVALS.features / 2,
  });
}

export function useFeatureHistory(
  userId: string,
  featureName: string,
  start: string,
  end: string
) {
  return useQuery({
    queryKey: ["feature-history", userId, featureName, start, end],
    queryFn: async () => {
      try {
        return await api.getFeatureHistory(userId, start, end, featureName);
      } catch {
        return generateMockFeatureHistory(userId, featureName);
      }
    },
    enabled: !!userId && !!featureName,
    staleTime: REFRESH_INTERVALS.features / 2,
  });
}
