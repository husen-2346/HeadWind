import React, { useRef, useEffect } from "react";
import clsx from "clsx";
import { useAppStore } from "@/stores/appStore";
import { useMap } from "@/components/map/MapContext";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { Tooltip } from "@/components/ui/Tooltip";
import { formatMph, formatInHr, formatEta } from "@/lib/format";
import type { Checkpoint } from "@/types/api";

export interface CheckpointTableProps {
  checkpoints: Checkpoint[];
  tripTimezone?: string;
  className?: string;
}

export function CheckpointTable({
  checkpoints,
  tripTimezone = "UTC",
  className,
}: CheckpointTableProps) {
  const selectedIndex = useAppStore((s) => s.selectedCheckpointIndex);
  const setSelectedCheckpointIndex = useAppStore((s) => s.setSelectedCheckpointIndex);
  const { map } = useMap();

  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Scroll active row into view when selection changes from map or detail view
  useEffect(() => {
    if (selectedIndex !== null) {
      const rowEl = rowRefs.current.get(selectedIndex);
      if (rowEl && typeof rowEl.scrollIntoView === "function") {
        rowEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  const handleSelectCheckpoint = (index: number) => {
    setSelectedCheckpointIndex(index);

    const cp = checkpoints.find((c) => c.index === index);
    if (map && cp) {
      const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      map.easeTo({
        center: [cp.lon, cp.lat],
        zoom: Math.max(map.getZoom(), 7.5),
        duration: isReducedMotion ? 0 : 500,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelectCheckpoint(currentIndex);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = Math.min(checkpoints.length - 1, currentIndex + 1);
      const nextCp = checkpoints[nextIdx];
      if (nextCp) {
        handleSelectCheckpoint(nextCp.index);
        rowRefs.current.get(nextCp.index)?.focus();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIdx = Math.max(0, currentIndex - 1);
      const prevCp = checkpoints[prevIdx];
      if (prevCp) {
        handleSelectCheckpoint(prevCp.index);
        rowRefs.current.get(prevCp.index)?.focus();
      }
    }
  };

  return (
    <div
      ref={tableContainerRef}
      className={clsx(
        "border border-border rounded-panel overflow-hidden flex flex-col bg-surface select-none",
        className
      )}
    >
      <div className="overflow-y-auto max-h-[420px] relative">
        <table className="w-full text-left border-collapse" role="table">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm border-b border-border shadow-none">
            <tr className="text-12 font-medium uppercase tracking-wider text-text-muted">
              <th className="py-2.5 pl-3 pr-2 font-mono">Mile</th>
              <th className="py-2.5 px-2 font-mono">ETA</th>
              <th className="py-2.5 px-2 text-right font-mono">Wind</th>
              <th className="py-2.5 px-2 text-right font-mono">Rain</th>
              <th className="py-2.5 px-2 text-right font-mono">Snow</th>
              <th className="py-2.5 pr-3 pl-2 text-right font-mono">Risk</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border/40 font-mono text-12">
            {checkpoints.map((cp, idx) => {
              const isSelected = selectedIndex === cp.index;
              const level = cp.risk?.level;
              const isSevereOrNoTravel = level === "severe" || level === "no_travel";
              const isEscalated = Boolean(cp.risk?.escalated_by_load);

              const formattedEta = cp.eta_utc
                ? formatEta(cp.eta_utc, tripTimezone)
                : cp.eta_local || "—";

              return (
                <tr
                  key={cp.index}
                  ref={(el) => {
                    if (el) rowRefs.current.set(cp.index, el);
                    else rowRefs.current.delete(cp.index);
                  }}
                  role="row"
                  tabIndex={0}
                  aria-selected={isSelected}
                  onClick={() => handleSelectCheckpoint(cp.index)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  style={{
                    contentVisibility: "auto",
                    containIntrinsicSize: "0 38px",
                  }}
                  className={clsx(
                    "cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
                    isSelected
                      ? "bg-accent/15 text-text"
                      : isSevereOrNoTravel
                        ? "bg-risk-severe/10 hover:bg-risk-severe/20 text-text"
                        : isEscalated
                          ? "bg-surface hover:bg-border/40 text-text"
                          : "hover:bg-border/30 text-text"
                  )}
                >
                  {/* Mile */}
                  <td className="py-2 pl-3 pr-2 tabular-nums font-medium text-text">
                    {Math.round(cp.mile)}
                  </td>

                  {/* ETA */}
                  <td className="py-2 px-2 tabular-nums text-text-muted whitespace-nowrap">
                    {formattedEta}
                  </td>

                  {/* Wind */}
                  <td className="py-2 px-2 tabular-nums text-right text-text">
                    {formatMph(cp.weather?.wind_mph)}
                  </td>

                  {/* Rain */}
                  <td className="py-2 px-2 tabular-nums text-right text-text-muted">
                    {formatInHr(cp.weather?.rain_in_hr)}
                  </td>

                  {/* Snow */}
                  <td className="py-2 px-2 tabular-nums text-right text-text-muted">
                    {formatInHr(cp.weather?.snow_in_hr)}
                  </td>

                  {/* Risk Badge & Escalation Tag */}
                  <td className="py-2 pr-3 pl-2 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {isEscalated && (
                        <Tooltip content={cp.risk?.escalation_reason || "Escalated due to cargo weight"}>
                          <span className="text-12 font-mono text-risk-severe font-medium px-1 rounded bg-risk-severe/10 border border-risk-severe/30 cursor-help">
                            ▲ load
                          </span>
                        </Tooltip>
                      )}

                      {level ? (
                        <RiskBadge level={level} size="sm" showShape={false} />
                      ) : (
                        <span className="text-12 font-mono text-text-muted">No data</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
