"""
candidates.py – Route candidate generation, geometry simplification, similarity, and selection.

Pure functions. No Django imports. No network calls.
"""

from __future__ import annotations

import math
from dataclasses import replace

from .constants import (
    MAX_DISTANCE_MULTIPLIER,
    MAX_DURATION_MULTIPLIER,
    SIMILARITY_DUPLICATE_THRESHOLD,
    SIMILARITY_SAMPLE_MILES,
    SIMILARITY_TOLERANCE_MILES,
    SIMPLIFY_TOLERANCE_DEG,
)
from .geo import cumulative_miles, haversine_miles, point_at_mile
from .types import RouteCandidate


def offset_waypoint(
    origin: tuple[float, float],
    dest: tuple[float, float],
    along_fraction: float = 0.5,
    offset_fraction: float = 0.15,
    side: str = "left",
    *,
    fraction: float | None = None,
    lateral_frac: float | None = None,
) -> tuple[float, float]:
    """Calculate a via-waypoint offset perpendicularly from the straight-line path.

    Args:
        origin:          (latitude, longitude) of origin in degrees.
        dest:            (latitude, longitude) of destination in degrees.
        along_fraction:  Fraction along origin-dest line (0.0 to 1.0, e.g. 0.5).
        offset_fraction: Fraction of line length to offset (e.g. 0.15, 0.25).
        side:            "left" or "right" relative to travel direction.
        fraction:        Alias for along_fraction.
        lateral_frac:    Signed lateral fraction (+ for right, - for left).

    Returns:
        (latitude, longitude) of waypoint, rounded to 5 decimals.
    """
    if fraction is not None:
        along_fraction = fraction
    if lateral_frac is not None:
        offset_fraction = abs(lateral_frac)
        side = "right" if lateral_frac >= 0 else "left"

    lat1, lon1 = origin
    lat2, lon2 = dest

    # Along point
    lat_along = lat1 + along_fraction * (lat2 - lat1)
    lon_along = lon1 + along_fraction * (lon2 - lon1)

    # Local projection
    dlat = lat2 - lat1
    cos_lat = math.cos(math.radians(lat_along))
    dlon_proj = (lon2 - lon1) * cos_lat

    dist_deg = math.hypot(dlat, dlon_proj)
    if dist_deg < 1e-9:
        return round(lat_along, 5), round(lon_along, 5)

    side_lower = side.strip().lower()
    if side_lower == "left":
        perp_lat_u = -dlon_proj / dist_deg
        perp_lon_u = dlat / dist_deg
    elif side_lower == "right":
        perp_lat_u = dlon_proj / dist_deg
        perp_lon_u = -dlat / dist_deg
    else:
        raise ValueError(f"side must be 'left' or 'right', got {side}")

    offset_deg = dist_deg * offset_fraction
    off_lat = lat_along + perp_lat_u * offset_deg
    scale_lon = cos_lat if abs(cos_lat) > 1e-6 else 1.0
    off_lon = lon_along + (perp_lon_u * offset_deg) / scale_lon

    # Clamp bounds
    off_lat = max(-89.9, min(89.9, off_lat))
    off_lon = max(-180.0, min(180.0, off_lon))
    return round(off_lat, 5), round(off_lon, 5)


def _point_to_segment_distance_deg(
    pt: list[float], line_start: list[float], line_end: list[float]
) -> float:
    """Distance from point [lon, lat] to line segment [start, end] in degrees."""
    x, y = pt[0], pt[1]
    x1, y1 = line_start[0], line_start[1]
    x2, y2 = line_end[0], line_end[1]

    dx = x2 - x1
    dy = y2 - y1
    if dx == 0 and dy == 0:
        return math.hypot(x - x1, y - y1)

    # Projection parameter
    t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    proj_x = x1 + t * dx
    proj_y = y1 + t * dy
    return math.hypot(x - proj_x, y - proj_y)


def simplify_polyline(
    coords: list[list[float]],
    tolerance_deg: float = SIMPLIFY_TOLERANCE_DEG,
) -> list[list[float]]:
    """Iterative Ramer-Douglas-Peucker polyline simplification.

    Operates without recursion to handle polylines with 20k+ vertices safely.
    Coordinates are GeoJSON [lon, lat]. Output rounded to 5 decimals.
    """
    if len(coords) <= 2:
        return [[round(c[0], 5), round(c[1], 5)] for c in coords]

    n = len(coords)
    keep = [False] * n
    keep[0] = True
    keep[-1] = True

    # Stack holds (start_index, end_index)
    stack: list[tuple[int, int]] = [(0, n - 1)]

    while stack:
        start_idx, end_idx = stack.pop()
        dmax = -1.0
        max_idx = start_idx

        start_pt = coords[start_idx]
        end_pt = coords[end_idx]

        for i in range(start_idx + 1, end_idx):
            d = _point_to_segment_distance_deg(coords[i], start_pt, end_pt)
            if d > dmax:
                dmax = d
                max_idx = i

        if dmax > tolerance_deg:
            keep[max_idx] = True
            stack.append((start_idx, max_idx))
            stack.append((max_idx, end_idx))

    return [[round(coords[i][0], 5), round(coords[i][1], 5)] for i in range(n) if keep[i]]


