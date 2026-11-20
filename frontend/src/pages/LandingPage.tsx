import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />

      {/* Hero Section with Grid and Glow */}
      <section className="relative overflow-hidden bg-grid flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-20">
        {/* Glow positioned behind the right side */}
        <div
          className="bg-glow w-96 h-96 right-10 top-20 rounded-full"
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-5xl mx-auto w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-badge border border-border bg-surface mb-6">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-12 font-mono text-text-muted uppercase tracking-wider">
              Phase 0 Scaffold
            </span>
          </div>

          <h1 className="text-display-56 font-medium text-text tracking-tight mb-6">
            Weather-Aware Truck Routing
          </h1>

          <p className="text-20 text-text-muted font-normal max-w-2xl mb-8">
            Navigate high-risk weather corridors with precision. Multi-route sampling, load-aware risk
            thresholds, and dynamic timeline forecasts designed for commercial trucking safety.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link to="/app">
              <Button size="lg" variant="primary">
                Open Route Planner
              </Button>
            </Link>
            {import.meta.env.DEV && (
              <Link to="/dev/tokens">
                <Button size="lg" variant="ghost">
                  View Design Tokens
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Subsequent section with plain background */}
      <section className="bg-bg border-t border-border py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-display-32 font-medium text-text mb-4">
            Core Architecture Overview
          </h2>
          <p className="text-16 text-text-muted">
            Phase 0 setup complete. Proceeding to Phase 1: Pure functional weather risk models, load weight
            adjustments, and lexicographic route ranking.
          </p>
        </div>
      </section>
    </div>
  );
};
