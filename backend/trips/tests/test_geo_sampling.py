"""
test_geo_sampling.py – Tests for geo helpers and checkpoint sampling.
"""

from __future__ import annotations

import pytest

from trips.services import (
    Checkpoint,
    cumulative_miles,
    haversine_miles,
    point_at_mile,
    sample_checkpoints,
    segment_miles_owned,
)

# ---------------------------------------------------------------------------
# haversine_miles – GeoJSON [lon, lat] order awareness
# ---------------------------------------------------------------------------


def test_haversine_zero_distance() -> None:
    assert haversine_miles(32.0, -97.0, 32.0, -97.0) == 0.0


def test_haversine_dallas_to_denver_approximate() -> None:
    # Dallas, TX: 32.7767, -96.7970
    # Denver, CO: 39.7392, -104.9903
    # Great-circle (haversine) distance ≈ 662 miles
    # Note: road distance is ~920 miles; great-circle is shorter
    dist = haversine_miles(32.7767, -96.7970, 39.7392, -104.9903)
    assert 640 < dist < 690, f"Expected ~662 miles (great-circle), got {dist:.1f}"


def test_haversine_symmetric() -> None:
    d1 = haversine_miles(0.0, 0.0, 10.0, 10.0)
    d2 = haversine_miles(10.0, 10.0, 0.0, 0.0)
    assert abs(d1 - d2) < 1e-9


def test_haversine_geojson_lon_lat_note_in_cumulative() -> None:
    # Confirm that cumulative_miles expects [lon, lat] pairs:
    # Dallas [lon, lat] = [-96.797, 32.777]
    # Denver [lon, lat] = [-104.990, 39.739]
    geom = [[-96.797, 32.777], [-104.990, 39.739]]
    cum = cumulative_miles(geom)
    assert len(cum) == 2
    assert cum[0] == 0.0
    # Great-circle (haversine) distance ≈ 662 miles (road is ~920)
    assert 640 < cum[1] < 690, f"Expected ~662 miles (great-circle), got {cum[1]:.1f}"


# ---------------------------------------------------------------------------
# cumulative_miles
# ---------------------------------------------------------------------------


def test_cumulative_miles_single_point() -> None:
    cum = cumulative_miles([[0.0, 0.0]])
    assert cum == [0.0]


def test_cumulative_miles_duplicate_consecutive_points_safe() -> None:
    # Two identical points → zero-length segment, no division by zero
    geom = [[0.0, 0.0], [0.0, 0.0], [1.0, 0.0]]
    cum = cumulative_miles(geom)
    assert len(cum) == 3
    assert cum[0] == 0.0
    assert cum[1] == 0.0  # zero-length segment
    assert cum[2] > 0.0


def test_cumulative_miles_monotone_non_decreasing() -> None:
    geom = [[-96.0, 32.0], [-98.0, 34.0], [-100.0, 36.0], [-104.0, 39.0]]
    cum = cumulative_miles(geom)
    for i in range(1, len(cum)):
        assert cum[i] >= cum[i - 1]


# ---------------------------------------------------------------------------
# point_at_mile
# ---------------------------------------------------------------------------


def test_point_at_mile_start() -> None:
    geom = [[-96.0, 32.0], [-104.0, 39.0]]
    cum = cumulative_miles(geom)
    lat, lon = point_at_mile(geom, cum, 0.0)
    assert abs(lat - 32.0) < 1e-9
    assert abs(lon - (-96.0)) < 1e-9


def test_point_at_mile_end() -> None:
    geom = [[-96.0, 32.0], [-104.0, 39.0]]
    cum = cumulative_miles(geom)
    lat, lon = point_at_mile(geom, cum, cum[-1])
    assert abs(lat - 39.0) < 1e-9
    assert abs(lon - (-104.0)) < 1e-9


def test_point_at_mile_clamp_below() -> None:
    geom = [[-96.0, 32.0], [-104.0, 39.0]]
    cum = cumulative_miles(geom)
    lat, lon = point_at_mile(geom, cum, -999.0)
    assert abs(lat - 32.0) < 1e-9


def test_point_at_mile_clamp_above() -> None:
    geom = [[-96.0, 32.0], [-104.0, 39.0]]
    cum = cumulative_miles(geom)
    lat, lon = point_at_mile(geom, cum, 99999.0)
    assert abs(lat - 39.0) < 1e-9


def test_point_at_mile_midpoint_of_two_point_line() -> None:
    # Simple 2-point geometry; midpoint should be at the average lat/lon
    geom = [[0.0, 0.0], [2.0, 2.0]]
    cum = cumulative_miles(geom)
    lat, lon = point_at_mile(geom, cum, cum[-1] / 2)
    # Should be approximately at [lat=1, lon=1] (not exactly due to haversine)
    assert 0.9 < lat < 1.1
    assert 0.9 < lon < 1.1


def test_point_at_mile_empty_geometry_raises() -> None:
    with pytest.raises(ValueError):
        point_at_mile([], [], 0.0)


def test_point_at_mile_length_mismatch_raises() -> None:
    with pytest.raises(ValueError):
        point_at_mile([[0.0, 0.0]], [0.0, 100.0], 50.0)


def test_point_at_mile_duplicate_consecutive_safe() -> None:
    # Duplicate points: zero-length segment must not cause division by zero
    geom = [[0.0, 0.0], [0.0, 0.0], [2.0, 2.0]]
    cum = cumulative_miles(geom)
    # mile 0 → first point; calling with 0 should work
    lat, lon = point_at_mile(geom, cum, 0.0)
    assert abs(lat - 0.0) < 1e-9
    assert abs(lon - 0.0) < 1e-9


# ---------------------------------------------------------------------------
# sample_checkpoints
# ---------------------------------------------------------------------------


