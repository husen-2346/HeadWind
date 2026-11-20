import type { RouteComparison } from "@/types/api";

/**
 * Format route generator source codes into human-friendly descriptions.
 */
export function formatRouteSource(source: string | null | undefined): string {
  if (!source) return "Standard Highway";

  switch (source.toLowerCase().trim()) {
    case "primary":
      return "Direct Highway";
    case "exclude_toll":
      return "Toll-Free Route";
    case "exclude_motorway":
      return "Non-Interstate Route";
    case "via_offset":
      return "Corridor Variant";
    case "alternative":
    case "mapbox_alt":
      return "Alternative Route";
    default:
      return source
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

/**
 * Maps the backend decided_by ranking criteria to readable plain-language labels.
 */
export function formatDecidedBy(decidedBy: string | null | undefined): string {
  if (!decidedBy) return "Overall Route Safety";

  switch (decidedBy.trim()) {
    case "no_travel_miles":
      return "Fewest No Travel miles";
    case "severe_miles":
      return "Fewest Severe risk miles";
    case "high_miles":
      return "Fewest High risk miles";
    case "avg_risk":
      return "Lowest average risk score";
    case "duration_minutes":
      return "Shortest travel time";
    case "unknown weather":
      return "Most complete weather coverage";
    case "route_id":
    case "route_id (tie)":
      return "Route identifier tie-break";
    case "tie":
      return "Equivalent safety and travel time";
    default:
      return decidedBy
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

/**
 * Formats a single RouteComparison into a readable sentence explaining why the best route won.
 */
export function formatComparison(comp: RouteComparison, bestRouteId: string): string {
  const { criterion, route_id, best_value, other_value } = comp;

  switch (criterion) {
    case "no_travel_miles":
      return `Route ${bestRouteId} has ${best_value} No Travel miles vs ${other_value} on Route ${route_id}.`;
    case "severe_miles":
      return `Route ${bestRouteId} has ${best_value} Severe miles vs ${other_value} on Route ${route_id}.`;
    case "high_miles":
      return `Route ${bestRouteId} has ${best_value} High miles vs ${other_value} on Route ${route_id}.`;
    case "avg_risk":
      return `Route ${bestRouteId} has lower avg risk (${best_value} vs ${other_value} on Route ${route_id}).`;
    case "duration_minutes":
      return `Route ${bestRouteId} is faster (${best_value}m vs ${other_value}m on Route ${route_id}).`;
    case "unknown weather":
      return `Route ${bestRouteId} has complete weather data; Route ${route_id} has unforecast segments.`;
    default:
      return `Route ${bestRouteId} outperformed Route ${route_id} on ${criterion.replace(/_/g, " ")}.`;
  }
}
