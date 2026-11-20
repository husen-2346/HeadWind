/**
 * geo.ts – Geographic utilities for the Headwind frontend.
 */

export const EARTH_RADIUS_MILES = 3958.8;

/**
 * Calculates the great-circle distance between two (lat, lon) points in statute miles.
 */
export function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
    return 0;
  }

  const toRad = Math.PI / 180;
  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;
  const deltaPhi = (lat2 - lat1) * toRad;
  const deltaLambda = (lon2 - lon1) * toRad;

  const sinDPhi = Math.sin(deltaPhi / 2.0);
  const sinDLambda = Math.sin(deltaLambda / 2.0);

  const a = sinDPhi * sinDPhi + Math.cos(phi1) * Math.cos(phi2) * sinDLambda * sinDLambda;
  const clampedA = Math.max(0.0, Math.min(1.0, a));
  const c = 2.0 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1.0 - clampedA));

  return EARTH_RADIUS_MILES * c;
}
