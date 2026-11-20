"""
test_recommend.py – Tests for route ranking and recommendation generation.

Covers:
  - Severe beats everything below
  - Tie on Severe → falls to High
  - Tie on High → avg risk
  - Tie on avg_risk → duration
  - No Travel loses to any route without it
  - Incomplete data (unknown_miles > 0) ranks after complete
  - Rounding (differences under 0.05 mi treated as equal)
  - Full tie resolved by route_id
  - Single route works
  - Empty input raises
  - Headline format matching spec examples
"""

from __future__ import annotations

import pytest

from trips.services import RiskLevel, RouteSummary, rank_routes


def _make_summary(
    *,
    no_travel_miles: float = 0.0,
    severe_miles: float = 0.0,
    high_miles: float = 0.0,
    avg_risk: float = 0.0,
    duration_seconds: float = 7200.0,
    unknown_miles: float = 0.0,
    distance_miles: float = 500.0,
    max_level: RiskLevel | None = RiskLevel.LOW,
) -> RouteSummary:
    miles_by_level: dict[RiskLevel, float] = dict.fromkeys(RiskLevel, 0.0)
    miles_by_level[RiskLevel.NO_TRAVEL] = no_travel_miles
    miles_by_level[RiskLevel.SEVERE] = severe_miles
    miles_by_level[RiskLevel.HIGH] = high_miles
    return RouteSummary(
        distance_miles=distance_miles,
        duration_seconds=duration_seconds,
        miles_by_level=miles_by_level,
        unknown_miles=unknown_miles,
        severe_miles=severe_miles,
        high_miles=high_miles,
        no_travel_miles=no_travel_miles,
        avg_risk=avg_risk,
        max_level=max_level,
    )


# ---------------------------------------------------------------------------
# Ranking correctness
# ---------------------------------------------------------------------------


def test_severe_miles_beats_everything_below() -> None:
    summaries = {
        "A": _make_summary(severe_miles=10.0),
        "B": _make_summary(severe_miles=0.0),
    }
    rec = rank_routes(summaries)
    assert rec.best_route_id == "B"
    assert rec.ranked_route_ids == ["B", "A"]
    assert rec.decided_by == "severe_miles"


def test_tie_on_severe_falls_to_high() -> None:
    summaries = {
        "A": _make_summary(severe_miles=5.0, high_miles=20.0),
        "B": _make_summary(severe_miles=5.0, high_miles=5.0),
    }
    rec = rank_routes(summaries)
    assert rec.best_route_id == "B"
    assert rec.decided_by == "high_miles"


def test_tie_on_high_falls_to_avg_risk() -> None:
    summaries = {
        "A": _make_summary(high_miles=10.0, avg_risk=2.5),
        "B": _make_summary(high_miles=10.0, avg_risk=1.5),
    }
    rec = rank_routes(summaries)
    assert rec.best_route_id == "B"
    assert rec.decided_by == "avg_risk"


def test_tie_on_avg_risk_falls_to_duration() -> None:
    summaries = {
        "A": _make_summary(avg_risk=1.5, duration_seconds=7200.0),
        "B": _make_summary(avg_risk=1.5, duration_seconds=3600.0),
    }
    rec = rank_routes(summaries)
    assert rec.best_route_id == "B"
    assert rec.decided_by == "duration_minutes"


def test_no_travel_loses_to_any_route_without_it() -> None:
    summaries = {
        "A": _make_summary(no_travel_miles=50.0, severe_miles=0.0, high_miles=0.0),
        "B": _make_summary(no_travel_miles=0.0, severe_miles=100.0, high_miles=100.0),
    }
    rec = rank_routes(summaries)
    assert rec.best_route_id == "B"
    assert rec.decided_by == "no_travel_miles"


def test_incomplete_data_ranks_after_complete() -> None:
    summaries = {
        "A": _make_summary(unknown_miles=10.0, severe_miles=0.0),
        "B": _make_summary(unknown_miles=0.0, severe_miles=50.0),
    }
    rec = rank_routes(summaries)
    assert rec.best_route_id == "B"
    assert rec.decided_by == "unknown weather"