def _densify_and_grid(
    coords: list[list[float]], grid_size: float = 0.05, step_deg: float = 0.015
) -> dict[tuple[int, int], list[tuple[float, float]]]:
    """Index polyline coordinates into a spatial hash grid for fast nearest-neighbor checks.

    Points in the grid are stored as (lat, lon).
    """
    grid: dict[tuple[int, int], list[tuple[float, float]]] = {}

    def add_pt(lat: float, lon: float) -> None:
        cell = (int(math.floor(lat / grid_size)), int(math.floor(lon / grid_size)))
        grid.setdefault(cell, []).append((lat, lon))

    for i in range(len(coords)):
        lon, lat = coords[i][0], coords[i][1]
        add_pt(lat, lon)
        if i > 0:
            prev_lon, prev_lat = coords[i - 1][0], coords[i - 1][1]
            seg_dist = math.hypot(lat - prev_lat, lon - prev_lon)
            if seg_dist > step_deg:
                steps = int(math.ceil(seg_dist / step_deg))
                for step in range(1, steps):
                    frac = step / steps
                    i_lat = prev_lat + frac * (lat - prev_lat)
                    i_lon = prev_lon + frac * (lon - prev_lon)
                    add_pt(i_lat, i_lon)

    return grid


def _sample_points_along_route(
    coords: list[list[float]], interval_miles: float
) -> list[tuple[float, float]]:
    """Sample (lat, lon) points along a GeoJSON line at regular mile intervals."""
    if not coords:
        return []
    cum = cumulative_miles(coords)
    total_len = cum[-1]
    if total_len == 0.0:
        return [(coords[0][1], coords[0][0])]

    points: list[tuple[float, float]] = []
    m = 0.0
    while m < total_len:
        points.append(point_at_mile(coords, cum, m))
        m += interval_miles

    points.append(point_at_mile(coords, cum, total_len))
    return points


def route_similarity(
    a: list[list[float]],
    b: list[list[float]],
    sample_miles: float = SIMILARITY_SAMPLE_MILES,
    tolerance_miles: float = SIMILARITY_TOLERANCE_MILES,
) -> float:
    """Compute bidirectional geometric route similarity in range [0.0, 1.0].

    Samples route A every sample_miles and checks fraction within tolerance_miles of B.
    Does the same in reverse. Similarity is min(overlap_A_in_B, overlap_B_in_A).
    """
    if not a or not b:
        return 0.0

    samples_a = _sample_points_along_route(a, sample_miles)
    samples_b = _sample_points_along_route(b, sample_miles)

    if not samples_a or not samples_b:
        return 0.0

    grid_size = 0.05  # ~3.5 miles
    grid_b = _densify_and_grid(b, grid_size=grid_size)
    grid_a = _densify_and_grid(a, grid_size=grid_size)

    def compute_overlap(
        samples: list[tuple[float, float]],
        grid: dict[tuple[int, int], list[tuple[float, float]]],
    ) -> float:
        hits = 0
        for s_lat, s_lon in samples:
            c_x = int(math.floor(s_lat / grid_size))
            c_y = int(math.floor(s_lon / grid_size))
            matched = False

            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    cell = (c_x + dx, c_y + dy)
                    pts = grid.get(cell, [])
                    for p_lat, p_lon in pts:
                        if haversine_miles(s_lat, s_lon, p_lat, p_lon) <= tolerance_miles:
                            matched = True
                            break
                    if matched:
                        break
                if matched:
                    break

            if matched:
                hits += 1

        return hits / len(samples)

    overlap_ab = compute_overlap(samples_a, grid_b)
    overlap_ba = compute_overlap(samples_b, grid_a)

    return min(overlap_ab, overlap_ba)


def select_routes(candidates: list[RouteCandidate], max_routes: int = 3) -> list[RouteCandidate]:
    """Filter detour outliers, remove duplicates, and greedily select distinct routes.

    Labels selected routes A, B, C in ascending duration order.
    """
    if not candidates:
        return []

    # Step a: Detour filter
    min_dist = min(c.distance_miles for c in candidates)
    min_dur = min(c.duration_seconds for c in candidates)

    filtered = [
        c
        for c in candidates
        if c.distance_miles <= MAX_DISTANCE_MULTIPLIER * min_dist
        and c.duration_seconds <= MAX_DURATION_MULTIPLIER * min_dur
    ]
    if not filtered:
        filtered = candidates[:]

    # Step b: Remove duplicates (similarity >= 0.90), keeping faster one
    filtered.sort(key=lambda c: c.duration_seconds)
    deduped: list[RouteCandidate] = []
    for cand in filtered:
        is_dup = any(
            route_similarity(cand.geometry, kept.geometry) >= SIMILARITY_DUPLICATE_THRESHOLD
            for kept in deduped
        )
        if not is_dup:
            deduped.append(cand)

    # Step c: Greedy selection maximizing diversity
    if len(deduped) <= max_routes:
        chosen = deduped
    else:
        chosen = [deduped[0]]
        pool = deduped[1:]

        while len(chosen) < max_routes and pool:
            best_candidate = None
            best_max_sim = 2.0

            for cand in pool:
                max_sim = max(route_similarity(cand.geometry, ch.geometry) for ch in chosen)
                if max_sim < best_max_sim:
                    best_max_sim = max_sim
                    best_candidate = cand
                elif (
                    abs(max_sim - best_max_sim) < 1e-4
                    and best_candidate is not None
                    and cand.duration_seconds < best_candidate.duration_seconds
                ):
                    best_candidate = cand

            if best_candidate is not None:
                chosen.append(best_candidate)
                pool.remove(best_candidate)
            else:
                break

    # Step d: Sort by duration ascending and assign letters A, B, C...
    chosen.sort(key=lambda c: c.duration_seconds)
    labeled = [replace(c, id=chr(ord("A") + i)) for i, c in enumerate(chosen[:max_routes])]
    return labeled
