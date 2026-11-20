"""
risk.py – Weather risk classification and load-escalation rules.

All classification functions are pure: same inputs always produce
same outputs. No Django imports, no I/O.

Threshold rules:
  Wind mph  : Low <25; Moderate [25,35); High [35,45); Severe [45,55); No Travel >=55
  Rain in/hr: Low <0.10; Moderate [0.10,0.25); High [0.25,0.50);
              Severe [0.50,1.00] (1.00 itself is Severe); No Travel >1.00
  Snow in/hr: Low <0.5; Moderate [0.5,1.0); High [1.0,2.0);
              Severe [2.0,3.0] (3.0 itself is Severe); No Travel >3.0

Load rules (wind only, load compared with strict >):
  wind >= 55:              No Travel any load     (already covered by threshold)
  45 <= wind < 55 & load > 30,000: No Travel
  35 <= wind < 45 & load > 40,000: Severe

A load rule can only RAISE the final level (never lower it).
"""

from __future__ import annotations

from .types import CheckpointRisk, RiskLevel, Weather


def classify_wind(mph: float) -> RiskLevel:
    """Return the RiskLevel for a sustained wind speed in mph.

    Implements half-open intervals:
        Low      [0,  25)
        Moderate [25, 35)
        High     [35, 45)
        Severe   [45, 55)
        No Travel >= 55

    Args:
        mph: Wind speed in mph. Must be >= 0.

    Returns:
        RiskLevel

    Raises:
        ValueError: if mph < 0.
    """
    if mph < 0:
        raise ValueError(f"wind_mph must be >= 0, got {mph}")
    if mph < 25:
        return RiskLevel.LOW
    if mph < 35:
        return RiskLevel.MODERATE
    if mph < 45:
        return RiskLevel.HIGH
    if mph < 55:
        return RiskLevel.SEVERE
    return RiskLevel.NO_TRAVEL


def classify_rain(in_hr: float) -> RiskLevel:
    """Return the RiskLevel for a rainfall rate in inches per hour.

    Implements:
        Low      [0,    0.10)
        Moderate [0.10, 0.25)
        High     [0.25, 0.50)
        Severe   [0.50, 1.00]   ← upper bound is INCLUSIVE
        No Travel > 1.00        ← strictly greater than 1.00

    Args:
        in_hr: Rain rate in in/hr. Must be >= 0.

    Returns:
        RiskLevel

    Raises:
        ValueError: if in_hr < 0.
    """
    if in_hr < 0:
        raise ValueError(f"rain_in_hr must be >= 0, got {in_hr}")
    if in_hr < 0.10:
        return RiskLevel.LOW
    if in_hr < 0.25:
        return RiskLevel.MODERATE
    if in_hr < 0.50:
        return RiskLevel.HIGH
    if in_hr <= 1.00:  # 0.50 <= x <= 1.00  → Severe
        return RiskLevel.SEVERE
    return RiskLevel.NO_TRAVEL  # > 1.00


def classify_snow(in_hr: float) -> RiskLevel:
    """Return the RiskLevel for a snowfall rate in inches per hour.

    Implements:
        Low      [0,   0.5)
        Moderate [0.5, 1.0)
        High     [1.0, 2.0)
        Severe   [2.0, 3.0]   ← upper bound is INCLUSIVE
        No Travel > 3.0       ← strictly greater than 3.0

    Args:
        in_hr: Snow rate in in/hr. Must be >= 0.

    Returns:
        RiskLevel

    Raises:
        ValueError: if in_hr < 0.
    """
    if in_hr < 0:
        raise ValueError(f"snow_in_hr must be >= 0, got {in_hr}")
    if in_hr < 0.5:
        return RiskLevel.LOW
    if in_hr < 1.0:
        return RiskLevel.MODERATE
    if in_hr < 2.0:
        return RiskLevel.HIGH
    if in_hr <= 3.0:  # 2.0 <= x <= 3.0  → Severe
        return RiskLevel.SEVERE
    return RiskLevel.NO_TRAVEL  # > 3.0


