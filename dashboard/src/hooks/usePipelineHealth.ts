import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { generateMockHealth } from "@/lib/mockData";
import { REFRESH_INTERVALS } from "@/lib/constants";
import { useDashboardStore } from "@/stores/dashboardStore";

export function usePipelineHealth() {
  const setHealth = useDashboardStore((s) => s.setHealth);

  return useQuery({
    queryKey: ["pipeline-health"],
    queryFn: async () => {
      try {
        const data = await api.getHealth();
        setHealth(data);
        return data;
      } catch {
        const mock = generateMockHealth();
        setHealth(mock);
        return mock;
      }
    },
    refetchInterval: REFRESH_INTERVALS.health,
    staleTime: REFRESH_INTERVALS.health / 2,
  });
}
