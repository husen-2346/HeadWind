"""
responses.py – Response builder functions for Headwind API.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from trips.services.types import Recommendation, RiskLevel, RouteCandidate, RouteSummary


def format_route_summary(summary: RouteSummary) -> dict[str, Any]:
    """Serialize RouteSummary to the API contract dictionary."""
    return {
        "distance_miles": round(summary.distance_miles, 1),
        "duration_seconds": int(round(summary.duration_seconds)),
        "miles_by_level": {
            "low": round(summary.miles_by_level.get(RiskLevel.LOW, 0.0), 1),
            "moderate": round(summary.miles_by_level.get(RiskLevel.MODERATE, 0.0), 1),
            "high": round(summary.miles_by_level.get(RiskLevel.HIGH, 0.0), 1),
            "severe": round(summary.miles_by_level.get(RiskLevel.SEVERE, 0.0), 1),
            "no_travel": round(summary.miles_by_level.get(RiskLevel.NO_TRAVEL, 0.0), 1),
        },
        "unknown_miles": round(summary.unknown_miles, 1),
        "severe_miles": round(summary.severe_miles, 1),
        "high_miles": round(summary.high_miles, 1),
        "no_travel_miles": round(summary.no_travel_miles, 1),
        "avg_risk": round(summary.avg_risk, 2) if summary.avg_risk is not None else None,
        "max_level": summary.max_level.name.lower() if summary.max_level is not None else None,
    }


def build_analyze_response(
    *,
    origin: list[float],
    destination: list[float],
    departure_local: str,
    departure_utc: str,
    origin_timezone: str,
    load_lb: int,
    interval_miles: int,
    recommendation: Recommendation | None,
    weather_status: str,
    warnings: list[dict[str, str]],
    routes_data: list[dict[str, Any]],
    timings_ms: dict[str, int],
) -> dict[str, Any]:
    """Assemble the top-level POST /api/analyze JSON response payload."""
    rec_id: str | None = None
    rec_headline: str = ""
    rec_decided_by: str | None = None

    if recommendation is not None:
        rec_id = recommendation.best_route_id
        rec_headline = recommendation.headline
        rec_decided_by = recommendation.decided_by
    elif weather_status == "unavailable":
        rec_headline = "Weather forecast unavailable; routes displayed with travel times only."
    else:
        rec_headline = "Route analysis completed."

    routes_json = []
    for r in routes_data:
        cand: RouteCandidate = r["candidate"]
        summary: RouteSummary = r["summary"]

        routes_json.append(
            {
                "id": cand.id,
                "name": cand.name,
                "source": cand.source,
                "distance_miles": round(cand.distance_miles, 1),
                "duration_seconds": int(round(cand.duration_seconds)),
                "summary": format_route_summary(summary),
                "geometry": r["geometry"],
                "risk_segments": r["risk_segments"],
                "checkpoints": r["checkpoints"],
            }
        )

    return {
        "request": {
            "origin": [round(origin[0], 5), round(origin[1], 5)],
            "destination": [round(destination[0], 5), round(destination[1], 5)],
            "departure_local": departure_local,
            "departure_utc": departure_utc,
            "origin_timezone": origin_timezone,
            "load_lb": load_lb,
            "interval_miles": interval_miles,
        },
        "summary": {
            "recommended_route_id": rec_id,
            "headline": rec_headline,
            "decided_by": rec_decided_by,
            "weather_status": weather_status,
            "warnings": warnings,
        },
        "routes": routes_json,
        "meta": {
            "generated_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            "route_count": len(routes_json),
            "timings_ms": timings_ms,
            "data_sources": {
                "routing": "Mapbox Directions v5",
                "weather": "Open-Meteo Forecast (CC BY 4.0)",
            },
        },
    }
