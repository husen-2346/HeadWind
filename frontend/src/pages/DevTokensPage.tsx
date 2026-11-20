import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface TokenItem {
  label: string;
  variable: string;
  bgClass: string;
  isRisk?: boolean;
}

const CORE_COLORS: TokenItem[] = [
  { label: "Background", variable: "--color-bg", bgClass: "bg-bg" },
  { label: "Surface", variable: "--color-surface", bgClass: "bg-surface" },
  { label: "Border", variable: "--color-border", bgClass: "bg-border" },
  { label: "Text", variable: "--color-text", bgClass: "bg-text" },
  { label: "Text Muted", variable: "--color-text-muted", bgClass: "bg-text-muted" },
  { label: "Accent", variable: "--color-accent", bgClass: "bg-accent" },
];

const RISK_RAMP: TokenItem[] = [
  { label: "Low", variable: "--color-risk-low", bgClass: "bg-risk-low", isRisk: true },
  { label: "Moderate", variable: "--color-risk-moderate", bgClass: "bg-risk-moderate", isRisk: true },
  { label: "High", variable: "--color-risk-high", bgClass: "bg-risk-high", isRisk: true },
  { label: "Severe", variable: "--color-risk-severe", bgClass: "bg-risk-severe", isRisk: true },
  { label: "No Travel", variable: "--color-risk-no-travel", bgClass: "bg-risk-no-travel", isRisk: true },
];

