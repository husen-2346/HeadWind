"""
cache.py – Caching utilities wrapping Django's cache backend.

Uses coordinates rounded to 4 decimals for directions,
and 2 decimals for weather.
"""

from __future__ import annotations

from typing import Any

from django.conf import settings
from django.core.cache import cache


def directions_cache_key(
    origin: tuple[float, float],
    destination: tuple[float, float],
    variant: str = "base",
) -> str:
    """Build cache key for directions query.

    Coordinates rounded to 4 decimals (~11m precision).
    """
    orig_str = f"{origin[0]:.4f},{origin[1]:.4f}"
    dest_str = f"{destination[0]:.4f},{destination[1]:.4f}"
    return f"headwind:dir:{orig_str}:{dest_str}:{variant}"


def weather_cache_key(lat: float, lon: float) -> str:
    """Build cache key for Open-Meteo hourly weather forecast.

    Coordinates rounded to 2 decimals (~1.1km precision).
    """
    return f"headwind:wx:{lat:.2f},{lon:.2f}"


def get_cached_directions(key: str) -> dict[str, Any] | None:
    return cache.get(key)


def set_cached_directions(key: str, data: dict[str, Any], ttl: int | None = None) -> None:
    timeout = ttl if ttl is not None else getattr(settings, "DIRECTIONS_CACHE_TTL", 3600)
    cache.set(key, data, timeout=timeout)


def get_cached_weather(key: str) -> dict[str, Any] | None:
    return cache.get(key)


def set_cached_weather(key: str, data: dict[str, Any], ttl: int | None = None) -> None:
    timeout = ttl if ttl is not None else getattr(settings, "WEATHER_CACHE_TTL", 1800)
    cache.set(key, data, timeout=timeout)
