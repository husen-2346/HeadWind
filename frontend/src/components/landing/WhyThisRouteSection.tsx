/**
 * WhyThisRouteSection.tsx – Transparent lexicographic recommendation breakdown.
 *
 * Demonstrates the 4-step lexicographic criteria ordering using the real Dallas-Denver fixture routes.
 */

import { CriteriaComparison } from "@/components/routes/CriteriaComparison";
import { dallasDenverFixture } from "@/mocks";

export function WhyThisRouteSection() {
  const routes = dallasDenverFixture.routes;
  const bestRouteId = dallasDenverFixture.summary.recommended_route_id || "route_b";

  return (
    <section className="py-20 md:py-28 bg-bg border-b border-border text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-badge border border-border bg-surface">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-11 font-mono uppercase tracking-wider text-text-muted">
              Why This Route
            </span>
          </div>

          <h2 className="text-display-32 sm:text-display-40 font-bold tracking-tight text-text">
            Transparent lexicographic ranking. No black-box scores.
          </h2>

          <p className="text-16 text-text-muted leading-relaxed">
            Headwind evaluates routes through strict priority ordering. Safety
            always comes first: routes with any Severe or No Travel miles are
            deprioritized before comparing high winds or travel times.
          </p>
        </div>

        {/* 4-Step Order Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-surface border border-border rounded-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-11 font-mono text-accent font-semibold">PRIORITY 1</span>
              <span className="w-2 h-2 rounded-full bg-risk-severe" />
            </div>
            <h3 className="text-14 font-bold text-text">Fewest Severe Miles</h3>
            <p className="text-12 text-text-muted">
              First filter out extreme hazard miles (≥45 mph winds, heavy rain, or blizzards).
            </p>
          </div>

          <div className="p-4 bg-surface border border-border rounded-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-11 font-mono text-accent font-semibold">PRIORITY 2</span>
              <span className="w-2 h-2 rounded-full bg-risk-high" />
            </div>
            <h3 className="text-14 font-bold text-text">Fewest High Miles</h3>
            <p className="text-12 text-text-muted">
              Next break ties by avoiding sustained 35–44 mph winds and moderate storm fronts.
            </p>
          </div>

          <div className="p-4 bg-surface border border-border rounded-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-11 font-mono text-accent font-semibold">PRIORITY 3</span>
              <span className="w-2 h-2 rounded-full bg-risk-moderate" />
            </div>
            <h3 className="text-14 font-bold text-text">Lowest Average Risk</h3>
            <p className="text-12 text-text-muted">
              Compare aggregate route exposure across all sampled checkpoints.
            </p>
          </div>

          <div className="p-4 bg-surface border border-border rounded-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-11 font-mono text-accent font-semibold">PRIORITY 4</span>
              <span className="w-2 h-2 rounded-full bg-accent" />
            </div>
            <h3 className="text-14 font-bold text-text">Shortest Travel Time</h3>
            <p className="text-12 text-text-muted">
              When risk is tied, pick the fastest path to maximize fleet productivity.
            </p>
          </div>
        </div>

        {/* Live Criteria Comparison Component */}
        <div className="bg-surface border border-border rounded-panel p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <span className="text-13 font-mono font-medium text-text">
              Worked Example: Dallas, TX to Denver, CO
            </span>
            <span className="text-12 font-mono text-accent">
              Decided by: Fewest High Risk miles
            </span>
          </div>

          <CriteriaComparison
            routes={routes}
            recommendation={{
              best_route_id: bestRouteId,
              ranked_route_ids: ["route_b", "route_c", "route_a"],
              decided_by: dallasDenverFixture.summary.decided_by || "high_miles",
              comparisons: [],
              headline: dallasDenverFixture.summary.headline,
            }}
          />
        </div>
      </div>
    </section>
  );
}
