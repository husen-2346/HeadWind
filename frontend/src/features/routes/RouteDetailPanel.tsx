import { useAppStore } from "@/stores/appStore";
import { Pill } from "@/components/ui/Pill";
import { Stat } from "@/components/ui/Stat";
import { ChevronLeft } from "@/components/ui/icons";
import { CriteriaComparison } from "@/components/routes/CriteriaComparison";
import { CheckpointTable } from "./CheckpointTable";
import { formatMiles, formatDuration } from "@/lib/format";

export function RouteDetailPanel() {
  const selectedRouteId = useAppStore((s) => s.selectedRouteId);
  const analysisResult = useAppStore((s) => s.analysisResult);
  const setPanelState = useAppStore((s) => s.setPanelState);

  const routes = analysisResult?.routes || [];
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0] || null;
  const isRecommended = selectedRoute?.id === analysisResult?.summary.recommended_route_id;

  if (!selectedRoute) {
    return (
      <div className="p-4 text-center text-text-muted">
        <span>No route selected.</span>
      </div>
    );
  }

  const avgRiskDisplay =
    selectedRoute.summary.avg_risk !== null
      ? `${selectedRoute.summary.avg_risk.toFixed(2)} / 4`
      : "—";

  return (
    <div className="space-y-4 text-left select-none">
      {/* Detail Header */}
      <div className="space-y-3 pb-3 border-b border-border/60">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPanelState("open")}
            aria-label="Back to routes list"
            className="flex items-center gap-1.5 text-12 font-mono text-text-muted hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded p-1 -ml-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>All Routes</span>
          </button>

          {isRecommended && <Pill variant="accent" size="sm">Recommended</Pill>}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="w-6 h-6 rounded bg-accent text-bg font-mono font-medium flex items-center justify-center text-12 shrink-0">
            {selectedRoute.id}
          </span>
          <h3 className="text-16 font-medium text-text">
            {selectedRoute.name || `Route ${selectedRoute.id}`}
          </h3>
        </div>

        {/* 3 Top Stat items */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/40">
          <Stat label="Distance" value={formatMiles(selectedRoute.distance_miles)} />
          <Stat label="Duration" value={formatDuration(selectedRoute.duration_seconds)} />
          <Stat label="Avg Risk" value={avgRiskDisplay} />
        </div>
      </div>

      {/* Why This Route (Criteria comparison) */}
      <CriteriaComparison
        routes={routes}
        recommendation={
          analysisResult
            ? {
                best_route_id: analysisResult.summary.recommended_route_id || routes[0].id,
                ranked_route_ids: routes.map((r) => r.id),
                decided_by: analysisResult.summary.decided_by || "avg_risk",
                comparisons: [],
                headline: analysisResult.summary.headline,
              }
            : null
        }
      />

      {/* Checkpoint Table */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-12 font-medium uppercase tracking-wider text-text-muted">
            Weather Checkpoints ({selectedRoute.checkpoints.length})
          </span>
          <span className="text-12 font-mono text-text-muted">Click row to center map</span>
        </div>

        <CheckpointTable
          checkpoints={selectedRoute.checkpoints}
          tripTimezone={analysisResult?.request.origin_timezone || "UTC"}
        />
      </div>
    </div>
  );
}
