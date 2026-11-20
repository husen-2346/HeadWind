import clsx from "clsx";
import type { RouteSummary } from "@/types/api";

export interface RiskBarProps {
  summary: RouteSummary;
  routeLabel?: string;
  className?: string;
}

export function RiskBar({ summary, routeLabel = "Route", className }: RiskBarProps) {
  const total = summary.distance_miles || 1;

  const low = summary.miles_by_level.low || 0;
  const mod = summary.miles_by_level.moderate || 0;
  const high = summary.miles_by_level.high || 0;
  const severe = summary.severe_miles || summary.miles_by_level.severe || 0;
  const noTravel = summary.no_travel_miles || summary.miles_by_level.no_travel || 0;
  const unknown = summary.unknown_miles || 0;

  const lowPct = (low / total) * 100;
  const modPct = (mod / total) * 100;
  const highPct = (high / total) * 100;
  const severePct = (severe / total) * 100;
  const noTravelPct = (noTravel / total) * 100;
  const unknownPct = (unknown / total) * 100;

  // Accessible text equivalent for screen readers
  const accessibleLabel = `${routeLabel}: ${Math.round(noTravel)} no-travel miles, ${Math.round(severe)} severe miles, ${Math.round(high)} high miles, ${Math.round(mod)} moderate miles, ${Math.round(low)} low miles${unknown > 0 ? `, ${Math.round(unknown)} unforecast miles` : ""}.`;

  return (
    <div className={clsx("flex flex-col gap-1 select-none", className)}>
      <div
        role="img"
        aria-label={accessibleLabel}
        className="w-full h-2.5 rounded-full overflow-hidden flex bg-border/40"
      >
        {lowPct > 0 && (
          <div
            title={`Low Risk: ${Math.round(low)} mi (${lowPct.toFixed(0)}%)`}
            style={{ width: `${lowPct}%` }}
            className="h-full bg-risk-low"
          />
        )}
        {modPct > 0 && (
          <div
            title={`Moderate: ${Math.round(mod)} mi (${modPct.toFixed(0)}%)`}
            style={{ width: `${modPct}%` }}
            className="h-full bg-risk-moderate"
          />
        )}
        {highPct > 0 && (
          <div
            title={`High Risk: ${Math.round(high)} mi (${highPct.toFixed(0)}%)`}
            style={{ width: `${highPct}%` }}
            className="h-full bg-risk-high"
          />
        )}
        {severePct > 0 && (
          <div
            title={`Severe: ${Math.round(severe)} mi (${severePct.toFixed(0)}%)`}
            style={{ width: `${severePct}%` }}
            className="h-full bg-risk-severe border-x border-bg/30"
          />
        )}
        {noTravelPct > 0 && (
          <div
            title={`No Travel: ${Math.round(noTravel)} mi (${noTravelPct.toFixed(0)}%)`}
            style={{ width: `${noTravelPct}%` }}
            className="h-full bg-risk-no-travel border-x border-bg/30"
          />
        )}
        {unknownPct > 0 && (
          <div
            title={`Unknown Weather: ${Math.round(unknown)} mi (${unknownPct.toFixed(0)}%)`}
            style={{
              width: `${unknownPct}%`,
              backgroundImage:
                "repeating-linear-gradient(45deg, #1F2A37, #1F2A37 3px, #8B98A5 3px, #8B98A5 6px)",
            }}
            className="h-full opacity-60"
          />
        )}
      </div>
    </div>
  );
}
