import { useState } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronUp, CheckCircle, Info } from "@/components/ui/icons";
import { Pill } from "@/components/ui/Pill";
import { formatDecidedBy, formatComparison } from "@/lib/labels";
import type { RouteComparison } from "@/types/api";

export interface RecommendationBannerProps {
  recommendedRouteId: string | null;
  headline: string | null;
  decidedBy: string | null;
  comparisons?: RouteComparison[];
  className?: string;
}

export function RecommendationBanner({
  recommendedRouteId,
  headline,
  decidedBy,
  comparisons = [],
  className,
}: RecommendationBannerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!recommendedRouteId || !headline) {
    return (
      <div className={clsx("p-3 bg-surface border border-border rounded-card text-12 text-text-muted flex items-center gap-2", className)}>
        <Info className="w-4 h-4 text-text-muted shrink-0" />
        <span>Recommendation unavailable without weather data.</span>
      </div>
    );
  }

  const decidedLabel = formatDecidedBy(decidedBy);

  return (
    <div
      className={clsx(
        "bg-surface border border-accent/40 rounded-card p-3.5 space-y-2 select-none text-left transition-colors",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-accent shrink-0" />
            <span className="text-12 font-mono uppercase tracking-wider text-accent font-medium">
              Recommendation
            </span>
            <Pill variant="accent" size="sm">
              Route {recommendedRouteId}
            </Pill>
          </div>
          <p className="text-14 font-medium text-text leading-snug">
            {headline}
          </p>
        </div>
      </div>

      {/* "How we decided" disclosure */}
      <div className="border-t border-border/60 pt-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="flex items-center justify-between w-full text-12 text-text-muted hover:text-text font-mono transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
        >
          <span className="flex items-center gap-1.5">
            <span>Primary Factor:</span>
            <span className="text-text font-medium">{decidedLabel}</span>
          </span>
          <span className="flex items-center gap-1 text-12 text-accent">
            <span>{isOpen ? "Hide logic" : "How we decided"}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {isOpen && (
          <div className="mt-2 text-12 text-text-muted space-y-1.5 font-sans bg-bg/50 p-2.5 rounded border border-border/50">
            <p className="text-12 text-text-muted">
              Routes are ranked by: <span className="font-mono text-text">1) Fewest No-Travel mi</span>,{" "}
              <span className="font-mono text-text">2) Fewest Severe mi</span>,{" "}
              <span className="font-mono text-text">3) Fewest High mi</span>,{" "}
              <span className="font-mono text-text">4) Lowest average risk</span>,{" "}
              <span className="font-mono text-text">5) Shortest travel time</span>.
            </p>

            {comparisons.length > 0 && (
              <ul className="space-y-1 pt-1 list-disc list-inside font-mono text-12 text-text">
                {comparisons.map((c, i) => (
                  <li key={i}>{formatComparison(c, recommendedRouteId)}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
