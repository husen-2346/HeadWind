import { create } from "zustand";
import type { Place } from "@/features/planner/validation";
import type { TripAnalysisResponse } from "@/types/api";

export type PanelState = "open" | "collapsed" | "detail";

export function getDefaultDeparture(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(6, 0, 0, 0);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const yyyy = tomorrow.getFullYear();
  const mm = pad(tomorrow.getMonth() + 1);
  const dd = pad(tomorrow.getDate());
  const hh = pad(tomorrow.getHours());
  const min = pad(tomorrow.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function parsePlaceParam(val: string | null): Place | null {
  if (!val || val.trim() === "") return null;
  const parts = val.split("|");
  if (parts.length >= 2) {
    const label = decodeURIComponent(parts[0].trim());
    const coords = parts[1].split(",");
    if (coords.length === 2) {
      const lat = parseFloat(coords[0]);
      const lon = parseFloat(coords[1]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return { label, lat, lon };
      }
    }
  }
  // If label only without coordinates
  return { label: decodeURIComponent(val.trim()), lat: NaN, lon: NaN };
}

export function formatPlaceParam(place: Place | null): string {
  if (!place) return "";
  if (Number.isFinite(place.lat) && Number.isFinite(place.lon)) {
    return `${encodeURIComponent(place.label)}|${place.lat.toFixed(5)},${place.lon.toFixed(5)}`;
  }
  return encodeURIComponent(place.label);
}

export interface AppState {
  // Route & Checkpoint selection
  selectedRouteId: string | null;
  hoveredRouteId: string | null;
  selectedCheckpointIndex: number | null;

  // Panel state: floating open / collapsed toggle / route detail view
  panelState: PanelState;

  // Active visualization mode
  mode: "routes" | "heatmap";

  // Forecast hour offset for weather heatmap (0 to 48 hours)
  forecastHour: number;

  // Current analysis data
  analysisResult: TripAnalysisResponse | null;

  // Planner inputs
  origin: Place | null;
  destination: Place | null;
  originInput: string;
  destinationInput: string;
  departureLocal: string;
  loadLb: number;
  intervalMiles: 10 | 25 | 50;

  // Actions
  setSelectedRouteId: (id: string | null) => void;
  setHoveredRouteId: (id: string | null) => void;
  setSelectedCheckpointIndex: (index: number | null) => void;
  setPanelState: (state: PanelState) => void;
  togglePanel: () => void;
  setMode: (mode: "routes" | "heatmap") => void;
  setForecastHour: (hour: number) => void;
  setAnalysisResult: (result: TripAnalysisResponse | null) => void;
  resetSelection: () => void;

  // Planner Actions
  setOrigin: (place: Place | null) => void;
  setDestination: (place: Place | null) => void;
  setOriginInput: (text: string) => void;
  setDestinationInput: (text: string) => void;
  swapLocations: () => void;
  clearOrigin: () => void;
  clearDestination: () => void;
  setDepartureLocal: (departure: string) => void;
  setLoadLb: (load: number) => void;
  setIntervalMiles: (interval: 10 | 25 | 50) => void;
  syncPlannerFromUrl: (searchParams: URLSearchParams) => void;
  getPlannerUrlParams: () => URLSearchParams;
}

export const useAppStore = create<AppState>((set, get) => ({
  selectedRouteId: null,
  hoveredRouteId: null,
  selectedCheckpointIndex: null,
  panelState: "open",
  mode: "routes",
  forecastHour: 0,
  analysisResult: null,

  // Planner Initial Values
  origin: null,
  destination: null,
  originInput: "",
  destinationInput: "",
  departureLocal: getDefaultDeparture(),
  loadLb: 42000,
  intervalMiles: 25,

  setSelectedRouteId: (id) =>
    set({
      selectedRouteId: id,
      selectedCheckpointIndex: null,
    }),

  setHoveredRouteId: (id) => set({ hoveredRouteId: id }),

  setSelectedCheckpointIndex: (index) => set({ selectedCheckpointIndex: index }),

  setPanelState: (panelState) => set({ panelState }),

  togglePanel: () =>
    set((state) => ({
      panelState: state.panelState === "collapsed" ? "open" : "collapsed",
    })),

  setMode: (mode) => set({ mode }),

  setForecastHour: (hour) =>
    set({
      forecastHour: Math.max(0, Math.min(48, Math.round(hour))),
    }),

  setAnalysisResult: (result) => {
    // When new analysis arrives, default select recommended route or first route
    const recommendedId = result?.summary.recommended_route_id || result?.routes[0]?.id || null;
    set({
      analysisResult: result,
      selectedRouteId: recommendedId,
      selectedCheckpointIndex: null,
      panelState: "open",
    });
  },

  resetSelection: () =>
    set({
      selectedRouteId: null,
      hoveredRouteId: null,
      selectedCheckpointIndex: null,
    }),

  // Planner actions
  setOrigin: (place) =>
    set({
      origin: place,
      originInput: place?.label || "",
    }),

  setDestination: (place) =>
    set({
      destination: place,
      destinationInput: place?.label || "",
    }),

  setOriginInput: (originInput) =>
    set((state) => ({
      originInput,
      // If user clears or edits typed text, invalidate selected place until picked
      origin: state.origin && state.origin.label === originInput ? state.origin : null,
    })),

  setDestinationInput: (destinationInput) =>
    set((state) => ({
      destinationInput,
      destination: state.destination && state.destination.label === destinationInput ? state.destination : null,
    })),

  swapLocations: () =>
    set((state) => ({
      origin: state.destination,
      originInput: state.destinationInput,
      destination: state.origin,
      destinationInput: state.originInput,
    })),

  clearOrigin: () =>
    set({
      origin: null,
      originInput: "",
    }),

  clearDestination: () =>
    set({
      destination: null,
      destinationInput: "",
    }),

  setDepartureLocal: (departureLocal) => set({ departureLocal }),

  setLoadLb: (loadLb) => set({ loadLb }),

  setIntervalMiles: (intervalMiles) => set({ intervalMiles }),

  syncPlannerFromUrl: (params) => {
    const oParam = params.get("o");
    const dParam = params.get("d");
    const tParam = params.get("t");
    const wParam = params.get("w");
    const iParam = params.get("i");

    const updates: Partial<AppState> = {};

    if (oParam) {
      const parsedO = parsePlaceParam(oParam);
      if (parsedO) {
        updates.origin = parsedO;
        updates.originInput = parsedO.label;
      }
    }

    if (dParam) {
      const parsedD = parsePlaceParam(dParam);
      if (parsedD) {
        updates.destination = parsedD;
        updates.destinationInput = parsedD.label;
      }
    }

    if (tParam) {
      updates.departureLocal = tParam;
    }

    if (wParam) {
      const parsedW = parseInt(wParam, 10);
      if (!Number.isNaN(parsedW) && parsedW > 0) {
        updates.loadLb = parsedW;
      }
    }

    if (iParam) {
      const parsedI = parseInt(iParam, 10);
      if ([10, 25, 50].includes(parsedI)) {
        updates.intervalMiles = parsedI as 10 | 25 | 50;
      }
    }

    if (Object.keys(updates).length > 0) {
      set(updates);
    }
  },

  getPlannerUrlParams: () => {
    const state = get();
    const params = new URLSearchParams();

    if (state.origin) {
      params.set("o", formatPlaceParam(state.origin));
    }
    if (state.destination) {
      params.set("d", formatPlaceParam(state.destination));
    }
    if (state.departureLocal) {
      params.set("t", state.departureLocal);
    }
    if (state.loadLb) {
      params.set("w", state.loadLb.toString());
    }
    if (state.intervalMiles) {
      params.set("i", state.intervalMiles.toString());
    }

    return params;
  },
}));
