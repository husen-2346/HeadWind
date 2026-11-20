import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export const AppPage = () => {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-display-40 font-medium text-text tracking-tight">
              Route Planner
            </h1>
            <p className="text-16 text-text-muted mt-1">
              Configure origin, destination, cargo load, and departure time to evaluate route risks.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-badge border border-border bg-surface text-12 font-mono text-text-muted">
            <span className="w-2 h-2 rounded-full bg-accent" />
            Backend API: /api/health
          </div>
        </div>

        {/* Planner Shell Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-6 bg-surface border border-border rounded-panel space-y-4">
            <h2 className="text-20 font-medium text-text">Trip Parameters</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-12 text-text-muted font-mono uppercase mb-1">
                  Origin
                </label>
                <Input placeholder="Dallas, TX" disabled />
              </div>
              <div>
                <label className="block text-12 text-text-muted font-mono uppercase mb-1">
                  Destination
                </label>
                <Input placeholder="Denver, CO" disabled />
              </div>
              <div>
                <label className="block text-12 text-text-muted font-mono uppercase mb-1">
                  Load Weight (lb)
                </label>
                <Input placeholder="35,000" disabled />
              </div>
            </div>
            <Button variant="primary" className="w-full mt-4" disabled>
              Calculate Routes (Phase 4)
            </Button>
          </div>

          <div className="lg:col-span-2 min-h-[400px] p-6 bg-surface border border-border rounded-panel flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full border border-border bg-bg flex items-center justify-center mb-4 text-accent font-mono text-20">
              M
            </div>
            <h3 className="text-20 font-medium text-text mb-2">Mapbox Container</h3>
            <p className="text-14 text-text-muted max-w-md">
              Interactive Mapbox GL JS map viewport with route polylines, weather checkpoints, and risk
              overlays will be integrated in Phase 3 &amp; 4.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
