import React from "react";
import clsx from "clsx";
import { useAppStore } from "@/stores/appStore";
import { Pill } from "@/components/ui/Pill";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { Button } from "@/components/ui/Button";
import { Stat } from "@/components/ui/Stat";
import { ArrowRight } from "@/components/ui/icons";
import { formatMiles, formatDuration, formatDelta } from "@/lib/format";
import { formatRouteSource } from "@/lib/labels";
import { RiskBar } from "./RiskBar";
import type { RouteOption } from "@/types/api";

export interface RouteCardProps {
  route: RouteOption;
  isRecommended: boolean;
  fastestDurationSeconds: number;
  className?: string;
}

export function RouteCard({
  route,
  isRecommended,
  fastestDurationSeconds,
  className,
}: RouteCardProps) {
  const selectedRouteId = useAppStore((s) => s.selectedRouteId);
  const hoveredRouteId = useAppStore((s) => s.hoveredRouteId);
  const setSelectedRouteId = useAppStore((s) => s.setSelectedRouteId);
  const setHoveredRouteId = useAppStore((s) => s.setHoveredRouteId);
  const setPanelState = useAppStore((s) => s.setPanelState);

  const isSelected = selectedRouteId === route.id;
  const isHovered = hoveredRouteId === route.id;

  const durationDiff = route.duration_seconds - fastestDurationSeconds;
  const deltaText =
    durationDiff <= 60 ? "Fastest" : formatDelta(durationDiff);

  // Checkpoint ETAs
  const firstCheckpoint = route.checkpoints[0];
  const lastCheckpoint = route.checkpoints[route.checkpoints.length - 1];

  const departureEta = firstCheckpoint?.eta_local || "";
  const arrivalEta = lastCheckpoint?.eta_local || "";

  const handleSelect = () => {
    setSelectedRouteId(route.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelect();
    }
  };

  const openDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRouteId(route.id);
    setPanelState("detail");
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Route ${route.id}, ${formatMiles(route.distance_miles)}, ${formatDuration(route.duration_seconds)}`}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHoveredRouteId(route.id)}
      onMouseLeave={() => setHoveredRouteId(null)}
      className={clsx(
        "p-3.5 bg-surface border rounded-card transition-all cursor-pointer text-left select-none relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        isSelected
          ? "border-accent ring-1 ring-accent"
          : isHovered
            ? "border-text-muted/50"
            : "border-border hover:border-text-muted/30",
        className
      )}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {/* Route Letter Badge */}
          <span
            className={clsx(
              "w-6 h-6 rounded flex items-center justify-center text-12 font-mono font-medium",
              isSelected ? "bg-accent text-bg" : "bg-border text-text"
            )}
          >
            {route.id}
          </span>
          <span className="text-14 font-medium text-text">
            {route.name || `Route ${route.id}`}
          </span>
          <span className="text-12 font-mono text-text-muted">
            · {formatRouteSource(route.source)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isRecommended && (
            <Pill variant="accent" size="sm">
              Recommended
            </Pill>
          )}
          {route.summary.max_level && (
            <RiskBadge level={route.summary.max_level} size="sm" />
          )}
        </div>
      </div>

      {/* Metric Stats */}
      <div className="grid grid-cols-3 gap-2 py-1.5 border-y border-border/50">
        <Stat label="Distance" value={formatMiles(route.distance_miles)} />
        <Stat label="Travel Time" value={formatDuration(route.duration_seconds)} delta={deltaText} />
        <div className="flex flex-col text-left">
          <span className="text-12 font-medium uppercase tracking-wider text-text-muted">
            Severe / High
          </span>
          <span className="text-16 font-mono font-medium tabular-nums text-text mt-0.5">
            <span className={route.summary.severe_miles > 0 ? "text-risk-severe font-medium" : "text-text"}>
              {Math.round(route.summary.severe_miles)}
            </span>{" "}
            /{" "}
            <span className={route.summary.high_miles > 0 ? "text-risk-high font-medium" : "text-text"}>
              {Math.round(route.summary.high_miles)}
            </span>{" "}
            <span className="text-12 font-mono text-text-muted">mi</span>
          </span>
        </div>
      </div>

      {/* Stacked RiskBar */}
      <div className="pt-2">
        <RiskBar summary={route.summary} routeLabel={`Route ${route.id}`} />
      </div>

      {/* Bottom Row: Departure/Arrival ETA & Details Button */}
      <div className="flex items-center justify-between pt-2.5 text-12 text-text-muted font-mono">
        <div>
          {departureEta && arrivalEta ? (
            <span>
              ETA: <span className="text-text">{departureEta}</span> → <span className="text-text">{arrivalEta}</span>
            </span>
          ) : (
            <span>{formatDuration(route.duration_seconds)} travel time</span>
          )}
        </div>

        {isSelected && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={openDetails}
            trailingIcon={<ArrowRight className="w-3.5 h-3.5" />}
            className="text-12 h-7 px-2.5 text-accent border-accent/40 hover:bg-accent/10"
          >
            Details
          </Button>
        )}
      </div>
    </div>
  );
}