export const DevTokensPage = () => {
  const [resolvedHex, setResolvedHex] = useState<Record<string, string>>({});
  const [gridSize, setGridSize] = useState<number>(24);
  const [lineAlpha, setLineAlpha] = useState<number>(0.06);

  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const resolved: Record<string, string> = {};
    for (const item of [...CORE_COLORS, ...RISK_RAMP]) {
      resolved[item.variable] = style.getPropertyValue(item.variable).trim();
    }
    setResolvedHex(resolved);
  }, []);

  // Update dynamic CSS variables for tuning
  const handleGridSizeChange = (val: number) => {
    setGridSize(val);
    document.documentElement.style.setProperty("--grid-size", `${val}px`);
  };

  const handleLineAlphaChange = (val: number) => {
    setLineAlpha(val);
    document.documentElement.style.setProperty(
      "--grid-line-color",
      `rgba(148, 163, 184, ${val})`
    );
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Header */}
        <div className="border-b border-border pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-badge border border-border bg-surface mb-3">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-12 font-mono text-text-muted uppercase">Dev Mode Inspection</span>
          </div>
          <h1 className="text-display-40 font-medium text-text">Design Tokens Specification</h1>
          <p className="text-16 text-text-muted mt-2">
            Single source of truth token verification. Validated against design references in docs/design.
          </p>
        </div>

        {/* 1. Core Colors */}
        <section className="space-y-4">
          <h2 className="text-20 font-medium text-text">1. Core UI Palette</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {CORE_COLORS.map((token) => (
              <div
                key={token.variable}
                className="p-4 bg-surface border border-border rounded-card space-y-3"
              >
                <div
                  className={`h-16 w-full rounded-badge border border-border ${token.bgClass}`}
                />
                <div>
                  <div className="text-14 font-medium text-text">{token.label}</div>
                  <div className="text-12 font-mono text-text-muted mt-0.5">
                    {token.variable}
                  </div>
                  <div className="text-12 font-mono text-accent font-medium mt-1 tabular-nums">
                    {resolvedHex[token.variable] || "loading..."}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Risk Ramp */}
        <section className="space-y-4">
          <div>
            <h2 className="text-20 font-medium text-text">2. Weather Risk Ramp</h2>
            <p className="text-14 text-text-muted mt-1">
              Used ONLY for weather risk data visualization. Always paired with text labels and geometric indicators.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {RISK_RAMP.map((token) => (
              <div
                key={token.variable}
                className="p-4 bg-surface border border-border rounded-card space-y-3"
              >
                <div
                  className={`h-16 w-full rounded-badge border border-border ${token.bgClass}`}
                />
                <div>
                  <div className="text-14 font-medium text-text">{token.label}</div>
                  <div className="text-12 font-mono text-text-muted mt-0.5">
                    {token.variable}
                  </div>
                  <div className="text-12 font-mono text-accent font-medium mt-1 tabular-nums">
                    {resolvedHex[token.variable] || "loading..."}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Typography Scale */}
        <section className="space-y-6">
          <h2 className="text-20 font-medium text-text">3. Typography Scale &amp; Weights (400 &amp; 500 only)</h2>
          <div className="p-6 bg-surface border border-border rounded-panel space-y-6">
            <div className="space-y-4 border-b border-border pb-6">
              <div className="text-12 font-mono text-text-muted uppercase">Geist Sans UI Scale</div>
              <div className="text-display-56 font-medium text-text">Display 56 (3.5rem / 56px) - Safe Travels</div>
              <div className="text-display-40 font-medium text-text">Display 40 (2.5rem / 40px) - Weather Routing</div>
              <div className="text-display-32 font-medium text-text">Display 32 (2rem / 32px) - Corridor Forecast</div>
              <div className="text-28 font-medium text-text">Title 28 (1.75rem / 28px) - Route Recommendation</div>
              <div className="text-20 font-medium text-text">Heading 20 (1.25rem / 20px) - Checkpoint Analysis</div>
              <div className="text-16 font-normal text-text">Body 16 (1rem / 16px) - Sustained wind threshold and load calculation</div>
              <div className="text-14 font-normal text-text-muted">Caption 14 (0.875rem / 14px) - Dallas, TX to Denver, CO alternatives</div>
              <div className="text-12 font-normal text-text-muted">Footnote 12 (0.75rem / 12px) - Forecast sampled at estimated time of arrival</div>
            </div>

            <div className="space-y-3">
              <div className="text-12 font-mono text-text-muted uppercase">Geist Mono Tabular Scale</div>
              <div className="text-28 font-mono font-medium text-text tabular-nums">
                520.4 mi &bull; 8h 15m &bull; 35,000 lb
              </div>
              <div className="text-20 font-mono font-normal text-text-muted tabular-nums">
                Lat: 32.7767, Lon: -96.7970 &bull; Wind: 38 mph &bull; Rain: 0.18 in/hr
              </div>
              <div className="text-14 font-mono font-normal text-text-muted tabular-nums">
                Checkpoint 01: 00:00:00 UTC &bull; Risk Score: 1.45 (Moderate)
              </div>
            </div>
          </div>
        </section>

        {/* 4. Interactive Component Samples */}
        <section className="space-y-6">
          <h2 className="text-20 font-medium text-text">4. Interactive Components</h2>
          <div className="p-6 bg-surface border border-border rounded-panel space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" size="md">
                Primary Cyan Button
              </Button>
              <Button variant="ghost" size="md">
                Ghost Outline Button
              </Button>
              <Button variant="primary" size="sm">
                Small Action
              </Button>
              <Button variant="ghost" size="lg">
                Large Button
              </Button>
            </div>

            <div className="max-w-md space-y-2">
              <label className="block text-12 font-mono text-text-muted uppercase">
                Input with Accent Focus Ring (Click to focus)
              </label>
              <Input placeholder="Focus ring: 2px accent (--color-accent)" />
            </div>
          </div>
        </section>

        {/* 5. Grid Background & Glow Sample Panel */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-20 font-medium text-text">5. Grid &amp; Glow Visual Test Panel</h2>
              <p className="text-14 text-text-muted mt-1">
                Faint 1px square grid with radial mask fading toward edges, and soft cyan glow.
              </p>
            </div>

            {/* Interactive Grid Tuning */}
            <div className="flex items-center gap-6 bg-surface border border-border p-3 rounded-card text-12 font-mono">
              <div className="flex items-center gap-2">
                <span className="text-text-muted">--grid-size:</span>
                <input
                  type="range"
                  min="16"
                  max="40"
                  step="2"
                  value={gridSize}
                  onChange={(e) => handleGridSizeChange(Number(e.target.value))}
                  className="w-24 accent-accent"
                />
                <span className="text-accent tabular-nums">{gridSize}px</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-muted">Line Alpha:</span>
                <input
                  type="range"
                  min="0.02"
                  max="0.20"
                  step="0.01"
                  value={lineAlpha}
                  onChange={(e) => handleLineAlphaChange(Number(e.target.value))}
                  className="w-24 accent-accent"
                />
                <span className="text-accent tabular-nums">{lineAlpha.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="relative min-h-[380px] bg-grid border border-border rounded-panel overflow-hidden p-8 flex flex-col justify-between">
            {/* Glow effect on the right side */}
            <div
              className="bg-glow w-80 h-80 right-8 top-10 rounded-full"
              aria-hidden="true"
            />

            <div className="relative z-10 max-w-lg space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-badge border border-border bg-surface text-12 font-mono text-accent">
                Hero Grid Utility (.bg-grid)
              </div>
              <h3 className="text-display-32 font-medium text-text">
                Background Grid Layer
              </h3>
              <p className="text-14 text-text-muted leading-relaxed">
                The faint square grid is rendered on a ::before pseudo-element with a radial-gradient mask
                so content remains clear and fully readable. Soft radial glow (.bg-glow) accents the map zone.
              </p>
            </div>

            <div className="relative z-10 flex items-center gap-4 pt-6">
              <div className="px-3 py-1.5 rounded-card border border-border bg-surface text-12 font-mono text-text tabular-nums">
                --grid-size: {gridSize}px
              </div>
              <div className="px-3 py-1.5 rounded-card border border-border bg-surface text-12 font-mono text-text tabular-nums">
                Line Alpha: {lineAlpha}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
