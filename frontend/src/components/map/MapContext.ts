import { createContext, useContext } from "react";
import type { Map as MapboxMap } from "mapbox-gl";

export interface MapContextValue {
  map: MapboxMap | null;
  isReady: boolean;
  container: HTMLDivElement | null;
}

export const MapContext = createContext<MapContextValue>({
  map: null,
  isReady: false,
  container: null,
});

export function useMap(): MapContextValue {
  return useContext(MapContext);
}
