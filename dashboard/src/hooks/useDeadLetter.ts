"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { REFETCH_INTERVALS, DLQ_PAGE_SIZE } from "@/lib/constants";
import type { DeadLetterResponse } from "@/types/quality";
import type { ReplayResult } from "@/types/api";

export function useDeadLetterEvents(limit = DLQ_PAGE_SIZE) {
  return useQuery<DeadLetterResponse>({
    queryKey: ["dead-letter", limit],
    queryFn: async () => {
      const { data } = await api.get("/dead-letter/recent", {
        params: { limit },
      });
      return data;
    },
    refetchInterval: REFETCH_INTERVALS.deadLetter,
  });
}

export function useReplayEvents() {
  const queryClient = useQueryClient();

  return useMutation<ReplayResult>({
    mutationFn: async () => {
      const { data } = await api.post("/pipeline/replay");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dead-letter"] });
    },
  });
}
