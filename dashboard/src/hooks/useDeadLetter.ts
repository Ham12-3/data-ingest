import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { generateMockDeadLetter } from "@/lib/mockData";
import { REFRESH_INTERVALS, DLQ_PAGE_SIZE } from "@/lib/constants";

export function useDeadLetter(errorType?: string) {
  const [page, setPage] = useState(0);

  const query = useQuery({
    queryKey: ["dead-letter", page, errorType],
    queryFn: async () => {
      try {
        return await api.getDeadLetter(
          DLQ_PAGE_SIZE,
          page * DLQ_PAGE_SIZE,
          errorType
        );
      } catch {
        return generateMockDeadLetter();
      }
    },
    refetchInterval: REFRESH_INTERVALS.deadLetter,
    staleTime: REFRESH_INTERVALS.deadLetter / 2,
  });

  return { ...query, page, setPage };
}

export function useReplayEvents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventIds: string[]) => api.replayEvents(eventIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dead-letter"] });
    },
  });
}
