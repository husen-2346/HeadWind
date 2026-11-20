"""
mapbox.py – Mapbox API client for Directions (v5) and Geocoding (v6).

Security: Never logs or surfaces the Mapbox API token in exceptions or logs.
"""

from __future__ import annotations

import logging
from typing import Any

from django.conf import settings

from trips.cache import (
    directions_cache_key,
    get_cached_directions,
    set_cached_directions,
)
from trips.clients.http import HttpClient, redact_token
from trips.errors import NoRouteFoundError, UpstreamRoutingError
from trips.services.types import RouteCandidate

logger = logging.getLogger(__name__)


class MapboxClient:
    """Client for Mapbox Directions v5 and Geocoding v6 APIs."""

    DIRECTIONS_BASE_URL = "https://api.mapbox.com/directions/v5/mapbox/driving"
    GEOCODING_BASE_URL = "https://api.mapbox.com/search/geocode/v6/forward"

    def __init__(
        self,
        token: str | None = None,
        http_client: HttpClient | None = None,
        cache_enabled: bool = True,
    ):
        self.token = (token or getattr(settings, "MAPBOX_TOKEN", "")).strip()
        self.http_client = http_client or HttpClient()
        self.cache_enabled = cache_enabled

    def directions(
        self,
        origin: tuple[float, float],
        destination: tuple[float, float],
        waypoints: list[tuple[float, float]] | None = None,
        alternatives: bool = True,
        exclude: str | None = None,
        source: str = "mapbox_primary",
    ) -> list[RouteCandidate]:
        """Fetch driving directions from Mapbox Directions API v5."""
        if not self.token:
            raise UpstreamRoutingError("MAPBOX_TOKEN is not configured.")

        pts = [origin] + (waypoints or []) + [destination]
        variant_label = source
        if exclude:
            variant_label += f"_exclude_{exclude}"

        cache_key = directions_cache_key(origin, destination, variant_label)
        if self.cache_enabled:
            cached = get_cached_directions(cache_key)
            if cached is not None:
                return [
                    RouteCandidate(
                        id=r["id"],
                        source=r["source"],
                        name=r["name"],
                        distance_miles=r["distance_miles"],
                        duration_seconds=r["duration_seconds"],
                        geometry=r["geometry"],
                        annotations=r.get("annotations"),
                        warnings=r.get("warnings", []),
                    )
                    for r in cached.get("routes", [])
                ]

        # Coordinates formatted as lon,lat;lon,lat;...
        coord_str = ";".join(f"{lon:.5f},{lat:.5f}" for lat, lon in pts)
        url = f"{self.DIRECTIONS_BASE_URL}/{coord_str}"

        # alternatives=true ONLY for 2-point requests (no via-waypoints)
        allow_alts = alternatives and len(pts) == 2

        params: dict[str, Any] = {
            "geometries": "geojson",
            "overview": "full",
            "annotations": "distance,duration",
            "access_token": self.token,
        }
        if allow_alts:
            params["alternatives"] = "true"
        if exclude:
            params["exclude"] = exclude

        try:
            resp = self.http_client.request(
                "GET",
                url,
                params=params,
                token_to_redact=self.token,
            )
        except Exception as exc:
            safe_err = redact_token(str(exc), self.token)
            logger.error("Mapbox Directions request failed: %s", safe_err)
            raise UpstreamRoutingError("Mapbox routing request failed.") from None

        if resp.status_code == 404:
            if source == "mapbox_primary":
                raise NoRouteFoundError("No driving route found between coordinates.")
            return []

        try:
            data = resp.json()
        except Exception:
            raise UpstreamRoutingError("Invalid JSON from Mapbox Directions API.") from None

        code = data.get("code")
        if code != "Ok":
            if code == "NoRoute":
                if source == "mapbox_primary":
                    raise NoRouteFoundError("No driving route found between coordinates.")
                return []
            raise UpstreamRoutingError(f"Mapbox Directions API error: {code}")

        raw_routes = data.get("routes", [])
        candidates: list[RouteCandidate] = []

        for idx, route in enumerate(raw_routes):
            dist_mi = route.get("distance", 0.0) / 1609.344
            dur_s = float(route.get("duration", 0.0))
            geometry = route.get("geometry", {}).get("coordinates", [])

            # Summary name from legs
            legs = route.get("legs", [])
            summaries = [leg.get("summary") for leg in legs if leg.get("summary")]
            name = " and ".join(summaries) if summaries else route.get("name") or "Route"

            # Annotations concatenated across legs
            ann_dist: list[float] = []
            ann_dur: list[float] = []
            for leg in legs:
                ann = leg.get("annotation", {})
                ann_dist.extend(ann.get("distance", []))
                ann_dur.extend(ann.get("duration", []))

            route_warnings: list[str] = []
            annotations_dict: dict[str, list[float]] | None = None
            if ann_dist and ann_dur:
                expected_len = len(geometry) - 1
                if len(ann_dist) == expected_len and len(ann_dur) == expected_len:
                    annotations_dict = {"distance": ann_dist, "duration": ann_dur}
                else:
                    route_warnings.append(
                        f"Annotation length mismatch ({len(ann_dist)} vs expected {expected_len}); falling back to linear profile."
                    )

            cand_source = source
            if source == "mapbox_primary" and idx > 0:
                cand_source = "mapbox_alternative"

            candidates.append(
                RouteCandidate(
                    id="",  # assigned in select_routes
                    source=cand_source,
                    name=name,
                    distance_miles=round(dist_mi, 2),
                    duration_seconds=round(dur_s, 1),
                    geometry=geometry,
                    annotations=annotations_dict,
                    warnings=route_warnings,
                )
            )

        if self.cache_enabled and candidates:
            cached_data = {
                "routes": [
                    {
                        "id": c.id,
                        "source": c.source,
                        "name": c.name,
                        "distance_miles": c.distance_miles,
                        "duration_seconds": c.duration_seconds,
                        "geometry": c.geometry,
                        "annotations": c.annotations,
                        "warnings": c.warnings,
                    }
                    for c in candidates
                ]
            }
            set_cached_directions(cache_key, cached_data)

        return candidates

    def geocode(self, query: str, limit: int = 5, country: str = "us") -> list[dict[str, Any]]:
        """Forward geocoding using Mapbox Search / Geocode v6 API.

        Returns normalized results: [{"label": str, "lat": float, "lon": float}].
        """
        if not self.token:
            raise UpstreamRoutingError("MAPBOX_TOKEN is not configured.")

        params = {
            "q": query,
            "limit": limit,
            "autocomplete": "true",
            "country": country,
            "types": "place,locality,neighborhood,address",
            "access_token": self.token,
        }

        try:
            resp = self.http_client.request(
                "GET",
                self.GEOCODING_BASE_URL,
                params=params,
                token_to_redact=self.token,
            )
        except Exception as exc:
            safe_err = redact_token(str(exc), self.token)
            logger.error("Mapbox Geocoding request failed: %s", safe_err)
            raise UpstreamRoutingError("Mapbox geocoding request failed.") from None

        if resp.status_code != 200:
            raise UpstreamRoutingError(f"Mapbox geocoding failed with status {resp.status_code}")

        try:
            data = resp.json()
        except Exception:
            raise UpstreamRoutingError("Invalid JSON from Mapbox Geocoding API.") from None

        features = data.get("features", [])
        results: list[dict[str, Any]] = []

        for feat in features:
            props = feat.get("properties", {})
            geom = feat.get("geometry", {})
            coords = geom.get("coordinates") or []
            if len(coords) < 2:
                continue

            lon, lat = float(coords[0]), float(coords[1])
            label = (
                props.get("full_address")
                or props.get("name")
                or props.get("place_formatted")
                or feat.get("place_name")
                or f"{lat:.4f}, {lon:.4f}"
            )
            results.append({"label": label, "lat": lat, "lon": lon})

        return results
