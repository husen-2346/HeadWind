import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { analyzeTrip, fetchHeatmap } from "@/lib/api/endpoints";
import { generateMockHeatmap, dallasDenverFixture } from "@/mocks";
import { ApiError } from "@/lib/api/client";
import type { TripAnalysisRequest, TripAnalysisResponse } from "@/types/api";

export function useAnalyzeTrip() {
  const [lastData, setLastData] = useState<TripAnalysisResponse | null>(null);
  const activeControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation<TripAnalysisResponse, ApiError, TripAnalysisRequest>({
    mutationFn: async (request: TripAnalysisRequest) => {
      // Abort any existing in-flight analysis
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
      const controller = new AbortController();
      activeControllerRef.current = controller;

      try {
        const result = await analyzeTrip(request, controller.signal);
        setLastData(result);
        return result;
      } finally {
        if (activeControllerRef.current === controller) {
          activeControllerRef.current = null;
        }
      }
    },
    onSuccess: (_data, variables) => {
      // Prefetch corridor heatmap as soon as analysis succeeds
      const isMock =
        Boolean(import.meta.env.DEV) &&
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("mock") === "1";

      queryClient.prefetchQuery({
        queryKey: [
          "heatmap",
          variables.origin,
          variables.destination,
          variables.departure_local,
          variables.load_lb,
          isMock,
        ],
        queryFn: ({ signal }) => {
          if (isMock) {
            return Promise.resolve(generateMockHeatmap(dallasDenverFixture, variables.load_lb));
          }
          return fetchHeatmap(
            {
              origin: variables.origin,
              destination: variables.destination,
              departure_local: variables.departure_local,
              load_lb: variables.load_lb,
            },
            signal
          );
        },
        staleTime: 10 * 60 * 1000,
      });
    },
    retry: (failureCount, error) => {
      // Never retry if aborted by user
      if (error?.code === "aborted") return false;
      // Retry once for network or 502/server errors, never for 4xx client errors
      if (failureCount >= 1) return false;
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        return false;
      }
      return true;
    },
  });

  const cancel = useCallback(() => {
    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
      activeControllerRef.current = null;
    }
  }, []);

  return {
    ...mutation,
    // Keep last result while pending to prevent UI flash
    data: mutation.data ?? lastData,
    lastData,
    cancel,
  };
}
