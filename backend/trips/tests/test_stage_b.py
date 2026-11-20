"""
test_stage_b.py – Tests for Mapbox client, route candidates, selection, geometry slicing.
"""

from __future__ import annotations

import httpx
import pytest

from trips.clients.http import HttpClient
from trips.clients.mapbox import MapboxClient
from trips.errors import NoRouteFoundError, UpstreamRoutingError
from trips.services import (
    RouteCandidate,
    cumulative_miles,
    geometry_slice,
    offset_waypoint,
    route_similarity,
    select_routes,
    simplify_polyline,
)


# ---------------------------------------------------------------------------
# offset_waypoint
# ---------------------------------------------------------------------------
def test_offset_waypoint_left_and_right() -> None:
    # Dallas, TX -> Denver, CO
    origin = (32.7767, -96.7970)
    dest = (39.7392, -104.9903)

    wpt_left = offset_waypoint(origin, dest, along_fraction=0.5, offset_fraction=0.2, side="left")
    wpt_right = offset_waypoint(origin, dest, along_fraction=0.5, offset_fraction=0.2, side="right")

    # Midpoint of straight line
    mid_lat = (origin[0] + dest[0]) / 2.0
    mid_lon = (origin[1] + dest[1]) / 2.0

    assert wpt_left != wpt_right
    # Left and right should be on opposite sides of midpoint
    assert (wpt_left[0] - mid_lat) * (wpt_right[0] - mid_lat) <= 0 or (wpt_left[1] - mid_lon) * (
        wpt_right[1] - mid_lon
    ) <= 0


def test_offset_waypoint_invalid_side_raises() -> None:
    with pytest.raises(ValueError, match="side must be 'left' or 'right'"):
        offset_waypoint((0.0, 0.0), (1.0, 1.0), 0.5, 0.2, side="center")


# ---------------------------------------------------------------------------
# simplify_polyline
# ---------------------------------------------------------------------------
def test_simplify_polyline_preserves_endpoints() -> None:
    coords = [[0.0, 0.0], [0.5, 0.00001], [1.0, 0.0]]
    simplified = simplify_polyline(coords, tolerance_deg=0.001)
    assert len(simplified) == 2
    assert simplified[0] == [0.0, 0.0]
    assert simplified[-1] == [1.0, 0.0]


def test_simplify_polyline_handles_20k_points_without_recursion_error() -> None:
    # 20,000 collinear points
    coords = [[float(i) * 0.0001, float(i) * 0.0001] for i in range(20000)]
    simplified = simplify_polyline(coords, tolerance_deg=0.001)
    # Collinear points simplify down to start and end
    assert len(simplified) == 2
    assert simplified[0] == [round(coords[0][0], 5), round(coords[0][1], 5)]
    assert simplified[-1] == [round(coords[-1][0], 5), round(coords[-1][1], 5)]


# ---------------------------------------------------------------------------
# route_similarity
# ---------------------------------------------------------------------------
def test_route_similarity_identical() -> None:
    geom = [[-96.0, 32.0], [-98.0, 34.0], [-100.0, 36.0], [-104.0, 39.0]]
    sim = route_similarity(geom, geom)
    assert abs(sim - 1.0) < 1e-3


def test_route_similarity_disjoint() -> None:
    geom1 = [[-96.0, 32.0], [-97.0, 33.0]]
    geom2 = [[-110.0, 42.0], [-111.0, 43.0]]
    sim = route_similarity(geom1, geom2)
    assert sim == 0.0


def test_route_similarity_subset_is_not_duplicate() -> None:
    # Route 1: 0 to 100 miles
    geom1 = [[float(i) * 0.1, 0.0] for i in range(20)]
    # Route 2: 0 to 50 miles (first half of Route 1)
    geom2 = geom1[:10]

    sim = route_similarity(geom1, geom2)
    # Directional overlap from geom2 to geom1 is 1.0, but geom1 to geom2 is ~0.5.
    # Similarity = min(0.5, 1.0) = 0.5 < 0.90, so subset is NOT a duplicate.
    assert sim < 0.80


# ---------------------------------------------------------------------------
# geometry_slice
# ---------------------------------------------------------------------------
def test_geometry_slice() -> None:
    # Straight line: 4 segments, each ~69 miles
    geom = [[0.0, 0.0], [1.0, 0.0], [2.0, 0.0], [3.0, 0.0]]
    cum = cumulative_miles(geom)
    total_len = cum[-1]

    # Slice between 10% and 90%
    sub = geometry_slice(geom, cum, 0.1 * total_len, 0.9 * total_len)
    assert len(sub) >= 2
    # Start point is near 10%, end point near 90%
    assert 0.0 < sub[0][0] < 1.0
    assert 2.0 < sub[-1][0] < 3.0


# ---------------------------------------------------------------------------
# select_routes
# ---------------------------------------------------------------------------
def test_select_routes_detour_filter() -> None:
    geom = [[-96.0, 32.0], [-104.0, 39.0]]
    candidates = [
        RouteCandidate("1", "base", "Fast", 500.0, 20000.0, geom),
        RouteCandidate(
            "2", "alt", "Normal", 550.0, 22000.0, [[-96.0, 32.0], [-98.0, 36.0], [-104.0, 39.0]]
        ),
        RouteCandidate(
            "3",
            "detour",
            "Way too long",
            800.0,
            35000.0,
            [[-96.0, 32.0], [-90.0, 35.0], [-104.0, 39.0]],
        ),  # > 1.4x distance
    ]
    selected = select_routes(candidates, max_routes=3)
    assert len(selected) == 2
    assert [c.id for c in selected] == ["A", "B"]
    assert selected[0].name == "Fast"
    assert selected[1].name == "Normal"


