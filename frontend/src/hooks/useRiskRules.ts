import { useQuery } from "@tanstack/react-query";
import { getRiskRules } from "@/lib/api/endpoints";
import type { RiskRulesResponse } from "@/types/api";

export function useRiskRules() {
  return useQuery<RiskRulesResponse>({
    queryKey: ["riskRules"],
    queryFn: ({ signal }) => getRiskRules(signal),
    staleTime: Infinity,
  });
}
