/**
 * heatmapMock.ts – Deterministic mock weather corridor heatmap generator.
 *
 * Generates an offline 49-hour corridor heatmap over the Dallas-Denver trip fixture.
 */

import { dallasDenverFixture } from "./index";
import type { HeatmapPoint, HeatmapResponse, TripAnalysisResponse } from "@/types/api";

export function generateMockHeatmap(
  fixture: TripAnalysisResponse = dallasDenverFixture,
  loadLb: number = 42000
): HeatmapResponse {
  const pointsMap = new Map<string, HeatmapPoint>();

  for (const route of fixture.routes) {
    for (const cp of route.checkpoints) {
      // Lateral spread around checkpoint coordinates
      const offsets = [
        [0, 0],
        [0.25, 0],
        [-0.25, 0],
        [0, 0.25],
        [0, -0.25],
        [0.25, 0.25],
        [-0.25, -0.25],
      ];

      for (const [dLat, dLon] of offsets) {
        const sLat = Math.round((cp.lat + dLat) / 0.25) * 0.25;
        const sLon = Math.round((cp.lon + dLon) / 0.25) * 0.25;
        const key = `${sLat.toFixed(2)},${sLon.toFixed(2)}`;

        if (!pointsMap.has(key)) {
          const levels: number[] = [];
          for (let h = 0; h < 49; h++) {
            // Deterministic synthetic storm wave moving across the corridor over time
            const wave = Math.sin((sLon + 105) * 0.85 + (sLat - 32) * 0.65 + h * 0.14);
            let lvl = 0;
            if (wave > 0.8) {
              lvl = loadLb > 40000 ? 3 : 2; // Escalated by heavy load
            } else if (wave > 0.5) {
              lvl = 2; // High
            } else if (wave > 0.15) {
              lvl = 1; // Moderate
            } else {
              lvl = 0; // Low
            }
            levels.push(lvl);
          }
          pointsMap.set(key, { lat: sLat, lon: sLon, levels });
        }
      }
    }
  }

  const points = Array.from(pointsMap.values()).slice(0, 280);
  const now = new Date();
  now.setMinutes(0, 0, 0);

  return {
    meta: {
      start_utc: now.toISOString(),
      hour_count: 49,
      timezone: fixture.request.origin_timezone || "America/Chicago",
      timezone_abbr: "CST",
      load_lb: loadLb,
      departure_hour_offset: 18,
      weather_status: "ok",
      point_count: points.length,
    },
    warnings: [],
    points,
  };
}
