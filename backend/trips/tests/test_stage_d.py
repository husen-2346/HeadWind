"""
test_stage_d.py – Tests for trip analysis orchestrator, views, serializers, and endpoints.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from trips.clients.mapbox import MapboxClient
from trips.clients.open_meteo import OpenMeteoClient
from trips.errors import UpstreamWeatherError
from trips.services.constants import RISK_RULES
from trips.services.types import RouteCandidate
from trips.usecases.analyze_trip import TripAnalyzer

DALLAS = [-96.7970, 32.7767]
DENVER = [-104.9903, 39.7392]


def _make_dummy_route(
    cand_id: str,
    name: str,
    distance_miles: float,
    duration_seconds: float,
    source: str = "primary",
) -> RouteCandidate:
    # 5-point polyline from Dallas to Denver
    geometry = [
        [-96.7970, 32.7767],
        [-98.5000, 34.5000],
        [-100.5000, 36.5000],
        [-102.5000, 38.0000],
        [-104.9903, 39.7392],
    ]
    # Synthetic annotations matching 4 segments
    seg_dist = (distance_miles * 1609.344) / 4.0
    seg_dur = duration_seconds / 4.0
    annotations = {
        "distance": [seg_dist] * 4,
        "duration": [seg_dur] * 4,
    }
    return RouteCandidate(
        id=cand_id,
        source=source,
        name=name,
        distance_miles=distance_miles,
        duration_seconds=duration_seconds,
        geometry=geometry,
        annotations=annotations,
    )


def _make_mock_hourly() -> dict[str, list]:
    base = datetime.now(UTC).replace(minute=0, second=0, microsecond=0)
    times = [(base + timedelta(hours=i)).isoformat() for i in range(120)]
    return {
        "time": times,
        "wind_speed_10m": [15.0] * 120,
        "rain": [0.0] * 120,
        "showers": [0.0] * 120,
        "snowfall": [0.0] * 120,
    }


@pytest.fixture
def api_client():
    return APIClient()


# ---------------------------------------------------------------------------
# Unit / Use Case Tests
# ---------------------------------------------------------------------------


def test_analyzer_happy_path_3_routes():
    mock_mapbox = MagicMock(spec=MapboxClient)
    mock_weather = MagicMock(spec=OpenMeteoClient)

    # Return 3 routes directly from primary call
    r1 = _make_dummy_route("A", "Route A", 800.0, 40000.0)
    r2_geom = [
        [-96.7970, 32.7767],
        [-97.5000, 35.0000],
        [-99.5000, 37.0000],
        [-101.5000, 38.5000],
        [-104.9903, 39.7392],
    ]
    r2 = RouteCandidate(
        id="B",
        source="alternative",
        name="Route B",
        distance_miles=820.0,
        duration_seconds=42000.0,
        geometry=r2_geom,
    )
    # Give r3 slightly different geometry
    r3_geom = [
        [-96.7970, 32.7767],
        [-99.0000, 34.0000],
        [-101.5000, 36.0000],
        [-103.5000, 38.5000],
        [-104.9903, 39.7392],
    ]
    r3 = RouteCandidate(
        id="C",
        source="alternative",
        name="Route C",
        distance_miles=840.0,
        duration_seconds=44000.0,
        geometry=r3_geom,
    )
    mock_mapbox.directions.return_value = [r1, r2, r3]

    hourly = _make_mock_hourly()
    mock_weather.get_forecasts.return_value = {
        (round(lat, 2), round(lon, 2)): hourly
        for lon, lat in [
            [-96.7970, 32.7767],
            [-98.5000, 34.5000],
            [-100.5000, 36.5000],
            [-102.5000, 38.0000],
            [-104.9903, 39.7392],
            [-99.0000, 34.0000],
            [-101.5000, 36.0000],
            [-103.5000, 38.5000],
        ]
    }

    now_fixed = datetime.now(UTC)
    dep_str = (now_fixed + timedelta(hours=4)).isoformat()

    analyzer = TripAnalyzer(
        mapbox_client=mock_mapbox,
        weather_client=mock_weather,
        clock_now=now_fixed,
    )
    result = analyzer.analyze(
        origin=DALLAS,
        destination=DENVER,
        departure_local=dep_str,
        load_lb=42000,
        interval_miles=50,
    )

    assert result["summary"]["weather_status"] in ("complete", "partial")
    assert result["summary"]["recommended_route_id"] is not None
    assert len(result["routes"]) == 3
    assert result["meta"]["route_count"] == 3
    assert "routing" in result["meta"]["timings_ms"]

    # Check route fields
    first_route = result["routes"][0]
    assert "risk_segments" in first_route
    assert len(first_route["risk_segments"]) >= 1
    assert "checkpoints" in first_route
    assert len(first_route["checkpoints"]) >= 2


def test_analyzer_variant_generation_on_single_route():
    mock_mapbox = MagicMock(spec=MapboxClient)
    mock_weather = MagicMock(spec=OpenMeteoClient)

    # Primary returns only 1 route
    r1 = _make_dummy_route("A", "Fast Primary", 800.0, 40000.0)

    # Variant generates distinct alternative
    r_var_geom = [
        [-96.7970, 32.7767],
        [-95.0000, 35.0000],
        [-98.0000, 38.0000],
        [-101.0000, 39.0000],
        [-104.9903, 39.7392],
    ]
    r_var = RouteCandidate(
        id="",
        source="exclude_toll",
        name="Scenic Variant",
        distance_miles=860.0,
        duration_seconds=45000.0,
        geometry=r_var_geom,
    )

    def mock_directions(*args, **kwargs):
        if kwargs.get("alternatives"):
            return [r1]
        if kwargs.get("exclude") == "toll":
            return [r_var]
        return []

    mock_mapbox.directions.side_effect = mock_directions

    hourly = _make_mock_hourly()
    mock_weather.get_forecasts.return_value = {
        (round(lat, 2), round(lon, 2)): hourly for lon, lat in r1.geometry + r_var_geom
    }

    now_fixed = datetime.now(UTC)
    dep_str = (now_fixed + timedelta(hours=2)).isoformat()

    analyzer = TripAnalyzer(
        mapbox_client=mock_mapbox,
        weather_client=mock_weather,
        clock_now=now_fixed,
    )
    result = analyzer.analyze(
        origin=DALLAS,
        destination=DENVER,
        departure_local=dep_str,
    )

    # We got 2 distinct routes, which triggers the fewer_routes warning
    assert len(result["routes"]) == 2
    assert any(w["code"] == "fewer_routes" for w in result["summary"]["warnings"])


def test_analyzer_weather_failure_tolerance():
    mock_mapbox = MagicMock(spec=MapboxClient)
    mock_weather = MagicMock(spec=OpenMeteoClient)

    r1 = _make_dummy_route("A", "Route A", 800.0, 40000.0)
    mock_mapbox.directions.return_value = [r1]
    mock_weather.get_forecasts.side_effect = UpstreamWeatherError("502 Bad Gateway")

    now_fixed = datetime.now(UTC)
    dep_str = (now_fixed + timedelta(hours=2)).isoformat()

    analyzer = TripAnalyzer(
        mapbox_client=mock_mapbox,
        weather_client=mock_weather,
        clock_now=now_fixed,
    )
    result = analyzer.analyze(
        origin=DALLAS,
        destination=DENVER,
        departure_local=dep_str,
    )

    assert result["summary"]["weather_status"] == "unavailable"
    assert result["summary"]["recommended_route_id"] is None
    assert any(w["code"] == "weather_unavailable" for w in result["summary"]["warnings"])
    assert len(result["routes"]) == 1
    # Checkpoints have weather=None and risk.level=None
    for cp in result["routes"][0]["checkpoints"]:
        assert cp["weather"]["wind_mph"] is None
        assert cp["risk"]["level"] is None


# ---------------------------------------------------------------------------
# API View & Integration Tests
# ---------------------------------------------------------------------------


def test_health_endpoint(api_client):
    response = api_client.get("/api/health")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok"}


def test_risk_rules_endpoint(api_client):
    response = api_client.get("/api/risk-rules")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "levels" in data
    assert "load_rules" in data
    assert "variables" in data
    assert data["levels"] == RISK_RULES["levels"]
    assert data["variables"]["wind_mph"]["unit"] == "mph"


def test_geocode_query_validation(api_client):
    # Missing q
    res = api_client.get("/api/geocode")
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert res.json()["error"]["code"] == "validation_error"

    # Too short
    res2 = api_client.get("/api/geocode?q=a")
    assert res2.status_code == status.HTTP_400_BAD_REQUEST
    assert res2.json()["error"]["code"] == "validation_error"


@patch("trips.views.MapboxClient")
def test_geocode_happy_path(mock_client_cls, api_client):
    mock_instance = mock_client_cls.return_value
    mock_instance.geocode.return_value = [
        {
            "name": "Denver, CO",
            "lat": 39.7392,
            "lon": -104.9903,
            "place_formatted": "Denver, CO, USA",
        }
    ]

    res = api_client.get("/api/geocode?q=Denver")
    assert res.status_code == status.HTTP_200_OK
    assert len(res.json()) == 1
    assert res.json()[0]["name"] == "Denver, CO"


def test_analyze_validation_errors(api_client):
    # 1. Missing required fields
    res = api_client.post("/api/analyze", {}, format="json")
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert res.json()["error"]["code"] == "validation_error"

    # 2. Identical origin & destination (< 2.0 miles)
    res = api_client.post(
        "/api/analyze",
        {
            "origin": [-96.7970, 32.7767],
            "destination": [-96.7971, 32.7768],
            "departure_local": datetime.now(UTC).isoformat(),
        },
        format="json",
    )
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "at least 2.0 miles apart" in str(res.json())

    # 3. Invalid coordinates (lat > 90)
    res = api_client.post(
        "/api/analyze",
        {
            "origin": [-96.7970, 95.0000],
            "destination": DENVER,
            "departure_local": datetime.now(UTC).isoformat(),
        },
        format="json",
    )
    assert res.status_code == status.HTTP_400_BAD_REQUEST


def test_analyze_departure_window_validation(api_client):
    # > 72 hours in the future
    far_future = (datetime.now(UTC) + timedelta(hours=75)).isoformat()
    res = api_client.post(
        "/api/analyze",
        {
            "origin": DALLAS,
            "destination": DENVER,
            "departure_local": far_future,
        },
        format="json",
    )
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "scheduling window" in str(res.json()).lower()

    # > 1 hour in the past
    past = (datetime.now(UTC) - timedelta(hours=3)).isoformat()
    res = api_client.post(
        "/api/analyze",
        {
            "origin": DALLAS,
            "destination": DENVER,
            "departure_local": past,
        },
        format="json",
    )
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "scheduling window" in str(res.json()).lower()


@patch("trips.usecases.analyze_trip.TripAnalyzer.analyze")
def test_analyze_api_happy_path(mock_analyze, api_client):
    mock_analyze.return_value = {
        "request": {
            "origin": DALLAS,
            "destination": DENVER,
            "departure_local": "2026-11-20T06:00:00",
            "departure_utc": "2026-11-20T12:00:00Z",
            "origin_timezone": "America/Chicago",
            "load_lb": 42000,
            "interval_miles": 25,
        },
        "summary": {
            "recommended_route_id": "A",
            "headline": "Route A is safest.",
            "decided_by": "severe_miles",
            "weather_status": "complete",
            "warnings": [],
        },
        "routes": [],
        "meta": {"route_count": 0, "timings_ms": {}},
    }

    res = api_client.post(
        "/api/analyze",
        {
            "origin": DALLAS,
            "destination": DENVER,
            "departure_local": (datetime.now(UTC) + timedelta(hours=1)).isoformat(),
            "load_lb": 42000,
            "interval_miles": 25,
        },
        format="json",
    )
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["summary"]["recommended_route_id"] == "A"


def test_analyze_object_coordinates_supported(api_client):
    with patch("trips.usecases.analyze_trip.TripAnalyzer.analyze") as mock_analyze:
        mock_analyze.return_value = {
            "summary": {"weather_status": "complete"},
            "routes": [],
            "meta": {},
        }
        res = api_client.post(
            "/api/analyze",
            {
                "origin": {"lon": -96.7970, "lat": 32.7767},
                "destination": {"lng": -104.9903, "lat": 39.7392},
                "departure_local": (datetime.now(UTC) + timedelta(hours=1)).isoformat(),
            },
            format="json",
        )
        assert res.status_code == status.HTTP_200_OK
        mock_analyze.assert_called_once()
        call_kwargs = mock_analyze.call_args[1]
        assert call_kwargs["origin"] == [-96.7970, 32.7767]
        assert call_kwargs["destination"] == [-104.9903, 39.7392]


def test_token_redacted_from_error_responses(api_client):
    fake_token = "pk.eyJ1InNlY3JldHRva2VuMTIzNDU2Nzg5In0.secret"
    with patch("trips.views.MapboxClient") as mock_mb:
        mock_mb.side_effect = Exception(
            f"Failed with URL https://api.mapbox.com?access_token={fake_token}"
        )
        res = api_client.get("/api/geocode?q=Dallas")
        assert res.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        content = res.content.decode("utf-8")
        assert fake_token not in content
        assert "access_token" not in content
