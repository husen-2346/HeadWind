"""
analyze_trip.py – Orchestrator use case for the trip analysis pipeline.

Coordinates:
  1. Input validation & departure timezone resolution
  2. Mapbox primary directions + diversity fallback variants
  3. Checkpoint sampling & ETA calculation along route
  4. Batched Open-Meteo weather lookups
  5. Load-adjusted risk evaluation & continuous risk segments
  6. Multi-criteria recommendation ranking
"""

from __future__ import annotations

import logging
import time
import zoneinfo
from concurrent.futures import ThreadPoolExecutor, wait
from datetime import datetime
from typing import Any

from trips.clients.mapbox import MapboxClient
from trips.clients.open_meteo import OpenMeteoClient
from trips.errors import NoRouteFoundError, UpstreamWeatherError
from trips.responses import build_analyze_response
from trips.services.analysis import analyze_route
from trips.services.candidates import offset_waypoint, select_routes, simplify_polyline
from trips.services.eta import (
    build_profile_from_annotations,
    eta_datetime,
    eta_seconds_at_mile,
    linear_profile,
)
from trips.services.geo import cumulative_miles, geometry_slice
from trips.services.recommend import rank_routes
from trips.services.sampling import sample_checkpoints, segment_miles_owned
from trips.services.types import Checkpoint, RouteCandidate, Weather
from trips.services.weather_lookup import lookup_weather
from trips.timezones import get_timezone_at, resolve_departure

logger = logging.getLogger(__name__)


