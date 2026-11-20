import { describe, expect, it } from "vitest";
import { dallasDenverFixture, riskRulesFixture } from "@/mocks";

describe("Mock Fixtures", () => {
  it("validates dallasDenverFixture shape and properties", () => {
    expect(dallasDenverFixture).toBeDefined();

    // Request
    expect(dallasDenverFixture.request).toBeDefined();
    expect(dallasDenverFixture.request.origin).toEqual([-96.797, 32.7767]);
    expect(dallasDenverFixture.request.destination).toEqual([-104.9903, 39.7392]);
    expect(dallasDenverFixture.request.load_lb).toBe(42000);

    // Summary
    expect(dallasDenverFixture.summary).toBeDefined();
    expect(dallasDenverFixture.summary.recommended_route_id).toBeDefined();
    expect(dallasDenverFixture.summary.weather_status).toBe("complete");
    expect(Array.isArray(dallasDenverFixture.summary.warnings)).toBe(true);

    // Routes (1 to 3 items)
    expect(Array.isArray(dallasDenverFixture.routes)).toBe(true);
    expect(dallasDenverFixture.routes.length).toBeGreaterThanOrEqual(1);
    expect(dallasDenverFixture.routes.length).toBeLessThanOrEqual(3);

    for (const route of dallasDenverFixture.routes) {
      expect(route.id).toBeDefined();
      expect(route.distance_miles).toBeGreaterThan(0);
      expect(route.duration_seconds).toBeGreaterThan(0);
      expect(Array.isArray(route.geometry)).toBe(true);
      expect(Array.isArray(route.risk_segments)).toBe(true);
      expect(Array.isArray(route.checkpoints)).toBe(true);

      // Checkpoints
      expect(route.checkpoints.length).toBeGreaterThan(0);
      const cp = route.checkpoints[0];
      expect(cp.weather).toBeDefined();
      expect(cp.risk).toBeDefined();
      expect(typeof cp.eta_utc).toBe("string");
      expect(typeof cp.eta_local).toBe("string");
    }

    // Meta
    expect(dallasDenverFixture.meta).toBeDefined();
    expect(dallasDenverFixture.meta.route_count).toBe(dallasDenverFixture.routes.length);
    expect(dallasDenverFixture.meta.timings_ms).toBeDefined();
  });

  it("validates riskRulesFixture shape", () => {
    expect(riskRulesFixture).toBeDefined();
    expect(riskRulesFixture.levels).toEqual(["LOW", "MODERATE", "HIGH", "SEVERE", "NO_TRAVEL"]);
    expect(riskRulesFixture.variables).toBeDefined();
    expect(riskRulesFixture.variables.wind_mph).toBeDefined();
    expect(riskRulesFixture.variables.rain_in_hr).toBeDefined();
    expect(riskRulesFixture.variables.snow_in_hr).toBeDefined();
    expect(Array.isArray(riskRulesFixture.load_rules)).toBe(true);
  });

  it("ensures fixtures contain no API keys or tokens", () => {
    const dallasStr = JSON.stringify(dallasDenverFixture);
    const rulesStr = JSON.stringify(riskRulesFixture);

    expect(dallasStr).not.toContain("pk.eyJ");
    expect(dallasStr).not.toContain("sk.eyJ");
    expect(rulesStr).not.toContain("pk.eyJ");
    expect(rulesStr).not.toContain("sk.eyJ");
  });
});
