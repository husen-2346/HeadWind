import { describe, it, expect } from "vitest";
import {
  formatMiles,
  formatDuration,
  formatLoad,
  formatMph,
  formatInHr,
  formatEta,
  formatDayTime,
  formatDelta,
} from "@/lib/format";

describe("format.ts utilities", () => {
  describe("formatMiles", () => {
    it("formats standard miles with thousands separators", () => {
      expect(formatMiles(806.4)).toBe("806 mi");
      expect(formatMiles(1250.8)).toBe("1,251 mi");
    });

    it("formats short distances with single decimal precision", () => {
      expect(formatMiles(4.2)).toBe("4.2 mi");
      expect(formatMiles(0.5)).toBe("0.5 mi");
    });

    it("handles zero and invalid inputs gracefully", () => {
      expect(formatMiles(0)).toBe("0 mi");
      expect(formatMiles(NaN)).toBe("0 mi");
      expect(formatMiles(Infinity)).toBe("0 mi");
    });
  });

  describe("formatDuration", () => {
    it("formats multi-hour durations", () => {
      // 12 hours 44 minutes = 45840s
      expect(formatDuration(45840)).toBe("12h 44m");
    });

    it("formats sub-hour durations", () => {
      expect(formatDuration(1500)).toBe("25m");
      expect(formatDuration(60)).toBe("1m");
    });

    it("handles zero or negative seconds", () => {
      expect(formatDuration(0)).toBe("0m");
      expect(formatDuration(-100)).toBe("0m");
    });
  });

  describe("formatLoad", () => {
    it("formats cargo weight in pounds with commas", () => {
      expect(formatLoad(42000)).toBe("42,000 lb");
      expect(formatLoad(80000)).toBe("80,000 lb");
      expect(formatLoad(500)).toBe("500 lb");
    });

    it("handles invalid numbers", () => {
      expect(formatLoad(NaN)).toBe("0 lb");
    });
  });

  describe("formatMph", () => {
    it("formats wind speed as rounded integer mph", () => {
      expect(formatMph(39.4)).toBe("39 mph");
      expect(formatMph(45.8)).toBe("46 mph");
    });

    it("returns dash for null or undefined", () => {
      expect(formatMph(null)).toBe("—");
      expect(formatMph(undefined)).toBe("—");
    });
  });

  describe("formatInHr", () => {
    it("formats precipitation to two decimal places", () => {
      expect(formatInHr(0.25)).toBe("0.25 in/hr");
      expect(formatInHr(1.5)).toBe("1.50 in/hr");
    });

    it("returns dash for null or undefined", () => {
      expect(formatInHr(null)).toBe("—");
      expect(formatInHr(undefined)).toBe("—");
    });
  });

  describe("formatEta and formatDayTime", () => {
    const isoString = "2026-11-20T21:44:00Z";

    it("formats ETA in UTC when specified", () => {
      const eta = formatEta(isoString, "UTC");
      expect(eta).toContain("9:44");
      expect(eta).toContain("PM");
    });

    it("formats DayTime string", () => {
      const dt = formatDayTime(isoString, "UTC");
      expect(dt).toContain("Nov 20");
      expect(dt).toContain("21:44");
    });

    it("returns dash on empty input", () => {
      expect(formatEta("")).toBe("—");
      expect(formatDayTime("")).toBe("—");
    });
  });

  describe("formatDelta", () => {
    it("formats positive delay as slower", () => {
      expect(formatDelta(2520)).toBe("+42m slower");
    });

    it("formats negative duration difference as faster", () => {
      expect(formatDelta(-1800)).toBe("-30m faster");
    });

    it("formats near zero as same time", () => {
      expect(formatDelta(15)).toBe("same time");
      expect(formatDelta(0)).toBe("same time");
    });
  });
});
