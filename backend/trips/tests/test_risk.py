"""
test_risk.py – Boundary tests for wind/rain/snow classification and load rules.

Coverage targets:
  - Every threshold boundary: just below, exactly at, just above
  - Negative inputs raise ValueError
  - Load escalation (escalated_by_load, escalation_reason)
  - Worst-of-three logic and None fields
  - Load never lowers a level
"""

from __future__ import annotations

import pytest

from trips.services import (
    RiskLevel,
    Weather,
    classify_checkpoint,
    classify_rain,
    classify_snow,
    classify_wind,
)


# ---------------------------------------------------------------------------
# classify_wind
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "mph, expected",
    [
        # --- Low band ---
        (0.0, RiskLevel.LOW),
        (12.5, RiskLevel.LOW),
        (24.99, RiskLevel.LOW),
        # --- Moderate band ---
        (25.0, RiskLevel.MODERATE),
        (30.0, RiskLevel.MODERATE),
        (34.99, RiskLevel.MODERATE),
        # --- High band ---
        (35.0, RiskLevel.HIGH),
        (40.0, RiskLevel.HIGH),
        (44.99, RiskLevel.HIGH),
        # --- Severe band ---
        (45.0, RiskLevel.SEVERE),
        (50.0, RiskLevel.SEVERE),
        (54.99, RiskLevel.SEVERE),
        # --- No Travel ---
        (55.0, RiskLevel.NO_TRAVEL),
        (75.0, RiskLevel.NO_TRAVEL),
        (200.0, RiskLevel.NO_TRAVEL),
    ],
)
def test_classify_wind_boundaries(mph: float, expected: RiskLevel) -> None:
    assert classify_wind(mph) == expected


def test_classify_wind_negative_raises() -> None:
    with pytest.raises(ValueError, match="wind_mph"):
        classify_wind(-0.1)


def test_classify_wind_negative_large_raises() -> None:
    with pytest.raises(ValueError):
        classify_wind(-100)


# ---------------------------------------------------------------------------
# classify_rain
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "in_hr, expected",
    [
        # --- Low ---
        (0.0, RiskLevel.LOW),
        (0.0999, RiskLevel.LOW),
        # --- Moderate ---
        (0.10, RiskLevel.MODERATE),
        (0.15, RiskLevel.MODERATE),
        (0.2499, RiskLevel.MODERATE),
        # --- High ---
        (0.25, RiskLevel.HIGH),
        (0.40, RiskLevel.HIGH),
        (0.4999, RiskLevel.HIGH),
        # --- Severe (closed upper at 1.00) ---
        (0.50, RiskLevel.SEVERE),
        (0.75, RiskLevel.SEVERE),
        (1.00, RiskLevel.SEVERE),  # exactly 1.00 is Severe
        # --- No Travel (strictly > 1.00) ---
        (1.0001, RiskLevel.NO_TRAVEL),
        (2.0, RiskLevel.NO_TRAVEL),
    ],
)
def test_classify_rain_boundaries(in_hr: float, expected: RiskLevel) -> None:
    assert classify_rain(in_hr) == expected


def test_classify_rain_negative_raises() -> None:
    with pytest.raises(ValueError, match="rain_in_hr"):
        classify_rain(-0.01)


# ---------------------------------------------------------------------------
# classify_snow
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "in_hr, expected",
    [
        # --- Low ---
        (0.0, RiskLevel.LOW),
        (0.49, RiskLevel.LOW),
        # --- Moderate ---
        (0.5, RiskLevel.MODERATE),
        (0.75, RiskLevel.MODERATE),
        (0.99, RiskLevel.MODERATE),
        # --- High ---
        (1.0, RiskLevel.HIGH),
        (1.5, RiskLevel.HIGH),
        (1.99, RiskLevel.HIGH),
        # --- Severe (closed upper at 3.0) ---
        (2.0, RiskLevel.SEVERE),
        (2.5, RiskLevel.SEVERE),
        (3.0, RiskLevel.SEVERE),  # exactly 3.0 is Severe
        # --- No Travel (strictly > 3.0) ---
        (3.0001, RiskLevel.NO_TRAVEL),
        (5.0, RiskLevel.NO_TRAVEL),
    ],
)
def test_classify_snow_boundaries(in_hr: float, expected: RiskLevel) -> None:
    assert classify_snow(in_hr) == expected


def test_classify_snow_negative_raises() -> None:
    with pytest.raises(ValueError, match="snow_in_hr"):
        classify_snow(-0.5)


# ---------------------------------------------------------------------------
# classify_checkpoint – worst-of-three and None handling
# ---------------------------------------------------------------------------
def test_all_none_weather_gives_unknown_level() -> None:
    cr = classify_checkpoint(Weather(), load_lb=10_000)
    assert cr.level is None
    assert cr.wind_level is None
    assert cr.rain_level is None
    assert cr.snow_level is None
    assert cr.escalated_by_load is False


def test_one_none_field_is_skipped() -> None:
    # Only snow provided; should give a snow-only classification
    cr = classify_checkpoint(Weather(snow_in_hr=2.5), load_lb=10_000)
    assert cr.level == RiskLevel.SEVERE
    assert cr.wind_level is None
    assert cr.rain_level is None
    assert cr.snow_level == RiskLevel.SEVERE


