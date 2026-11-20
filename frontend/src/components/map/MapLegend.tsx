import { useState } from "react";
import { useRiskRules } from "@/hooks/useRiskRules";
import { RiskShape } from "@/components/ui/RiskShape";
import { ChevronDown, ChevronUp, Layers, Compass } from "@/components/ui/icons";
import { useMap } from "./MapContext";
import { useAppStore } from "@/stores/appStore";
import { computeRoutesBounds } from "./geojson";
import type { RiskLevelName } from "@/types/api";

export function MapLegend() {
  const [isOpen, setIsOpen] = useState(true);
  const { data: riskRules } = useRiskRules();
  const { map } = useMap();
  const analysisResult = useAppStore((s) => s.analysisResult);

  const levels: { key: RiskLevelName; label: string; wind: string }[] = [
    { key: "low", label: "Low", wind: "<25 mph" },
    { key: "moderate", label: "Moderate", wind: "25–34 mph" },
    { key: "high", label: "High", wind: "35–44 mph" },
    { key: "severe", label: "Severe", wind: "45–54 mph" },
    { key: "no_travel", label: "No Travel", wind: "≥55 mph" },
  ];

  const handleFitRoutes = () => {
    if (!map || !analysisResult?.routes || analysisResult.routes.length === 0) return;
    const bounds = computeRoutesBounds(analysisResult.routes);
    if (bounds) {
      const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      map.fitBounds(
        [
          [bounds.minLon, bounds.minLat],
          [bounds.maxLon, bounds.maxLat],
        ],
        {
          padding: { top: 70, bottom: 70, left: 440, right: 70 },
          duration: isReducedMotion ? 0 : 700,
        }
      );
    }
  };

  return (
    <div className="absolute bottom-6 left-4 md:left-[432px] z-20 flex flex-col items-start gap-2 select-none pointer-events-auto">
      {/* Fit Routes floating action button */}
      {analysisResult?.routes && analysisResult.routes.length > 0 && (
        <button
          type="button"
          onClick={handleFitRoutes}
          aria-label="Fit map to all routes"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface/90 hover:bg-surface border border-border rounded-card text-12 font-mono text-text hover:text-accent shadow-none transition-colors backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Compass className="w-3.5 h-3.5 text-accent" />
          <span>Fit routes</span>
        </button>
      )}

      {/* Legend Card */}
      <div className="bg-surface/95 border border-border rounded-panel p-2.5 backdrop-blur-md text-left transition-all">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="flex items-center justify-between w-full gap-4 text-12 font-mono uppercase tracking-wider text-text-muted hover:text-text"
        >
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-accent" />
            <span>Weather Risk Legend</span>
          </span>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        {isOpen && (
          <div className="mt-2 space-y-1.5 pt-1.5 border-t border-border/60">
            {levels.map((lvl) => {
              // Read dynamic wind threshold if available from API
              const ruleVar = riskRules?.variables?.wind_mph?.thresholds;
              const rule = ruleVar?.find((t) => t.level.toLowerCase() === lvl.key);
              let windDisplay = lvl.wind;
              if (rule) {
                if (rule.upper_exclusive === null) {
                  windDisplay = `≥${rule.lower_inclusive ?? 55} mph`;
                } else {
                  windDisplay = `${rule.lower_inclusive ?? 0}–${(rule.upper_exclusive ?? 0) - 1} mph`;
                }
              }

              return (
                <div key={lvl.key} className="flex items-center justify-between gap-4 text-12 font-mono">
                  <div className="flex items-center gap-2">
                    <RiskShape level={lvl.key} size="sm" />
                    <span className="text-text">{lvl.label}</span>
                  </div>
                  <span className="text-text-muted">{windDisplay}</span>
                </div>
              );
            })}

            <div className="flex items-center justify-between gap-4 text-12 font-mono pt-1 border-t border-border/40">
              <div className="flex items-center gap-2">
                <RiskShape level="unknown" size="sm" />
                <span className="text-text-muted">Unforecast</span>
              </div>
              <span className="text-text-muted">No data</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
