/**
 * LandingFooter.tsx – Accessible footer with attribution links and planning disclaimer.
 */

import { Link } from "react-router-dom";
import { REPO_URL } from "@/config";

export function LandingFooter() {
  return (
    <footer className="bg-bg border-t border-border py-16 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand Info (Cols 1-2) */}
          <div className="md:col-span-2 space-y-4">
            <Link
              to="/"
              className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm w-fit"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
              <span className="text-18 font-bold tracking-tight text-text">
                HEADWIND
              </span>
            </Link>

            <p className="text-13 text-text-muted leading-relaxed max-w-sm">
              Weather-aware commercial truck routing balancing weather risk,
              cargo load weight, and travel time.
            </p>
          </div>

          {/* Column 1: PRODUCT */}
          <div className="space-y-3">
            <h4 className="text-11 font-mono uppercase tracking-wider text-text font-semibold">
              Product
            </h4>
            <ul className="space-y-2 text-13 font-mono">
              <li>
                <a
                  href="#how-it-works"
                  className="text-text-muted hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
                >
                  How it works
                </a>
              </li>
              <li>
                <a
                  href="#risk-rules"
                  className="text-text-muted hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
                >
                  Risk rules
                </a>
              </li>
              <li>
                <a
                  href="#heatmap"
                  className="text-text-muted hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
                >
                  Corridor heatmap
                </a>
              </li>
              <li>
                <Link
                  to="/app"
                  className="text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
                >
                  Launch app
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: PROJECT */}
          <div className="space-y-3">
            <h4 className="text-11 font-mono uppercase tracking-wider text-text font-semibold">
              Project
            </h4>
            <ul className="space-y-2 text-13 font-mono">
              <li>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <Link
                  to="/app?demo=1"
                  className="text-text-muted hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
                >
                  Dallas-Denver Demo
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: DATA ATTRIBUTION */}
          <div className="space-y-3">
            <h4 className="text-11 font-mono uppercase tracking-wider text-text font-semibold">
              Data &amp; APIs
            </h4>
            <ul className="space-y-2 text-13 font-mono">
              <li>
                <a
                  href="https://open-meteo.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
                >
                  Open-Meteo (CC BY 4.0)
                </a>
              </li>
              <li>
                <a
                  href="https://www.mapbox.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
                >
                  Mapbox Directions v5
                </a>
              </li>
              <li>
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
                >
                  © OpenStreetMap
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-12 text-text-muted">
          <div className="font-mono">
            Built by <span className="text-text font-medium">Husen H. F.</span>
          </div>

          <p className="max-w-xl text-11 leading-relaxed text-text-muted">
            Headwind is a trip planning aid and advisory system. Commercial
            drivers remain fully responsible for vehicle operation, cargo
            securement, and compliance with weather regulations and road closures.
          </p>
        </div>
      </div>
    </footer>
  );
}
