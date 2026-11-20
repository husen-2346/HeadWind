"""
timezones.py – Timezone resolution and departure time validation.

Determines IANA time zone from origin coordinates using timezonefinder.
Interprets naive departure timestamps in the origin's time zone.
Validates departure time within [now - 1h, now + MAX_DEPARTURE_HOURS_AHEAD].
"""

from __future__ import annotations

import zoneinfo
from datetime import UTC, datetime, timedelta

from django.conf import settings
from timezonefinder import TimezoneFinder

from trips.errors import ValidationError

_tz_finder: TimezoneFinder | None = None


def _get_finder() -> TimezoneFinder:
    global _tz_finder
    if _tz_finder is None:
        _tz_finder = TimezoneFinder()
    return _tz_finder


def get_timezone_at(lat: float, lon: float) -> str:
    """Find IANA time zone name at coordinates, fallback to 'UTC'."""
    try:
        finder = _get_finder()
        tz_name = finder.timezone_at(lat=lat, lng=lon)
        return tz_name or "UTC"
    except Exception:
        return "UTC"


def resolve_departure(
    departure_str: str,
    origin_lat: float,
    origin_lon: float,
    clock_now: datetime | None = None,
) -> tuple[datetime, datetime, str, str]:
    """Parse departure time, resolve time zone, and validate departure window.

    Args:
        departure_str: ISO 8601 timestamp string (e.g. '2026-11-25T06:00' or with offset).
        origin_lat:    Origin latitude.
        origin_lon:    Origin longitude.
        clock_now:     Injectable current UTC datetime for deterministic testing.

    Returns:
        (departure_utc, departure_local, timezone_name, timezone_abbr)

    Raises:
        ValidationError: if parsing fails or departure is outside the allowed window.
    """
    try:
        dt = datetime.fromisoformat(departure_str)
    except Exception as exc:
        raise ValidationError(f"Invalid ISO 8601 departure timestamp: '{departure_str}'") from exc

    tz_name = get_timezone_at(origin_lat, origin_lon)
    try:
        origin_tz = zoneinfo.ZoneInfo(tz_name)
    except Exception:
        origin_tz = zoneinfo.ZoneInfo("UTC")
        tz_name = "UTC"

    if dt.tzinfo is None:
        # Naive: interpret in origin's timezone
        departure_local = dt.replace(tzinfo=origin_tz)
    else:
        # Offset-aware: convert to origin's timezone for local representation
        departure_local = dt.astimezone(origin_tz)

    departure_utc = departure_local.astimezone(UTC)
    tz_abbr = departure_local.tzname() or tz_name

    # Validate window [now - 1h, now + MAX_DEPARTURE_HOURS_AHEAD]
    now = clock_now if clock_now is not None else datetime.now(UTC)
    max_ahead = getattr(settings, "MAX_DEPARTURE_HOURS_AHEAD", 72)

    min_allowed = now - timedelta(hours=1)
    max_allowed = now + timedelta(hours=max_ahead)

    if departure_utc < min_allowed or departure_utc > max_allowed:
        raise ValidationError(
            f"Departure time {departure_utc.isoformat()} is outside the valid scheduling window "
            f"(must be between {min_allowed.isoformat()} and {max_allowed.isoformat()})."
        )

    return departure_utc, departure_local, tz_name, tz_abbr
