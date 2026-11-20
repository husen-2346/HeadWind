/**
 * RiskRulesSection.tsx – Interactive risk threshold rulers with real load weight escalation.
 *
 * Implements:
 *   - Wind, Rain, and Snow threshold rulers with exact assignment boundaries
 *   - Interactive load slider (0..100,000 lb, default 42,000 lb)
 *   - Strict greater-than escalation rules with ghost outlines and badges
 *   - Canonical load rules reference column
 */

import { useState } from "react";
import { RISK_LEVELS } from "@/lib/risk";
import { RiskShape } from "@/components/ui/RiskShape";
import { Wind, CloudRain, Snowflake } from "@/components/ui/icons";

export function RiskRulesSection() {
  const [cargoLoadLb, setCargoLoadLb] = useState<number>(42000);

  // Load escalation rules (strict > comparison)
  const isHighEscalatedToSevere = cargoLoadLb > 40000;
  const isSevereEscalatedToNoTravel = cargoLoadLb > 30000;

  return (
    <section
      id="risk-rules"
      className="py-20 md:py-28 bg-surface/30 border-b border-border scroll-mt-16 text-left"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-badge border border-border bg-surface">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-11 font-mono uppercase tracking-wider text-text-muted">
              Risk Rules
            </span>
          </div>

          <h2 className="text-display-32 sm:text-display-40 font-bold tracking-tight text-text">
            Five levels. Heavy loads raise them.
          </h2>

          <p className="text-16 text-text-muted leading-relaxed">
            Every checkpoint evaluates wind speed, rain rate, and snowfall. To
            protect high-profile commercial tractor-trailers from rollover and
            jackknife risks, heavy cargo dynamically escalates wind thresholds.
          </p>
        </div>

        {/* Main Grid: Threshold Rulers (Left) vs Load Escalation Simulator (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: 3 Threshold Rulers */}
          <div className="lg:col-span-7 space-y-6">
            {/* Shape Badges Header (Rendered Once) */}
            <div className="p-3 bg-surface border border-border rounded-card flex flex-wrap items-center justify-between gap-4">
              <span className="text-11 font-mono text-text-muted uppercase tracking-wider">
                Risk Glyphs
              </span>
              <div className="flex items-center gap-4">
                {Object.values(RISK_LEVELS).map((lvl) => (
                  <div key={lvl.key} className="flex items-center gap-1.5">
                    <RiskShape level={lvl.key} size="sm" />
                    <span className="text-12 font-mono font-medium text-text">
                      {lvl.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 1. Wind Speed Ruler */}
            <div className="p-4 bg-surface border border-border rounded-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-accent" />
                  <span className="text-13 font-medium text-text">Sustained Wind Speed</span>
                </div>
                <span className="text-11 font-mono text-text-muted">mph</span>
              </div>

              {/* Segmented Ruler Bar */}
              <div className="grid grid-cols-5 gap-1.5 h-10">
                {/* Low (<25) */}
                <div className="bg-risk-low/30 border border-risk-low rounded p-1 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-risk-low">LOW</span>
                  <span className="text-[11px] font-mono text-text tabular-nums">&lt; 25</span>
                </div>

                {/* Moderate (25-34) */}
                <div className="bg-risk-moderate/30 border border-risk-moderate rounded p-1 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-risk-moderate">MOD</span>
                  <span className="text-[11px] font-mono text-text tabular-nums">25–34</span>
                </div>

                {/* High (35-44) -> Escalates to Severe if >40k lb */}
                <div
                  className={`rounded p-1 flex flex-col justify-between transition-colors ${
                    isHighEscalatedToSevere
                      ? "bg-risk-severe/35 border-2 border-risk-severe shadow-[0_0_10px_rgba(209,52,75,0.3)]"
                      : "bg-risk-high/30 border border-risk-high"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        isHighEscalatedToSevere ? "text-risk-severe" : "text-risk-high"
                      }`}
                    >
                      {isHighEscalatedToSevere ? "SEVERE" : "HIGH"}
                    </span>
                    {isHighEscalatedToSevere && (
                      <span className="text-[8px] font-mono bg-risk-severe text-white px-0.5 rounded">
                        ▲ LOAD
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-text tabular-nums">35–44</span>
                </div>

                {/* Severe (45-54) -> Escalates to No Travel if >30k lb */}
                <div
                  className={`rounded p-1 flex flex-col justify-between transition-colors ${
                    isSevereEscalatedToNoTravel
                      ? "bg-risk-no-travel/40 border-2 border-risk-no-travel shadow-[0_0_10px_rgba(106,27,77,0.4)]"
                      : "bg-risk-severe/30 border border-risk-severe"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        isSevereEscalatedToNoTravel ? "text-[#E066A6]" : "text-risk-severe"
                      }`}
                    >
                      {isSevereEscalatedToNoTravel ? "NO TRAVEL" : "SEVERE"}
                    </span>
                    {isSevereEscalatedToNoTravel && (
                      <span className="text-[8px] font-mono bg-risk-no-travel text-white px-0.5 rounded">
                        ▲ LOAD
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-text tabular-nums">45–54</span>
                </div>

                {/* No Travel (>=55) */}
                <div className="bg-risk-no-travel/30 border border-risk-no-travel rounded p-1 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#E066A6]">NO TRAVEL</span>
                  <span className="text-[11px] font-mono text-text tabular-nums">≥ 55</span>
                </div>
              </div>

              {/* Load rule note under wind ruler */}
              {(isHighEscalatedToSevere || isSevereEscalatedToNoTravel) && (
                <p className="text-11 font-mono text-accent pt-1">
                  * Thresholds elevated: Cargo weight {cargoLoadLb.toLocaleString()} lb triggers
                  wind risk escalation.
                </p>
              )}
            </div>

            {/* 2. Rain Precipitation Ruler */}
            <div className="p-4 bg-surface border border-border rounded-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-accent" />
                  <span className="text-13 font-medium text-text">Rain Intensity</span>
                </div>
                <span className="text-11 font-mono text-text-muted">in/hr</span>
              </div>

              <div className="grid grid-cols-5 gap-1.5 h-10">
                <div className="bg-risk-low/30 border border-risk-low rounded p-1 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-risk-low">LOW</span>
                  <span className="text-[11px] font-mono text-text tabular-nums">&lt; 0.10</span>
                </div>
                <div className="bg-risk-moderate/30 border border-risk-moderate rounded p-1 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-risk-moderate">MOD</span>
                  <span className="text-[11px] font-mono text-text tabular-nums">0.10–0.25</span>
                </div>
                <div className="bg-risk-high/30 border border-risk-high rounded p-1 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-risk-high">HIGH</span>
                  <span className="text-[11px] font-mono text-text tabular-nums">0.25–0.50</span>
                </div>
                <div className="bg-risk-severe/30 border border-risk-severe rounded p-1 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-risk-severe">SEVERE</span>
                  <span className="text-[11px] font-mono text-text tabular-nums">0.50–1.00</span>
                </div>
                <div className="bg-risk-no-travel/30 border border-risk-no-travel rounded p-1 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#E066A6]">NO TRAVEL</span>
                  <span className="text-[11px] font-mono text-text tabular-nums">&gt; 1.00</span>
                </div>
              </div>
            </div>

            {/* 3. Snow Precipitation Ruler */}
            <div className="p-4 bg-surface border border-border rounded-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Snowflake className="w-4 h-4 text-accent" />
                  <span className="text-13 font-medium text-text">Snowfall Rate</span>
                </div>
                <span className="text-11 font-mono text-text-muted">in/hr</span>
              </div>

              <div className="grid grid-cols-5 gap-1.5 h-10">
                <div className="bg-risk-low/30 border border-risk-low rounded p-1 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-risk-low">LOW</span>
                  <span className="text-[11px] font-mono text-text tabular-nums">&lt; 0.50</span>
                </div>
                <div className="bg-risk-moderate/30 border border-risk-moderate rounded p-1 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-risk-moderate">MOD</span>
                  <span className="text-[11px] font-mono text-text tabular-nums">0.50–1.0</span>
                </div>
                <div className="bg-risk-high/30 border border-risk-high rounded p-1 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-risk-high">HIGH</span>
                  <span className="text-[11px] font-mono text-text tabular-nums">1.0–2.0</span>
                </div>
                <div className="bg-risk-severe/30 border border-risk-severe rounded p-1 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-risk-severe">SEVERE</span>
                  <span className="text-[11px] font-mono text-text tabular-nums">2.0–3.0</span>
                </div>
                <div className="bg-risk-no-travel/30 border border-risk-no-travel rounded p-1 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#E066A6]">NO TRAVEL</span>
                  <span className="text-[11px] font-mono text-text tabular-nums">&gt; 3.0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Real Load Weight Slider & Canonical Rules */}
          <div className="lg:col-span-5 bg-surface border border-border rounded-panel p-6 space-y-6">
            <div className="space-y-1">
              <span className="text-11 font-mono uppercase tracking-wider text-accent">
                Interactive Load Sensitivity
              </span>
              <h3 className="text-18 font-bold text-text">
                Test Cargo Weight Impact
              </h3>
              <p className="text-12 text-text-muted leading-relaxed">
                Drag the slider to see how gross vehicle weight escalates the wind
                risk ruler in real time.
              </p>
            </div>

            {/* Real Load Weight Slider */}
            <div className="p-4 bg-bg/50 border border-border rounded-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-12 font-medium text-text">Gross Cargo Weight</span>
                <span className="text-16 font-mono font-bold text-accent tabular-nums">
                  {cargoLoadLb.toLocaleString()} lb
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100000"
                step="1000"
                value={cargoLoadLb}
                onChange={(e) => setCargoLoadLb(parseInt(e.target.value, 10))}
                aria-label="Cargo load weight slider"
                className="w-full accent-accent cursor-pointer"
              />

              <div className="flex justify-between text-[10px] font-mono text-text-muted">
                <span>Empty (0 lb)</span>
                <span>30k lb threshold</span>
                <span>40k lb threshold</span>
                <span>Max (100k lb)</span>
              </div>
            </div>

            {/* The Three Canonical Load Rules */}
            <div className="space-y-3 pt-2 border-t border-border">
              <span className="text-11 font-mono uppercase tracking-wider text-text-muted block">
                Official Load Rules
              </span>

              <div className="space-y-2.5">
                <div className="p-3 bg-bg/40 border border-border rounded-card text-12 space-y-1">
                  <div className="font-semibold text-text">1. Severe Gale Rule</div>
                  <div className="font-mono text-risk-no-travel font-medium">≥ 55 mph wind</div>
                  <p className="text-text-muted text-11">
                    No Travel for any load. High rollover hazard for all commercial vehicles.
                  </p>
                </div>

                <div className="p-3 bg-bg/40 border border-border rounded-card text-12 space-y-1">
                  <div className="font-semibold text-text">2. Heavy Load High Wind Rule</div>
                  <div className="font-mono text-risk-no-travel font-medium">
                    45–54 mph and load &gt; 30,000 lb
                  </div>
                  <p className="text-text-muted text-11">
                    Escalates from Severe to No Travel due to lateral momentum on tractor-trailers.
                  </p>
                </div>

                <div className="p-3 bg-bg/40 border border-border rounded-card text-12 space-y-1">
                  <div className="font-semibold text-text">3. Heavy Load Gale Rule</div>
                  <div className="font-mono text-risk-severe font-medium">
                    35–44 mph and load &gt; 40,000 lb
                  </div>
                  <p className="text-text-muted text-11">
                    Escalates from High to Severe. Drivers are advised to reduce speed and seek shelter.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
