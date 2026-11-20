import clsx from "clsx";
import type { RiskLevelName } from "@/types/api";

export interface RiskShapeProps {
  level: RiskLevelName | "unknown";
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}

export function RiskShape({
  level,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: RiskShapeProps) {
  const pixelSize = size === "sm" ? 12 : 16;
  const isAccessible = Boolean(ariaLabel);

  const colorClass = {
    low: "text-risk-low",
    moderate: "text-risk-moderate",
    high: "text-risk-high",
    severe: "text-risk-severe",
    no_travel: "text-risk-no-travel",
    unknown: "text-text-muted",
  }[level];

  // SVG shapes matching specification:
  // Low: Circle
  // Moderate: Triangle
  // High: Diamond
  // Severe: Square
  // No Travel: Octagon
  // Unknown: Dashed circle
  const renderShape = () => {
    switch (level) {
      case "low":
        return <circle cx="8" cy="8" r="6" fill="currentColor" />;
      case "moderate":
        return <polygon points="8,2 14.5,13.5 1.5,13.5" fill="currentColor" />;
      case "high":
        return <polygon points="8,1.5 14.5,8 8,14.5 1.5,8" fill="currentColor" />;
      case "severe":
        return <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" fill="currentColor" />;
      case "no_travel":
        return (
          <polygon
            points="5,2 11,2 14,5 14,11 11,14 5,14 2,11 2,5"
            fill="currentColor"
          />
        );
      case "unknown":
      default:
        return (
          <circle
            cx="8"
            cy="8"
            r="5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
        );
    }
  };

  return (
    <svg
      viewBox="0 0 16 16"
      width={pixelSize}
      height={pixelSize}
      className={clsx("inline-block shrink-0", colorClass, className)}
      role={isAccessible ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={!isAccessible}
    >
      {renderShape()}
    </svg>
  );
}
