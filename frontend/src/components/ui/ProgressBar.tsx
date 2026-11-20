import clsx from "clsx";
import type { RiskLevelName } from "@/types/api";

export interface ProgressSegment {
  level: RiskLevelName | "unknown";
  miles: number;
  label?: string;
}

export interface ProgressBarProps {
  segments?: ProgressSegment[];
  value?: number; // 0 to 100 for single progress
  max?: number;
  className?: string;
  ariaLabel?: string;
}

export function ProgressBar({
  segments,
  value,
  max = 100,
  className,
  ariaLabel = "Progress",
}: ProgressBarProps) {
  // If segments provided, render multi-segment risk breakdown
  if (segments && segments.length > 0) {
    const totalMiles = segments.reduce((sum, s) => sum + Math.max(0, s.miles), 0);

    const levelBgClass = {
      low: "bg-risk-low",
      moderate: "bg-risk-moderate",
      high: "bg-risk-high",
      severe: "bg-risk-severe",
      no_travel: "bg-risk-no-travel",
      unknown: "bg-text-muted/40",
    };

    return (
      <div
        role="meter"
        aria-label={ariaLabel}
        aria-valuenow={totalMiles}
        aria-valuemin={0}
        aria-valuemax={totalMiles}
        className={clsx(
          "w-full h-2 rounded-full overflow-hidden flex bg-border/40 select-none",
          className
        )}
      >
        {segments.map((seg, idx) => {
          const pct = totalMiles > 0 ? (seg.miles / totalMiles) * 100 : 0;
          if (pct <= 0) return null;
          return (
            <div
              key={idx}
              title={`${seg.label || seg.level}: ${Math.round(seg.miles)} mi (${pct.toFixed(0)}%)`}
              style={{ width: `${pct}%` }}
              className={clsx("h-full transition-all", levelBgClass[seg.level])}
            />
          );
        })}
      </div>
    );
  }

  // Single value progress
  const pct = Math.min(100, Math.max(0, ((value ?? 0) / max) * 100));

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={clsx("w-full h-1.5 rounded-full overflow-hidden bg-border", className)}
    >
      <div
        className="h-full bg-accent transition-all duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
