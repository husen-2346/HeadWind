import type { RouteOption, Recommendation } from "@/types/api";
import { formatMiles, formatDuration } from "@/lib/format";

export interface RouteBarData {
  routeId: string;
  displayValue: string;
  rawValue: number;
  percentage: number;
  isFaded: boolean;
  isBest: boolean;
}

export interface CriteriaRow {
  key: string;
  label: string;
  isDecidedHere: boolean;
  routes: RouteBarData[];
}

export interface CriteriaComparisonResult {
  rows: CriteriaRow[];
  caption: string;
  note: string | null;
  decidedCriterionLabel: string | null;
}

/**
 * Pure helper to build criteria comparison rows in the backend's exact lexicographic order.
 */
export function buildCriteriaRows(
  routes: RouteOption[],
  recommendation: Recommendation | null
): CriteriaComparisonResult {
  if (!routes || routes.length === 0) {
    return {
      rows: [],
      caption: "Ranked by Severe miles, then High miles, then average risk, then time.",
      note: null,
      decidedCriterionLabel: null,
    };
  }

  const bestRouteId = recommendation?.best_route_id || routes[0].id;
  const decidedBy = recommendation?.decided_by || null;

  // Check if any route has no-travel miles
  const hasNoTravel = routes.some((r) => r.summary.no_travel_miles > 0);
  const hasIncompleteData = routes.some((r) => r.summary.unknown_miles > 0);

  type CriterionDef = {
    key: string;
    label: string;
    decidedMatch: string[];
    getValue: (r: RouteOption) => number;
    formatValue: (r: RouteOption) => string;
  };

  const criteriaDefs: CriterionDef[] = [];

  if (hasNoTravel) {
    criteriaDefs.push({
      key: "no_travel_miles",
      label: "No-Travel mi",
      decidedMatch: ["no_travel_miles"],
      getValue: (r) => r.summary.no_travel_miles,
      formatValue: (r) => formatMiles(r.summary.no_travel_miles),
    });
  }

  criteriaDefs.push(
    {
      key: "severe_miles",
      label: "Severe mi",
      decidedMatch: ["severe_miles"],
      getValue: (r) => r.summary.severe_miles,
      formatValue: (r) => formatMiles(r.summary.severe_miles),
    },
    {
      key: "high_miles",
      label: "High mi",
      decidedMatch: ["high_miles"],
      getValue: (r) => r.summary.high_miles,
      formatValue: (r) => formatMiles(r.summary.high_miles),
    },
    {
      key: "avg_risk",
      label: "Avg risk",
      decidedMatch: ["avg_risk"],
      getValue: (r) => r.summary.avg_risk ?? 0,
      formatValue: (r) => (r.summary.avg_risk !== null ? `${r.summary.avg_risk.toFixed(2)} / 4` : "—"),
    },
    {
      key: "duration_seconds",
      label: "Travel time",
      decidedMatch: ["duration_seconds", "duration_minutes"],
      getValue: (r) => r.duration_seconds,
      formatValue: (r) => formatDuration(r.duration_seconds),
    }
  );

  // Track eliminated routes so non-winning routes fade from the criterion where they lose
  const eliminatedRouteIds = new Set<string>();

  const rows: CriteriaRow[] = criteriaDefs.map((def) => {
    const rawValues = routes.map((r) => def.getValue(r));
    const maxValue = Math.max(...rawValues, 1);
    const bestValue = def.getValue(routes.find((r) => r.id === bestRouteId) || routes[0]);

    const isDecidedHere = Boolean(decidedBy && def.decidedMatch.includes(decidedBy));

    const routeBars: RouteBarData[] = routes.map((r) => {
      const val = def.getValue(r);
      const isBest = r.id === bestRouteId;

      // If a route has a strictly worse value than best, eliminate it for this and subsequent rows
      if (val > bestValue && !isBest) {
        eliminatedRouteIds.add(r.id);
      }

      const isFaded = eliminatedRouteIds.has(r.id);
      const percentage = Math.min(100, Math.max(8, (val / maxValue) * 100));

      return {
        routeId: r.id,
        displayValue: def.formatValue(r),
        rawValue: val,
        percentage,
        isFaded,
        isBest,
      };
    });

    return {
      key: def.key,
      label: def.label,
      isDecidedHere,
      routes: routeBars,
    };
  });

  let note: string | null = null;
  if (hasIncompleteData) {
    note = "Routes with unforecast checkpoints rank below routes with complete weather data.";
  }
  if (decidedBy === "unknown weather") {
    note = "Selected primarily because alternative routes contain unforecast weather segments.";
  }

  return {
    rows,
    caption: "Ranked by Severe miles, then High miles, then average risk, then time.",
    note,
    decidedCriterionLabel: decidedBy,
  };
}
