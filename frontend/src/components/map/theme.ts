import type { Map as MapboxMap } from "mapbox-gl";

interface MapWithDynamicProperties {
  getLayer: (id: string) => unknown;
  setPaintProperty: (layerId: string, property: string, value: unknown) => void;
  setLayoutProperty: (layerId: string, property: string, value: unknown) => void;
}

/**
 * Custom dark map theme adjustments for Headwind.
 * Defensively modifies basemap layers on dark-v11 to ensure high contrast
 * for route polylines, checkpoint markers, and weather heatmap overlays.
 */
export function applyHeadwindMapTheme(map: MapboxMap): void {
  const dynamicMap = map as unknown as MapWithDynamicProperties;

  // Defensive helper to set layer paint property only if layer exists
  const setPaint = (layerId: string, property: string, value: unknown) => {
    if (dynamicMap.getLayer(layerId)) {
      try {
        dynamicMap.setPaintProperty(layerId, property, value);
      } catch {
        // Layer property might not match schema on certain styles
      }
    }
  };

  const setLayout = (layerId: string, property: string, value: unknown) => {
    if (dynamicMap.getLayer(layerId)) {
      try {
        dynamicMap.setLayoutProperty(layerId, property, value);
      } catch {
        // Ignore if layer doesn't support layout property
      }
    }
  };

  // 1. Water color (deepest dark tone)
  setPaint("water", "fill-color", "#070A0E");

  // 2. Background and Land (neutral dark surface)
  setPaint("background", "background-color", "#0B0F14");
  setPaint("land", "background-color", "#0B0F14");

  // 3. Roads & Highways (subtle low-contrast borders)
  const roadLayers = [
    "road-primary",
    "road-secondary-tertiary",
    "road-street",
    "road-motorway-trunk",
    "tunnel-primary-secondary-tertiary",
    "tunnel-motorway-trunk",
    "bridge-primary-secondary-tertiary",
    "bridge-motorway-trunk",
  ];

  roadLayers.forEach((id) => {
    setPaint(id, "line-color", "#1A232E");
  });

  // 4. Admin Boundaries (state & country borders)
  const adminLayers = [
    "admin-0-boundary",
    "admin-1-boundary",
    "admin-0-boundary-bg",
    "admin-1-boundary-bg",
  ];

  adminLayers.forEach((id) => {
    setPaint(id, "line-color", "#263545");
  });

  // 5. Hide cluttered POI and transit labels
  const clutterLayers = [
    "poi-label",
    "transit-label",
    "airport-label",
    "natural-point-label",
  ];

  clutterLayers.forEach((id) => {
    setLayout(id, "visibility", "none");
  });

  // 6. Muted place and road labels
  const labelLayers = [
    "settlement-major-label",
    "settlement-minor-label",
    "state-label",
    "road-label",
  ];

  labelLayers.forEach((id) => {
    setPaint(id, "text-color", "#8B98A5");
    setPaint(id, "text-halo-color", "#0B0F14");
    setPaint(id, "text-halo-width", 1.5);
  });
}
