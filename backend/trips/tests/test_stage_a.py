"""
test_stage_a.py – Tests for settings, errors, http helper, cache, and token redaction.
"""

from __future__ import annotations

import httpx
import pytest
from rest_framework import exceptions as drf_exceptions

from trips.cache import (
    directions_cache_key,
    get_cached_directions,
    get_cached_weather,
    set_cached_directions,
    set_cached_weather,
    weather_cache_key,
)
from trips.clients.http import HttpClient, redact_token
from trips.errors import (
    NoRouteFoundError,
    RateLimitedError,
    UpstreamRoutingError,
    UpstreamWeatherError,
    ValidationError,
    drf_exception_handler,
)


def test_token_redaction_query_param() -> None:
    url = "https://api.mapbox.com/directions/v5/mapbox/driving/-96.7,32.7;-104.9,39.7?access_token=TEST_TOKEN&geometries=geojson"
    redacted = redact_token(url)
    assert "TEST_TOKEN" not in redacted
    assert "pk.eyJ1123456789" not in redacted


def test_token_redaction_explicit_secret() -> None:
    secret = "secret-mapbox-token-xyz"
    msg = f"Failed to authenticate with token {secret} on API"
    redacted = redact_token(msg, token=secret)
    assert secret not in redacted
    assert "[REDACTED]" in redacted


def test_token_redaction_empty_string() -> None:
    assert redact_token("") == ""


def test_http_client_successful_request() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"ok": True})

    transport = httpx.MockTransport(handler)
    client = httpx.Client(transport=transport)
    http = HttpClient(client=client)

    resp = http.request("GET", "https://example.com/api")
    assert resp.status_code == 200
    assert resp.json() == {"ok": True}


def test_http_client_retries_on_500() -> None:
    attempts = 0
    sleeps: list[float] = []

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            return httpx.Response(500, text="Internal Error")
        return httpx.Response(200, json={"recovered": True})

    transport = httpx.MockTransport(handler)
    client = httpx.Client(transport=transport)
    http = HttpClient(client=client, sleep_fn=sleeps.append)

    resp = http.request("GET", "https://example.com/transient")
    assert resp.status_code == 200
    assert resp.json() == {"recovered": True}
    assert attempts == 3
    assert len(sleeps) == 2


def test_http_client_exhausts_retries_on_persistent_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("Connection timed out")

    transport = httpx.MockTransport(handler)
    client = httpx.Client(transport=transport)
    http = HttpClient(client=client, retries=1, sleep_fn=lambda _: None)

    with pytest.raises(httpx.RequestError) as exc_info:
        http.request("GET", "https://api.mapbox.com/test?access_token=pk.secret")

    # Safe message without token
    assert "pk.secret" not in str(exc_info.value)


def test_exception_handler_app_errors() -> None:
    # Validation error
    resp = drf_exception_handler(ValidationError("Bad param", details={"param": "invalid"}), {})
    assert resp is not None
    assert resp.status_code == 400
    assert resp.data == {
        "error": {
            "code": "validation_error",
            "message": "Bad param",
            "details": {"param": "invalid"},
        }
    }

    # No route found
    resp = drf_exception_handler(NoRouteFoundError("No routes available"), {})
    assert resp is not None
    assert resp.status_code == 404
    assert resp.data == {
        "error": {
            "code": "no_route_found",
            "message": "No routes available",
        }
    }

    # Upstream routing error
    resp = drf_exception_handler(UpstreamRoutingError(), {})
    assert resp is not None
    assert resp.status_code == 502
    assert resp.data["error"]["code"] == "upstream_routing_error"

    # Upstream weather error
    resp = drf_exception_handler(UpstreamWeatherError(), {})
    assert resp is not None
    assert resp.status_code == 502
    assert resp.data["error"]["code"] == "upstream_weather_error"

    # Rate limited
    resp = drf_exception_handler(RateLimitedError(), {})
    assert resp is not None
    assert resp.status_code == 429
    assert resp.data["error"]["code"] == "rate_limited"


def test_exception_handler_drf_builtins() -> None:
    # DRF ValidationError
    resp = drf_exception_handler(drf_exceptions.ValidationError({"field": ["required"]}), {})
    assert resp is not None
    assert resp.status_code == 400
    assert resp.data["error"]["code"] == "validation_error"

    # DRF Throttled
    resp = drf_exception_handler(drf_exceptions.Throttled(wait=15), {})
    assert resp is not None
    assert resp.status_code == 429
    assert resp.data["error"]["code"] == "rate_limited"
    assert "15 seconds" in resp.data["error"]["message"]


def test_exception_handler_unexpected_error() -> None:
    resp = drf_exception_handler(RuntimeError("Unexpected database fail"), {})
    assert resp is not None
    assert resp.status_code == 500
    assert resp.data == {
        "error": {
            "code": "internal_error",
            "message": "An internal server error occurred.",
        }
    }


def test_cache_keys_and_storage() -> None:
    dir_key = directions_cache_key((32.77666, -96.79698), (39.73923, -104.99025), "avoid_tolls")
    # Rounded to 4 decimals
    assert "32.7767,-96.7970:39.7392,-104.9903:avoid_tolls" in dir_key

    set_cached_directions(dir_key, {"routes": [1, 2, 3]})
    assert get_cached_directions(dir_key) == {"routes": [1, 2, 3]}

    wx_key = weather_cache_key(32.7766, -96.7969)
    # Rounded to 2 decimals
    assert "32.78,-96.80" in wx_key

    set_cached_weather(wx_key, {"hourly": {"wind_speed_10m": [15.0]}})
    assert get_cached_weather(wx_key) == {"hourly": {"wind_speed_10m": [15.0]}}
