"""
weather_lookup.py – Pure interpolation and lookup of Open-Meteo hourly forecast data.

Lookup rules:
  - Times are UTC hourly timestamps.
  - Wind: Linear interpolation between the two hourly values around the ETA.
  - Rain/Snow: Open-Meteo precipitation represents the preceding hour sum.
    Uses the value at the first hourly boundary at or after the ETA.
    rain_in_hr = rain + showers (if both None -> None; otherwise missing treated as 0.0).
    snow_in_hr = snowfall.
  - If ETA is outside available time range or a needed value is null, field is None.
  - Never extrapolate.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from .types import Weather


def _parse_utc_iso(time_str: str) -> datetime:
    """Parse Open-Meteo GMT timestamp into timezone-aware UTC datetime."""
    dt = datetime.fromisoformat(time_str)
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt.astimezone(UTC)


def lookup_weather(
    hourly_data: dict[str, Any] | None,
    eta_utc: datetime,
) -> Weather:
    """Extract and interpolate weather for a specific UTC arrival datetime.

    Args:
        hourly_data: Dictionary containing hourly series:
                     'time', 'wind_speed_10m', 'rain', 'showers', 'snowfall'.
        eta_utc:     Timezone-aware arrival datetime at checkpoint.

    Returns:
        Weather(wind_mph, rain_in_hr, snow_in_hr).
    """
    if not hourly_data:
        return Weather(None, None, None)

    raw_times = hourly_data.get("time") or []
    if not raw_times:
        return Weather(None, None, None)

    # Ensure eta_utc is UTC
    eta_utc = eta_utc.replace(tzinfo=UTC) if eta_utc.tzinfo is None else eta_utc.astimezone(UTC)

    # Parse timestamps
    parsed_times = [_parse_utc_iso(t) for t in raw_times]

    first_t = parsed_times[0]
    last_t = parsed_times[-1]

    # Out of range check (never extrapolate)
    if eta_utc < first_t or eta_utc > last_t:
        return Weather(None, None, None)

    wind_list = hourly_data.get("wind_speed_10m") or []
    rain_list = hourly_data.get("rain") or []
    showers_list = hourly_data.get("showers") or []
    snow_list = hourly_data.get("snowfall") or []

    # 1. Wind speed: Linear interpolation
    wind_mph: float | None = None
    # Find interval
    for i in range(len(parsed_times)):
        t_cur = parsed_times[i]
        if t_cur == eta_utc:
            if i < len(wind_list) and wind_list[i] is not None:
                wind_mph = float(wind_list[i])
            break
        elif i + 1 < len(parsed_times) and parsed_times[i] < eta_utc < parsed_times[i + 1]:
            t0 = parsed_times[i].timestamp()
            t1 = parsed_times[i + 1].timestamp()
            frac = (eta_utc.timestamp() - t0) / (t1 - t0)

            w0 = wind_list[i] if i < len(wind_list) else None
            w1 = wind_list[i + 1] if i + 1 < len(wind_list) else None

            if w0 is not None and w1 is not None:
                wind_mph = float(w0) + frac * (float(w1) - float(w0))
            break

    # 2. Rain and Snow: First boundary at or after ETA
    rain_in_hr: float | None = None
    snow_in_hr: float | None = None

    for j in range(len(parsed_times)):
        if parsed_times[j] >= eta_utc:
            r_val = rain_list[j] if j < len(rain_list) else None
            sh_val = showers_list[j] if j < len(showers_list) else None
            sn_val = snow_list[j] if j < len(snow_list) else None

            if r_val is None and sh_val is None:
                rain_in_hr = None
            else:
                rain_in_hr = (float(r_val) if r_val is not None else 0.0) + (
                    float(sh_val) if sh_val is not None else 0.0
                )

            snow_in_hr = float(sn_val) if sn_val is not None else None
            break

    return Weather(
        wind_mph=round(wind_mph, 2) if wind_mph is not None else None,
        rain_in_hr=round(rain_in_hr, 4) if rain_in_hr is not None else None,
        snow_in_hr=round(snow_in_hr, 4) if snow_in_hr is not None else None,
    )