class TripAnalyzer:
    """Orchestrator for analyzing weather risks along multi-candidate truck routes."""

    def __init__(
        self,
        mapbox_client: MapboxClient | None = None,
        weather_client: OpenMeteoClient | None = None,
        clock_now: datetime | None = None,
    ) -> None:
        self.mapbox = mapbox_client if mapbox_client is not None else MapboxClient()
        self.weather = weather_client if weather_client is not None else OpenMeteoClient()
        self.clock_now = clock_now

    def analyze(
        self,
        origin: list[float],
        destination: list[float],
        departure_local: str,
        load_lb: int = 40000,
        interval_miles: int = 25,
    ) -> dict[str, Any]:
        """Execute the end-to-end trip analysis pipeline.

        Args:
            origin: [lon, lat] coordinate pair.
            destination: [lon, lat] coordinate pair.
            departure_local: ISO 8601 local departure timestamp.
            load_lb: Cargo weight in pounds.
            interval_miles: Weather checkpoint sampling interval (10, 25, or 50).

        Returns:
            Dictionary matching the API response schema.
        """
        if load_lb <= 0:
            load_lb = 40000
        start_total = time.perf_counter()
        orig_lon, orig_lat = origin
        dest_lon, dest_lat = destination

        # 1. Resolve departure datetime and origin timezone
        dep_local_dt, dep_utc_dt, tz_name, _ = resolve_departure(
            departure_local, orig_lat, orig_lon, clock_now=self.clock_now
        )

        # 2. Mapbox primary directions + diversity fallbacks
        t_routing_start = time.perf_counter()
        primary_candidates = self.mapbox.directions(
            origin=(orig_lat, orig_lon),
            destination=(dest_lat, dest_lon),
            alternatives=True,
            source="primary",
        )
        selected = select_routes(primary_candidates, max_routes=3)

        warnings: list[dict[str, str]] = []

        if len(selected) < 3:
            # Generate variants in parallel
            via_pts = [
                offset_waypoint(
                    (orig_lat, orig_lon),
                    (dest_lat, dest_lon),
                    fraction=0.45,
                    lateral_frac=+0.15,
                ),
                offset_waypoint(
                    (orig_lat, orig_lon),
                    (dest_lat, dest_lon),
                    fraction=0.55,
                    lateral_frac=-0.15,
                ),
                offset_waypoint(
                    (orig_lat, orig_lon),
                    (dest_lat, dest_lon),
                    fraction=0.35,
                    lateral_frac=+0.25,
                ),
                offset_waypoint(
                    (orig_lat, orig_lon),
                    (dest_lat, dest_lon),
                    fraction=0.65,
                    lateral_frac=-0.25,
                ),
            ]

            def _fetch_variant(fn, *args, **kwargs):
                try:
                    return fn(*args, **kwargs)
                except Exception as exc:
                    logger.warning("Variant route generation failed: %s", exc)
                    return []

            variant_candidates: list[RouteCandidate] = list(primary_candidates)
            with ThreadPoolExecutor(max_workers=6) as executor:
                futures = [
                    executor.submit(
                        _fetch_variant,
                        self.mapbox.directions,
                        (orig_lat, orig_lon),
                        (dest_lat, dest_lon),
                        alternatives=False,
                        exclude="toll",
                        source="exclude_toll",
                    ),
                    executor.submit(
                        _fetch_variant,
                        self.mapbox.directions,
                        (orig_lat, orig_lon),
                        (dest_lat, dest_lon),
                        alternatives=False,
                        exclude="motorway",
                        source="exclude_motorway",
                    ),
                ]
                for vp in via_pts:
                    futures.append(
                        executor.submit(
                            _fetch_variant,
                            self.mapbox.directions,
                            (orig_lat, orig_lon),
                            (dest_lat, dest_lon),
                            waypoints=[vp],
                            alternatives=False,
                            source="via_offset",
                        )
                    )

                done, _ = wait(futures, timeout=6.0)
                for f in done:
                    try:
                        res = f.result()
                        if res:
                            variant_candidates.extend(res)
                    except Exception:
                        pass

            selected = select_routes(variant_candidates, max_routes=3)

        if not selected:
            raise NoRouteFoundError("No routes found between origin and destination.")

        if len(selected) < 3:
            warnings.append(
                {
                    "code": "fewer_routes",
                    "message": f"Only {len(selected)} distinct routes could be found for this corridor.",
                }
            )

        routing_ms = max(1, int(round((time.perf_counter() - t_routing_start) * 1000)))

        # 3. Checkpoint sampling & ETA calculation per route
        route_checkpoints_data: list[
            tuple[
                RouteCandidate,
                list[Checkpoint],
                list[tuple[Checkpoint, datetime, datetime]],
                list[float],
            ]
        ] = []

        all_coords_set: set[tuple[float, float]] = set()

        for route in selected:
            # Scaled cumulative distances for geometry slicing
            cum = cumulative_miles(route.geometry)
            tot_h = cum[-1] if cum else 0.0
            scale = route.distance_miles / tot_h if tot_h > 0 else 1.0
            scaled_cum = [c * scale for c in cum]

            checkpoints = sample_checkpoints(route.geometry, route.distance_miles, interval_miles)

            if (
                route.annotations
                and "distance" in route.annotations
                and "duration" in route.annotations
            ):
                miles_prof, secs_prof = build_profile_from_annotations(
                    route.annotations["distance"],
                    route.annotations["duration"],
                    route.distance_miles,
                )
            else:
                miles_prof, secs_prof = linear_profile(route.distance_miles, route.duration_seconds)

            etas: list[tuple[Checkpoint, datetime, datetime]] = []
            for cp in checkpoints:
                s = eta_seconds_at_mile(cp.mile, miles_prof, secs_prof)
                cp_eta_utc = eta_datetime(dep_utc_dt, s)
                cp_tz_name = get_timezone_at(cp.lat, cp.lon)
                cp_tz = zoneinfo.ZoneInfo(cp_tz_name)
                cp_eta_local = cp_eta_utc.astimezone(cp_tz)
                etas.append((cp, cp_eta_utc, cp_eta_local))
                all_coords_set.add((round(cp.lat, 2), round(cp.lon, 2)))

            route_checkpoints_data.append((route, checkpoints, etas, scaled_cum))

        # 4. Batched weather lookup
        t_weather_start = time.perf_counter()
        weather_status = "complete"
        forecast_by_coord: dict[tuple[float, float], dict[str, Any]] = {}

        try:
            forecast_by_coord = self.weather.get_forecasts(list(all_coords_set))
        except (UpstreamWeatherError, Exception) as exc:
            logger.warning("Weather fetch failed: %s", exc)
            weather_status = "unavailable"
            warnings.append(
                {
                    "code": "weather_unavailable",
                    "message": "Weather data could not be retrieved. Displaying route geometry and travel times only.",
                }
            )

        if weather_status != "unavailable":
            missing_count = sum(
                1 for c in all_coords_set if c not in forecast_by_coord or not forecast_by_coord[c]
            )
            if missing_count == len(all_coords_set):
                weather_status = "unavailable"
                warnings.append(
                    {
                        "code": "weather_unavailable",
                        "message": "Weather data could not be retrieved. Displaying route geometry and travel times only.",
                    }
                )
            elif missing_count > 0:
                weather_status = "partial"

        weather_ms = max(1, int(round((time.perf_counter() - t_weather_start) * 1000)))

        # 5. Analysis & risk segments
        t_analysis_start = time.perf_counter()
        routes_data = []
        summaries_by_id = {}

        for route, checkpoints, etas, scaled_cum in route_checkpoints_data:
            weather_by_cp: dict[int, Weather] = {}
            for cp, cp_eta_utc, _ in etas:
                if weather_status == "unavailable":
                    wx = Weather(None, None, None)
                else:
                    coord = (round(cp.lat, 2), round(cp.lon, 2))
                    hourly = forecast_by_coord.get(coord)
                    wx = lookup_weather(hourly, cp_eta_utc)
                weather_by_cp[cp.index] = wx

            checkpoint_risks, summary = analyze_route(
                checkpoints,
                weather_by_cp,
                load_lb,
                route.distance_miles,
                route.duration_seconds,
            )
            summaries_by_id[route.id] = summary

            # Build continuous risk segments
            owned = segment_miles_owned(checkpoints, route.distance_miles)
            risk_segments: list[dict[str, Any]] = []

            cur_level: str | None = None
            cur_start = 0.0
            cur_end = 0.0
            running_mile = 0.0

            for i, (_, risk) in enumerate(zip(checkpoints, checkpoint_risks, strict=True)):
                cp_owned = owned[i]
                cp_start = running_mile
                cp_end = running_mile + cp_owned
                running_mile = cp_end
                lvl_str = risk.level.name.lower() if risk.level is not None else "unknown"

                if cur_level is None:
                    cur_level = lvl_str
                    cur_start = cp_start
                    cur_end = cp_end
                elif lvl_str == cur_level:
                    cur_end = cp_end
                else:
                    seg_geom = geometry_slice(route.geometry, scaled_cum, cur_start, cur_end)
                    risk_segments.append(
                        {
                            "level": cur_level,
                            "start_mile": round(cur_start, 1),
                            "end_mile": round(cur_end, 1),
                            "geometry": seg_geom,
                        }
                    )
                    cur_level = lvl_str
                    cur_start = cp_start
                    cur_end = cp_end

            if cur_level is not None:
                seg_geom = geometry_slice(route.geometry, scaled_cum, cur_start, cur_end)
                risk_segments.append(
                    {
                        "level": cur_level,
                        "start_mile": round(cur_start, 1),
                        "end_mile": round(cur_end, 1),
                        "geometry": seg_geom,
                    }
                )

            # Simplified geometry for client transmission
            simplified_geom = simplify_polyline(route.geometry)

            # Formatted checkpoint objects
            formatted_checkpoints = []
            for (cp, cp_eta_utc, cp_eta_local), risk in zip(etas, checkpoint_risks, strict=True):
                wx = weather_by_cp[cp.index]
                formatted_checkpoints.append(
                    {
                        "index": cp.index,
                        "mile": round(cp.mile, 1),
                        "lat": round(cp.lat, 5),
                        "lon": round(cp.lon, 5),
                        "eta_utc": cp_eta_utc.isoformat().replace("+00:00", "Z"),
                        "eta_local": cp_eta_local.isoformat(),
                        "weather": {
                            "wind_mph": wx.wind_mph,
                            "rain_in_hr": wx.rain_in_hr,
                            "snow_in_hr": wx.snow_in_hr,
                        },
                        "risk": {
                            "level": (risk.level.name.lower() if risk.level is not None else None),
                            "wind_level": (
                                risk.wind_level.name.lower()
                                if risk.wind_level is not None
                                else None
                            ),
                            "rain_level": (
                                risk.rain_level.name.lower()
                                if risk.rain_level is not None
                                else None
                            ),
                            "snow_level": (
                                risk.snow_level.name.lower()
                                if risk.snow_level is not None
                                else None
                            ),
                            "escalated_by_load": risk.escalated_by_load,
                            "escalation_reason": risk.escalation_reason,
                        },
                    }
                )

            routes_data.append(
                {
                    "candidate": route,
                    "summary": summary,
                    "geometry": simplified_geom,
                    "risk_segments": risk_segments,
                    "checkpoints": formatted_checkpoints,
                }
            )

        # 6. Recommendation
        recommendation = None
        if weather_status != "unavailable":
            recommendation = rank_routes(summaries_by_id)

        analysis_ms = max(1, int(round((time.perf_counter() - t_analysis_start) * 1000)))
        total_ms = max(1, int(round((time.perf_counter() - start_total) * 1000)))

        timings = {
            "routing": routing_ms,
            "weather": weather_ms,
            "analysis": analysis_ms,
            "total": total_ms,
        }

        return build_analyze_response(
            origin=origin,
            destination=destination,
            departure_local=dep_local_dt.isoformat(),
            departure_utc=dep_utc_dt.isoformat().replace("+00:00", "Z"),
            origin_timezone=tz_name,
            load_lb=load_lb,
            interval_miles=interval_miles,
            recommendation=recommendation,
            weather_status=weather_status,
            warnings=warnings,
            routes_data=routes_data,
            timings_ms=timings,
        )
