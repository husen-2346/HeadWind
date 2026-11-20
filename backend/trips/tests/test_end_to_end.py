"""
test_end_to_end.py – Integration test: build synthetic route, attach weather,
run analyze_route, assert full summary, then rank.
"""

from __future__ import annotations

from trips.services import (
    RiskLevel,
    Weather,
    analyze_route,
    rank_routes,
    sample_checkpoints,
)


def test_end_to_end_synthetic_100_mile_route() -> None:
    """
    Synthetic 100-mile route with 25-mile intervals, load 42,000 lb.

    Geometry: straight line east along equator (11 points, [lon, lat]).
    total_distance_miles = 100 (authoritative).

    Checkpoints at: 0, 25, 50, 75, 100 mi.

    Weather assignment:
      mile  0 → wind 10 mph (Low)
      mile 25 → wind 28 mph (Moderate)
      mile 50 → wind 40 mph, load 42,000 lb → escalates to Severe
      mile 75 → wind 60 mph → No Travel
      mile100 → all None (unknown)

    Owned miles (midpoint rule):
      cp0  → [0, 12.5]      = 12.5 mi → Low
      cp1  → [12.5, 37.5]   = 25.0 mi → Moderate
      cp2  → [37.5, 62.5]   = 25.0 mi → Severe  (load escalation)
      cp3  → [62.5, 87.5]   = 25.0 mi → No Travel
      cp4  → [87.5, 100]    = 12.5 mi → Unknown

    Expected summary:
      miles_by_level: LOW=12.5, MODERATE=25.0, SEVERE=25.0, NO_TRAVEL=25.0
      unknown_miles = 12.5
      known_miles   = 87.5
      avg_risk = (12.5×0 + 25×1 + 25×3 + 25×4) / 87.5
               = (0 + 25 + 75 + 100) / 87.5
               = 200 / 87.5
               = 2.2857...
      max_level = NO_TRAVEL
      no_travel_miles = 25.0
      severe_miles    = 25.0
    """
    geom = [[float(i), 0.0] for i in range(11)]
    checkpoints = sample_checkpoints(geom, total_distance_miles=100.0, interval_miles=25)
    assert [cp.mile for cp in checkpoints] == [0.0, 25.0, 50.0, 75.0, 100.0]

    weather_map = {
        0: Weather(wind_mph=10.0),  # Low
        1: Weather(wind_mph=28.0),  # Moderate
        2: Weather(wind_mph=40.0),  # High → Severe via load
        3: Weather(wind_mph=60.0),  # No Travel
        # 4 is intentionally missing → unknown
    }

    load_lb = 42_000  # > 40,000 → triggers load escalation at wind 40 mph

    risks, summary = analyze_route(
        checkpoints,
        weather_map,
        load_lb=load_lb,
        total_miles=100.0,
        duration_seconds=5 * 3600,
    )

    # --- Individual checkpoint risks ---
    assert risks[0].level == RiskLevel.LOW
    assert risks[1].level == RiskLevel.MODERATE
    assert risks[2].level == RiskLevel.SEVERE
    assert risks[2].escalated_by_load is True
    assert risks[3].level == RiskLevel.NO_TRAVEL
    assert risks[4].level is None  # unknown

    # --- Summary ---
    assert abs(summary.unknown_miles - 12.5) < 1e-6
    assert abs(summary.miles_by_level[RiskLevel.LOW] - 12.5) < 1e-6
    assert abs(summary.miles_by_level[RiskLevel.MODERATE] - 25.0) < 1e-6
    assert abs(summary.miles_by_level[RiskLevel.SEVERE] - 25.0) < 1e-6
    assert abs(summary.miles_by_level[RiskLevel.NO_TRAVEL] - 25.0) < 1e-6
    assert abs(summary.no_travel_miles - 25.0) < 1e-6
    assert abs(summary.severe_miles - 25.0) < 1e-6

    expected_avg = 200.0 / 87.5
    assert abs(summary.avg_risk - expected_avg) < 1e-6

    assert summary.max_level == RiskLevel.NO_TRAVEL


def test_end_to_end_ranking_two_routes() -> None:
    """Route comparison: safe route wins over route with severe miles."""
    geom = [[float(i), 0.0] for i in range(11)]

    # Route A: moderate weather everywhere
    cps_a = sample_checkpoints(geom, total_distance_miles=100.0, interval_miles=25)
    weather_a = {i: Weather(wind_mph=20.0) for i in range(5)}  # all Low
    _, summary_a = analyze_route(
        cps_a, weather_a, load_lb=10_000, total_miles=100.0, duration_seconds=5 * 3600
    )

    # Route B: severe weather on half the route
    cps_b = sample_checkpoints(geom, total_distance_miles=100.0, interval_miles=25)
    weather_b = {
        0: Weather(wind_mph=20.0),
        1: Weather(wind_mph=20.0),
        2: Weather(wind_mph=50.0),  # Severe
        3: Weather(wind_mph=50.0),  # Severe
        4: Weather(wind_mph=20.0),
    }
    _, summary_b = analyze_route(
        cps_b, weather_b, load_lb=10_000, total_miles=100.0, duration_seconds=4 * 3600
    )

    rec = rank_routes({"A": summary_a, "B": summary_b})
    assert rec.best_route_id == "A"
    assert rec.decided_by == "severe_miles"
    assert "Severe" in rec.headline
