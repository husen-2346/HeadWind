"""
test_eta.py – Tests for ETA interpolation and datetime helpers.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta, timezone

import pytest

from trips.services import (
    eta_datetime,
    eta_seconds_at_mile,
    linear_profile,
)

# ---------------------------------------------------------------------------
# eta_seconds_at_mile
# ---------------------------------------------------------------------------


def test_eta_600_miles_12h_at_300_miles_gives_6h() -> None:
    """600 miles in 12 hours: at mile 300 (halfway) elapsed = 6 hours."""
    miles_prof, secs_prof = linear_profile(600.0, 12 * 3600)
    result = eta_seconds_at_mile(300.0, miles_prof, secs_prof)
    assert abs(result - 6 * 3600) < 1.0


def test_eta_clamp_below_zero() -> None:
    miles_prof, secs_prof = linear_profile(100.0, 3600.0)
    result = eta_seconds_at_mile(-10.0, miles_prof, secs_prof)
    assert result == 0.0


def test_eta_clamp_above_total() -> None:
    miles_prof, secs_prof = linear_profile(100.0, 3600.0)
    result = eta_seconds_at_mile(999.0, miles_prof, secs_prof)
    assert result == 3600.0


def test_eta_at_zero_miles() -> None:
    miles_prof, secs_prof = linear_profile(500.0, 7200.0)
    result = eta_seconds_at_mile(0.0, miles_prof, secs_prof)
    assert result == 0.0


def test_eta_at_total_miles() -> None:
    miles_prof, secs_prof = linear_profile(500.0, 7200.0)
    result = eta_seconds_at_mile(500.0, miles_prof, secs_prof)
    assert result == 7200.0


def test_eta_multipoint_profile_interpolation() -> None:
    """Multi-point profile: 0→100 mi in 1h, 100→200 mi in 2h (slower second half)."""
    miles_prof = [0.0, 100.0, 200.0]
    secs_prof = [0.0, 3600.0, 3 * 3600.0]  # 1h then 2h more

    # At mile 50 (first segment): 0.5 × 3600 = 1800 s
    assert abs(eta_seconds_at_mile(50.0, miles_prof, secs_prof) - 1800.0) < 1.0
    # At mile 150 (second segment): 3600 + 0.5 × 7200 = 3600 + 3600 = 7200 s
    assert abs(eta_seconds_at_mile(150.0, miles_prof, secs_prof) - 7200.0) < 1.0
    # At mile 100 exactly: 3600 s
    assert abs(eta_seconds_at_mile(100.0, miles_prof, secs_prof) - 3600.0) < 1.0


def test_eta_mismatched_profiles_raise() -> None:
    with pytest.raises(ValueError):
        eta_seconds_at_mile(50.0, [0.0, 100.0], [0.0])


def test_eta_empty_profiles_raise() -> None:
    with pytest.raises(ValueError):
        eta_seconds_at_mile(50.0, [], [])


# ---------------------------------------------------------------------------
# linear_profile
# ---------------------------------------------------------------------------


def test_linear_profile_structure() -> None:
    miles_prof, secs_prof = linear_profile(500.0, 7200.0)
    assert miles_prof == [0.0, 500.0]
    assert secs_prof == [0.0, 7200.0]


# ---------------------------------------------------------------------------
# eta_datetime
# ---------------------------------------------------------------------------


def test_eta_datetime_adds_seconds() -> None:
    departure = datetime(2024, 6, 1, 6, 0, 0, tzinfo=UTC)
    result = eta_datetime(departure, 6 * 3600)
    expected = datetime(2024, 6, 1, 12, 0, 0, tzinfo=UTC)
    assert result == expected


def test_eta_datetime_naive_raises() -> None:
    naive = datetime(2024, 6, 1, 6, 0, 0)  # no tzinfo
    with pytest.raises(ValueError, match="timezone-aware"):
        eta_datetime(naive, 3600.0)


def test_eta_datetime_full_trip_600_miles_12h() -> None:
    """600 miles / 12 h, departing 06:00 UTC: arrives at 18:00 UTC."""
    departure = datetime(2024, 1, 15, 6, 0, tzinfo=UTC)
    miles_prof, secs_prof = linear_profile(600.0, 12 * 3600)
    secs_at_300 = eta_seconds_at_mile(300.0, miles_prof, secs_prof)
    arrival = eta_datetime(departure, secs_at_300)
    assert arrival == datetime(2024, 1, 15, 12, 0, tzinfo=UTC)


def test_eta_datetime_non_utc_timezone() -> None:
    tz_offset = timezone(timedelta(hours=5, minutes=30))  # IST
    departure = datetime(2024, 6, 1, 6, 0, tzinfo=tz_offset)
    result = eta_datetime(departure, 3600.0)
    assert result.tzinfo is not None
    assert result == departure + timedelta(hours=1)