def _apply_load_rule(
    wind_mph: float,
    load_lb: float,
    base_wind_level: RiskLevel,
) -> tuple[RiskLevel, bool, str | None]:
    """Apply cargo-weight escalation to the wind risk level.

    Rules (applied in priority order; highest escalation wins):
        wind >= 55:                       No Travel (any load) [already threshold]
        45 <= wind < 55 & load > 30,000:  No Travel
        35 <= wind < 45 & load > 40,000:  Severe

    Args:
        wind_mph:        Sustained wind speed in mph.
        load_lb:         Cargo weight in pounds. Must be > 0.
        base_wind_level: The RiskLevel already assigned by classify_wind().

    Returns:
        Tuple of (final_level, escalated_by_load, escalation_reason).
        escalated_by_load is True only when the load rule produced a
        level HIGHER than base_wind_level.
        escalation_reason is a plain sentence or None.
    """
    escalated_level: RiskLevel | None = None
    reason: str | None = None

    if 45.0 <= wind_mph < 55.0 and load_lb > 30_000:
        escalated_level = RiskLevel.NO_TRAVEL
        reason = f"{wind_mph:.4g} mph is Severe. Load over 30,000 lb raises it to No Travel."
    elif 35.0 <= wind_mph < 45.0 and load_lb > 40_000:
        escalated_level = RiskLevel.SEVERE
        reason = f"{wind_mph:.4g} mph is High. Load over 40,000 lb raises it to Severe."
    # wind >= 55 is already NO_TRAVEL from classify_wind; no load escalation needed.

    if escalated_level is not None and escalated_level > base_wind_level:
        return escalated_level, True, reason

    return base_wind_level, False, None


def classify_checkpoint(weather: Weather, load_lb: float) -> CheckpointRisk:
    """Classify the risk at a single checkpoint given weather and load.

    Algorithm:
        1. Classify each weather variable independently.
           Missing (None) variables are excluded.
        2. Apply load escalation to the wind level (if wind is known).
        3. The checkpoint level is the maximum of wind (after escalation),
           rain and snow levels.
        4. If all three are None the level is None (unknown checkpoint).

    Args:
        weather: Weather observation/forecast at this checkpoint.
        load_lb: Cargo weight in pounds. Must be > 0.

    Returns:
        CheckpointRisk with the final level and per-variable breakdown.

    Raises:
        ValueError: if any non-None weather value is negative.
        ValueError: if load_lb <= 0.
    """
    if load_lb <= 0:
        raise ValueError(f"load_lb must be > 0, got {load_lb}")

    # --- classify each variable (may raise ValueError for negative values)
    wind_level: RiskLevel | None = None
    escalated_by_load = False
    escalation_reason: str | None = None

    if weather.wind_mph is not None:
        wind_level = classify_wind(weather.wind_mph)
        wind_level, escalated_by_load, escalation_reason = _apply_load_rule(
            weather.wind_mph, load_lb, wind_level
        )

    rain_level: RiskLevel | None = None
    if weather.rain_in_hr is not None:
        rain_level = classify_rain(weather.rain_in_hr)

    snow_level: RiskLevel | None = None
    if weather.snow_in_hr is not None:
        snow_level = classify_snow(weather.snow_in_hr)

    # --- worst of all known variables
    known = [lv for lv in (wind_level, rain_level, snow_level) if lv is not None]
    final_level: RiskLevel | None = max(known) if known else None

    # escalated_by_load is True only when the load rule produced a HIGHER
    # level than what classify_wind() alone would give AND that wind level
    # (post-escalation) is actually the final level.
    # Edge case: if rain or snow is already worse than the escalated wind,
    # the load escalation has no net effect on the final level.
    # We preserve escalated_by_load = True as long as the load changed the
    # wind level (the information is still accurate for display).

    return CheckpointRisk(
        level=final_level,
        wind_level=wind_level,
        rain_level=rain_level,
        snow_level=snow_level,
        escalated_by_load=escalated_by_load,
        escalation_reason=escalation_reason,
    )
