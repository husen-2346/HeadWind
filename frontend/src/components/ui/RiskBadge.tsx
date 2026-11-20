import clsx from "clsx";
import type { RiskLevelName } from "@/types/api";
import { RISK_LEVELS } from "@/lib/risk";
import { RiskShape } from "./RiskShape";

export interface RiskBadgeProps {
  level: RiskLevelName | "unknown";
  label?: string;
  size?: "sm" | "md";
  showShape?: boolean;
  escalated?: boolean;
  className?: string;
}

export function RiskBadge({
  level,
  label,
  size = "md",
  showShape = true,
  escalated = false,
  className,
}: RiskBadgeProps) {
  const displayLabel = label || (level === "unknown" ? "Unknown" : RISK_LEVELS[level]?.label || "Unknown");

  const borderAndTextClass = {
    low: "border-risk-low/30 text-text bg-risk-low/10",
    moderate: "border-risk-moderate/30 text-text bg-risk-moderate/10",
    high: "border-risk-high/30 text-text bg-risk-high/10",
    severe: "border-risk-severe/30 text-text bg-risk-severe/10",
    no_travel: "border-risk-no-travel/40 text-text bg-risk-no-travel/15",
    unknown: "border-border text-text-muted bg-surface",
  }[level];

  const sizeClass = size === "sm" ? "text-12 px-1.5 py-0.5 gap-1" : "text-12 px-2 py-0.5 gap-1.5";

  return (
    <span
      className={clsx(
        "inline-flex items-center font-medium rounded-badge border select-none transition-colors",
        borderAndTextClass,
        sizeClass,
        className
      )}
    >
      {showShape && <RiskShape level={level} size={size} />}
      <span>{displayLabel}</span>
      {escalated && (
        <span
          className="text-12 text-risk-severe font-mono font-medium ml-0.5"
          title="Escalated due to truck cargo weight"
          aria-label="Escalated due to cargo weight"
        >
          ▲ load
        </span>
      )}
    </span>
  );
}
