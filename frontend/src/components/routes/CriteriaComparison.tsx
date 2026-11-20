import clsx from "clsx";
import { buildCriteriaRows } from "@/features/routes/criteria";
import type { RouteOption, Recommendation } from "@/types/api";

export interface CriteriaComparisonProps {
  routes: RouteOption[];
  recommendation: Recommendation | null;
  className?: string;
}

export function CriteriaComparison({
  routes,
  recommendation,
  className,
}: CriteriaComparisonProps) {
  const { rows, caption, note } = buildCriteriaRows(routes, recommendation);

  return (
    <div className={clsx("p-3.5 bg-surface border border-border rounded-card space-y-3 text-left select-none", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-12 font-medium uppercase tracking-wider text-text-muted">
          Why This Route Was Recommended
        </h4>
        <span className="text-12 font-mono text-text-muted">Lexicographic Rank</span>
      </div>

      <div className="space-y-3 pt-1">
        {rows.map((row) => (
          <div key={row.key} className="space-y-1">
            <div className="flex items-center justify-between text-12 font-mono">
              <span className="text-text-muted flex items-center gap-1.5">
                <span>{row.label}</span>
                {row.isDecidedHere && (
                  <span className="text-12 text-accent bg-accent/15 px-1.5 py-0.2 rounded border border-accent/40 font-sans font-medium">
                    Decided here
                  </span>
                )}
              </span>
            </div>

            {/* Horizontal bars per route */}
            <div className="space-y-1">
              {row.routes.map((rb) => (
                <div key={rb.routeId} className="flex items-center gap-2 text-12 font-mono">
                  <span
                    className={clsx(
                      "w-4 shrink-0 text-center font-medium",
                      rb.isBest ? "text-accent" : rb.isFaded ? "text-text-muted/40" : "text-text-muted"
                    )}
                  >
                    {rb.routeId}
                  </span>

                  <div className="flex-1 h-2 bg-border/40 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${rb.percentage}%` }}
                      className={clsx(
                        "h-full rounded-full transition-all duration-300",
                        rb.isBest
                          ? "bg-accent"
                          : rb.isFaded
                            ? "bg-text-muted/20"
                            : "bg-text-muted/60"
                      )}
                    />
                  </div>

                  <span
                    className={clsx(
                      "w-20 text-right tabular-nums",
                      rb.isBest
                        ? "text-text font-medium"
                        : rb.isFaded
                          ? "text-text-muted/40"
                          : "text-text-muted"
                    )}
                  >
                    {rb.displayValue}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {note && (
        <div className="p-2 bg-bg/50 border border-border/60 rounded text-12 text-text-muted font-sans">
          {note}
        </div>
      )}

      <div className="pt-1 border-t border-border/50 text-12 text-text-muted font-sans">
        {caption}
      </div>
    </div>
  );
}
