import { useState } from "react";
import clsx from "clsx";
import { useAppStore } from "@/stores/appStore";
import { ChevronLeft, ChevronRight, Menu, Sliders } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { MapCanvas } from "@/components/map/MapCanvas";
import { RoutesLayers } from "@/components/map/RoutesLayers";
import { MapLegend } from "@/components/map/MapLegend";
import { PlannerForm } from "@/features/planner/PlannerForm";
import { RouteResults } from "@/features/routes/RouteResults";
import { RouteDetailPanel } from "@/features/routes/RouteDetailPanel";

export interface AppShellProps {
  children?: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const panelState = useAppStore((s) => s.panelState);
  const togglePanel = useAppStore((s) => s.togglePanel);
  const analysisResult = useAppStore((s) => s.analysisResult);
  const origin = useAppStore((s) => s.origin);
  const destination = useAppStore((s) => s.destination);

  const [isEditingForm, setIsEditingForm] = useState(false);

  const isCollapsed = panelState === "collapsed";
  const isDetailView = panelState === "detail";

  return (
    <div className="relative w-screen h-dvh overflow-hidden bg-bg select-none flex">
      {/* Base Map in Background */}
      <main className="absolute inset-0 z-0" aria-label="Map Canvas Area">
        <MapCanvas className="w-full h-full">
          <RoutesLayers />
          <MapLegend />
        </MapCanvas>
      </main>

      {/* Floating Left Panel (Desktop) / Bottom Sheet (Mobile) */}
      <aside
        aria-label="Trip planning and route details"
        className={clsx(
          "z-20 transition-all duration-300 ease-in-out flex flex-col",
          // Desktop styles: floating card on the left
          "md:absolute md:top-4 md:bottom-4 md:left-4 md:w-[412px]",
          // Mobile styles: bottom sheet
          "fixed bottom-0 inset-x-0 md:inset-x-auto",
          isCollapsed
            ? "md:w-14 md:h-14 md:bottom-auto max-h-14 overflow-hidden"
            : "h-[70vh] md:h-auto max-h-[calc(100dvh-2rem)]",
          "bg-surface border border-border md:rounded-panel rounded-t-panel backdrop-blur-md"
        )}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span
              className="w-2.5 h-2.5 rounded-full bg-accent shrink-0 shadow-[0_0_8px_var(--color-accent)]"
              aria-hidden="true"
            />
            {!isCollapsed && (
              <div className="flex items-baseline gap-2">
                <span className="text-16 font-medium text-text tracking-tight">
                  Headwind
                </span>
                <span className="text-12 font-mono text-text-muted">
                  Truck Route Risk
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <IconButton
              aria-label={isCollapsed ? "Expand trip planner" : "Collapse trip planner"}
              variant="ghost"
              size="sm"
              onClick={togglePanel}
              className="text-text-muted hover:text-text"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 hidden md:block" />
              ) : (
                <ChevronLeft className="w-4 h-4 hidden md:block" />
              )}
              <Menu className="w-4 h-4 md:hidden" />
            </IconButton>
          </div>
        </div>

        {/* Panel Body */}
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {children ? (
              children
            ) : isDetailView ? (
              <RouteDetailPanel />
            ) : analysisResult && !isEditingForm ? (
              <div className="space-y-4">
                {/* Trip Summary Bar with Edit button */}
                <div className="p-3 bg-bg/50 border border-border rounded-card flex items-center justify-between text-left">
                  <div className="space-y-0.5 overflow-hidden pr-2">
                    <div className="text-12 font-medium text-text truncate">
                      {origin?.label || "Origin"} → {destination?.label || "Destination"}
                    </div>
                    <div className="text-12 font-mono text-text-muted">
                      {analysisResult.request.load_lb.toLocaleString()} lb · check every {analysisResult.request.interval_miles} mi
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingForm(true)}
                    leadingIcon={<Sliders className="w-3.5 h-3.5" />}
                    className="shrink-0 text-12 h-7 px-2"
                  >
                    Edit
                  </Button>
                </div>

                <RouteResults />
              </div>
            ) : (
              <div className="space-y-3">
                {analysisResult && (
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingForm(false)}
                      className="text-12 h-7 px-2 text-text-muted"
                    >
                      Close editor
                    </Button>
                  </div>
                )}
                <PlannerForm />
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Reserved Slot for Bottom-Center Time Scrubber (Phase 6) */}
      <div
        id="forecast-scrubber-slot"
        className="pointer-events-none absolute bottom-4 inset-x-0 z-20 flex justify-center px-4"
        aria-hidden="true"
      />
    </div>
  );
}
