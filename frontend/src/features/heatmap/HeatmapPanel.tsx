/**
 * HeatmapPanel.tsx – Left panel view when in Heatmap mode.
 *
 * Displays the current forecast hour timeline label, corridor explanation,
 * risk ramp legend, and handles loading and error states gracefully.
 */

import { useMemo } from "react";
import { useAppStore } from "@/stores/appStore";
import { useHeatmap } from "@/hooks/useHeatmap";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { RISK_LEVELS } from "@/lib/risk";
import type { HeatmapRequest } from "@/types/api";

export function HeatmapPanel() {
  const analysisResult = useAppStore((s) => s.analysisResult);
  const forecastHour = useAppStore((s) => s.forecastHour);

  const heatmapRequest: HeatmapRequest | null = analysisResult
    ? {
        origin: analysisResult.request.origin as [number, number],
        destination: analysisResult.request.destination as [number, number],
        departure_local: analysisResult.request.departure_local,
        load_lb: analysisResult.request.load_lb,
      }
    : null;

  const {
    data: heatmapData,
    isLoading,
    isError,
    error,
    refetch,
  } = useHeatmap(heatmapRequest);

  // Compute formatted forecast date/time string for current forecastHour
  const showingTime = useMemo(() => {
    if (!heatmapData?.meta?.start_utc) {
      const d = new Date();
      d.setHours(d.getHours() + forecastHour);
      return d.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }

    const startMs = new Date(heatmapData.meta.start_utc).getTime();
    const targetMs = startMs + forecastHour * 3600 * 1000;
    const dateObj = new Date(targetMs);

    const timeStr = dateObj.toLocaleString("en-US", {
      timeZone: heatmapData.meta.timezone || "America/Chicago",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return `${timeStr} ${heatmapData.meta.timezone_abbr || "UTC"}`;
  }, [heatmapData, forecastHour]);

  if (isLoading) {
    return (
      <div className="space-y-4 select-none text-left p-1">
        <div className="space-y-1.5">
          <Skeleton variant="text" className="w-36 h-5" />
          <Skeleton variant="text" className="w-52 h-4" />
        </div>
        <Skeleton variant="rectangular" className="h-28 w-full rounded-card" />
        <Skeleton variant="rectangular" className="h-32 w-full rounded-card" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3 select-none text-left">
        <InlineAlert
          type="error"
          title="Corridor Forecast Unavailable"
          message={error?.message || "Failed to load corridor weather forecast."}
        />
        <Button
          variant="subtle"
          size="sm"
          onClick={() => refetch()}
          className="text-12"
        >
          Retry corridor weather
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 select-none text-left">
      {/* Title & Timeline Subtitle */}
      <div className="space-y-1">
        <h2 className="text-16 font-semibold text-text tracking-tight">
          Weather corridor
        </h2>
        <div className="flex items-center gap-1.5 text-12 font-mono text-accent">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span>Showing: {showingTime}</span>
        </div>
        <p className="text-12 text-text-muted leading-relaxed pt-1">
          Hourly weather risk corridor across route candidates over the next 48
          hours. Use the scrubber below to inspect conditions over time.
        </p>
      </div>

      {/* Corridor Stats Card */}
      {heatmapData && (
        <div className="p-3 bg-bg/60 border border-border rounded-card flex items-center justify-between text-12 font-mono">
          <span className="text-text-muted">Grid resolution</span>
          <span className="text-text font-medium">
            {heatmapData.points.length} points · 25 mi lateral
          </span>
        </div>
      )}

      {/* Five Levels Legend with Shapes */}
      <div className="p-3.5 bg-bg/40 border border-border rounded-card space-y-2.5">
        <span className="text-11 font-mono uppercase tracking-wider text-text-muted block">
          Corridor Risk Scale
        </span>

        <div className="space-y-2">
          {Object.values(RISK_LEVELS).map((lvl) => (
            <div key={lvl.key} className="flex items-center justify-between text-12">
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-sm flex items-center justify-center shrink-0 border border-black/20"
                  style={{ backgroundColor: `var(${lvl.cssVar})` }}
                  aria-hidden="true"
                />
                <span className="font-medium text-text capitalize">
                  {lvl.label}
                </span>
              </div>
              <span className="text-11 font-mono text-text-muted">
                {lvl.key === "low"
                  ? "< 25 mph wind"
                  : lvl.key === "moderate"
                    ? "25–34 mph"
                    : lvl.key === "high"
                      ? "35–44 mph"
                      : lvl.key === "severe"
                        ? "45–54 mph / heavy load"
                        : "≥ 55 mph / severe winds"}
              </span>
            </div>
          ))}

          {/* No Data Row */}
          <div className="flex items-center justify-between text-12 pt-1 border-t border-border/50">
            <div className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-sm flex items-center justify-center shrink-0 border border-border bg-surface"
                aria-hidden="true"
              />
              <span className="font-medium text-text-muted">No data</span>
            </div>
            <span className="text-11 font-mono text-text-muted">Transparent</span>
          </div>
        </div>
      </div>
    </div>
  );
}
