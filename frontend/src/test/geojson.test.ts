import { describe, it, expect } from "vitest";
import {
  buildRoutesGeoJson,
  buildCheckpointsGeoJson,
  buildEndpointsGeoJson,
  computeRoutesBounds,
} from "@/components/map/geojson";
import dallasDenverFixture from "@/mocks/dallas-denver.json";
import type { TripAnalysisResponse } from "@/types/api";

describe("Map GeoJSON Builders", () => {
  const fixture = dallasDenverFixture as unknown as TripAnalysisResponse;
  const routes = fixture.routes;

  it("builds unselected routes and selected route casing/segments", () => {
    const selectedRouteId = routes[0].id;
    const { unselected, selectedCasing, selectedSegments } = buildRoutesGeoJson(
      routes,
      selectedRouteId
    );

    // Unselected routes should contain the other 2 routes
    expect(unselected.features.length).toBe(routes.length - 1);
    expect(unselected.features.every((f) => f.properties?.route_id !== selectedRouteId)).toBe(true);

    // Selected casing should be 1 feature
    expect(selectedCasing.features.length).toBe(1);

    // Selected segments should contain risk_segments
    expect(selectedSegments.features.length).toBe(routes[0].risk_segments.length);
    expect(selectedSegments.features[0].properties?.level).toBeDefined();
  });

  it("builds checkpoints GeoJSON with numeric IDs for feature-state", () => {
    const checkpoints = routes[0].checkpoints;
    const fc = buildCheckpointsGeoJson(checkpoints);

    expect(fc.features.length).toBe(checkpoints.length);
    expect(fc.features[0].id).toBe(checkpoints[0].index);
    expect(typeof fc.features[0].id).toBe("number");
    expect(fc.features[0].properties?.level).toBeDefined();
    expect(fc.features[0].properties?.icon_name).toContain("checkpoint-");
  });

  it("builds endpoints GeoJSON for origin and destination", () => {
    const origin: [number, number] = [-96.797, 32.7767];
    const destination: [number, number] = [-104.9903, 39.7392];

    const endpoints = buildEndpointsGeoJson(origin, destination);
    expect(endpoints.features.length).toBe(2);
    expect(endpoints.features[0].properties?.kind).toBe("origin");
    expect(endpoints.features[1].properties?.kind).toBe("destination");
  });

  it("computes accurate bounding box across routes", () => {
    const bounds = computeRoutesBounds(routes);
    expect(bounds).not.toBeNull();
    expect(bounds!.minLon).toBeLessThan(bounds!.maxLon);
    expect(bounds!.minLat).toBeLessThan(bounds!.maxLat);
  });
});
