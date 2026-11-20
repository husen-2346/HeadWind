"""
eta.py – Estimated time of arrival calculations.

ETA is computed by linear interpolation along a distance-time profile.
Phase 2 may supply a richer per-segment profile from the Mapbox API;
the linear 2-point profile produced by linear_profile() is the fallback.

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
    two surrounding profile points.  Values outside the profile range are
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
    # miles[idx-1] < mile <= miles[idx]  (or exactly at a sample point)
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
    Phase 2 may replace this with a per-segment profile from the
    Mapbox Directions API's leg durations.

    Args:
        total_miles:   Route length in miles.
        total_seconds: Total travel time in seconds.

    Returns:
        Tuple of (cumulative_miles_profile, cumulative_seconds_profile),
        each a 2-element list: [0.0, total].
    """
    return [0.0, total_miles], [0.0, total_seconds]


def eta_datetime(departure: datetime, seconds: float) -> datetime:
    """Return the absolute arrival datetime at a checkpoint.

    Args:
        departure: The trip departure instant. MUST be timezone-aware
                   (tzinfo must not be None). Pass a UTC-aware datetime
                   or one with a local tzinfo.
        seconds:   Elapsed travel seconds from departure to this checkpoint.

    Returns:
        A timezone-aware datetime representing the checkpoint arrival time.
        The timezone is preserved from *departure*.

    Raises:
        ValueError: if *departure* is timezone-naive (tzinfo is None).
    """
    if departure.tzinfo is None:
        raise ValueError(
            "departure must be a timezone-aware datetime (tzinfo must not be None). "
            "Use datetime(..., tzinfo=timezone.utc) or attach a local tzinfo."
        )
    return departure + timedelta(seconds=seconds)
