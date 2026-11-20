import { describe, it, expect } from "vitest";
import {
  RISK_LEVELS,
  RISK_ORDER,
  getRiskColor,
  levelFromIndex,
  compareLevels,
  isEscalated,
} from "@/lib/risk";
import type { CheckpointRisk } from "@/types/api";

describe("risk.ts utilities", () => {
  it("defines RISK_ORDER with correct 5 sequential levels", () => {
    expect(RISK_ORDER).toEqual(["low", "moderate", "high", "severe", "no_travel"]);
  });

  it("defines all risk metadata with shapes and labels", () => {
    expect(RISK_LEVELS.low.shape).toBe("circle");
    expect(RISK_LEVELS.moderate.shape).toBe("triangle");
    expect(RISK_LEVELS.high.shape).toBe("diamond");
    expect(RISK_LEVELS.severe.shape).toBe("square");
    expect(RISK_LEVELS.no_travel.shape).toBe("octagon");
  });

  it("resolves fallback risk colors in headless test environment", () => {
    expect(getRiskColor("low")).toBe("#2E9CCA");
    expect(getRiskColor("moderate")).toBe("#E8C547");
    expect(getRiskColor("high")).toBe("#F28C28");
    expect(getRiskColor("severe")).toBe("#D1344B");
    expect(getRiskColor("no_travel")).toBe("#6A1B4D");
    expect(getRiskColor("unknown")).toBe("#8B98A5");
  });

  describe("levelFromIndex", () => {
    it("maps indices 0 through 4 to risk level names", () => {
      expect(levelFromIndex(0)).toBe("low");
      expect(levelFromIndex(1)).toBe("moderate");
      expect(levelFromIndex(2)).toBe("high");
      expect(levelFromIndex(3)).toBe("severe");
      expect(levelFromIndex(4)).toBe("no_travel");
    });

    it("maps null or undefined to unknown", () => {
      expect(levelFromIndex(null)).toBe("unknown");
      expect(levelFromIndex(undefined)).toBe("unknown");
    });
  });

  describe("compareLevels", () => {
    it("orders levels accurately", () => {
      expect(compareLevels("low", "severe")).toBeLessThan(0);
      expect(compareLevels("severe", "low")).toBeGreaterThan(0);
      expect(compareLevels("moderate", "moderate")).toBe(0);
      expect(compareLevels("unknown", "low")).toBeLessThan(0);
    });
  });

  describe("isEscalated", () => {
    it("identifies load escalation flag on CheckpointRisk", () => {
      const normalRisk: CheckpointRisk = {
        level: "moderate",
        wind_level: "moderate",
        rain_level: "low",
        snow_level: "low",
        escalated_by_load: false,
        escalation_reason: null,
      };

      const escalatedRisk: CheckpointRisk = {
        level: "severe",
        wind_level: "high",
        rain_level: "low",
        snow_level: "low",
        escalated_by_load: true,
        escalation_reason: "High wind with heavy cargo (>40,000 lb)",
      };

      expect(isEscalated(normalRisk)).toBe(false);
      expect(isEscalated(escalatedRisk)).toBe(true);
      expect(isEscalated(null)).toBe(false);
    });
  });
});
