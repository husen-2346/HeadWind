import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { GeoJSONSource } from "mapbox-gl";
import type { FeatureCollection } from "geojson";
import { useMap } from "./MapContext";
import { useAppStore } from "@/stores/appStore";
import { registerMapIcons } from "./icons";
import {
  buildRoutesGeoJson,
  buildCheckpointsGeoJson,
  buildEndpointsGeoJson,
  computeRoutesBounds,
} from "./geojson";
import { formatMph, formatInHr } from "@/lib/format";
import { RISK_LEVELS } from "@/lib/risk";

export function RoutesLayers() {
  const { map, isReady } = useMap();

  const analysisResult = useAppStore((s) => s.analysisResult);
  const selectedRouteId = useAppStore((s) => s.selectedRouteId);
  const hoveredRouteId = useAppStore((s) => s.hoveredRouteId);
  const selectedCheckpointIndex = useAppStore((s) => s.selectedCheckpointIndex);

  const setSelectedRouteId = useAppStore((s) => s.setSelectedRouteId);
  const setHoveredRouteId = useAppStore((s) => s.setHoveredRouteId);
  const setSelectedCheckpointIndex = useAppStore((s) => s.setSelectedCheckpointIndex);

  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const layersInitializedRef = useRef<boolean>(false);
  const previousAnalysisIdRef = useRef<string | null>(null);
  const prevSelectedCheckpointRef = useRef<number | null>(null);

  // 1. Initialize Mapbox Layers & Icons
  useEffect(() => {
    if (!map || !isReady || layersInitializedRef.current) return;

    registerMapIcons(map);

    // Create shared popup
    popupRef.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      offset: 14,
      className: "headwind-checkpoint-popup",
    });

    popupRef.current.on("close", () => {
      setSelectedCheckpointIndex(null);
    });

    const emptyFc: FeatureCollection = { type: "FeatureCollection", features: [] };

    // Sources
    if (!map.getSource("source-routes-unselected")) {
      map.addSource("source-routes-unselected", {
        type: "geojson",
        data: emptyFc,
      });
    }
    if (!map.getSource("source-routes-selected-casing")) {
      map.addSource("source-routes-selected-casing", {
        type: "geojson",
        data: emptyFc,
      });
    }
    if (!map.getSource("source-routes-selected")) {
      map.addSource("source-routes-selected", {
        type: "geojson",
        data: emptyFc,
      });
    }
    if (!map.getSource("source-checkpoints")) {
      map.addSource("source-checkpoints", {
        type: "geojson",
        data: emptyFc,
        promoteId: "id", // Ensures numeric id enables feature-state
      });
    }
    if (!map.getSource("source-endpoints")) {
      map.addSource("source-endpoints", {
        type: "geojson",
        data: emptyFc,
      });
    }

    // Unselected Routes Layer (thin, dimmed neutral)
    if (!map.getLayer("layer-routes-unselected")) {
      map.addLayer({
        id: "layer-routes-unselected",
        type: "line",
        source: "source-routes-unselected",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#8B98A5",
          "line-width": 3,
          "line-opacity": 0.45,
        },
      });
    }

    // Selected Route Dark Casing
    if (!map.getLayer("layer-routes-selected-casing")) {
      map.addLayer({
        id: "layer-routes-selected-casing",
        type: "line",
        source: "source-routes-selected-casing",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#0B0F14",
          "line-width": 8,
          "line-opacity": 0.95,
        },
      });
    }

    // Selected Route Risk-Colored Segments
    if (!map.getLayer("layer-routes-selected")) {
      map.addLayer({
        id: "layer-routes-selected",
        type: "line",
        source: "source-routes-selected",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-width": 5,
          "line-color": [
            "match",
            ["get", "level"],
            "low",
            "#2E9CCA",
            "moderate",
            "#E8C547",
            "high",
            "#F28C28",
            "severe",
            "#D1344B",
            "no_travel",
            "#6A1B4D",
            /* fallback unknown */ "#8B98A5",
          ],
        },
      });
    }

    // Checkpoint Symbols
    if (!map.getLayer("layer-checkpoints")) {
      map.addLayer({
        id: "layer-checkpoints",
        type: "symbol",
        source: "source-checkpoints",
        layout: {
          "icon-image": ["get", "icon_name"],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-size": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            1.35,
            0.9,
          ],
        },
      });
    }

    // Endpoints Layer (Start and End pins)
    if (!map.getLayer("layer-endpoints")) {
      map.addLayer({
        id: "layer-endpoints",
        type: "symbol",
        source: "source-endpoints",
        layout: {
          "icon-image": [
            "case",
            ["==", ["get", "kind"], "origin"],
            "endpoint-origin",
            "endpoint-destination",
          ],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-size": 1.0,
        },
      });
    }

    // Event Handlers for Unselected Routes
    map.on("click", "layer-routes-unselected", (e) => {
      const feat = e.features?.[0];
      if (feat && feat.properties?.route_id) {
        setSelectedRouteId(String(feat.properties.route_id));
      }
    });

    map.on("mouseenter", "layer-routes-unselected", (e) => {
      map.getCanvas().style.cursor = "pointer";
      const feat = e.features?.[0];
      if (feat && feat.properties?.route_id) {
        setHoveredRouteId(String(feat.properties.route_id));
      }
    });

    map.on("mouseleave", "layer-routes-unselected", () => {
      map.getCanvas().style.cursor = "";
      setHoveredRouteId(null);
    });

    // Event Handlers for Checkpoints
    map.on("click", "layer-checkpoints", (e) => {
      const feat = e.features?.[0];
      if (feat && typeof feat.properties?.index === "number") {
        setSelectedCheckpointIndex(feat.properties.index);
      }
    });

    map.on("mouseenter", "layer-checkpoints", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "layer-checkpoints", () => {
      map.getCanvas().style.cursor = "";
    });

    layersInitializedRef.current = true;
  }, [map, isReady, setSelectedRouteId, setHoveredRouteId, setSelectedCheckpointIndex]);

  // 2. Sync GeoJSON Data whenever analysisResult or selectedRouteId changes
  useEffect(() => {
    if (!map || !isReady || !layersInitializedRef.current) return;

    const routes = analysisResult?.routes || [];
    const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0] || null;

    // Build GeoJSON
    const routesData = buildRoutesGeoJson(routes, selectedRoute?.id || null);
    const checkpointsData = buildCheckpointsGeoJson(selectedRoute?.checkpoints || []);

    const origin = analysisResult?.request.origin || null;
    const dest = analysisResult?.request.destination || null;
    const endpointsData = buildEndpointsGeoJson(origin, dest);

    // Update sources via setData
    const unselectedSrc = map.getSource("source-routes-unselected") as GeoJSONSource | undefined;
    const casingSrc = map.getSource("source-routes-selected-casing") as GeoJSONSource | undefined;
    const selectedSrc = map.getSource("source-routes-selected") as GeoJSONSource | undefined;
    const cpSrc = map.getSource("source-checkpoints") as GeoJSONSource | undefined;
    const endSrc = map.getSource("source-endpoints") as GeoJSONSource | undefined;

    unselectedSrc?.setData(routesData.unselected);
    casingSrc?.setData(routesData.selectedCasing);
    selectedSrc?.setData(routesData.selectedSegments);
    cpSrc?.setData(checkpointsData);
    endSrc?.setData(endpointsData);

    // Fit bounds only when a new analysis result arrives
    const currentMetaId = analysisResult?.meta.generated_at || null;
    if (routes.length > 0 && currentMetaId && currentMetaId !== previousAnalysisIdRef.current) {
      previousAnalysisIdRef.current = currentMetaId;

      const bounds = computeRoutesBounds(routes);
      if (bounds) {
        const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        map.fitBounds(
          [
            [bounds.minLon, bounds.minLat],
            [bounds.maxLon, bounds.maxLat],
          ],
          {
            padding: { top: 70, bottom: 70, left: 440, right: 70 },
            duration: isReducedMotion ? 0 : 800,
            maxZoom: 11,
          }
        );
      }
    }
  }, [map, isReady, analysisResult, selectedRouteId]);

  // 3. Highlight Hovered Route
  useEffect(() => {
    if (!map || !isReady || !layersInitializedRef.current) return;

    if (map.getLayer("layer-routes-unselected")) {
      map.setPaintProperty(
        "layer-routes-unselected",
        "line-opacity",
        hoveredRouteId ? 0.75 : 0.45
      );
    }
  }, [map, isReady, hoveredRouteId]);

  // 4. Checkpoint Selection & Shared Popup
  useEffect(() => {
    if (!map || !isReady || !layersInitializedRef.current) return;

    const routes = analysisResult?.routes || [];
    const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0] || null;
    const checkpoints = selectedRoute?.checkpoints || [];

    // Reset previous feature state
    if (prevSelectedCheckpointRef.current !== null) {
      map.setFeatureState(
        { source: "source-checkpoints", id: prevSelectedCheckpointRef.current },
        { selected: false }
      );
    }

    if (selectedCheckpointIndex === null) {
      popupRef.current?.remove();
      prevSelectedCheckpointRef.current = null;
      return;
    }

    const cp = checkpoints.find((c) => c.index === selectedCheckpointIndex);
    if (!cp) {
      popupRef.current?.remove();
      prevSelectedCheckpointRef.current = null;
      return;
    }

    // Set new feature state
    map.setFeatureState(
      { source: "source-checkpoints", id: cp.index },
      { selected: true }
    );
    prevSelectedCheckpointRef.current = cp.index;

    // Build DOM popup content safely with tokens
    const popupContainer = document.createElement("div");
    popupContainer.className =
      "p-3 bg-surface border border-border rounded-panel text-left text-text font-sans space-y-2 min-w-[210px] select-none";

    const level = cp.risk?.level || "unknown";
    const levelLabel = level === "unknown" ? "Unforecast" : RISK_LEVELS[level]?.label || "Unknown";

    popupContainer.innerHTML = `
      <div class="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
        <span class="text-14 font-mono font-medium text-text">Mile ${Math.round(cp.mile)}</span>
        <span class="text-12 font-medium px-1.5 py-0.5 rounded border ${
          level === "severe" || level === "no_travel"
            ? "border-risk-severe text-risk-severe bg-risk-severe/10"
            : "border-border text-text-muted bg-bg"
        }">${levelLabel}</span>
      </div>
      <div class="text-12 font-mono text-text-muted">
        ETA: <span class="text-text">${cp.eta_local || "—"}</span>
      </div>
      <div class="grid grid-cols-3 gap-1 py-1 text-12 font-mono border-t border-border/40">
        <div>
          <span class="text-text-muted block text-12">WIND</span>
          <span class="text-text font-medium">${formatMph(cp.weather?.wind_mph)}</span>
        </div>
        <div>
          <span class="text-text-muted block text-12">RAIN</span>
          <span class="text-text font-medium">${formatInHr(cp.weather?.rain_in_hr)}</span>
        </div>
        <div>
          <span class="text-text-muted block text-12">SNOW</span>
          <span class="text-text font-medium">${formatInHr(cp.weather?.snow_in_hr)}</span>
        </div>
      </div>
      ${
        cp.risk?.escalated_by_load
          ? `<div class="p-1.5 bg-risk-severe/15 border border-risk-severe/30 rounded text-12 text-risk-severe font-mono">
               ▲ Load escalation: ${cp.risk.escalation_reason || "Weight threshold exceeded"}
             </div>`
          : ""
      }
    `;

    popupRef.current
      ?.setLngLat([cp.lon, cp.lat])
      .setDOMContent(popupContainer)
      .addTo(map);
  }, [map, isReady, analysisResult, selectedRouteId, selectedCheckpointIndex]);

  return null;
}
