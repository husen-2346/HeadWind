"""
test_stage_c.py – Tests for Open-Meteo client, weather lookup, time zones, and ETA annotation profile.
"""

from __future__ import annotations

from datetime import UTC, datetime

import httpx
import pytest

from trips.clients.http import HttpClient
from trips.clients.open_meteo import OpenMeteoClient
from trips.errors import UpstreamWeatherError, ValidationError
from trips.services import (
    Weather,
    build_profile_from_annotations,
    eta_seconds_at_mile,
    lookup_weather,
)
from trips.timezones import get_timezone_at, resolve_departure


# ---------------------------------------------------------------------------
# build_profile_from_annotations
# ---------------------------------------------------------------------------
def test_build_profile_from_annotations_scaling() -> None:
    # 2 segments: 16093.44m (10 mi) in 600s, 16093.44m (10 mi) in 600s
    dist_m = [16093.44, 16093.44]
    dur_s = [600.0, 600.0]
    total_miles = 25.0  # scaled up to 25 miles authoritative

    miles_prof, secs_prof = build_profile_from_annotations(dist_m, dur_s, total_miles=total_miles)
    assert len(miles_prof) == 3
    assert miles_prof[0] == 0.0
    assert abs(miles_prof[-1] - 25.0) < 1e-4
    assert secs_prof[-1] == 1200.0

    # Halfway should be at mile 12.5 and 600 seconds
    secs = eta_seconds_at_mile(12.5, miles_prof, secs_prof)
    assert abs(secs - 600.0) < 1.0


def test_build_profile_from_annotations_thinning() -> None:
    # 3000 points thinned to at most 2000
    dist_m = [100.0] * 3000
    dur_s = [5.0] * 3000
    miles_prof, secs_prof = build_profile_from_annotations(
        dist_m, dur_s, total_miles=186.4, max_points=1000
    )
    assert len(miles_prof) <= 1002
    assert miles_prof[0] == 0.0
    assert abs(miles_prof[-1] - 186.4) < 1e-3


def test_build_profile_fallback_on_empty_or_mismatch() -> None:
    # Empty annotations fall back to linear
    miles_prof, secs_prof = build_profile_from_annotations(None, None, total_miles=100.0)
    assert miles_prof == [0.0, 100.0]
    assert secs_prof == [0.0, 0.0]


# ---------------------------------------------------------------------------
# timezones
# ---------------------------------------------------------------------------
def test_get_timezone_at_dallas() -> None:
    tz = get_timezone_at(32.7767, -96.7970)
    assert tz == "America/Chicago"


def test_resolve_departure_naive_interpreted_in_origin_tz() -> None:
    # 2026-11-25 06:00 in Dallas (Standard Time, UTC-6)
    # Clock frozen at 2026-11-24 12:00 UTC (well within 72h window)
    clock = datetime(2026, 11, 24, 12, 0, tzinfo=UTC)
    dep_utc, dep_local, tz_name, tz_abbr = resolve_departure(
        "2026-11-25T06:00",
        origin_lat=32.7767,
        origin_lon=-96.7970,
        clock_now=clock,
    )
    assert tz_name == "America/Chicago"
    # 06:00 CST -> 12:00 UTC
    assert dep_utc == datetime(2026, 11, 25, 12, 0, tzinfo=UTC)
    assert dep_local.hour == 6
    assert tz_abbr in ("CST", "CDT", "-06")


def test_resolve_departure_offset_aware() -> None:
    clock = datetime(2026, 11, 24, 12, 0, tzinfo=UTC)
    dep_utc, dep_local, tz_name, _ = resolve_departure(
        "2026-11-25T06:00-06:00",
        origin_lat=32.7767,
        origin_lon=-96.7970,
        clock_now=clock,
    )
    assert dep_utc == datetime(2026, 11, 25, 12, 0, tzinfo=UTC)


def test_resolve_departure_window_validation() -> None:
    clock = datetime(2026, 11, 25, 12, 0, tzinfo=UTC)

    # Past > 1 hour raises
    with pytest.raises(ValidationError, match="outside the valid scheduling window"):
        resolve_departure(
            "2026-11-25T10:00Z",  # 2 hours before clock
            origin_lat=32.7767,
            origin_lon=-96.7970,
            clock_now=clock,
        )

    # Future > 72 hours raises
    with pytest.raises(ValidationError, match="outside the valid scheduling window"):
        resolve_departure(
            "2026-11-30T12:00Z",  # 5 days ahead
            origin_lat=32.7767,
            origin_lon=-96.7970,
            clock_now=clock,
        )


# ---------------------------------------------------------------------------
# weather_lookup
# ---------------------------------------------------------------------------
def test_weather_lookup_wind_interpolation() -> None:
    hourly = {
        "time": ["2026-11-25T06:00", "2026-11-25T07:00", "2026-11-25T08:00"],
        "wind_speed_10m": [20.0, 30.0, 40.0],
        "rain": [0.0, 0.1, 0.2],
        "showers": [0.0, 0.0, 0.0],
        "snowfall": [0.0, 0.0, 0.0],
    }
    # ETA at 06:30 (halfway between 20 and 30 -> 25 mph)
    eta = datetime(2026, 11, 25, 6, 30, tzinfo=UTC)
    wx = lookup_weather(hourly, eta)
    assert wx.wind_mph == 25.0


