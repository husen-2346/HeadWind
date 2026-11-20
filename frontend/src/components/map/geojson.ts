import type { FeatureCollection, Feature, LineString, Point } from "geojson";
import type { RouteOption, Checkpoint } from "@/types/api";

export interface GeoJsonBounds {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

/**
 * Builds GeoJSON FeatureCollections for unselected and selected routes.
 */
export function buildRoutesGeoJson(
  routes: RouteOption[],
  selectedRouteId: string | null
): {
  unselected: FeatureCollection<LineString>;
  selectedCasing: FeatureCollection<LineString>;
  selectedSegments: FeatureCollection<LineString>;
} {
  const unselectedFeatures: Feature<LineString>[] = [];
  const selectedCasingFeatures: Feature<LineString>[] = [];
  const selectedSegmentFeatures: Feature<LineString>[] = [];

  for (const route of routes) {
    const isSelected = route.id === selectedRouteId;

    if (!isSelected) {
      unselectedFeatures.push({
        type: "Feature",
        id: route.id,
        properties: {
          route_id: route.id,
          name: route.name,
          source: route.source,
        },
        geometry: {
          type: "LineString",
          coordinates: route.geometry,
        },
      });
    } else {
      // Selected Route casing (full polyline)
      selectedCasingFeatures.push({
        type: "Feature",
        id: `casing-${route.id}`,
        properties: {
          route_id: route.id,
        },
        geometry: {
          type: "LineString",
          coordinates: route.geometry,
        },
      });

      // Selected Route risk segments (colored by risk level)
      if (route.risk_segments && route.risk_segments.length > 0) {
        route.risk_segments.forEach((seg, idx) => {
          selectedSegmentFeatures.push({
            type: "Feature",
            id: `seg-${route.id}-${idx}`,
            properties: {
              route_id: route.id,
              level: seg.level || "unknown",
              start_mile: seg.start_mile,
              end_mile: seg.end_mile,
            },
            geometry: {
              type: "LineString",
              coordinates: seg.geometry,
            },
          });
        });
      } else {
        // Fallback if risk segments are absent: single neutral segment
        selectedSegmentFeatures.push({
          type: "Feature",
          id: `seg-${route.id}-fallback`,
          properties: {
            route_id: route.id,
            level: "unknown",
            start_mile: 0,
            end_mile: route.distance_miles,
          },
          geometry: {
            type: "LineString",
            coordinates: route.geometry,
          },
        });
      }
    }
  }

  return {
    unselected: { type: "FeatureCollection", features: unselectedFeatures },
    selectedCasing: { type: "FeatureCollection", features: selectedCasingFeatures },
    selectedSegments: { type: "FeatureCollection", features: selectedSegmentFeatures },
  };
}

/**
 * Builds GeoJSON FeatureCollection for checkpoints along the selected route.
 */
export function buildCheckpointsGeoJson(
  checkpoints: Checkpoint[]
): FeatureCollection<Point> {
  const features: Feature<Point>[] = checkpoints.map((cp) => {
    const level = cp.risk?.level || "unknown";
    return {
      type: "Feature",
      id: cp.index, // Numeric ID required for mapbox feature-state!
      properties: {
        index: cp.index,
        mile: cp.mile,
        lat: cp.lat,
        lon: cp.lon,
        level,
        icon_name: `checkpoint-${level}`,
        is_escalated: Boolean(cp.risk?.escalated_by_load),
        wind_mph: cp.weather?.wind_mph ?? null,
        rain_in_hr: cp.weather?.rain_in_hr ?? null,
        snow_in_hr: cp.weather?.snow_in_hr ?? null,
        eta_local: cp.eta_local,
        escalation_reason: cp.risk?.escalation_reason ?? null,
      },
      geometry: {
        type: "Point",
        coordinates: [cp.lon, cp.lat],
      },
    };
  });

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Builds GeoJSON FeatureCollection for Start (origin) and End (destination) pins.
 */
export function buildEndpointsGeoJson(
  origin: [number, number] | null,
  destination: [number, number] | null
): FeatureCollection<Point> {
  const features: Feature<Point>[] = [];

  if (origin && Number.isFinite(origin[0]) && Number.isFinite(origin[1])) {
    features.push({
      type: "Feature",
      id: "endpoint-origin",
      properties: {
        kind: "origin",
        label: "Origin",
      },
      geometry: {
        type: "Point",
        coordinates: origin,
      },
    });
  }

  if (destination && Number.isFinite(destination[0]) && Number.isFinite(destination[1])) {
    features.push({
      type: "Feature",
      id: "endpoint-destination",
      properties: {
        kind: "destination",
        label: "Destination",
      },
      geometry: {
        type: "Point",
        coordinates: destination,
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Computes the minimum bounding box covering all routes or coordinates.
 */
export function computeRoutesBounds(routes: RouteOption[]): GeoJsonBounds | null {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  let count = 0;

  for (const r of routes) {
    if (r.geometry && r.geometry.length > 0) {
      for (const [lon, lat] of r.geometry) {
        if (Number.isFinite(lon) && Number.isFinite(lat)) {
          if (lon < minLon) minLon = lon;
          if (lat < minLat) minLat = lat;
          if (lon > maxLon) maxLon = lon;
          if (lat > maxLat) maxLat = lat;
          count++;
        }
      }
    }
  }

  if (count === 0) return null;

  return { minLon, minLat, maxLon, maxLat };
}
