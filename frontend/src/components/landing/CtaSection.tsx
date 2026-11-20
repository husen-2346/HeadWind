/**
 * CtaSection.tsx – High-conversion CTA banner with subtle contour-line SVG background.
 */

import { Link } from "react-router-dom";
import { ArrowRight, Compass } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-28 bg-surface border-b border-border text-center">
      {/* Subtle Contour-Line SVG Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-15 overflow-hidden" aria-hidden="true">
        <svg viewBox="0 0 1200 400" className="w-full h-full" preserveAspectRatio="none">
          <path
            d="M 0 350 Q 300 200 600 280 T 1200 200"
            fill="none"
            stroke="#2E9CCA"
            strokeWidth="1.5"
          />
          <path
            d="M 0 280 Q 350 120 700 220 T 1200 120"
            fill="none"
            stroke="#2E9CCA"
            strokeWidth="1.5"
          />
          <path
            d="M 0 200 Q 400 60 800 160 T 1200 40"
            fill="none"
            stroke="#2E9CCA"
            strokeWidth="1.5"
          />
          <path
            d="M 0 120 Q 450 20 900 100 T 1200 0"
            fill="none"
            stroke="#2E9CCA"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
        <h2 className="text-display-32 sm:text-display-48 font-bold tracking-tight text-text">
          See your safest route in under a minute.
        </h2>

        <p className="text-16 sm:text-18 text-text-muted max-w-2xl mx-auto leading-relaxed">
          Test your origin and destination against real Open-Meteo forecasts and
          Mapbox commercial highway corridors.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link to="/app">
            <Button
              variant="primary"
              size="lg"
              trailingIcon={<ArrowRight className="w-4 h-4" />}
              className="text-14 font-medium px-6 h-11"
            >
              Plan a trip
            </Button>
          </Link>

          <Link to="/app?demo=1">
            <Button
              variant="subtle"
              size="lg"
              leadingIcon={<Compass className="w-4 h-4" />}
              className="text-14 px-5 h-11"
            >
              Try the Dallas to Denver demo
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
