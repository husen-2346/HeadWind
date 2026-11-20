import { useQuery } from "@tanstack/react-query";
import { getHealth } from "@/lib/api/endpoints";
import type { HealthResponse } from "@/types/api";

export function useHealth() {
  return useQuery<HealthResponse>({
    queryKey: ["health"],
    queryFn: ({ signal }) => getHealth(signal),
    enabled: import.meta.env.DEV,
  });
}
