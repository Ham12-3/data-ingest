"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { REFETCH_INTERVALS } from "@/lib/constants";
import type { UserFeatures, FeatureHistoryResponse } from "@/types/features";

export function useUserFeatures(userId: string) {
  return useQuery<UserFeatures>({
    queryKey: ["features", userId],
    queryFn: async () => {
      const { data } = await api.get(`/features/${userId}`);
      return data;
    },
    enabled: !!userId,
    refetchInterval: REFETCH_INTERVALS.features,
  });
}

export function useFeatureHistory(userId: string, hours = 24) {
  return useQuery<FeatureHistoryResponse>({
    queryKey: ["features", userId, "history", hours],
    queryFn: async () => {
      const { data } = await api.get(`/features/${userId}/history`, {
        params: { hours },
      });
      return data;
    },
    enabled: !!userId,
    refetchInterval: REFETCH_INTERVALS.features,
  });
}
