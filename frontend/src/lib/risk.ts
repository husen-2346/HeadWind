/**
 * risk.ts – Metadata, shapes, color resolving, and comparison utilities for risk levels.
 */

import type { CheckpointRisk, RiskLevelIndex, RiskLevelName } from "@/types/api";

export type RiskShapeType = "circle" | "triangle" | "diamond" | "square" | "octagon";

export interface RiskLevelMeta {
  key: RiskLevelName;
  index: RiskLevelIndex;
  label: string;
  shape: RiskShapeType;
  cssVar: string;
}

export const RISK_LEVELS: Record<RiskLevelName, RiskLevelMeta> = {
  low: {
    key: "low",
    index: 0,
    label: "Low Risk",
    shape: "circle",
    cssVar: "--color-risk-low",
  },
  moderate: {
    key: "moderate",
    index: 1,
    label: "Moderate",
    shape: "triangle",
    cssVar: "--color-risk-moderate",
  },
  high: {
    key: "high",
    index: 2,
    label: "High Risk",
    shape: "diamond",
    cssVar: "--color-risk-high",
  },
  severe: {
    key: "severe",
    index: 3,
    label: "Severe",
    shape: "square",
    cssVar: "--color-risk-severe",
  },
  no_travel: {
    key: "no_travel",
    index: 4,
    label: "No Travel",
    shape: "octagon",
    cssVar: "--color-risk-no-travel",
  },
};

export const RISK_ORDER: RiskLevelName[] = ["low", "moderate", "high", "severe", "no_travel"];

// Runtime color cache reading CSS variables from :root without hardcoded hex
const colorCache = new Map<string, string>();

/**
 * Resolves the actual runtime hex/rgb color string from the :root CSS variable.
 * Fallback values are only used when running in headless / SSR environments where getComputedStyle returns empty.
 */
export function getRiskColor(level: RiskLevelName | "unknown"): string {
  if (colorCache.has(level)) {
    return colorCache.get(level)!;
  }

  let color = "";
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const rootStyle = getComputedStyle(document.documentElement);
    if (level === "unknown") {
      color = rootStyle.getPropertyValue("--color-text-muted").trim();
    } else {
      const meta = RISK_LEVELS[level];
      if (meta) {
        color = rootStyle.getPropertyValue(meta.cssVar).trim();
      }
    }
  }

  // Fallback defaults matching tokens.css if CSS variable cannot be read
  if (!color) {
    switch (level) {
      case "low":
        color = "#2E9CCA";
        break;
      case "moderate":
        color = "#E8C547";
        break;
      case "high":
        color = "#F28C28";
        break;
      case "severe":
        color = "#D1344B";
        break;
      case "no_travel":
        color = "#6A1B4D";
        break;
      case "unknown":
      default:
        color = "#8B98A5";
        break;
    }
  }

  colorCache.set(level, color);
  return color;
}

/**
 * Returns RiskLevelName or "unknown" from numeric index (0 to 4).
 */
export function levelFromIndex(index: number | null | undefined): RiskLevelName | "unknown" {
  if (index === null || index === undefined || index < 0 || index >= RISK_ORDER.length) {
    return "unknown";
  }
  return RISK_ORDER[index] ?? "unknown";
}

/**
 * Compares two risk levels: returns positive if a > b, negative if a < b, 0 if equal.
 * Null or unknown levels sort below low (as -1).
 */
export function compareLevels(
  a: RiskLevelName | "unknown" | null | undefined,
  b: RiskLevelName | "unknown" | null | undefined
): number {
  const getIndex = (lvl: RiskLevelName | "unknown" | null | undefined): number => {
    if (!lvl || lvl === "unknown" || !(lvl in RISK_LEVELS)) return -1;
    return RISK_LEVELS[lvl as RiskLevelName].index;
  };

  return getIndex(a) - getIndex(b);
}

/**
 * Checks whether this checkpoint risk was escalated by load weight rules.
 */
export function isEscalated(risk: CheckpointRisk | null | undefined): boolean {
  return Boolean(risk?.escalated_by_load);
}
