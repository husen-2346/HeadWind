/**
 * HeroSection.tsx – High-impact hero section with SVG corridor route preview.
 *
 * Implements strict design fidelity, single origin/destination pins,
 * zero severe segments on Route B ribbon, and pure SVG drawing.
 */

import { Link } from "react-router-dom";
import { ArrowRight } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { LOOM_URL } from "@/config";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-bg bg-grid pt-16 pb-20 md:pt-24 md:pb-32 border-b border-border">
      {/* Background radial cyan glow */}
      <div
        className="bg-glow absolute top-12 right-1/4 w-[500px] h-[500px] pointer-events-none rounded-full -z-0"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-badge border border-border bg-surface/80 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-11 font-mono uppercase tracking-wider text-text-muted">
                Weather-Aware Routing for Trucks
              </span>
            </div>

            <h1 className="text-display-40 sm:text-display-48 lg:text-display-56 font-bold tracking-tight text-text leading-[1.1]">
              Drive around the weather, not into it.
            </h1>

            <p className="text-16 sm:text-18 text-text-muted leading-relaxed max-w-xl">
              Compare routes by weather risk, not just travel time. We sample the
              forecast at your estimated arrival along the corridor and adjust risk
              for your cargo weight.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link to="/app">
                <Button
                  variant="primary"
                  size="lg"
                  trailingIcon={<ArrowRight className="w-4 h-4" />}
                  className="font-medium text-14 px-6 h-11"
                >
                  Plan a trip
                </Button>
              </Link>

              {LOOM_URL && (
                <a href={LOOM_URL} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="lg" className="text-14 px-5 h-11 text-text">
                    Watch walkthrough
                  </Button>
                </a>
              )}
            </div>

            {/* Mono Proof Line */}
            <div className="pt-4 border-t border-border/60">
              <p className="text-12 font-mono text-text-muted tabular-nums">
                806 mi corridor · 3 distinct routes · 49-hour forecast horizon
              </p>
            </div>
          </div>

          {/* Right Column: Framed SVG Map Preview Card */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-lg bg-surface border border-border rounded-panel p-4 md:p-6 shadow-none relative">
              {/* Header Bar */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-12 font-mono font-medium text-text">
                    Dallas, TX → Denver, CO
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-accent/15 text-accent border border-accent/30 font-semibold">
                    Route B Recommended
                  </span>
                  <span className="text-[10px] font-mono text-text-muted italic">
                    Illustrative
                  </span>
                </div>
              </div>

              {/* Pure SVG Route & Storm Preview */}
              <div className="relative w-full aspect-[4/3] bg-bg/90 rounded-card overflow-hidden border border-border/60">
                <svg
                  viewBox="0 0 400 300"
                  className="w-full h-full select-none"
                  aria-label="Map illustration comparing three routes from Dallas to Denver"
                  role="img"
                >
                  {/* Subtle Grid Lines */}
                  <defs>
                    <pattern
                      id="hero-grid"
                      width="40"
                      height="40"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 40 0 L 0 0 0 40"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.04)"
                        strokeWidth="1"
                      />
                    </pattern>

                    {/* Storm Front Gradient */}
                    <radialGradient
                      id="storm-gradient"
                      cx="50%"
                      cy="50%"
                      r="50%"
                      fx="50%"
                      fy="50%"
                    >
                      <stop offset="0%" stopColor="#D1344B" stopOpacity="0.45" />
                      <stop offset="65%" stopColor="#F28C28" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#F28C28" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  <rect width="400" height="300" fill="url(#hero-grid)" />

                  {/* Soft Storm Band (Located on Route A corridor in the Panhandle) */}
                  <ellipse
                    cx="210"
                    cy="145"
                    rx="65"
                    ry="45"
                    fill="url(#storm-gradient)"
                  />
                  <text
                    x="210"
                    y="142"
                    textAnchor="middle"
                    fill="#D1344B"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                    letterSpacing="0.05em"
                  >
                    HIGH WIND / STORM
                  </text>
                  <text
                    x="210"
                    y="154"
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.6)"
                    fontSize="7"
                    fontFamily="monospace"
                  >
                    50+ mph gust band
                  </text>

                  {/* Route A (Northern line - crosses directly through storm: severe red/orange) */}
                  <path
                    d="M 100 240 Q 150 170 205 145 T 310 70"
                    fill="none"
                    stroke="#D1344B"
                    strokeWidth="3.5"
                    strokeDasharray="4 2"
                    opacity="0.8"
                  />

                  {/* Route C (Longer southern detour) */}
                  <path
                    d="M 100 240 Q 190 230 260 170 T 310 70"
                    fill="none"
                    stroke="#8B98A5"
                    strokeWidth="2.5"
                    opacity="0.5"
                  />

                  {/* Route B (Recommended - clean cyan, safely bypasses storm, 0 Severe miles) */}
                  <path
                    d="M 100 240 Q 135 180 200 115 T 310 70"
                    fill="none"
                    stroke="#2E9CCA"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Origin Pin (Dallas: exactly ONE origin marker) */}
                  <g transform="translate(100, 240)">
                    <circle r="7" fill="#0B0F14" stroke="#2E9CCA" strokeWidth="2.5" />
                    <circle r="2.5" fill="#2E9CCA" />
                    <text
                      x="-14"
                      y="18"
                      fill="#FFFFFF"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="600"
                    >
                      Dallas (Origin)
                    </text>
                  </g>

                  {/* Destination Pin (Denver: exactly ONE destination marker) */}
                  <g transform="translate(310, 70)">
                    <circle r="7" fill="#0B0F14" stroke="#2E9CCA" strokeWidth="2.5" />
                    <circle r="2.5" fill="#2E9CCA" />
                    <text
                      x="-42"
                      y="-12"
                      fill="#FFFFFF"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="600"
                    >
                      Denver (Dest)
                    </text>
                  </g>

                  {/* Route B Badge Floating Callout */}
                  <g transform="translate(145, 125)">
                    <rect
                      x="-6"
                      y="-14"
                      width="104"
                      height="20"
                      rx="4"
                      fill="#0B0F14"
                      stroke="#2E9CCA"
                      strokeWidth="1.2"
                    />
                    <text
                      x="46"
                      y="0"
                      textAnchor="middle"
                      fill="#2E9CCA"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="600"
                    >
                      Route B: 0 Severe mi
                    </text>
                  </g>
                </svg>
              </div>

              {/* Bottom Card Summary */}
              <div className="grid grid-cols-3 gap-2 pt-3 mt-3 border-t border-border text-left">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-mono text-text-muted">Route B (Best)</div>
                  <div className="text-13 font-mono font-bold text-accent">0 mi Severe</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[11px] font-mono text-text-muted">Route A</div>
                  <div className="text-13 font-mono font-medium text-risk-severe">46 mi Severe</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[11px] font-mono text-text-muted">Travel Time</div>
                  <div className="text-13 font-mono text-text">12.9 hrs (+8 min)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
