import { useState } from "react";
import {
  Button,
  IconButton,
  Input,
  SegmentedControl,
  RiskShape,
  RiskBadge,
  Pill,
  Card,
  Panel,
  Divider,
  Skeleton,
  ProgressBar,
  Stat,
  Num,
  InlineAlert,
  EmptyState,
  useToast,
  ToastProvider,
  ArrowRight,
  Search,
  Sliders,
  Layers,
  Wind,
} from "@/components/ui";
import { formatMiles, formatDuration, formatLoad, formatMph, formatEta, formatDelta } from "@/lib/format";
import { RISK_ORDER } from "@/lib/risk";
import type { RiskLevelName } from "@/types/api";

function DevGallery() {
  const { toast } = useToast();
  const [selectedInterval, setSelectedInterval] = useState<number>(25);
  const [activeCard, setActiveCard] = useState<number>(1);
  const [inputValue, setInputValue] = useState("");
  const [hasError, setHasError] = useState(false);

  const sampleSegments = [
    { level: "low" as RiskLevelName, miles: 540, label: "Low Risk" },
    { level: "moderate" as RiskLevelName, miles: 180, label: "Moderate Risk" },
    { level: "high" as RiskLevelName, miles: 60, label: "High Risk" },
    { level: "severe" as RiskLevelName, miles: 26, label: "Severe Risk" },
  ];

  return (
    <div className="min-h-screen bg-grid p-6 sm:p-10 max-w-7xl mx-auto space-y-12">
      <header className="border-b border-border pb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            <h1 className="text-display-32 font-medium tracking-tight text-text">
              Component Design System Gallery
            </h1>
          </div>
          <p className="text-14 text-text-muted mt-1">
            Headwind UI tokens, accessible primitives, risk visualizations, and tabular figures.
          </p>
        </div>
        <Pill variant="accent">Phase 3 Shell</Pill>
      </header>

      {/* 1. Risk Shapes & Badges */}
      <section className="space-y-4">
        <h2 className="text-20 font-medium text-text">1. Risk Visualizations (Weather Only)</h2>
        <p className="text-12 text-text-muted">
          Per AGENTS.md rule 2: Risk colors must ONLY be used for weather data and ALWAYS paired with a geometric shape or text label.
        </p>
        <div className="flex flex-wrap gap-4 items-center p-4 bg-surface border border-border rounded-panel">
          {RISK_ORDER.map((level) => (
            <div key={level} className="flex items-center gap-2">
              <RiskShape level={level} size="md" />
              <RiskBadge level={level} size="md" />
            </div>
          ))}
          <div className="flex items-center gap-2">
            <RiskShape level="unknown" size="md" />
            <RiskBadge level="unknown" size="md" />
          </div>
          <div className="flex items-center gap-2">
            <RiskBadge level="severe" escalated size="md" />
          </div>
          <div className="flex items-center gap-2">
            <RiskBadge level="no_travel" escalated size="sm" />
          </div>
        </div>
      </section>

      {/* 2. Buttons & Icon Buttons */}
      <section className="space-y-4">
        <h2 className="text-20 font-medium text-text">2. Buttons & Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-surface border border-border rounded-panel">
          <div className="space-y-3">
            <h3 className="text-12 uppercase font-medium text-text-muted">Variants & Sizes</h3>
            <div className="flex flex-wrap gap-2 items-center">
              <Button variant="primary" size="sm">Primary SM</Button>
              <Button variant="primary" size="md">Primary MD</Button>
              <Button variant="primary" size="lg">Primary LG</Button>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button variant="ghost" size="md" leadingIcon={<Search className="w-4 h-4" />}>
                Ghost with Icon
              </Button>
              <Button variant="subtle" size="md" trailingIcon={<ArrowRight className="w-4 h-4" />}>
                Subtle Action
              </Button>
              <Button variant="primary" size="md" loading>
                Loading
              </Button>
              <Button variant="ghost" size="md" disabled>
                Disabled
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-12 uppercase font-medium text-text-muted">Icon Buttons</h3>
            <div className="flex flex-wrap gap-3 items-center">
              <IconButton aria-label="Settings" variant="primary" size="md">
                <Sliders className="w-4 h-4" />
              </IconButton>
              <IconButton aria-label="Layers" variant="ghost" size="md">
                <Layers className="w-4 h-4" />
              </IconButton>
              <IconButton aria-label="Wind" variant="subtle" size="md">
                <Wind className="w-4 h-4" />
              </IconButton>
              <IconButton aria-label="Search disabled" variant="ghost" size="sm" disabled>
                <Search className="w-3.5 h-3.5" />
              </IconButton>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Inputs & Controls */}
      <section className="space-y-4">
        <h2 className="text-20 font-medium text-text">3. Form Controls & Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-surface border border-border rounded-panel">
          <Input
            label="Origin Location"
            placeholder="e.g. Dallas, TX"
            leadingIcon={<Search className="w-4 h-4" />}
            hint="Enter city or coordinates"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />

          <Input
            label="Cargo Weight"
            placeholder="42,000"
            monoSuffix="lb"
            error={hasError ? "Load exceeds maximum rating" : undefined}
            value="45,000"
            onChange={() => {}}
          />

          <div className="space-y-1.5 text-left">
            <label className="text-12 font-medium text-text-muted uppercase tracking-wider">
              Sampling Interval
            </label>
            <div>
              <SegmentedControl
                name="sampling-interval"
                value={selectedInterval}
                onChange={(val) => setSelectedInterval(val)}
                options={[
                  { value: 10, label: "10 mi" },
                  { value: 25, label: "25 mi" },
                  { value: 50, label: "50 mi" },
                ]}
              />
            </div>
            <span className="text-12 text-text-muted block">Selected: {selectedInterval} miles</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setHasError(!hasError)}>
            Toggle Input Error State
          </Button>
        </div>
      </section>

      {/* 4. Numerals & Metric Formatting */}
      <section className="space-y-4">
        <h2 className="text-20 font-medium text-text">4. Tabular Numerals & Metric Formatters</h2>
        <p className="text-12 text-text-muted">
          All numbers rendered in Geist Mono (`font-mono tabular-nums`).
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-surface border border-border rounded-panel">
          <Stat label="Total Distance" value={formatMiles(806.4)} />
          <Stat label="Trip Duration" value={formatDuration(45864)} delta={formatDelta(2520)} />
          <Stat label="Cargo Load" value={formatLoad(42000)} />
          <Stat label="Peak Wind" value={formatMph(39.4)} />
          <Stat label="Destination ETA" value={formatEta("2026-11-20T21:44:00Z", "America/Chicago")} />
          <div className="flex flex-col text-left">
            <span className="text-12 font-medium uppercase tracking-wider text-text-muted">
              Inline Tabular
            </span>
            <span className="text-16 font-sans text-text mt-1">
              ETA: <Num>14:32 CST</Num> · Mile <Num>450.2</Num>
            </span>
          </div>
        </div>
      </section>

      {/* 5. Progress Bars & Segments */}
      <section className="space-y-4">
        <h2 className="text-20 font-medium text-text">5. Route Risk Meter & Progress</h2>
        <div className="p-4 bg-surface border border-border rounded-panel space-y-4">
          <div>
            <div className="flex justify-between text-12 text-text-muted mb-2 font-mono">
              <span>Risk Distribution along Route 1 (806 mi)</span>
              <span>100% evaluated</span>
            </div>
            <ProgressBar segments={sampleSegments} />
          </div>
          <div className="flex flex-wrap gap-4 text-12 font-mono text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <RiskShape level="low" size="sm" /> 540 mi Low
            </span>
            <span className="inline-flex items-center gap-1.5">
              <RiskShape level="moderate" size="sm" /> 180 mi Mod
            </span>
            <span className="inline-flex items-center gap-1.5">
              <RiskShape level="high" size="sm" /> 60 mi High
            </span>
            <span className="inline-flex items-center gap-1.5">
              <RiskShape level="severe" size="sm" /> 26 mi Severe
            </span>
          </div>
          <Divider />
          <div>
            <div className="text-12 text-text-muted mb-1 font-mono">Single Task Progress (70%)</div>
            <ProgressBar value={70} max={100} />
          </div>
        </div>
      </section>

      {/* 6. Cards, Panels, & Surfaces */}
      <section className="space-y-4">
        <h2 className="text-20 font-medium text-text">6. Cards, Panels & Status Pills</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            interactive
            selected={activeCard === 1}
            onClick={() => setActiveCard(1)}
            className="flex flex-col justify-between h-44"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-14 font-medium text-text">Route 1 (US-287 N)</span>
                <Pill variant="accent" size="sm">Recommended</Pill>
              </div>
              <p className="text-12 text-text-muted mt-1">Fewest Severe miles across corridor</p>
            </div>
            <div className="flex items-baseline justify-between border-t border-border/60 pt-2">
              <Stat label="Travel Time" value="12h 44m" />
              <RiskBadge level="moderate" size="sm" />
            </div>
          </Card>

          <Card
            interactive
            selected={activeCard === 2}
            onClick={() => setActiveCard(2)}
            className="flex flex-col justify-between h-44"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-14 font-medium text-text">Route 2 (I-35 N / I-70 W)</span>
                <Pill variant="subtle" size="sm">Fastest</Pill>
              </div>
              <p className="text-12 text-text-muted mt-1">Shortest travel time, high wind corridor</p>
            </div>
            <div className="flex items-baseline justify-between border-t border-border/60 pt-2">
              <Stat label="Travel Time" value="12h 08m" />
              <RiskBadge level="high" size="sm" />
            </div>
          </Card>

          <Panel
            header={<span className="text-14 font-medium text-text">Panel Container</span>}
            footer={<span className="text-12 text-text-muted font-mono">Footer slot</span>}
            className="h-44"
          >
            <p className="text-12 text-text-muted">
              Standard panel layout with scrollable content and border dividers.
            </p>
          </Panel>
        </div>
      </section>

      {/* 7. Alerts, Empty States & Toasts */}
      <section className="space-y-4">
        <h2 className="text-20 font-medium text-text">7. Feedback & Alerts</h2>
        <div className="space-y-3">
          <InlineAlert
            type="info"
            title="Sampling Active"
            message="Weather sampled every 25 miles using estimated truck arrival times."
          />
          <InlineAlert
            type="warning"
            title="High Wind Advisory"
            message="Gusts above 45 mph detected in New Mexico corridor between 18:00 and 22:00."
            onRetry={() => toast("Refreshed weather forecast", "info")}
          />
          <InlineAlert
            type="error"
            title="Route Analysis Warning"
            message="Only 2 distinct routes returned by routing provider for this pair."
          />

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast("Trip analyzed successfully", "success")}
            >
              Trigger Success Toast
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast("Open-Meteo rate limit warning", "warning")}
            >
              Trigger Warning Toast
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast("Failed to connect to directions service", "error")}
            >
              Trigger Error Toast
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EmptyState
            icon={<Search className="w-6 h-6" />}
            title="No Routes Analyzed Yet"
            description="Enter origin, destination, cargo weight, and departure time to calculate safe routes."
          />
          <div className="p-4 bg-surface border border-border rounded-panel space-y-3">
            <h3 className="text-12 uppercase font-medium text-text-muted">Skeleton Placeholders</h3>
            <Skeleton variant="text" className="w-3/4" />
            <Skeleton variant="text" className="w-1/2" />
            <Skeleton variant="rectangular" className="h-20 w-full" />
          </div>
        </div>
      </section>
    </div>
  );
}

export function DevComponentsPage() {
  return (
    <ToastProvider>
      <DevGallery />
    </ToastProvider>
  );
}
