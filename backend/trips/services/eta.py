"""
eta.py – Estimated time of arrival calculations and profile building.

ETA is computed by linear interpolation along a distance-time profile.
Builds profile from Mapbox leg annotations, with fallback to 2-point linear profile.

No Django imports. No network calls.
"""

from __future__ import annotations

import bisect
from collections.abc import Sequence
from datetime import datetime, timedelta


def eta_seconds_at_mile(
    mile: float,
    cumulative_miles_profile: Sequence[float],
    cumulative_seconds_profile: Sequence[float],
) -> float:
    """Return the elapsed seconds to reach *mile* by interpolating a profile.

    Uses bisect for O(log n) lookup then linear interpolation between the
    two surrounding profile points. Values outside the profile range are
    clamped to the first / last value.

    Args:
        mile:                       Target distance from origin (miles).
        cumulative_miles_profile:   Sorted sequence of mile values in the
                                    profile (non-decreasing).
        cumulative_seconds_profile: Corresponding elapsed seconds.
                                    Must have the same length.

    Returns:
        Elapsed seconds (float, clamped to [0, max_seconds]).

    Raises:
        ValueError: if the two profiles have different lengths.
        ValueError: if cumulative_miles_profile is empty.
    """
    if len(cumulative_miles_profile) != len(cumulative_seconds_profile):
        raise ValueError(
            "cumulative_miles_profile and cumulative_seconds_profile must have the same length"
        )
    if not cumulative_miles_profile:
        raise ValueError("profiles must not be empty")

    miles = cumulative_miles_profile
    secs = cumulative_seconds_profile

    # Clamp
    if mile <= miles[0]:
        return float(secs[0])
    if mile >= miles[-1]:
        return float(secs[-1])

    # bisect_right: insert position *after* any equal values
    idx = bisect.bisect_right(miles, mile)
    # miles[idx-1] < mile <= miles[idx]
    hi = idx
    lo = idx - 1

    seg_miles = miles[hi] - miles[lo]
    if seg_miles == 0.0:
        return float(secs[lo])

    t = (mile - miles[lo]) / seg_miles
    return secs[lo] + t * (secs[hi] - secs[lo])


def linear_profile(
    total_miles: float,
    total_seconds: float,
) -> tuple[list[float], list[float]]:
    """Create a simple 2-point linear distance-time profile.

    Assumes constant average speed throughout the route.
    """
    return [0.0, total_miles], [0.0, total_seconds]


def build_profile_from_annotations(
    distance_m: list[float] | None,
    duration_s: list[float] | None,
    total_miles: float,
    max_points: int = 2000,
) -> tuple[list[float], list[float]]:
    """Build a scaled, thinned distance-time profile from route annotations.

    Cumulative miles are scaled so the total exactly matches total_miles.
    Thinned to at most max_points to optimize memory and search performance.

    Falls back to linear_profile if annotations are unavailable or mismatched.
    """
    if not distance_m or not duration_s or len(distance_m) != len(duration_s):
        total_sec = sum(duration_s) if duration_s else 0.0
        return linear_profile(total_miles, total_sec)

    cum_m = [0.0]
    cum_s = [0.0]
    running_m = 0.0
    running_s = 0.0

    for d, s in zip(distance_m, duration_s, strict=False):
        running_m += max(0.0, d)
        running_s += max(0.0, s)
        cum_m.append(running_m)
        cum_s.append(running_s)

    raw_total_miles = running_m / 1609.344
    if raw_total_miles > 0 and total_miles > 0:
        scale = total_miles / raw_total_miles
        miles_prof = [(m / 1609.344) * scale for m in cum_m]
    else:
        miles_prof = [m / 1609.344 for m in cum_m]

    secs_prof = cum_s

    # Thinning to max_points
    n = len(miles_prof)
    if n > max_points:
        step = max(1, n // max_points)
        indices = list(range(0, n, step))
        if indices[-1] != n - 1:
            indices.append(n - 1)
        miles_prof = [miles_prof[i] for i in indices]
        secs_prof = [secs_prof[i] for i in indices]

    return miles_prof, secs_prof


def eta_datetime(departure: datetime, seconds: float) -> datetime:
    """Return the absolute arrival datetime at a checkpoint.

    Args:
        departure: The trip departure instant. MUST be timezone-aware.
        seconds:   Elapsed travel seconds from departure to this checkpoint.

    Returns:
        A timezone-aware datetime representing the checkpoint arrival time.

    Raises:
        ValueError: if departure is timezone-naive.
    """
    if departure.tzinfo is None:
        raise ValueError("departure must be a timezone-aware datetime (tzinfo must not be None).")
    return departure + timedelta(seconds=seconds)
