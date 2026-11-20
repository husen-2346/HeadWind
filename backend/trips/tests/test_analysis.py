"""
test_analysis.py – Tests for analyze_route and RouteSummary aggregation.
"""

from __future__ import annotations

import pytest

from trips.services import (
    Checkpoint,
    RiskLevel,
    Weather,
    analyze_route,
)


def _make_checkpoints(miles: list[float]) -> list[Checkpoint]:
    return [Checkpoint(index=i, mile=m, lat=0.0, lon=0.0) for i, m in enumerate(miles)]


# ---------------------------------------------------------------------------
# Hand-computed small route
# ---------------------------------------------------------------------------


def test_analyze_route_hand_computed_small() -> None:
    """
    4 checkpoints at miles 0, 25, 50, 100 on a 100-mile route.
    Owned miles (midpoint rule):
      cp0 (0 mi):  right midpoint=(0+25)/2=12.5  → owns [0, 12.5]   = 12.5 mi
      cp1 (25 mi): midpoints 12.5 and 37.5       → owns [12.5, 37.5] = 25.0 mi
      cp2 (50 mi): midpoints 37.5 and 75.0       → owns [37.5, 75.0] = 37.5 mi
      cp3 (100 mi):                              → owns [75.0, 100]  = 25.0 mi

    Weather: cp0=Low(0), cp1=Moderate(1), cp2=Severe(3), cp3=High(2)
    """
    cps = _make_checkpoints([0.0, 25.0, 50.0, 100.0])
    weather_map = {
        0: Weather(wind_mph=10.0),  # Low
        1: Weather(wind_mph=28.0),  # Moderate
        2: Weather(wind_mph=50.0),  # Severe
        3: Weather(wind_mph=40.0),  # High
    }
    _, summary = analyze_route(
        cps,
        weather_map,
        load_lb=10_000,
        total_miles=100.0,
        duration_seconds=7200.0,
    )

    assert summary.distance_miles == 100.0
    assert summary.duration_seconds == 7200.0
    assert summary.unknown_miles == 0.0

    # miles by level
    assert abs(summary.miles_by_level[RiskLevel.LOW] - 12.5) < 1e-6
    assert abs(summary.miles_by_level[RiskLevel.MODERATE] - 25.0) < 1e-6
    assert abs(summary.miles_by_level[RiskLevel.SEVERE] - 37.5) < 1e-6
    assert abs(summary.miles_by_level[RiskLevel.HIGH] - 25.0) < 1e-6

    # shortcuts
    assert abs(summary.severe_miles - 37.5) < 1e-6
    assert abs(summary.high_miles - 25.0) < 1e-6
    assert summary.no_travel_miles == 0.0

    # avg_risk (mile-weighted): (12.5*0 + 25*1 + 37.5*3 + 25*2) / 100
    expected_avg = (12.5 * 0 + 25.0 * 1 + 37.5 * 3 + 25.0 * 2) / 100.0
    assert abs(summary.avg_risk - expected_avg) < 1e-6

    # max level
    assert summary.max_level == RiskLevel.SEVERE


def test_analyze_route_all_unknown_weather() -> None:
    """When no weather is provided, all miles are unknown."""
    cps = _make_checkpoints([0.0, 50.0, 100.0])
    _, summary = analyze_route(cps, {}, load_lb=10_000, total_miles=100.0, duration_seconds=3600.0)
    assert abs(summary.unknown_miles - 100.0) < 1e-6
    assert summary.avg_risk == 0.0
    assert summary.max_level is None


def test_analyze_route_mixed_known_unknown() -> None:
    """Only some checkpoints have weather; unknown miles tracked separately."""
    cps = _make_checkpoints([0.0, 50.0, 100.0])
    # cp0 and cp2 known; cp1 unknown
    weather_map = {
        0: Weather(wind_mph=10.0),  # Low
        2: Weather(wind_mph=50.0),  # Severe
    }
    _, summary = analyze_route(
        cps, weather_map, load_lb=10_000, total_miles=100.0, duration_seconds=3600.0
    )
    # cp0 owns 25 mi (known), cp1 owns 50 mi (unknown), cp2 owns 25 mi (known)
    assert abs(summary.unknown_miles - 50.0) < 1e-6
    assert abs(summary.miles_by_level[RiskLevel.LOW] - 25.0) < 1e-6
    assert abs(summary.miles_by_level[RiskLevel.SEVERE] - 25.0) < 1e-6


def test_analyze_route_empty_checkpoints_raises() -> None:
    with pytest.raises(ValueError):
        analyze_route([], {}, load_lb=10_000, total_miles=100.0, duration_seconds=3600.0)


def test_analyze_route_no_travel_miles_counted() -> None:
    cps = _make_checkpoints([0.0, 100.0])
    weather_map = {0: Weather(wind_mph=60.0), 1: Weather(wind_mph=60.0)}
    _, summary = analyze_route(
        cps, weather_map, load_lb=10_000, total_miles=100.0, duration_seconds=3600.0
    )
    assert summary.no_travel_miles == 100.0
    assert summary.max_level == RiskLevel.NO_TRAVEL
