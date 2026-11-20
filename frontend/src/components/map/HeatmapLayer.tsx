/**
 * HeatmapLayer.tsx – Mapbox circle layer for continuous weather risk corridor.
 *
 * Uses data-driven paint expressions updated via setPaintProperty inside
 * requestAnimationFrame to deliver 60 fps time-scrubbing with zero GeoJSON rebuilds.
 */

import { useEffect, useRef } from "react";
import type { GeoJSONSource } from "mapbox-gl";
import type { FeatureCollection, Point } from "geojson";
import { useMap } from "./MapContext";
import { useAppStore } from "@/stores/appStore";
import { useHeatmap } from "@/hooks/useHeatmap";
import type { HeatmapRequest } from "@/types/api";

const SOURCE_ID = "source-corridor-heatmap";
const LAYER_ID = "layer-corridor-heatmap";

// Risk ramp colors for paint expression
// 0: Low (faint blue), 1: Moderate (yellow), 2: High (orange), 3: Severe (red), 4: No Travel (purple)
function buildCircleColorExpression(hour: number) {
  return [
    "match",
    ["at", hour, ["get", "levels"]],
    0,
    "rgba(46, 156, 202, 0.45)",
    1,
    "#E8C547",
    2,
    "#F28C28",
    3,
    "#D1344B",
    4,
    "#6A1B4D",
    /* fallback / -1 unknown */
    "rgba(0, 0, 0, 0)",
  ];
}

export function HeatmapLayer() {
  const { map, isReady } = useMap();

  const mode = useAppStore((s) => s.mode);
  const forecastHour = useAppStore((s) => s.forecastHour);
  const analysisResult = useAppStore((s) => s.analysisResult);

  // Build heatmap request from analysisResult
  const heatmapRequest: HeatmapRequest | null = analysisResult
    ? {
        origin: analysisResult.request.origin as [number, number],
        destination: analysisResult.request.destination as [number, number],
        departure_local: analysisResult.request.departure_local,
        load_lb: analysisResult.request.load_lb,
      }
    : null;

  const { data: heatmapData } = useHeatmap(heatmapRequest);

  const layerAddedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const prevForecastHourRef = useRef<number>(forecastHour);

  // 1. Initialize Mapbox Source & Layer
  useEffect(() => {
    if (!map || !isReady || layerAddedRef.current) return;

    const emptyFc: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: [],
    };

    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: emptyFc,
      });
    }

    if (!map.getLayer(LAYER_ID)) {
      // Find beforeLayer: insert below route lines
      const beforeId = map.getLayer("layer-routes-unselected")
        ? "layer-routes-unselected"
        : undefined;

      map.addLayer(
        {
          id: LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          layout: {
            visibility: mode === "heatmap" ? "visible" : "none",
            "circle-sort-key": ["at", forecastHour, ["get", "levels"]] as unknown as number,
          },
          paint: {
            "circle-color": buildCircleColorExpression(forecastHour) as unknown as string,
            "circle-radius": [
              "interpolate",
              ["exponential", 1.5],
              ["zoom"],
              4,
              18,
              6,
              34,
              8,
              68,
              10,
              130,
              12,
              230,
            ],
            "circle-blur": 0.85,
            "circle-opacity": 0.5,
          },
        },
        beforeId
      );
      layerAddedRef.current = true;
    }
  }, [map, isReady, forecastHour, mode]);

  // 2. Update GeoJSON Source when heatmapData arrives
  useEffect(() => {
    if (!map || !isReady || !heatmapData) return;

    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) return;

    const fc: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: heatmapData.points.map((pt, idx) => ({
        type: "Feature",
        id: idx,
        geometry: {
          type: "Point",
          coordinates: [pt.lon, pt.lat],
        },
        properties: {
          levels: pt.levels,
        },
      })),
    };

    source.setData(fc);
  }, [map, isReady, heatmapData]);

  // 3. Toggle Visibility based on app mode
  useEffect(() => {
    if (!map || !isReady || !map.getLayer(LAYER_ID)) return;
    map.setLayoutProperty(LAYER_ID, "visibility", mode === "heatmap" ? "visible" : "none");
  }, [map, isReady, mode]);

  // 4. Update Paint Property on forecastHour change via requestAnimationFrame (Zero refetch / rebuild)
  useEffect(() => {
    if (!map || !isReady || !map.getLayer(LAYER_ID)) return;
    if (prevForecastHourRef.current === forecastHour) return;
    prevForecastHourRef.current = forecastHour;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      if (!map.getLayer(LAYER_ID)) return;
      map.setPaintProperty(
        LAYER_ID,
        "circle-color",
        buildCircleColorExpression(forecastHour) as unknown as string
      );
      map.setLayoutProperty(LAYER_ID, "circle-sort-key", [
        "at",
        forecastHour,
        ["get", "levels"],
      ] as unknown as number);
    });

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [map, isReady, forecastHour]);

  return null;
}
