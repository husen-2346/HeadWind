import { describe, it, expect } from "vitest";
import { haversineMiles, EARTH_RADIUS_MILES } from "@/lib/geo";

describe("haversineMiles", () => {
  it("calculates known great-circle distance accurately", () => {
    // Dallas (32.7767, -96.7970) to Denver (39.7392, -104.9903) ~ 662 miles
    const dist = haversineMiles(32.7767, -96.797, 39.7392, -104.9903);
    expect(dist).toBeGreaterThan(650);
    expect(dist).toBeLessThan(675);
  });

  it("returns 0 for identical points", () => {
    expect(haversineMiles(32.7767, -96.797, 32.7767, -96.797)).toBe(0);
  });

  it("handles antipodal and invalid coordinates gracefully", () => {
    expect(haversineMiles(0, 0, 0, 180)).toBeCloseTo(Math.PI * EARTH_RADIUS_MILES, -1);
    expect(haversineMiles(NaN, 0, 10, 10)).toBe(0);
  });
});
