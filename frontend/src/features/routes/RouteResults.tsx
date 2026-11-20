import { useAppStore } from "@/stores/appStore";
import { RecommendationBanner } from "@/components/routes/RecommendationBanner";
import { RouteCard } from "@/components/routes/RouteCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Compass } from "@/components/ui/icons";

export interface RouteResultsProps {
  isLoading?: boolean;
}

export function RouteResults({ isLoading = false }: RouteResultsProps) {
  const analysisResult = useAppStore((s) => s.analysisResult);

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="space-y-3 select-none">
        <Skeleton variant="rectangular" className="h-24 w-full" />
        <Skeleton variant="rectangular" className="h-36 w-full" />
        <Skeleton variant="rectangular" className="h-36 w-full" />
        <Skeleton variant="rectangular" className="h-36 w-full" />
      </div>
    );
  }

  // 2. Idle State (no analysis executed yet)
  if (!analysisResult) {
    return (
      <EmptyState
        icon={<Compass className="w-6 h-6 text-accent" />}
        title="Ready to Analyze"
        description="Enter origin, destination, cargo weight, and departure time to compare route weather risks."
        className="py-12"
      />
    );
  }

  const { summary, routes, meta } = analysisResult;

  // 3. No Routes Found
  if (!routes || routes.length === 0) {
    return (
      <EmptyState
        title="No Routes Found"
        description="Could not find drivable truck routes between the selected locations. Try selecting major highway corridors."
        className="py-12"
      />
    );
  }

  const recommendedRouteId = summary.recommended_route_id;
  const fastestDuration = Math.min(...routes.map((r) => r.duration_seconds));

  return (
    <div className="space-y-3.5 select-none text-left">
      {/* Weather Status Alerts */}
      {summary.weather_status === "unavailable" && (
        <InlineAlert
          type="warning"
          title="Weather Forecast Unavailable"
          message="Live forecast data could not be retrieved. Route options are displayed with travel times only."
        />
      )}

      {summary.weather_status === "partial" && (
        <InlineAlert
          type="info"
          title="Partial Weather Coverage"
          message="Some checkpoints along the corridor exceed available forecast horizons and are marked as unforecast."
        />
      )}

      {/* Backend warnings */}
      {summary.warnings &&
        summary.warnings.map((w, idx) => (
          <InlineAlert
            key={idx}
            type="warning"
            title={`Notice (${w.code})`}
            message={w.message}
          />
        ))}

      {/* Fewer than 3 routes notice */}
      {routes.length < 3 && !summary.warnings?.some((w) => w.code === "fewer_than_3_routes") && (
        <InlineAlert
          type="info"
          title="Route Alternatives"
          message={`Only ${routes.length} distinct corridor${routes.length === 1 ? "" : "s"} found between these locations.`}
        />
      )}

      {/* Recommendation Banner */}
      <RecommendationBanner
        recommendedRouteId={recommendedRouteId}
        headline={summary.headline}
        decidedBy={summary.decided_by}
      />

      {/* Route Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-12 font-mono text-text-muted px-0.5">
          <span>Candidate Routes ({routes.length})</span>
          <span>Click to view on map</span>
        </div>

        {routes.map((route) => (
          <RouteCard
            key={route.id}
            route={route}
            isRecommended={route.id === recommendedRouteId}
            fastestDurationSeconds={fastestDuration}
          />
        ))}
      </div>

      {/* Attribution footer */}
      <div className="pt-2 text-center text-12 text-text-muted font-mono">
        <span>{meta.data_sources.weather}</span>
      </div>
    </div>
  );
}