def test_select_routes_duplicate_removal() -> None:
    geom = [[-96.0, 32.0], [-104.0, 39.0]]
    # Two identical routes, one slower
    candidates = [
        RouteCandidate("1", "base", "Route 1", 500.0, 25000.0, geom),
        RouteCandidate("2", "variant", "Route 2 (faster)", 500.0, 20000.0, geom),
    ]
    selected = select_routes(candidates, max_routes=3)
    assert len(selected) == 1
    assert selected[0].name == "Route 2 (faster)"
    assert selected[0].id == "A"


def test_select_routes_fewer_than_3_returns_what_exists() -> None:
    geom1 = [[-96.0, 32.0], [-104.0, 39.0]]
    geom2 = [[-96.0, 32.0], [-100.0, 33.0], [-104.0, 39.0]]
    candidates = [
        RouteCandidate("1", "base", "Route 1", 500.0, 20000.0, geom1),
        RouteCandidate("2", "alt", "Route 2", 520.0, 21000.0, geom2),
    ]
    selected = select_routes(candidates, max_routes=3)
    assert len(selected) == 2
    assert [c.id for c in selected] == ["A", "B"]


# ---------------------------------------------------------------------------
# MapboxClient
# ---------------------------------------------------------------------------
def test_mapbox_client_parsing_and_annotations() -> None:
    mock_payload = {
        "code": "Ok",
        "routes": [
            {
                "distance": 804672.0,  # ~500 miles
                "duration": 28800.0,  # 8 hours
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[-96.797, 32.776], [-98.0, 35.0], [-104.99, 39.739]],
                },
                "legs": [
                    {
                        "summary": "I-35 N",
                        "annotation": {
                            "distance": [402336.0, 402336.0],
                            "duration": [14400.0, 14400.0],
                        },
                    }
                ],
            }
        ],
    }

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=mock_payload)

    http_client = HttpClient(client=httpx.Client(transport=httpx.MockTransport(handler)))
    client = MapboxClient(token="pk.mock_token", http_client=http_client, cache_enabled=False)

    routes = client.directions((32.776, -96.797), (39.739, -104.99))
    assert len(routes) == 1
    r = routes[0]
    assert abs(r.distance_miles - 500.0) < 0.1
    assert r.duration_seconds == 28800.0
    assert r.name == "I-35 N"
    assert r.annotations is not None
    assert len(r.annotations["distance"]) == 2


def test_mapbox_client_annotation_mismatch_fallback() -> None:
    # 3 coordinates -> expected 2 annotation values, but leg has only 1
    mock_payload = {
        "code": "Ok",
        "routes": [
            {
                "distance": 160934.4,
                "duration": 7200.0,
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[-96.0, 32.0], [-97.0, 33.0], [-98.0, 34.0]],
                },
                "legs": [
                    {
                        "summary": "US-287",
                        "annotation": {
                            "distance": [160934.4],  # mismatch: len 1 vs expected 2
                            "duration": [7200.0],
                        },
                    }
                ],
            }
        ],
    }

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=mock_payload)

    http_client = HttpClient(client=httpx.Client(transport=httpx.MockTransport(handler)))
    client = MapboxClient(token="pk.mock_token", http_client=http_client, cache_enabled=False)

    routes = client.directions((32.0, -96.0), (34.0, -98.0))
    assert len(routes) == 1
    r = routes[0]
    assert r.annotations is None
    assert len(r.warnings) == 1
    assert "Annotation length mismatch" in r.warnings[0]


def test_mapbox_client_no_route_found_on_primary() -> None:
    mock_payload = {"code": "NoRoute", "message": "No route found"}

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=mock_payload)

    http_client = HttpClient(client=httpx.Client(transport=httpx.MockTransport(handler)))
    client = MapboxClient(token="pk.mock_token", http_client=http_client, cache_enabled=False)

    with pytest.raises(NoRouteFoundError):
        client.directions((32.0, -96.0), (34.0, -98.0), source="mapbox_primary")


def test_mapbox_client_no_route_returns_empty_on_variant() -> None:
    mock_payload = {"code": "NoRoute", "message": "No route found"}

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=mock_payload)

    http_client = HttpClient(client=httpx.Client(transport=httpx.MockTransport(handler)))
    client = MapboxClient(token="pk.mock_token", http_client=http_client, cache_enabled=False)

    # Variant request should return empty list instead of raising
    res = client.directions((32.0, -96.0), (34.0, -98.0), source="avoid_highways")
    assert res == []


def test_mapbox_client_token_never_in_exception() -> None:
    token = "pk.super_secret_mapbox_key"

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.RequestError(f"Connection failed for {request.url}")

    http_client = HttpClient(client=httpx.Client(transport=httpx.MockTransport(handler)))
    client = MapboxClient(token=token, http_client=http_client, cache_enabled=False)

    with pytest.raises(UpstreamRoutingError) as exc_info:
        client.directions((32.0, -96.0), (34.0, -98.0))

    assert token not in str(exc_info.value)


def test_mapbox_geocode_v6() -> None:
    mock_payload = {
        "features": [
            {
                "properties": {
                    "full_address": "Dallas, Texas, United States",
                    "name": "Dallas",
                },
                "geometry": {
                    "coordinates": [-96.797, 32.7767],
                },
            }
        ]
    }

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=mock_payload)

    http_client = HttpClient(client=httpx.Client(transport=httpx.MockTransport(handler)))
    client = MapboxClient(token="pk.mock_token", http_client=http_client, cache_enabled=False)

    results = client.geocode("Dallas, TX")
    assert len(results) == 1
    assert results[0]["label"] == "Dallas, Texas, United States"
    assert results[0]["lat"] == 32.7767
    assert results[0]["lon"] == -96.797
