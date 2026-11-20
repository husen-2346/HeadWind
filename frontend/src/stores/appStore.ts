import { create } from "zustand";

export interface AppState {
  // Route & Checkpoint selection
  selectedRouteId: string | null;
  hoveredRouteId: string | null;
  selectedCheckpointIndex: number | null;

  // Panel state (floating panel on desktop / sheet on mobile)
  panelState: "open" | "collapsed";

  // Active visualization mode
  mode: "routes" | "heatmap";

  // Forecast hour offset for weather heatmap (0 to 48 hours)
  forecastHour: number;

  // Actions
  setSelectedRouteId: (id: string | null) => void;
  setHoveredRouteId: (id: string | null) => void;
  setSelectedCheckpointIndex: (index: number | null) => void;
  setPanelState: (state: "open" | "collapsed") => void;
  togglePanel: () => void;
  setMode: (mode: "routes" | "heatmap") => void;
  setForecastHour: (hour: number) => void;
  resetSelection: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedRouteId: null,
  hoveredRouteId: null,
  selectedCheckpointIndex: null,
  panelState: "open",
  mode: "routes",
  forecastHour: 0,

  setSelectedRouteId: (id) =>
    set({
      selectedRouteId: id,
      // Deselect checkpoint when switching routes
      selectedCheckpointIndex: null,
    }),

  setHoveredRouteId: (id) => set({ hoveredRouteId: id }),

  setSelectedCheckpointIndex: (index) => set({ selectedCheckpointIndex: index }),

  setPanelState: (panelState) => set({ panelState }),

  togglePanel: () =>
    set((state) => ({
      panelState: state.panelState === "open" ? "collapsed" : "open",
    })),

  setMode: (mode) => set({ mode }),

  setForecastHour: (hour) =>
    set({
      forecastHour: Math.max(0, Math.min(48, Math.round(hour))),
    }),

  resetSelection: () =>
    set({
      selectedRouteId: null,
      hoveredRouteId: null,
      selectedCheckpointIndex: null,
    }),
}));
