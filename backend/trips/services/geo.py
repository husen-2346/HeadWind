"""
geo.py – Pure geometric helpers for route geometry.

IMPORTANT: GeoJSON geometry uses [longitude, latitude] coordinate order.
Every function in this module that accepts geometry coordinates expects
them in [lon, lat] order (as returned by Mapbox Directions API).
Latitude and longitude are stored separately in Checkpoint objects
in conventional (lat, lon) order.

No Django imports. No network calls. All functions are deterministic.
"""

from __future__ import annotations

import math
from collections.abc import Sequence

from .constants import EARTH_RADIUS_MILES


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance in miles between two WGS-84 points.

    Args:
        lat1, lon1: First point in decimal degrees (conventional lat/lon order).
        lat2, lon2: Second point in decimal degrees (conventional lat/lon order).

    Returns:
        Distance in miles (non-negative).

    Note:
        This function uses conventional (lat, lon) argument order.
        Callers receiving GeoJSON [lon, lat] pairs must swap before calling.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lon2 - lon1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_MILES * c


def cumulative_miles(geometry: Sequence[Sequence[float]]) -> list[float]:
    """Return cumulative haversine distances along a GeoJSON LineString.

    Args:
        geometry: Sequence of [lon, lat] coordinate pairs in GeoJSON order.
                  Must contain at least one point.

    Returns:
        A list of floats with the same length as *geometry*.
        cumulative_miles[0] is always 0.0.
        cumulative_miles[i] is the total haversine distance from the first
        point to geometry[i], in miles.

    Implementation note:
        Duplicate consecutive points (zero-length segments) are handled
        safely: the cumulative distance just stays the same, no division
        by zero can occur here.
    """
    if not geometry:
        return []

    result: list[float] = [0.0]
    running = 0.0

    for i in range(1, len(geometry)):
        lon1, lat1 = geometry[i - 1][0], geometry[i - 1][1]  # GeoJSON [lon, lat]
        lon2, lat2 = geometry[i][0], geometry[i][1]
        # swap to (lat, lon) for haversine_miles
        seg = haversine_miles(lat1, lon1, lat2, lon2)
        running += seg
        result.append(running)

    return result


def point_at_mile(
    geometry: Sequence[Sequence[float]],
    cumulative: Sequence[float],
    mile: float,
) -> tuple[float, float]:
    """Return the (lat, lon) of the point at *mile* along the route.

    Uses linear interpolation between the two surrounding geometry vertices.
    Clamps to the first / last point when *mile* is outside the range.

    Args:
        geometry:   Sequence of [lon, lat] coordinate pairs (GeoJSON order).
        cumulative: Cumulative distances as returned by cumulative_miles().
                    Must have the same length as *geometry*.
        mile:       Target distance from the route start (miles).

    Returns:
        (latitude, longitude) in conventional order.

    Raises:
        ValueError: if geometry is empty or lengths mismatch.

    Note:
        Duplicate consecutive points produce zero-length segments.
        When *mile* falls inside a zero-length segment the first of the
        two identical points is returned (safe, no division by zero).
    """
    if not geometry:
        raise ValueError("geometry must not be empty")
    if len(geometry) != len(cumulative):
        raise ValueError("geometry and cumulative must have the same length")

    # Clamp to bounds
    if mile <= cumulative[0]:
        return geometry[0][1], geometry[0][0]  # (lat, lon)
    if mile >= cumulative[-1]:
        return geometry[-1][1], geometry[-1][0]

    # Binary search for the segment that contains mile
    lo, hi = 0, len(cumulative) - 1
    while lo + 1 < hi:
        mid = (lo + hi) // 2
        if cumulative[mid] <= mile:
            lo = mid
        else:
            hi = mid

    seg_len = cumulative[hi] - cumulative[lo]
    if seg_len == 0.0:
        # Duplicate point – return it directly
        return geometry[lo][1], geometry[lo][0]

    t = (mile - cumulative[lo]) / seg_len
    lon1, lat1 = geometry[lo][0], geometry[lo][1]
    lon2, lat2 = geometry[hi][0], geometry[hi][1]
    lat = lat1 + t * (lat2 - lat1)
    lon = lon1 + t * (lon2 - lon1)
    return lat, lon


def geometry_slice(
    geometry: Sequence[Sequence[float]],
    cumulative: Sequence[float],
    start_mile: float,
    end_mile: float,
) -> list[list[float]]:
    """Return the sub-polyline of GeoJSON [lon, lat] points between start_mile and end_mile.

    Includes the interpolated point at start_mile, any original vertices
    lying strictly between start_mile and end_mile, and the interpolated
    point at end_mile.

    Args:
        geometry:   GeoJSON [lon, lat] coordinates.
        cumulative: Cumulative distances matching geometry.
        start_mile: Start distance along route (miles).
        end_mile:   End distance along route (miles).

    Returns:
        List of [lon, lat] coordinates.
    """
    if not geometry:
        return []
    if len(geometry) != len(cumulative):
        raise ValueError("geometry and cumulative must have the same length")

    # Clamp bounds to route range
    total_len = cumulative[-1]
    s_mi = max(0.0, min(start_mile, total_len))
    e_mi = max(s_mi, min(end_mile, total_len))

    start_lat, start_lon = point_at_mile(geometry, cumulative, s_mi)
    start_pt = [start_lon, start_lat]

    if e_mi <= s_mi:
        return [start_pt]

    end_lat, end_lon = point_at_mile(geometry, cumulative, e_mi)
    end_pt = [end_lon, end_lat]

    slice_coords: list[list[float]] = [start_pt]
    for i, cum in enumerate(cumulative):
        if s_mi < cum < e_mi:
            pt = [geometry[i][0], geometry[i][1]]
            slice_coords.append(pt)

    slice_coords.append(end_pt)

    # Deduplicate adjacent identical points
    deduped: list[list[float]] = [slice_coords[0]]
    for pt in slice_coords[1:]:
        if pt[0] != deduped[-1][0] or pt[1] != deduped[-1][1]:
            deduped.append(pt)

    return deduped
