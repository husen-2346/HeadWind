"""
types.py – Frozen dataclasses and enums for the Headwind risk engine.

No Django imports. Import these from anywhere in the service layer.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum


class RiskLevel(IntEnum):
    """Numeric risk level.  Higher == more dangerous.

    Use as integers for arithmetic (avg_risk, ranking key) and
    as named constants for display logic.
    """

    LOW = 0
    MODERATE = 1
    HIGH = 2
    SEVERE = 3
    NO_TRAVEL = 4


@dataclass(frozen=True)
class Weather:
    """Observed or forecast weather at a single checkpoint.

    Any field may be None when the data source did not return a value.
    None fields are excluded from risk classification (they never raise
    or lower the risk level by themselves).

    Units:
        wind_mph  – sustained wind speed in mph  (not gusts)
        rain_in_hr – precipitation rate (rain) in inches per hour
        snow_in_hr – precipitation rate (snow/sleet) in inches per hour
    """

    wind_mph: float | None = None
    rain_in_hr: float | None = None
    snow_in_hr: float | None = None


@dataclass(frozen=True)
class Checkpoint:
    """A single sampled point along a route.

    Attributes:
        index   – 0-based position in the checkpoint list
        mile    – distance from the route origin (miles)
        lat     – latitude  (degrees)
        lon     – longitude (degrees)

    Note: GeoJSON geometry is [lon, lat] order. The Checkpoint stores
    conventional (lat, lon) order for clarity.
    """

    index: int
    mile: float
    lat: float
    lon: float


@dataclass(frozen=True)
class CheckpointRisk:
    """Risk assessment for one checkpoint.

    Attributes:
        level               – final risk level (None if all weather fields
                              are None, i.e. the checkpoint is unknown)
        wind_level          – individual wind risk (None if wind_mph is None)
        rain_level          – individual rain risk (None if rain_in_hr is None)
        snow_level          – individual snow risk (None if snow_in_hr is None)
        escalated_by_load   – True only when a load rule raised the level
                              above what the thresholds alone would give
        escalation_reason   – plain-text explanation of the escalation;
                              None when escalated_by_load is False
    """

    level: RiskLevel | None
    wind_level: RiskLevel | None
    rain_level: RiskLevel | None
    snow_level: RiskLevel | None
    escalated_by_load: bool
    escalation_reason: str | None


@dataclass(frozen=True)
class RouteSummary:
    """Aggregate risk statistics for one route candidate.

    Attributes:
        distance_miles   – total route length in miles
        duration_seconds – estimated travel time in seconds
        miles_by_level   – dict mapping RiskLevel → owned miles at that level
        unknown_miles    – miles whose checkpoints had no weather data
        severe_miles     – shortcut: miles_by_level[SEVERE]   (or 0.0)
        high_miles       – shortcut: miles_by_level[HIGH]     (or 0.0)
        no_travel_miles  – shortcut: miles_by_level[NO_TRAVEL](or 0.0)
        avg_risk         – mile-weighted mean of the numeric risk level
                           over KNOWN miles (0.0 when no known miles)
        max_level        – highest RiskLevel seen; None if all unknown
    """

    distance_miles: float
    duration_seconds: float
    miles_by_level: dict[RiskLevel, float]
    unknown_miles: float
    severe_miles: float
    high_miles: float
    no_travel_miles: float
    avg_risk: float
    max_level: RiskLevel | None


@dataclass(frozen=True)
class RouteComparison:
    """Explanation of why the best route beats one specific alternative."""

    route_id: str
    criterion: str  # e.g. "severe_miles"
    best_value: object  # value for the best route on that criterion
    other_value: object  # value for this alternative route


@dataclass(frozen=True)
class Recommendation:
    """The ranking result for a set of route candidates.

    Attributes:
        best_route_id    – the winning route's identifier
        ranked_route_ids – all routes, best-first
        decided_by       – the first criterion that broke the tie
                           between best and runner-up; "tie" if equal
        comparisons      – one RouteComparison per non-best route
        headline         – single human-readable sentence summarising the
                           recommendation
    """

    best_route_id: str
    ranked_route_ids: list[str]
    decided_by: str
    comparisons: list[RouteComparison]
    headline: str
