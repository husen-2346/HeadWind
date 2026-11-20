"""
sampling.py – Checkpoint sampling along a route geometry.

Checkpoints are placed at mile 0, N, 2N, 3N, ... and always include
a final checkpoint at the route destination (total_distance_miles) unless
it coincides with a regular interval point.

No Django imports. No network calls.
"""

from __future__ import annotations

from .geo import cumulative_miles, point_at_mile
from .types import Checkpoint

VALID_INTERVALS = {10, 25, 50}


def sample_checkpoints(
    geometry: list[list[float]],
    total_distance_miles: float,
    interval_miles: int,
) -> list[Checkpoint]:
    """Sample checkpoints along a route at regular mile intervals.

    The routing API's reported distance (total_distance_miles) is treated
    as the authoritative route length.  The haversine cumulative distances
    are scaled so they span exactly total_distance_miles.  This avoids
    systematic bias from the spherical approximation on long routes.

    Args:
        geometry:             GeoJSON coordinate pairs [[lon, lat], ...].
        total_distance_miles: Authoritative route length from the routing API
                              (miles).
        interval_miles:       Sampling interval; must be 10, 25, or 50.

    Returns:
        List of Checkpoint objects, ordered by ascending mile.
        Always includes mile 0 and the destination mile.

    Raises:
        ValueError: if interval_miles is not in {10, 25, 50}.
        ValueError: if geometry is empty.
        ValueError: if total_distance_miles <= 0.
    """
    if interval_miles not in VALID_INTERVALS:
        raise ValueError(f"interval_miles must be one of {VALID_INTERVALS}, got {interval_miles}")
    if not geometry:
        raise ValueError("geometry must not be empty")
    if total_distance_miles <= 0:
        raise ValueError(f"total_distance_miles must be > 0, got {total_distance_miles}")

    raw_cumulative = cumulative_miles(geometry)
    raw_total = raw_cumulative[-1]

    # Build a scaled cumulative array so its max = total_distance_miles.
    # If the raw haversine total is 0 (all points identical), keep all zeros.
    if raw_total > 0:
        scale = total_distance_miles / raw_total
        scaled = [d * scale for d in raw_cumulative]
    else:
        scaled = raw_cumulative[:]

    # Determine the mile targets
    targets: list[float] = []
    mile = 0.0
    while mile < total_distance_miles:
        targets.append(mile)
        mile += interval_miles

    # Append destination unless it coincides with the last regular point
    if not targets or abs(targets[-1] - total_distance_miles) > 1e-9:
        targets.append(total_distance_miles)

    checkpoints: list[Checkpoint] = []
    for idx, target_mile in enumerate(targets):
        lat, lon = point_at_mile(geometry, scaled, target_mile)
        checkpoints.append(Checkpoint(index=idx, mile=target_mile, lat=lat, lon=lon))

    return checkpoints


def segment_miles_owned(
    checkpoints: list[Checkpoint],
    total_miles: float,
) -> list[float]:
    """Compute the miles "owned" by each checkpoint.

    Each checkpoint owns the miles from the midpoint between it and the
    previous checkpoint to the midpoint between it and the next checkpoint.
    The first checkpoint owns from mile 0.
    The last checkpoint owns to total_miles.

    The owned miles always sum to total_miles.

    Args:
        checkpoints: Ordered list of Checkpoint objects.
        total_miles: Total route length in miles.

    Returns:
        List of float with the same length as checkpoints.

    Raises:
        ValueError: if checkpoints is empty.
    """
    if not checkpoints:
        raise ValueError("checkpoints must not be empty")

    n = len(checkpoints)
    if n == 1:
        return [total_miles]

    miles = [cp.mile for cp in checkpoints]
    owned: list[float] = []

    for i in range(n):
        left = 0.0 if i == 0 else (miles[i - 1] + miles[i]) / 2.0

        right = total_miles if i == n - 1 else (miles[i] + miles[i + 1]) / 2.0

        owned.append(right - left)

    return owned
