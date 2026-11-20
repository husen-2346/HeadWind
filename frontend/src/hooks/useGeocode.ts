import { useQuery } from "@tanstack/react-query";
import { geocode } from "@/lib/api/endpoints";
import { useDebouncedValue } from "./useDebouncedValue";
import type { GeocodeResult } from "@/types/api";

export function useGeocode(query: string) {
  const debouncedQuery = useDebouncedValue(query.trim(), 250);

  return useQuery<GeocodeResult[]>({
    queryKey: ["geocode", debouncedQuery],
    queryFn: ({ signal }) => geocode(debouncedQuery, signal),
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