def test_rounding_tie_under_0_05_mi_treated_as_equal() -> None:
    # Severe difference of 0.04 mi rounds to same at 1 decimal
    summaries = {
        "A": _make_summary(severe_miles=10.00, avg_risk=2.0),
        "B": _make_summary(severe_miles=10.04, avg_risk=1.0),  # rounds to 10.0
    }
    rec = rank_routes(summaries)
    # B should win on avg_risk since severe rounds the same
    assert rec.best_route_id == "B"
    assert rec.decided_by == "avg_risk"


def test_full_tie_resolved_by_route_id() -> None:
    summaries = {
        "C": _make_summary(),
        "A": _make_summary(),
        "B": _make_summary(),
    }
    rec = rank_routes(summaries)
    # All equal → sorted by route_id ascending
    assert rec.best_route_id == "A"
    assert rec.ranked_route_ids == ["A", "B", "C"]
    assert rec.decided_by == "route_id (tie)"


def test_single_route_works() -> None:
    summaries = {"solo": _make_summary()}
    rec = rank_routes(summaries)
    assert rec.best_route_id == "solo"
    assert rec.ranked_route_ids == ["solo"]
    assert len(rec.comparisons) == 0


def test_empty_input_raises() -> None:
    with pytest.raises(ValueError):
        rank_routes({})


# ---------------------------------------------------------------------------
# Headline format – Dallas to Denver scenario
# A: 46 Severe mi; B: 0 Severe mi, 28 High mi; C: 0 Severe mi, 61 High mi
# ---------------------------------------------------------------------------


def test_headline_dallas_denver_severe_criterion() -> None:
    summaries = {
        "A": _make_summary(severe_miles=46.0, high_miles=0.0, duration_seconds=10 * 3600),
        "B": _make_summary(severe_miles=0.0, high_miles=28.0, duration_seconds=12 * 3600),
        "C": _make_summary(severe_miles=0.0, high_miles=61.0, duration_seconds=11 * 3600),
    }
    rec = rank_routes(summaries)
    assert rec.best_route_id == "B"
    # Ranking: B=(0,0,28,0,720,"B"), C=(0,0,61,0,660,"C"), A=(0,46,0,0,600,"A")
    # Best=B, runner-up=C → B beats C on high_miles (both have 0 severe)
    assert rec.decided_by == "high_miles"
    headline = rec.headline
    # Headline should mention B, 28 High miles, and vs C
    assert "B" in headline
    assert "28" in headline
    assert "High" in headline


def test_headline_high_miles_criterion() -> None:
    summaries = {
        "B": _make_summary(severe_miles=0.0, high_miles=28.0, duration_seconds=12 * 3600),
        "C": _make_summary(severe_miles=0.0, high_miles=61.0, duration_seconds=11 * 3600),
    }
    rec = rank_routes(summaries)
    assert rec.best_route_id == "B"
    assert rec.decided_by == "high_miles"
    headline = rec.headline
    assert "B" in headline
    assert "28" in headline
    assert "High" in headline


def test_comparisons_populated_for_non_best_routes() -> None:
    summaries = {
        "A": _make_summary(severe_miles=10.0),
        "B": _make_summary(severe_miles=0.0),
        "C": _make_summary(severe_miles=5.0),
    }
    rec = rank_routes(summaries)
    assert rec.best_route_id == "B"
    # Should have comparisons for C and A
    comp_ids = {c.route_id for c in rec.comparisons}
    assert comp_ids == {"A", "C"}


# ---------------------------------------------------------------------------
# Full ranking order check with 3 routes
# ---------------------------------------------------------------------------


def test_full_ranking_order_three_routes() -> None:
    summaries = {
        "A": _make_summary(severe_miles=46.0, duration_seconds=10 * 3600),
        "B": _make_summary(severe_miles=0.0, high_miles=28.0, duration_seconds=12 * 3600),
        "C": _make_summary(severe_miles=0.0, high_miles=61.0, duration_seconds=11 * 3600),
    }
    rec = rank_routes(summaries)
    assert rec.ranked_route_ids == ["B", "C", "A"]