def test_weather_lookup_precipitation_bucket_rule() -> None:
    # Open-Meteo precipitation represents sum of preceding hour
    hourly = {
        "time": ["2026-11-25T06:00", "2026-11-25T07:00"],
        "wind_speed_10m": [10.0, 10.0],
        "rain": [0.0, 0.25],
        "showers": [0.0, 0.10],
        "snowfall": [0.0, 1.5],
    }
    # ETA at 06:15 -> boundary at or after is 07:00
    eta = datetime(2026, 11, 25, 6, 15, tzinfo=UTC)
    wx = lookup_weather(hourly, eta)
    # rain + showers = 0.25 + 0.10 = 0.35
    assert wx.rain_in_hr == 0.35
    assert wx.snow_in_hr == 1.5


def test_weather_lookup_outside_range_gives_none() -> None:
    hourly = {
        "time": ["2026-11-25T06:00", "2026-11-25T07:00"],
        "wind_speed_10m": [10.0, 10.0],
        "rain": [0.0, 0.0],
        "showers": [0.0, 0.0],
        "snowfall": [0.0, 0.0],
    }
    # Way outside
    eta = datetime(2026, 11, 28, 12, 0, tzinfo=UTC)
    wx = lookup_weather(hourly, eta)
    assert wx == Weather(None, None, None)


def test_weather_lookup_null_fields() -> None:
    hourly = {
        "time": ["2026-11-25T06:00", "2026-11-25T07:00"],
        "wind_speed_10m": [None, 10.0],
        "rain": [None, None],
        "showers": [None, None],
        "snowfall": [None, None],
    }
    eta = datetime(2026, 11, 25, 6, 30, tzinfo=UTC)
    wx = lookup_weather(hourly, eta)
    assert wx.wind_mph is None
    assert wx.rain_in_hr is None
    assert wx.snow_in_hr is None


# ---------------------------------------------------------------------------
# OpenMeteoClient
# ---------------------------------------------------------------------------
def test_open_meteo_unit_assertion() -> None:
    mock_payload = {
        "hourly_units": {
            "wind_speed_10m": "km/h",  # WRONG UNIT
            "rain": "inch",
            "snowfall": "inch",
        },
        "hourly": {},
    }

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=mock_payload)

    http_client = HttpClient(client=httpx.Client(transport=httpx.MockTransport(handler)))
    client = OpenMeteoClient(http_client=http_client, cache_enabled=False)

    with pytest.raises(UpstreamWeatherError, match="Unexpected weather units"):
        client._fetch_chunk([(32.78, -96.80)])


def test_open_meteo_single_vs_list_response() -> None:
    # 1 location queried -> Open-Meteo returns single object
    mock_single = {
        "latitude": 32.78,
        "longitude": -96.80,
        "hourly_units": {"wind_speed_10m": "mph", "rain": "inch", "snowfall": "inch"},
        "hourly": {"time": ["2026-11-25T06:00"], "wind_speed_10m": [15.0]},
    }

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=mock_single)

    http_client = HttpClient(client=httpx.Client(transport=httpx.MockTransport(handler)))
    client = OpenMeteoClient(http_client=http_client, cache_enabled=False)

    res = client.fetch_forecasts_for_coordinates([(32.776, -96.797)])
    assert (32.78, -96.80) in res
    assert res[(32.78, -96.80)]["wind_speed_10m"] == [15.0]


def test_open_meteo_chunking_at_50() -> None:
    chunks_received: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        lats = request.url.params["latitude"].split(",")
        chunks_received.append(len(lats))
        items = [
            {
                "latitude": float(lat),
                "longitude": 0.0,
                "hourly_units": {"wind_speed_10m": "mph", "rain": "inch", "snowfall": "inch"},
                "hourly": {"wind_speed_10m": [10.0]},
            }
            for lat in lats
        ]
        return httpx.Response(200, json=items)

    http_client = HttpClient(client=httpx.Client(transport=httpx.MockTransport(handler)))
    client = OpenMeteoClient(http_client=http_client, cache_enabled=False)

    # 65 unique coordinates -> should split into chunk of 50 and chunk of 15
    coords = [(float(i), float(i)) for i in range(65)]
    res = client.fetch_forecasts_for_coordinates(coords)

    assert len(res) == 65
    assert sorted(chunks_received) == [15, 50]


def test_open_meteo_caching_zero_http_calls_on_repeat() -> None:
    call_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        return httpx.Response(
            200,
            json={
                "hourly_units": {"wind_speed_10m": "mph", "rain": "inch", "snowfall": "inch"},
                "hourly": {"time": ["2026-11-25T06:00"], "wind_speed_10m": [12.0]},
            },
        )

    http_client = HttpClient(client=httpx.Client(transport=httpx.MockTransport(handler)))
    client = OpenMeteoClient(http_client=http_client, cache_enabled=True)

    pt = [(45.123, -93.456)]
    # First call -> hits HTTP
    res1 = client.fetch_forecasts_for_coordinates(pt)
    assert call_count == 1
    assert res1[(45.12, -93.46)] is not None

    # Second call -> zero HTTP calls
    res2 = client.fetch_forecasts_for_coordinates(pt)
    assert call_count == 1  # No additional calls
    assert res2[(45.12, -93.46)] is not None
