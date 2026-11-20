"""
heatmap.py – Use case for generating 48-hour weather corridor heatmaps.

Constructs a weather corridor around candidate routes, evaluates hourly risk
from 0 to 48 hours for each point using the same load-adjusted risk rules,
and returns the grid points with risk level arrays.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from trips.cache import (
    get_cached_heatmap,
    heatmap_cache_key,
    set_cached_heatmap,
)
from trips.clients.mapbox import MapboxClient
from trips.clients.open_meteo import OpenMeteoClient
from trips.errors import UpstreamWeatherError
from trips.services.geo import corridor_points
from trips.services.risk import classify_checkpoint
from trips.services.weather_lookup import lookup_weather
from trips.timezones import resolve_departure
from trips.usecases.analyze_trip import TripAnalyzer

logger = logging.getLogger(__name__)


class CorridorHeatmapAnalyzer:
    """Evaluates 49-hour weather risk corridor along route candidates."""

    def __init__(
        self,
        mapbox_client: MapboxClient | None = None,
        weather_client: OpenMeteoClient | None = None,
        clock_now: datetime | None = None,
    ) -> None:
        self.mapbox = mapbox_client if mapbox_client is not None else MapboxClient()
        self.weather = weather_client if weather_client is not None else OpenMeteoClient()
        self.clock_now = clock_now

    def generate_heatmap(
        self,
        origin: list[float],
        destination: list[float],
        departure_local: str,
        load_lb: int = 40000,
    ) -> dict[str, Any]:
        """Generate 49-hour corridor heatmap for a given trip.

        Args:
            origin: [lon, lat] coordinate pair.
            destination: [lon, lat] coordinate pair.
            departure_local: ISO 8601 local departure timestamp.
            load_lb: Cargo weight in pounds.

        Returns:
            Dictionary matching the heatmap API response schema.
        """
        if load_lb <= 0:
            load_lb = 40000

        orig_lon, orig_lat = origin
        dest_lon, dest_lat = destination

        # 1. Determine start_utc (current UTC hour)
        if self.clock_now is not None:
            now_utc = (
                self.clock_now.replace(tzinfo=UTC)
                if self.clock_now.tzinfo is None
                else self.clock_now.astimezone(UTC)
            )
        else:
            now_utc = datetime.now(UTC)

        start_utc = now_utc.replace(minute=0, second=0, microsecond=0)
        start_utc_iso = start_utc.isoformat().replace("+00:00", "Z")

        # 2. Check 10-minute response cache keyed by (orig, dest, load_lb, start_utc_iso)
        cache_key = heatmap_cache_key(
            (orig_lat, orig_lon),
            (dest_lat, dest_lon),
            load_lb,
            start_utc_iso,
        )
        cached = get_cached_heatmap(cache_key)
        if cached is not None:
            dep_local_dt, dep_utc_dt, tz_name, _ = resolve_departure(
                departure_local, orig_lat, orig_lon, clock_now=self.clock_now
            )
            tz_abbr = dep_local_dt.tzname() or tz_name
            diff_hours = (dep_utc_dt - start_utc).total_seconds() / 3600.0
            dep_hour_offset = round(diff_hours)
            departure_hour_offset = int(dep_hour_offset) if 0 <= dep_hour_offset <= 48 else None
            cached_meta = dict(cached["meta"])
            cached_meta["departure_hour_offset"] = departure_hour_offset
            cached_meta["timezone"] = tz_name
            cached_meta["timezone_abbr"] = tz_abbr
            return {
                "meta": cached_meta,
                "warnings": cached.get("warnings", []),
                "points": cached.get("points", []),
            }

        # 3. Resolve departure and timezone
        dep_local_dt, dep_utc_dt, tz_name, _ = resolve_departure(
            departure_local, orig_lat, orig_lon, clock_now=self.clock_now
        )
        tz_abbr = dep_local_dt.tzname() or tz_name

        diff_hours = (dep_utc_dt - start_utc).total_seconds() / 3600.0
        dep_hour_offset = round(diff_hours)
        departure_hour_offset: int | None = (
            int(dep_hour_offset) if 0 <= dep_hour_offset <= 48 else None
        )

        # 4. Route selection (reuses route cache from analyze)
        analyzer = TripAnalyzer(
            mapbox_client=self.mapbox,
            weather_client=self.weather,
            clock_now=self.clock_now,
        )
        selected_routes, warnings = analyzer.get_selected_routes(
            orig_lat, orig_lon, dest_lat, dest_lon
        )

        geometries = [r.geometry for r in selected_routes]
        longest_miles = max(r.distance_miles for r in selected_routes)
        spacing_miles = max(25.0, longest_miles / 40.0)

        # 5. Build corridor grid points
        raw_points = corridor_points(
            geometries=geometries,
            spacing_miles=spacing_miles,
            lateral_miles=25.0,
            cell_deg=0.25,
            max_points=300,
        )

        # 6. Fetch weather for all corridor coordinates
        rounded_coords = [(round(lat, 2), round(lon, 2)) for lat, lon in raw_points]
        forecast_by_coord: dict[tuple[float, float], dict[str, Any] | None] = {}
        weather_status = "ok"

        try:
            forecast_by_coord = self.weather.get_forecasts(rounded_coords)
        except (UpstreamWeatherError, Exception) as exc:
            logger.warning("Heatmap weather fetch failed: %s", exc)
            weather_status = "unavailable"
            warnings.append(
                {
                    "code": "weather_unavailable",
                    "message": "Weather forecast unavailable for corridor points.",
                }
            )

        if weather_status != "unavailable":
            missing_count = sum(
                1 for c in rounded_coords if c not in forecast_by_coord or not forecast_by_coord[c]
            )
            if missing_count == len(rounded_coords) and len(rounded_coords) > 0:
                weather_status = "unavailable"
                warnings.append(
                    {
                        "code": "weather_unavailable",
                        "message": "Weather forecast unavailable for corridor points.",
                    }
                )
            elif missing_count > 0:
                weather_status = "partial"

        # 7. Compute level arrays for each point across 49 hours (0..48)
        points_output: list[dict[str, Any]] = []

        for lat, lon in raw_points:
            coord = (round(lat, 2), round(lon, 2))
            hourly = forecast_by_coord.get(coord)
            levels: list[int] = []

            for h in range(49):
                if weather_status == "unavailable" or hourly is None:
                    levels.append(-1)
                    continue

                target_dt = start_utc + timedelta(hours=h)
                wx = lookup_weather(hourly, target_dt)
                chk_risk = classify_checkpoint(wx, load_lb)
                lvl = int(chk_risk.level) if chk_risk.level is not None else -1
                levels.append(lvl)

            points_output.append({"lat": lat, "lon": lon, "levels": levels})

        # 8. Assemble response payload
        result: dict[str, Any] = {
            "meta": {
                "start_utc": start_utc_iso,
                "hour_count": 49,
                "timezone": tz_name,
                "timezone_abbr": tz_abbr,
                "load_lb": load_lb,
                "departure_hour_offset": departure_hour_offset,
                "weather_status": weather_status,
                "point_count": len(points_output),
            },
            "warnings": warnings,
            "points": points_output,
        }

        # 9. Cache for 10 minutes (600s)
        set_cached_heatmap(cache_key, result, ttl=600)
        return result
