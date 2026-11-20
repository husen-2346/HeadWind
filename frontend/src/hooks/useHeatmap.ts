/**
 * useHeatmap.ts – React Query hook for 49-hour weather corridor heatmap data.
 *
 * Supports 10-minute stale time caching and dev mock mode via ?mock=1.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchHeatmap } from "@/lib/api/endpoints";
import { generateMockHeatmap, dallasDenverFixture } from "@/mocks";
import type { HeatmapRequest, HeatmapResponse } from "@/types/api";
import type { ApiError } from "@/lib/api/client";

export function useHeatmap(request: HeatmapRequest | null) {
  const isMock =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("mock") === "1";

  return useQuery<HeatmapResponse, ApiError>({
    queryKey: [
      "heatmap",
      request?.origin,
      request?.destination,
      request?.departure_local,
      request?.load_lb,
      isMock,
    ],
    queryFn: async ({ signal }) => {
      if (!request) throw new Error("No request provided");
      if (isMock) {
        return generateMockHeatmap(dallasDenverFixture, request.load_lb ?? 42000);
      }
      return fetchHeatmap(request, signal);
    },
    enabled: Boolean(
      request &&
        request.origin &&
        request.destination &&
        request.departure_local
    ),
    placeholderData: () =>
      generateMockHeatmap(dallasDenverFixture, request?.load_lb ?? 42000),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}
