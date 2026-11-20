"""
test_heatmap.py – Unit and integration tests for weather corridor heatmap endpoint and services.

Tests (no network):
  - offset_point & bearing_degrees
  - corridor_points (dedupe, cap, lateral offsets, bearing)
  - hour indexing & departure_hour_offset (inside/outside 0..48)
  - level arrays with hand-made weather (load escalation & missing data)
  - partial and unavailable weather statuses
  - cache hit makes zero HTTP calls
  - response shape & validation
  - throttling (12/min)
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient

from trips.clients.mapbox import MapboxClient
from trips.clients.open_meteo import OpenMeteoClient
from trips.errors import UpstreamWeatherError
from trips.services.geo import (
    bearing_degrees,
    corridor_points,
    haversine_miles,
    offset_point,
)
from trips.services.types import RouteCandidate
from trips.usecases.heatmap import CorridorHeatmapAnalyzer

DALLAS = [-96.7970, 32.7767]
DENVER = [-104.9903, 39.7392]


@pytest.fixture(autouse=True)
def _clear_cache_between_tests():
    cache.clear()
    yield
    cache.clear()


def _make_dummy_route(cand_id: str = "route_1", distance_miles: float = 800.0) -> RouteCandidate:
    geometry = [
        [-96.7970, 32.7767],
        [-98.5000, 34.5000],
        [-100.5000, 36.5000],
        [-102.5000, 38.0000],
        [-104.9903, 39.7392],
    ]
    return RouteCandidate(
        id=cand_id,
        source="primary",
        name=f"Test Route {cand_id}",
        distance_miles=distance_miles,
        duration_seconds=36000.0,
        geometry=geometry,
    )


def _make_hourly_forecast(base_time: datetime, wind_mph: float = 15.0) -> dict[str, list]:
    times = [(base_time + timedelta(hours=i)).isoformat() for i in range(72)]
    return {
        "time": times,
        "wind_speed_10m": [wind_mph] * 72,
        "rain": [0.0] * 72,
        "showers": [0.0] * 72,
        "snowfall": [0.0] * 72,
    }


# =====================================================================
# 1. Geo: offset_point & bearing_degrees
# =====================================================================


def test_bearing_degrees():
    assert bearing_degrees(0.0, 0.0, 1.0, 0.0) == pytest.approx(0.0, abs=0.1)  # Due North
    assert bearing_degrees(0.0, 0.0, 0.0, 1.0) == pytest.approx(90.0, abs=0.1)  # Due East
    assert bearing_degrees(0.0, 0.0, -1.0, 0.0) == pytest.approx(180.0, abs=0.1)  # Due South
    assert bearing_degrees(0.0, 0.0, 0.0, -1.0) == pytest.approx(270.0, abs=0.1)  # Due West


def test_offset_point():
    # Zero miles returns identical point
    lat, lon = offset_point(35.0, -97.0, 45.0, 0.0)
    assert (lat, lon) == (35.0, -97.0)

    # 100 miles due North
    lat_n, lon_n = offset_point(35.0, -97.0, 0.0, 100.0)
    assert lat_n > 35.0
    assert lon_n == pytest.approx(-97.0, abs=1e-3)
    dist = haversine_miles(35.0, -97.0, lat_n, lon_n)
    assert dist == pytest.approx(100.0, abs=0.1)

    # 50 miles due East
    lat_e, lon_e = offset_point(35.0, -97.0, 90.0, 50.0)
    dist_e = haversine_miles(35.0, -97.0, lat_e, lon_e)
    assert dist_e == pytest.approx(50.0, abs=0.1)


# =====================================================================
# 2. Corridor Points: dedupe, grid snapping, capping, lateral offsets
# =====================================================================


def test_corridor_points_snapping_and_dedupe():
    geom1 = [[-97.0, 35.0], [-97.0, 36.0]]
    points = corridor_points([geom1], spacing_miles=20.0, lateral_miles=15.0, cell_deg=0.25)
    assert len(points) > 0

    # Verify all points are snapped to 0.25 grid
    for lat, lon in points:
        assert (lat / 0.25) == pytest.approx(round(lat / 0.25), abs=1e-5)
        assert (lon / 0.25) == pytest.approx(round(lon / 0.25), abs=1e-5)

    # Verify strict uniqueness (no duplicates)
    assert len(points) == len(set(points))


def test_corridor_points_capping():
    # Long route with very dense initial spacing
    geom = [[-105.0, 32.0], [-95.0, 40.0]]
    max_pts = 40
    points = corridor_points(
        [geom],
        spacing_miles=5.0,
        lateral_miles=25.0,
        cell_deg=0.25,
        max_points=max_pts,
    )
    assert len(points) <= max_pts


def test_corridor_points_lateral_offsets():
    # Straight north-south route
    geom = [[-97.0, 32.0], [-97.0, 33.0]]
    points = corridor_points(
        [geom],
        spacing_miles=30.0,
        lateral_miles=25.0,
        cell_deg=0.25,
    )
    # Lateral offsets perpendicular to N-S route should be East/West (different longitudes)
    lons = {p[1] for p in points}
    assert len(lons) > 1  # Contains lateral spreads


# =====================================================================
# 3. Heatmap Use Case: Hour indexing & Departure offset
# =====================================================================


def test_heatmap_hour_indexing_and_departure_offset():
    clock_now = datetime(2026, 11, 20, 10, 30, tzinfo=UTC)
    mock_mapbox = MagicMock(spec=MapboxClient)
    mock_mapbox.directions.return_value = [_make_dummy_route()]
    mock_weather = MagicMock(spec=OpenMeteoClient)
    mock_weather.get_forecasts.return_value = {}

    analyzer = CorridorHeatmapAnalyzer(
        mapbox_client=mock_mapbox,
        weather_client=mock_weather,
        clock_now=clock_now,
    )

    # Departure 6 hours after current hour (2026-11-20T16:00:00Z)
    dep_local = "2026-11-20T10:00:00-06:00"  # 16:00 UTC -> +6 hours
    res = analyzer.generate_heatmap(
        origin=DALLAS,
        destination=DENVER,
        departure_local=dep_local,
        load_lb=40000,
    )

    assert res["meta"]["start_utc"] == "2026-11-20T10:00:00Z"
    assert res["meta"]["hour_count"] == 49
    assert res["meta"]["departure_hour_offset"] == 6

    # Departure > 48 hours ahead but <= 72 hours window (55 hours ahead: 2026-11-22T17:00:00Z)
    dep_far = "2026-11-22T11:00:00-06:00"
    res_far = analyzer.generate_heatmap(
        origin=DALLAS,
        destination=DENVER,
        departure_local=dep_far,
        load_lb=40000,
    )
    assert res_far["meta"]["departure_hour_offset"] is None


# =====================================================================
# 4. Level Arrays: hand-made weather & load escalation
# =====================================================================


def test_heatmap_level_arrays_and_load_escalation():
    clock_now = datetime(2026, 11, 20, 10, 0, tzinfo=UTC)
    mock_mapbox = MagicMock(spec=MapboxClient)
    mock_mapbox.directions.return_value = [_make_dummy_route()]

    # Weather: 40 mph wind (Normal High; with >40k lb load -> SEVERE)
    mock_weather = MagicMock(spec=OpenMeteoClient)

    def fake_get_forecasts(coords):
        return {c: _make_hourly_forecast(clock_now, wind_mph=40.0) for c in coords}

    mock_weather.get_forecasts.side_effect = fake_get_forecasts

    # Run with 30,000 lb (Normal load: 40 mph is HIGH = 2)
    analyzer_light = CorridorHeatmapAnalyzer(
        mapbox_client=mock_mapbox,
        weather_client=mock_weather,
        clock_now=clock_now,
    )
    res_light = analyzer_light.generate_heatmap(
        origin=DALLAS,
        destination=DENVER,
        departure_local="2026-11-20T10:00:00Z",
        load_lb=30000,
    )
    p0_light = res_light["points"][0]
    assert len(p0_light["levels"]) == 49
    assert p0_light["levels"][0] == 2  # HIGH

    # Run with 45,000 lb (Heavy load: 40 mph wind escalated to SEVERE = 3)
    analyzer_heavy = CorridorHeatmapAnalyzer(
        mapbox_client=mock_mapbox,
        weather_client=mock_weather,
        clock_now=clock_now,
    )
    res_heavy = analyzer_heavy.generate_heatmap(
        origin=DALLAS,
        destination=DENVER,
        departure_local="2026-11-20T10:00:00Z",
        load_lb=45000,
    )
    p0_heavy = res_heavy["points"][0]
    assert p0_heavy["levels"][0] == 3  # SEVERE


# =====================================================================
# 5. Partial & Unavailable Weather
# =====================================================================


def test_heatmap_partial_and_unavailable_weather():
    clock_now = datetime(2026, 11, 20, 10, 0, tzinfo=UTC)
    mock_mapbox = MagicMock(spec=MapboxClient)
    mock_mapbox.directions.return_value = [_make_dummy_route()]

    # Scenario A: Partial weather (half points have data, half are None)
    mock_weather_partial = MagicMock(spec=OpenMeteoClient)

    def fake_partial(coords):
        res = {}
        for i, c in enumerate(coords):
            res[c] = _make_hourly_forecast(clock_now, wind_mph=10.0) if i % 2 == 0 else None
        return res

    mock_weather_partial.get_forecasts.side_effect = fake_partial

    analyzer_p = CorridorHeatmapAnalyzer(
        mapbox_client=mock_mapbox,
        weather_client=mock_weather_partial,
        clock_now=clock_now,
    )
    res_p = analyzer_p.generate_heatmap(
        origin=DALLAS,
        destination=DENVER,
        departure_local="2026-11-20T10:00:00Z",
        load_lb=40000,
    )
    assert res_p["meta"]["weather_status"] == "partial"
    # Points with missing data have -1
    missing_pt = next(p for p in res_p["points"] if p["levels"][0] == -1)
    assert missing_pt["levels"][0] == -1

    # Scenario B: Upstream weather exception -> unavailable
    cache.clear()
    mock_weather_fail = MagicMock(spec=OpenMeteoClient)
    mock_weather_fail.get_forecasts.side_effect = UpstreamWeatherError("Service timeout")

    analyzer_fail = CorridorHeatmapAnalyzer(
        mapbox_client=mock_mapbox,
        weather_client=mock_weather_fail,
        clock_now=clock_now,
    )
    res_fail = analyzer_fail.generate_heatmap(
        origin=DALLAS,
        destination=DENVER,
        departure_local="2026-11-20T10:00:00Z",
        load_lb=40000,
    )
    assert res_fail["meta"]["weather_status"] == "unavailable"
    for pt in res_fail["points"]:
        assert all(lvl == -1 for lvl in pt["levels"])


# =====================================================================
# 6. Cache hit makes zero HTTP calls
# =====================================================================


def test_heatmap_cache_hit_makes_zero_calls():
    clock_now = datetime(2026, 11, 20, 10, 0, tzinfo=UTC)
    mock_mapbox = MagicMock(spec=MapboxClient)
    # Return 3 distinct routes so variants are not fetched
    mock_mapbox.directions.return_value = [
        _make_dummy_route("r1", 800.0),
        _make_dummy_route("r2", 820.0),
        _make_dummy_route("r3", 850.0),
    ]
    mock_weather = MagicMock(spec=OpenMeteoClient)
    mock_weather.get_forecasts.return_value = {}

    analyzer = CorridorHeatmapAnalyzer(
        mapbox_client=mock_mapbox,
        weather_client=mock_weather,
        clock_now=clock_now,
    )

    # First call fills cache
    analyzer.generate_heatmap(
        origin=DALLAS,
        destination=DENVER,
        departure_local="2026-11-20T10:00:00Z",
        load_lb=40000,
    )
    initial_directions_count = mock_mapbox.directions.call_count
    initial_weather_count = mock_weather.get_forecasts.call_count
    assert initial_directions_count > 0
    assert initial_weather_count == 1

    # Second call hits cache: zero additional directions or weather calls
    res2 = analyzer.generate_heatmap(
        origin=DALLAS,
        destination=DENVER,
        departure_local="2026-11-20T10:00:00Z",
        load_lb=40000,
    )
    assert mock_mapbox.directions.call_count == initial_directions_count
    assert mock_weather.get_forecasts.call_count == initial_weather_count
    assert res2["meta"]["hour_count"] == 49


# =====================================================================
# 7. Endpoint Integration & Response Shape
# =====================================================================


@pytest.mark.django_db
def test_heatmap_api_view_success_and_validation():
    cache.clear()
    client = APIClient()

    # Invalid coordinates (<2 miles)
    bad_req = {
        "origin": [-96.7970, 32.7767],
        "destination": [-96.7970, 32.7768],
        "departure_local": "2026-11-20T08:00:00-06:00",
    }
    resp = client.post("/api/heatmap", bad_req, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST

    # Valid request with mocks
    with (
        patch("trips.views.CorridorHeatmapAnalyzer") as mock_analyzer_cls,
    ):
        mock_instance = MagicMock()
        mock_instance.generate_heatmap.return_value = {
            "meta": {
                "start_utc": "2026-11-20T10:00:00Z",
                "hour_count": 49,
                "timezone": "America/Chicago",
                "timezone_abbr": "CST",
                "load_lb": 42000,
                "departure_hour_offset": 2,
                "weather_status": "ok",
                "point_count": 2,
            },
            "warnings": [],
            "points": [
                {"lat": 32.75, "lon": -96.75, "levels": [0] * 49},
                {"lat": 33.00, "lon": -97.00, "levels": [1] * 49},
            ],
        }
        mock_analyzer_cls.return_value = mock_instance

        valid_req = {
            "origin": DALLAS,
            "destination": DENVER,
            "departure_local": "2026-11-20T10:00:00-06:00",
            "load_lb": 42000,
        }
        res = client.post("/api/heatmap", valid_req, format="json")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert "meta" in data
        assert data["meta"]["hour_count"] == 49
        assert data["meta"]["load_lb"] == 42000
        assert len(data["points"]) == 2
        assert len(data["points"][0]["levels"]) == 49


# =====================================================================
# 8. Throttling
# =====================================================================


@pytest.mark.django_db
def test_heatmap_throttling():
    cache.clear()
    client = APIClient()

    with patch("trips.views.CorridorHeatmapAnalyzer") as mock_analyzer_cls:
        mock_instance = MagicMock()
        mock_instance.generate_heatmap.return_value = {
            "meta": {
                "start_utc": "2026-11-20T10:00:00Z",
                "hour_count": 49,
                "timezone": "America/Chicago",
                "timezone_abbr": "CST",
                "load_lb": 42000,
                "departure_hour_offset": 2,
                "weather_status": "ok",
                "point_count": 1,
            },
            "warnings": [],
            "points": [{"lat": 32.75, "lon": -96.75, "levels": [0] * 49}],
        }
        mock_analyzer_cls.return_value = mock_instance

        req = {
            "origin": DALLAS,
            "destination": DENVER,
            "departure_local": "2026-11-20T10:00:00-06:00",
        }

        # First 12 requests should succeed (12/min limit)
        for _ in range(12):
            resp = client.post("/api/heatmap", req, format="json")
            assert resp.status_code == status.HTTP_200_OK

        # 13th request should trigger HTTP 429 Too Many Requests
        threw_429 = False
        resp = client.post("/api/heatmap", req, format="json")
        if resp.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            threw_429 = True
        assert threw_429 is True
