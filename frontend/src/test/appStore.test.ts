import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "@/stores/appStore";

describe("appStore (Zustand)", () => {
  beforeEach(() => {
    useAppStore.setState({
      selectedRouteId: null,
      hoveredRouteId: null,
      selectedCheckpointIndex: null,
      panelState: "open",
      mode: "routes",
      forecastHour: 0,
    });
  });

  it("initializes with default state", () => {
    const state = useAppStore.getState();
    expect(state.selectedRouteId).toBeNull();
    expect(state.hoveredRouteId).toBeNull();
    expect(state.selectedCheckpointIndex).toBeNull();
    expect(state.panelState).toBe("open");
    expect(state.mode).toBe("routes");
    expect(state.forecastHour).toBe(0);
  });

  it("updates selectedRouteId and clears selectedCheckpointIndex", () => {
    useAppStore.getState().setSelectedCheckpointIndex(4);
    expect(useAppStore.getState().selectedCheckpointIndex).toBe(4);

    useAppStore.getState().setSelectedRouteId("route-1");
    expect(useAppStore.getState().selectedRouteId).toBe("route-1");
    expect(useAppStore.getState().selectedCheckpointIndex).toBeNull();
  });

  it("toggles panelState", () => {
    expect(useAppStore.getState().panelState).toBe("open");

    useAppStore.getState().togglePanel();
    expect(useAppStore.getState().panelState).toBe("collapsed");

    useAppStore.getState().togglePanel();
    expect(useAppStore.getState().panelState).toBe("open");
  });

  it("sets and clamps forecastHour between 0 and 48", () => {
    useAppStore.getState().setForecastHour(12);
    expect(useAppStore.getState().forecastHour).toBe(12);

    useAppStore.getState().setForecastHour(60);
    expect(useAppStore.getState().forecastHour).toBe(48);

    useAppStore.getState().setForecastHour(-5);
    expect(useAppStore.getState().forecastHour).toBe(0);
  });

  it("resets selection", () => {
    useAppStore.getState().setSelectedRouteId("route-2");
    useAppStore.getState().setHoveredRouteId("route-1");
    useAppStore.getState().setSelectedCheckpointIndex(10);

    useAppStore.getState().resetSelection();
    expect(useAppStore.getState().selectedRouteId).toBeNull();
    expect(useAppStore.getState().hoveredRouteId).toBeNull();
    expect(useAppStore.getState().selectedCheckpointIndex).toBeNull();
  });
});
