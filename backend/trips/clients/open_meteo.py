"""
open_meteo.py – Open-Meteo Weather Forecast API client with batching, chunking, and caching.

Chunking: At most 50 locations per request.
Units: Strictly asserts wind_speed_unit=mph and precipitation_unit=inch.
Caching: Caches hourly forecast keyed by (lat, lon) rounded to 2 decimals.
"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from django.conf import settings

from trips.cache import (
    get_cached_weather,
    set_cached_weather,
    weather_cache_key,
)
from trips.clients.http import HttpClient
from trips.errors import UpstreamWeatherError

logger = logging.getLogger(__name__)


class OpenMeteoClient:
    """Client for Open-Meteo Weather Forecast API."""

    def __init__(
        self,
        base_url: str | None = None,
        http_client: HttpClient | None = None,
        forecast_days: int | None = None,
        cache_enabled: bool = True,
    ):
        self.base_url = base_url or getattr(
            settings, "OPEN_METEO_BASE_URL", "https://api.open-meteo.com/v1/forecast"
        )
        self.http_client = http_client or HttpClient()
        self.forecast_days = (
            forecast_days
            if forecast_days is not None
            else getattr(settings, "WEATHER_FORECAST_DAYS", 5)
        )
        self.cache_enabled = cache_enabled

    def _fetch_chunk(
        self, chunk: list[tuple[float, float]]
    ) -> list[tuple[tuple[float, float], dict[str, Any] | None]]:
        """Fetch weather for a single chunk of at most 50 rounded coordinates."""
        if not chunk:
            return []

        lat_str = ",".join(f"{c[0]:.2f}" for c in chunk)
        lon_str = ",".join(f"{c[1]:.2f}" for c in chunk)

        params = {
            "latitude": lat_str,
            "longitude": lon_str,
            "hourly": "wind_speed_10m,rain,showers,snowfall",
            "wind_speed_unit": "mph",
            "precipitation_unit": "inch",
            "timezone": "GMT",
            "forecast_days": self.forecast_days,
        }

        try:
            resp = self.http_client.request("GET", self.base_url, params=params)
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            logger.warning("Open-Meteo chunk request failed: %s", exc)
            return [(c, None) for c in chunk]

        # Single location returns dict; multiple returns list of dicts
        raw_items: list[dict[str, Any]]
        if isinstance(data, list):
            raw_items = data
        elif isinstance(data, dict):
            raw_items = [data]
        else:
            return [(c, None) for c in chunk]

        results: list[tuple[tuple[float, float], dict[str, Any] | None]] = []

        for i, item in enumerate(raw_items):
            if i >= len(chunk):
                break
            coord = chunk[i]

            # Unit assertion
            units = item.get("hourly_units", {})
            if units:
                wind_u = units.get("wind_speed_10m")
                rain_u = units.get("rain")
                snow_u = units.get("snowfall")
                if wind_u not in ("mph", "mp/h") or rain_u != "inch" or snow_u != "inch":
                    raise UpstreamWeatherError(
                        f"Unexpected weather units from Open-Meteo: wind={wind_u}, rain={rain_u}, snow={snow_u}"
                    )

            hourly = item.get("hourly")
            results.append((coord, hourly))

        # Pad with None if count mismatched
        while len(results) < len(chunk):
            results.append((chunk[len(results)], None))

        return results

    def fetch_forecasts_for_coordinates(
        self, coords: list[tuple[float, float]]
    ) -> dict[tuple[float, float], dict[str, Any] | None]:
        """Fetch forecasts for given (lat, lon) coordinates, utilizing cache and parallel chunking.

        Coordinates are rounded to 2 decimals.
        Returns mapping from (lat, lon) -> hourly_data dict or None.
        """
        results: dict[tuple[float, float], dict[str, Any] | None] = {}
        needed_coords: list[tuple[float, float]] = []

        # 1. Check cache for each coordinate
        for lat, lon in coords:
            r_lat = round(lat, 2)
            r_lon = round(lon, 2)
            rounded = (r_lat, r_lon)

            if rounded in results:
                continue

            if self.cache_enabled:
                key = weather_cache_key(r_lat, r_lon)
                cached = get_cached_weather(key)
                if cached is not None:
                    results[rounded] = cached
                    continue

            results[rounded] = None
            if rounded not in needed_coords:
                needed_coords.append(rounded)

        # 2. Chunk un-cached coordinates in batches of <= 50
        if needed_coords:
            chunk_size = 50
            chunks = [
                needed_coords[i : i + chunk_size] for i in range(0, len(needed_coords), chunk_size)
            ]

            max_workers = min(len(chunks), 4)
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = [executor.submit(self._fetch_chunk, ch) for ch in chunks]
                for future in as_completed(futures):
                    chunk_results = future.result()
                    for coord, hourly in chunk_results:
                        results[coord] = hourly
                        if self.cache_enabled and hourly is not None:
                            key = weather_cache_key(coord[0], coord[1])
                            set_cached_weather(key, hourly)

        return results

    # Alias for convenience
    get_forecasts = fetch_forecasts_for_coordinates