def _straight_line_geometry(n_segments: int = 10) -> list[list[float]]:
    """Build a simple west-to-east geometry with n_segments points."""
    # Straight line along the equator spanning ~1 degree per step
    return [[float(i), 0.0] for i in range(n_segments + 1)]


def test_sample_100_mile_route_25_mile_interval() -> None:
    """A 100-mile route sampled every 25 miles: mile 0, 25, 50, 75, 100."""
    # Build geometry spanning exactly 100 haversine miles along equator
    # Using a known distance: ~69.1 miles per degree of longitude at equator
    # We'll use a simple geometry and pass total_distance_miles=100
    geom = [[float(i), 0.0] for i in range(11)]  # 10 segments
    checkpoints = sample_checkpoints(geom, total_distance_miles=100.0, interval_miles=25)
    miles = [cp.mile for cp in checkpoints]
    assert miles == [0.0, 25.0, 50.0, 75.0, 100.0]
    assert all(cp.index == i for i, cp in enumerate(checkpoints))


def test_sample_110_mile_route_25_interval_has_final_destination() -> None:
    """A 110-mile route: 0, 25, 50, 75, 100, then a final at 110."""
    geom = [[float(i), 0.0] for i in range(12)]
    checkpoints = sample_checkpoints(geom, total_distance_miles=110.0, interval_miles=25)
    miles = [cp.mile for cp in checkpoints]
    assert miles == [0.0, 25.0, 50.0, 75.0, 100.0, 110.0]


def test_sample_interval_larger_than_route_gives_start_and_end() -> None:
    """When interval > route length, should give mile 0 and destination only."""
    geom = [[0.0, 0.0], [0.5, 0.0]]
    checkpoints = sample_checkpoints(geom, total_distance_miles=20.0, interval_miles=25)
    miles = [cp.mile for cp in checkpoints]
    assert miles == [0.0, 20.0]


def test_sample_invalid_interval_raises() -> None:
    geom = [[0.0, 0.0], [1.0, 0.0]]
    with pytest.raises(ValueError, match="interval_miles"):
        sample_checkpoints(geom, total_distance_miles=100.0, interval_miles=15)


def test_sample_empty_geometry_raises() -> None:
    with pytest.raises(ValueError, match="geometry"):
        sample_checkpoints([], total_distance_miles=100.0, interval_miles=25)


def test_sample_non_positive_distance_raises() -> None:
    geom = [[0.0, 0.0], [1.0, 0.0]]
    with pytest.raises(ValueError, match="total_distance_miles"):
        sample_checkpoints(geom, total_distance_miles=0.0, interval_miles=25)


def test_sample_duplicate_consecutive_points_safe() -> None:
    geom = [[0.0, 0.0], [0.0, 0.0], [1.0, 0.0]]
    checkpoints = sample_checkpoints(geom, total_distance_miles=50.0, interval_miles=25)
    assert len(checkpoints) >= 2
    assert checkpoints[0].mile == 0.0
    assert checkpoints[-1].mile == 50.0


def test_sample_lon_lat_order_respected() -> None:
    # Dallas [lon=-96.797, lat=32.777] and Denver [lon=-104.990, lat=39.739]
    geom = [[-96.797, 32.777], [-104.990, 39.739]]
    checkpoints = sample_checkpoints(geom, total_distance_miles=920.0, interval_miles=50)
    # First checkpoint should be near Dallas (lat ~32.7)
    assert abs(checkpoints[0].lat - 32.777) < 1.0
    assert abs(checkpoints[0].lon - (-96.797)) < 1.0
    # Last checkpoint should be near Denver
    assert abs(checkpoints[-1].lat - 39.739) < 1.0
    assert abs(checkpoints[-1].lon - (-104.990)) < 1.0


# ---------------------------------------------------------------------------
# segment_miles_owned
# ---------------------------------------------------------------------------


def _make_checkpoints(miles: list[float]) -> list[Checkpoint]:
    return [Checkpoint(index=i, mile=m, lat=0.0, lon=0.0) for i, m in enumerate(miles)]


@pytest.mark.parametrize(
    "miles, total",
    [
        ([0.0, 25.0, 50.0, 75.0, 100.0], 100.0),
        ([0.0, 25.0, 50.0, 75.0, 100.0, 110.0], 110.0),
        ([0.0, 100.0], 100.0),
        ([0.0, 10.0, 20.0, 30.0, 40.0, 50.0], 50.0),
        ([0.0, 50.0], 100.0),  # only start and end, 100-mile route
    ],
)
def test_segment_miles_owned_sums_to_total(miles: list[float], total: float) -> None:
    cps = _make_checkpoints(miles)
    owned = segment_miles_owned(cps, total)
    assert abs(sum(owned) - total) < 1e-9, f"Sum {sum(owned):.6f} != {total}"


def test_segment_miles_owned_single_checkpoint_owns_total() -> None:
    cps = _make_checkpoints([0.0])
    owned = segment_miles_owned(cps, 100.0)
    assert owned == [100.0]


def test_segment_miles_owned_midpoint_rule() -> None:
    # 3 checkpoints at 0, 50, 100 on a 100-mile route
    # Midpoints: between 0 and 50 → 25; between 50 and 100 → 75
    # Owned: cp0 → [0, 25] = 25; cp1 → [25, 75] = 50; cp2 → [75, 100] = 25
    cps = _make_checkpoints([0.0, 50.0, 100.0])
    owned = segment_miles_owned(cps, 100.0)
    assert abs(owned[0] - 25.0) < 1e-9
    assert abs(owned[1] - 50.0) < 1e-9
    assert abs(owned[2] - 25.0) < 1e-9


def test_segment_miles_owned_empty_raises() -> None:
    with pytest.raises(ValueError):
        segment_miles_owned([], 100.0)
