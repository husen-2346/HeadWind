import React from "react";
import clsx from "clsx";
import { useAppStore } from "@/stores/appStore";
import { ChevronLeft, ChevronRight, Menu, Compass } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
import { MapCanvas } from "@/components/map/MapCanvas";

export interface AppShellProps {
  children?: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const panelState = useAppStore((s) => s.panelState);
  const togglePanel = useAppStore((s) => s.togglePanel);

  const isCollapsed = panelState === "collapsed";

  return (
    <div className="relative w-screen h-dvh overflow-hidden bg-bg select-none flex">
      {/* Base Map in Background */}
      <main className="absolute inset-0 z-0" aria-label="Map Canvas Area">
        <MapCanvas className="w-full h-full" />
      </main>

      {/* Floating Left Panel (Desktop) / Bottom Sheet (Mobile) */}
      <aside
        aria-label="Trip planning and route details"
        className={clsx(
          "z-20 transition-all duration-300 ease-in-out flex flex-col",
          // Desktop styles: floating card on the left
          "md:absolute md:top-4 md:bottom-4 md:left-4 md:w-[400px]",
          // Mobile styles: bottom sheet
          "fixed bottom-0 inset-x-0 md:inset-x-auto",
          isCollapsed
            ? "md:w-14 md:h-14 md:bottom-auto max-h-14 overflow-hidden"
            : "h-[65vh] md:h-auto max-h-[calc(100dvh-2rem)]",
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
            {children || <PlannerPlaceholder />}
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

function PlannerPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-border rounded-card bg-bg/50">
      <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-accent mb-3">
        <Compass className="w-5 h-5" />
      </div>
      <h3 className="text-14 font-medium text-text">Trip Planner</h3>
      <p className="text-12 text-text-muted mt-1 max-w-xs">
        Origin, destination, cargo weight, and departure time inputs arrive in Phase 4.
      </p>
      <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-badge bg-surface border border-border text-12 font-mono text-text-muted">
        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
        Phase 3 Shell Active
      </div>
    </div>
  );
}
