import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore, parsePlaceParam, formatPlaceParam } from "@/stores/appStore";

describe("Planner State & URL Sync", () => {
  beforeEach(() => {
    useAppStore.setState({
      origin: null,
      destination: null,
      originInput: "",
      destinationInput: "",
      departureLocal: "2026-11-21T06:00",
      loadLb: 42000,
      intervalMiles: 25,
      panelState: "open",
    });
  });

  it("serializes and parses Place params correctly", () => {
    const place = { label: "Dallas, TX", lat: 32.7767, lon: -96.797 };
    const formatted = formatPlaceParam(place);
    const parsed = parsePlaceParam(formatted);

    expect(parsed?.label).toBe("Dallas, TX");
    expect(parsed?.lat).toBeCloseTo(32.7767, 4);
    expect(parsed?.lon).toBeCloseTo(-96.797, 4);
  });

  it("swaps origin and destination correctly", () => {
    const dallas = { label: "Dallas, TX", lat: 32.7767, lon: -96.797 };
    const denver = { label: "Denver, CO", lat: 39.7392, lon: -104.9903 };

    useAppStore.getState().setOrigin(dallas);
    useAppStore.getState().setDestination(denver);

    useAppStore.getState().swapLocations();

    expect(useAppStore.getState().origin?.label).toBe("Denver, CO");
    expect(useAppStore.getState().destination?.label).toBe("Dallas, TX");
  });

  it("clears origin and destination independently", () => {
    useAppStore.getState().setOrigin({ label: "Dallas, TX", lat: 32.7767, lon: -96.797 });
    expect(useAppStore.getState().origin).not.toBeNull();

    useAppStore.getState().clearOrigin();
    expect(useAppStore.getState().origin).toBeNull();
    expect(useAppStore.getState().originInput).toBe("");
  });

  it("generates and reads URL query parameters (o, d, t, w, i)", () => {
    useAppStore.getState().setOrigin({ label: "Dallas, TX", lat: 32.7767, lon: -96.797 });
    useAppStore.getState().setDestination({ label: "Denver, CO", lat: 39.7392, lon: -104.9903 });
    useAppStore.getState().setDepartureLocal("2026-11-22T08:00");
    useAppStore.getState().setLoadLb(60000);
    useAppStore.getState().setIntervalMiles(50);

    const params = useAppStore.getState().getPlannerUrlParams();
    expect(params.get("t")).toBe("2026-11-22T08:00");
    expect(params.get("w")).toBe("60000");
    expect(params.get("i")).toBe("50");
    expect(params.get("o")).toContain("Dallas");
    expect(params.get("d")).toContain("Denver");

    // Clear state and re-sync from params
    useAppStore.setState({
      origin: null,
      destination: null,
      originInput: "",
      destinationInput: "",
      departureLocal: "",
      loadLb: 0,
      intervalMiles: 10,
    });

    useAppStore.getState().syncPlannerFromUrl(params);

    expect(useAppStore.getState().origin?.label).toBe("Dallas, TX");
    expect(useAppStore.getState().destination?.label).toBe("Denver, CO");
    expect(useAppStore.getState().departureLocal).toBe("2026-11-22T08:00");
    expect(useAppStore.getState().loadLb).toBe(60000);
    expect(useAppStore.getState().intervalMiles).toBe(50);
  });
});
