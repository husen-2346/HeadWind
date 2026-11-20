/**
 * TimeScrubber.tsx – Accessible 0–48 hour weather timeline scrubber with risk ribbon.
 *
 * Features:
 *   - 60 fps scrub performance via Zustand selector
 *   - Max risk gradient ribbon along the 49-hour corridor
 *   - Departure hour offset pin marker
 *   - Round Play/Pause button with reduced-motion awareness
 *   - WAI-ARIA slider role with keyboard navigation (Arrows 1h, PageUp/Dn 6h, Home/End)
 *   - Pointer capture for smooth mouse and touch scrub
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import clsx from "clsx";
import { useAppStore } from "@/stores/appStore";
import { useHeatmap } from "@/hooks/useHeatmap";
import { Play, Pause } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
import type { HeatmapRequest } from "@/types/api";

const RISK_COLORS: Record<number, string> = {
  0: "#2E9CCA",
  1: "#E8C547",
  2: "#F28C28",
  3: "#D1344B",
  4: "#6A1B4D",
};

export function TimeScrubber() {
  const mode = useAppStore((s) => s.mode);
  const forecastHour = useAppStore((s) => s.forecastHour);
  const setForecastHour = useAppStore((s) => s.setForecastHour);
  const analysisResult = useAppStore((s) => s.analysisResult);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const playTimerRef = useRef<number | null>(null);

  const heatmapRequest: HeatmapRequest | null = analysisResult
    ? {
        origin: analysisResult.request.origin as [number, number],
        destination: analysisResult.request.destination as [number, number],
        departure_local: analysisResult.request.departure_local,
        load_lb: analysisResult.request.load_lb,
      }
    : null;

  const { data: heatmapData, isLoading } = useHeatmap(heatmapRequest);

  // 1. Check prefers-reduced-motion safely with JSDOM fallback
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // 2. Compute MAX risk per hour across all corridor points for the risk strip
  const { riskGradient } = useMemo(() => {
    if (!heatmapData?.points || heatmapData.points.length === 0) {
      return { riskGradient: "" };
    }

    const maxRisks = new Array<number>(49).fill(-1);
    for (const pt of heatmapData.points) {
      for (let h = 0; h < 49; h++) {
        const lvl = pt.levels[h];
        if (lvl > maxRisks[h]) {
          maxRisks[h] = lvl;
        }
      }
    }

    // Build CSS linear-gradient
    const stops: string[] = [];
    const stepPct = 100 / 49;
    for (let h = 0; h < 49; h++) {
      const color = RISK_COLORS[maxRisks[h]] || "rgba(255,255,255,0.06)";
      const start = (h * stepPct).toFixed(2);
      const end = ((h + 1) * stepPct).toFixed(2);
      stops.push(`${color} ${start}% ${end}%`);
    }

    return {
      riskGradient: `linear-gradient(to right, ${stops.join(", ")})`,
    };
  }, [heatmapData]);

  // 3. Formatted Time Readout
  const { readoutTime, formattedAriaText } = useMemo(() => {
    if (!heatmapData?.meta?.start_utc) {
      return {
        readoutTime: `+${forecastHour}h`,
        formattedAriaText: `+${forecastHour} hours`,
      };
    }

    const startMs = new Date(heatmapData.meta.start_utc).getTime();
    const targetMs = startMs + forecastHour * 3600 * 1000;
    const dateObj = new Date(targetMs);

    const timeStr = dateObj.toLocaleString("en-US", {
      timeZone: heatmapData.meta.timezone || "America/Chicago",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const tzAbbr = heatmapData.meta.timezone_abbr || "UTC";
    return {
      readoutTime: `+${forecastHour}h  ${timeStr} ${tzAbbr}`,
      formattedAriaText: `+${forecastHour} hours, ${timeStr} ${tzAbbr}`,
    };
  }, [heatmapData, forecastHour]);

  // 4. Play / Pause Animation Loop
  const pausePlayback = useCallback(() => {
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (prefersReducedMotion) return; // Disallow autoplay for reduced motion
    if (isPlaying) {
      pausePlayback();
    } else {
      setIsPlaying(true);
    }
  }, [isPlaying, pausePlayback, prefersReducedMotion]);

  useEffect(() => {
    if (!isPlaying) return;

    playTimerRef.current = window.setInterval(() => {
      setForecastHour((useAppStore.getState().forecastHour + 1) % 49);
    }, 400);

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    };
  }, [isPlaying, setForecastHour]);

  // Pause when document visibility changes (tab hidden)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        pausePlayback();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [pausePlayback]);

  // 5. Pointer & Touch Dragging
  const handlePointerUpdate = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const fraction = clickX / rect.width;
      const hour = Math.round(fraction * 48);
      setForecastHour(hour);
    },
    [setForecastHour]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pausePlayback();
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointerUpdate(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    handlePointerUpdate(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if capture was already lost
    }
  };

  // 6. Keyboard Slider Control
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    pausePlayback();
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        e.preventDefault();
        setForecastHour(Math.min(48, forecastHour + 1));
        break;
      case "ArrowLeft":
      case "ArrowDown":
        e.preventDefault();
        setForecastHour(Math.max(0, forecastHour - 1));
        break;
      case "PageUp":
        e.preventDefault();
        setForecastHour(Math.min(48, forecastHour + 6));
        break;
      case "PageDown":
        e.preventDefault();
        setForecastHour(Math.max(0, forecastHour - 6));
        break;
      case "Home":
        e.preventDefault();
        setForecastHour(0);
        break;
      case "End":
        e.preventDefault();
        setForecastHour(48);
        break;
    }
  };

  if (mode !== "heatmap") return null;

  const departureOffset = heatmapData?.meta?.departure_hour_offset ?? null;
  const handlePercent = (forecastHour / 48) * 100;

  return (
    <div
      className={clsx(
        "pointer-events-auto w-[calc(100%-2rem)] max-w-xl md:max-w-2xl",
        "bg-surface border border-border rounded-panel p-3 shadow-none backdrop-blur-md",
        "select-none transition-all duration-200"
      )}
    >
      {/* Top Row: Play/Pause, Title, and Readout */}
      <div className="flex items-center justify-between pb-2.5">
        <div className="flex items-center gap-2">
          <IconButton
            variant="ghost"
            size="sm"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause timeline playback" : "Play timeline forward"}
            disabled={prefersReducedMotion || isLoading}
            className="w-8 h-8 rounded-full border border-border hover:border-accent text-text"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 text-accent" />
            ) : (
              <Play className="w-3.5 h-3.5 ml-0.5 text-text" />
            )}
          </IconButton>
          <span className="text-11 font-mono uppercase tracking-wider text-text-muted">
            Forecast Horizon
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-13 font-mono font-semibold text-text tabular-nums">
            {readoutTime}
          </span>
        </div>
      </div>

      {/* Corridor Max Risk Strip */}
      <div
        className="w-full h-1.5 rounded-full overflow-hidden mb-2 bg-surface-alt border border-border/40"
        title="Max weather risk across corridor at each hour"
        aria-hidden="true"
      >
        {riskGradient ? (
          <div className="w-full h-full" style={{ background: riskGradient }} />
        ) : (
          <div className="w-full h-full bg-border/30 animate-pulse" />
        )}
      </div>

      {/* Interactive Track & Slider */}
      <div
        ref={trackRef}
        role="slider"
        aria-label="Corridor Forecast Hour"
        aria-valuemin={0}
        aria-valuemax={48}
        aria-valuenow={forecastHour}
        aria-valuetext={formattedAriaText}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative h-6 flex items-center cursor-pointer touch-none outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
      >
        {/* Track Line */}
        <div className="w-full h-1 bg-border rounded-full relative">
          {/* Active Fill Track */}
          <div
            className="h-full bg-accent/60 rounded-full"
            style={{ width: `${handlePercent}%` }}
          />
        </div>

        {/* Departure Hour Pin Marker */}
        {departureOffset !== null && departureOffset >= 0 && departureOffset <= 48 && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none flex flex-col items-center -translate-x-1/2 z-10"
            style={{ left: `${(departureOffset / 48) * 100}%` }}
          >
            <div className="w-0.5 h-full bg-accent" />
            <span className="absolute -top-3.5 text-[9px] font-mono tracking-tight text-accent bg-surface px-1 py-0.2 rounded border border-border">
              Dep
            </span>
          </div>
        )}

        {/* Draggable Cyan Handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-accent border-2 border-surface shadow-[0_0_8px_var(--color-accent)] z-20 pointer-events-none transition-transform"
          style={{ left: `${handlePercent}%` }}
        />
      </div>

      {/* Major Hour Ticks & Labels */}
      <div className="flex justify-between items-center text-[10px] font-mono text-text-muted pt-1 px-0.5">
        <span>Now</span>
        <span>+12h</span>
        <span>+24h</span>
        <span>+36h</span>
        <span>+48h</span>
      </div>
    </div>
  );
}