def test_low_wind_severe_rain_gives_severe() -> None:
    cr = classify_checkpoint(Weather(wind_mph=10.0, rain_in_hr=0.75), load_lb=10_000)
    assert cr.level == RiskLevel.SEVERE
    assert cr.wind_level == RiskLevel.LOW
    assert cr.rain_level == RiskLevel.SEVERE


def test_all_three_max_is_used() -> None:
    # Wind: Moderate, Rain: High, Snow: Severe  → Severe
    cr = classify_checkpoint(
        Weather(wind_mph=28.0, rain_in_hr=0.30, snow_in_hr=2.5),
        load_lb=10_000,
    )
    assert cr.level == RiskLevel.SEVERE
    assert cr.wind_level == RiskLevel.MODERATE
    assert cr.rain_level == RiskLevel.HIGH
    assert cr.snow_level == RiskLevel.SEVERE


def test_zero_load_raises() -> None:
    with pytest.raises(ValueError, match="load_lb"):
        classify_checkpoint(Weather(wind_mph=10.0), load_lb=0)


def test_negative_load_raises() -> None:
    with pytest.raises(ValueError, match="load_lb"):
        classify_checkpoint(Weather(wind_mph=10.0), load_lb=-1)


# ---------------------------------------------------------------------------
# classify_checkpoint – load escalation rules
# ---------------------------------------------------------------------------


# Rule: 45-54 mph + load > 30,000 → No Travel
def test_load_rule_54_9_with_30001_is_no_travel() -> None:
    cr = classify_checkpoint(Weather(wind_mph=54.9), load_lb=30_001)
    assert cr.level == RiskLevel.NO_TRAVEL
    assert cr.escalated_by_load is True
    assert "30,000" in (cr.escalation_reason or "")
    assert "No Travel" in (cr.escalation_reason or "")


def test_load_rule_54_9_with_exactly_30000_stays_severe() -> None:
    # load == 30,000 → NOT escalated (strict >)
    cr = classify_checkpoint(Weather(wind_mph=54.9), load_lb=30_000)
    assert cr.level == RiskLevel.SEVERE
    assert cr.escalated_by_load is False
    assert cr.escalation_reason is None


def test_load_rule_54_9_with_29999_stays_severe() -> None:
    cr = classify_checkpoint(Weather(wind_mph=54.9), load_lb=29_999)
    assert cr.level == RiskLevel.SEVERE
    assert cr.escalated_by_load is False


# Rule: 35-44 mph + load > 40,000 → Severe
def test_load_rule_44_9_with_40001_is_severe() -> None:
    cr = classify_checkpoint(Weather(wind_mph=44.9), load_lb=40_001)
    assert cr.level == RiskLevel.SEVERE
    assert cr.escalated_by_load is True
    assert "40,000" in (cr.escalation_reason or "")
    assert "Severe" in (cr.escalation_reason or "")


def test_load_rule_44_9_with_exactly_40000_stays_high() -> None:
    # load == 40,000 → NOT escalated
    cr = classify_checkpoint(Weather(wind_mph=44.9), load_lb=40_000)
    assert cr.level == RiskLevel.HIGH
    assert cr.escalated_by_load is False


def test_load_rule_44_9_with_39999_stays_high() -> None:
    cr = classify_checkpoint(Weather(wind_mph=44.9), load_lb=39_999)
    assert cr.level == RiskLevel.HIGH
    assert cr.escalated_by_load is False


# wind >= 55 → NO_TRAVEL for any load
def test_wind_55_with_1lb_is_no_travel() -> None:
    cr = classify_checkpoint(Weather(wind_mph=55.0), load_lb=1)
    assert cr.level == RiskLevel.NO_TRAVEL
    # This is from the threshold, not the load rule
    assert cr.escalated_by_load is False


def test_wind_55_with_massive_load_is_still_no_travel_not_load_escalated() -> None:
    cr = classify_checkpoint(Weather(wind_mph=55.0), load_lb=100_000)
    assert cr.level == RiskLevel.NO_TRAVEL
    # Already NO_TRAVEL from threshold; load rule doesn't apply
    assert cr.escalated_by_load is False


# Moderate wind + extreme load stays Moderate (load rules only cover [35,55))
def test_wind_30_with_100000_lb_stays_moderate() -> None:
    cr = classify_checkpoint(Weather(wind_mph=30.0), load_lb=100_000)
    assert cr.level == RiskLevel.MODERATE
    assert cr.escalated_by_load is False


# Load never lowers a level: base NO_TRAVEL from rain stays NO_TRAVEL
def test_load_never_lowers_no_travel_from_rain() -> None:
    # Rain > 1.0 → NO_TRAVEL; wind is Moderate (no escalation needed)
    cr = classify_checkpoint(
        Weather(wind_mph=30.0, rain_in_hr=1.5),
        load_lb=1,
    )
    assert cr.level == RiskLevel.NO_TRAVEL
    assert cr.escalated_by_load is False  # load didn't do anything


# Escalation reason text format
def test_escalation_reason_contains_wind_speed() -> None:
    cr = classify_checkpoint(Weather(wind_mph=40.0), load_lb=50_000)
    assert cr.escalated_by_load is True
    reason = cr.escalation_reason or ""
    assert "40" in reason
    assert "Severe" in reason


def test_escalation_reason_no_travel_contains_30000() -> None:
    cr = classify_checkpoint(Weather(wind_mph=50.0), load_lb=35_000)
    assert cr.escalated_by_load is True
    reason = cr.escalation_reason or ""
    assert "30,000" in reason
    assert "No Travel" in reason
