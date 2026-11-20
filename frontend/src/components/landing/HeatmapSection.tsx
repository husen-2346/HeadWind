/**
 * HeatmapSection.tsx – Lightweight SVG preview of the corridor heatmap and scrubber.
 *
 * Demonstrates the 0–48 hour weather horizon without loading Mapbox GL.
 */

import { RISK_LEVELS } from "@/lib/risk";

export function HeatmapSection() {
  return (
    <section
      id="heatmap"
      className="py-20 md:py-28 bg-bg border-b border-border scroll-mt-16 text-left"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-badge border border-border bg-surface">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-11 font-mono uppercase tracking-wider text-text-muted">
              Corridor Heatmap
            </span>
          </div>

          <h2 className="text-display-32 sm:text-display-40 font-bold tracking-tight text-text">
            See the whole corridor, hour by hour.
          </h2>

          <p className="text-16 text-text-muted leading-relaxed">
            Switch between routing decisions and a wide-angle corridor weather
            heatmap. Track atmospheric fronts up to 48 hours in advance, scrub
            the timeline with precision, and identify optimal departure windows.
          </p>
        </div>

        {/* Lightweight SVG Heatmap & Scrubber Card */}
        <div className="bg-surface border border-border rounded-panel p-4 md:p-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <span className="text-13 font-mono font-medium text-text">
              Corridor Weather Heatmap Preview
            </span>
            <span className="text-11 font-mono text-accent">
              Showing: Tue, 14:00 CST (+8h)
            </span>
          </div>

          {/* SVG Heatmap Visualization */}
          <div className="relative w-full aspect-[21/9] bg-bg rounded-card overflow-hidden border border-border/60">
            <svg
              viewBox="0 0 840 360"
              className="w-full h-full select-none"
              aria-label="Corridor heatmap showing weather risk circles along highway corridors"
              role="img"
            >
              <defs>
                <pattern
                  id="heatmap-grid"
                  width="30"
                  height="30"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 30 0 L 0 0 0 30"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.03)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="840" height="360" fill="url(#heatmap-grid)" />

              {/* Highway Route Lines in Background */}
              <path
                d="M 120 280 C 220 240, 360 210, 480 150 S 680 110, 720 90"
                fill="none"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="2.5"
              />
              <path
                d="M 120 280 C 260 260, 400 230, 520 180 S 690 130, 720 90"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1.8"
                strokeDasharray="4 2"
              />

              {/* Weather Corridor Circle Cluster */}
              {[
                { cx: 150, cy: 270, r: 24, fill: "rgba(46, 156, 202, 0.45)" },
                { cx: 190, cy: 260, r: 26, fill: "rgba(46, 156, 202, 0.45)" },
                { cx: 230, cy: 245, r: 28, fill: "#E8C547", opacity: 0.7 },
                { cx: 270, cy: 235, r: 30, fill: "#E8C547", opacity: 0.7 },
                { cx: 310, cy: 225, r: 32, fill: "#F28C28", opacity: 0.75 },
                { cx: 350, cy: 210, r: 34, fill: "#D1344B", opacity: 0.8 },
                { cx: 390, cy: 195, r: 36, fill: "#D1344B", opacity: 0.85 },
                { cx: 430, cy: 180, r: 35, fill: "#6A1B4D", opacity: 0.85 },
                { cx: 470, cy: 165, r: 34, fill: "#D1344B", opacity: 0.8 },
                { cx: 510, cy: 150, r: 32, fill: "#F28C28", opacity: 0.75 },
                { cx: 550, cy: 135, r: 30, fill: "#E8C547", opacity: 0.7 },
                { cx: 590, cy: 125, r: 28, fill: "rgba(46, 156, 202, 0.45)" },
                { cx: 630, cy: 110, r: 26, fill: "rgba(46, 156, 202, 0.45)" },
                { cx: 670, cy: 100, r: 24, fill: "rgba(46, 156, 202, 0.45)" },
                { cx: 710, cy: 90, r: 22, fill: "rgba(46, 156, 202, 0.45)" },
              ].map((c, i) => (
                <circle
                  key={`wx-${i}`}
                  cx={c.cx}
                  cy={c.cy}
                  r={c.r}
                  fill={c.fill}
                  opacity={c.opacity || 0.6}
                  filter="blur(1.5px)"
                />
              ))}

              {/* Lateral Corridor Spreads */}
              {[
                { cx: 370, cy: 160, r: 28, fill: "#D1344B", opacity: 0.65 },
                { cx: 410, cy: 230, r: 28, fill: "#F28C28", opacity: 0.65 },
                { cx: 450, cy: 140, r: 30, fill: "#D1344B", opacity: 0.7 },
                { cx: 470, cy: 215, r: 26, fill: "#E8C547", opacity: 0.6 },
              ].map((c, i) => (
                <circle
                  key={`wx-lat-${i}`}
                  cx={c.cx}
                  cy={c.cy}
                  r={c.r}
                  fill={c.fill}
                  opacity={c.opacity}
                  filter="blur(2px)"
                />
              ))}

              {/* Origin and Destination Markers */}
              <circle cx="120" cy="280" r="5" fill="#2E9CCA" stroke="#FFFFFF" strokeWidth="2" />
              <text x="120" y="302" fill="#FFFFFF" fontSize="11" textAnchor="middle" fontFamily="monospace">
                Dallas
              </text>
              <circle cx="720" cy="90" r="5" fill="#2E9CCA" stroke="#FFFFFF" strokeWidth="2" />
              <text x="720" y="75" fill="#FFFFFF" fontSize="11" textAnchor="middle" fontFamily="monospace">
                Denver
              </text>
            </svg>
          </div>

          {/* Scrubber Preview Bar */}
          <div className="bg-bg/60 border border-border rounded-panel p-3.5 space-y-2">
            <div className="flex items-center justify-between text-11 font-mono text-text-muted">
              <span>0h (Now)</span>
              <span className="text-accent font-semibold">+8h (Showing)</span>
              <span>+48h</span>
            </div>

            {/* Gradient Risk Strip Preview */}
            <div
              className="h-1.5 w-full rounded-full"
              style={{
                background:
                  "linear-gradient(to right, #2E9CCA 0%, #2E9CCA 25%, #E8C547 35%, #F28C28 45%, #D1344B 58%, #6A1B4D 66%, #E8C547 80%, #2E9CCA 100%)",
              }}
            />

            {/* Simulated Slider Track with Cyan Handle */}
            <div className="relative h-4 flex items-center">
              <div className="w-full h-1 bg-border rounded-full" />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-accent border-2 border-surface shadow-[0_0_8px_var(--color-accent)]"
                style={{ left: `${(8 / 48) * 100}%` }}
              />
            </div>
          </div>

          {/* 5-Level Legend Preview */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2">
            {Object.values(RISK_LEVELS).map((lvl) => (
              <div key={lvl.key} className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-sm flex items-center justify-center border border-black/20"
                  style={{ backgroundColor: `var(${lvl.cssVar})` }}
                  aria-hidden="true"
                />
                <span className="text-12 font-medium text-text capitalize">
                  {lvl.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
