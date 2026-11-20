import { describe, it, expect } from "vitest";
import { validateTripForm, type TripFormValues } from "@/features/planner/validation";

describe("validateTripForm", () => {
  const baseTime = new Date("2026-11-20T12:00:00Z");

  const validForm: TripFormValues = {
    origin: { label: "Dallas, TX", lat: 32.7767, lon: -96.797 },
    destination: { label: "Denver, CO", lat: 39.7392, lon: -104.9903 },
    departureLocal: "2026-11-21T06:00",
    loadLb: 42000,
    intervalMiles: 25,
  };

  it("passes valid form parameters", () => {
    const result = validateTripForm(validForm, baseTime);
    expect(result.isValid).toBe(true);
    expect(result.disabledReason).toBeNull();
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it("fails when origin or destination is missing", () => {
    const noOrigin = validateTripForm({ ...validForm, origin: null }, baseTime);
    expect(noOrigin.isValid).toBe(false);
    expect(noOrigin.errors.origin).toBeDefined();

    const noDest = validateTripForm({ ...validForm, destination: null }, baseTime);
    expect(noDest.isValid).toBe(false);
    expect(noDest.errors.destination).toBeDefined();
  });

  it("fails when origin and destination are less than 2 miles apart", () => {
    const tooClose: TripFormValues = {
      ...validForm,
      origin: { label: "Downtown Dallas", lat: 32.7767, lon: -96.797 },
      destination: { label: "Uptown Dallas", lat: 32.785, lon: -96.798 }, // ~0.5 mi
    };
    const result = validateTripForm(tooClose, baseTime);
    expect(result.isValid).toBe(false);
    expect(result.errors.destination).toContain("at least 2 miles apart");
  });

  it("fails for load weight outside 1 to 100,000 lb range", () => {
    const zeroLoad = validateTripForm({ ...validForm, loadLb: 0 }, baseTime);
    expect(zeroLoad.isValid).toBe(false);
    expect(zeroLoad.errors.loadLb).toBeDefined();

    const overLoad = validateTripForm({ ...validForm, loadLb: 105000 }, baseTime);
    expect(overLoad.isValid).toBe(false);
    expect(overLoad.errors.loadLb).toBeDefined();
  });

  it("fails for non-integer load weight", () => {
    const floatLoad = validateTripForm({ ...validForm, loadLb: 42000.5 }, baseTime);
    expect(floatLoad.isValid).toBe(false);
  });

  it("fails for invalid sampling intervals", () => {
    // @ts-expect-error testing invalid interval
    const badInterval = validateTripForm({ ...validForm, intervalMiles: 30 }, baseTime);
    expect(badInterval.isValid).toBe(false);
    expect(badInterval.errors.intervalMiles).toBeDefined();
  });

  it("validates departure time window [-1h, +72h]", () => {
    // 2 hours in the past
    const tooOld = validateTripForm(
      { ...validForm, departureLocal: "2026-11-20T09:00:00Z" },
      baseTime
    );
    expect(tooOld.isValid).toBe(false);
    expect(tooOld.errors.departureLocal).toContain("1 hour in the past");

    // 80 hours in the future
    const tooFar = validateTripForm(
      { ...validForm, departureLocal: "2026-11-24T00:00:00Z" },
      baseTime
    );
    expect(tooFar.isValid).toBe(false);
    expect(tooFar.errors.departureLocal).toContain("72 hours in the future");
  });
});
