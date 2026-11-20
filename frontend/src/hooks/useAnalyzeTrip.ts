import { useQuery } from "@tanstack/react-query";
import { analyzeTrip } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import type { TripAnalysisRequest, TripAnalysisResponse } from "@/types/api";

export function useAnalyzeTrip(request: TripAnalysisRequest | null) {
  return useQuery<TripAnalysisResponse, ApiError>({
    queryKey: ["analyzeTrip", request],
    queryFn: ({ signal }) => {
      if (!request) {
        throw new ApiError("invalid_request", "Trip request cannot be null", 400);
      }
      return analyzeTrip(request, signal);
    },
    enabled: request !== null,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Retry once for network or 502/server errors, never for 4xx client errors
      if (failureCount >= 1) {
        return false;
      }
      if (error instanceof ApiError) {
        if (error.status >= 400 && error.status < 500) {
          return false;
        }
      }
      return true;
    },
  });
}
