"""
constants.py – All numeric thresholds as plain Python data.

No Django imports. No magic numbers elsewhere in the codebase.
"""

EARTH_RADIUS_MILES = 3958.8

# ---------------------------------------------------------------------------
# Wind thresholds  (mph, sustained, 10 m)
# Half-open intervals:  [low_bound, high_bound)
# Top band is open-ended (>= 55 → NO_TRAVEL)
# ---------------------------------------------------------------------------
WIND_THRESHOLDS: list[tuple[str, float, float | None]] = [
    # (level_name, lower_inclusive, upper_exclusive_or_None_for_top)
    ("LOW", 0.0, 25.0),
    ("MODERATE", 25.0, 35.0),
    ("HIGH", 35.0, 45.0),
    ("SEVERE", 45.0, 55.0),
    ("NO_TRAVEL", 55.0, None),
]

# ---------------------------------------------------------------------------
# Rain thresholds  (in/hr)
# Top band: Severe is [0.50, 1.00] (1.00 itself is Severe).
#           NO_TRAVEL is > 1.00.
# Encoded here as (name, lower_inclusive, upper_exclusive_for_NO_TRAVEL_cutoff)
# The rule is enforced in risk.py via classify_rain().
# ---------------------------------------------------------------------------
RAIN_THRESHOLDS: list[tuple[str, float, float | None]] = [
    ("LOW", 0.0, 0.10),
    ("MODERATE", 0.10, 0.25),
    ("HIGH", 0.25, 0.50),
    ("SEVERE", 0.50, 1.00),  # upper bound 1.00 is INCLUSIVE for Severe
    ("NO_TRAVEL", 1.00, None),  # > 1.00 (strictly)
]

# ---------------------------------------------------------------------------
# Snow thresholds  (in/hr)
# Same closed-top pattern as rain: Severe is [2.0, 3.0]; NO_TRAVEL > 3.0.
# ---------------------------------------------------------------------------
SNOW_THRESHOLDS: list[tuple[str, float, float | None]] = [
    ("LOW", 0.0, 0.5),
    ("MODERATE", 0.5, 1.0),
    ("HIGH", 1.0, 2.0),
    ("SEVERE", 2.0, 3.0),  # upper bound 3.0 is INCLUSIVE for Severe
    ("NO_TRAVEL", 3.0, None),  # > 3.0 (strictly)
]

# ---------------------------------------------------------------------------
# Load escalation rules  (wind only, load compared with strict >)
# ---------------------------------------------------------------------------
LOAD_RULES: list[dict] = [
    {
        "min_wind_mph": 55.0,
        "max_wind_mph": None,  # open-ended (but already NO_TRAVEL)
        "min_load_lb": None,  # any load
        "escalate_to": "NO_TRAVEL",
        "description": "Wind >= 55 mph is No Travel for any load",
    },
    {
        "min_wind_mph": 45.0,
        "max_wind_mph": 55.0,
        "min_load_lb": 30_000.0,  # load STRICTLY > 30,000
        "escalate_to": "NO_TRAVEL",
        "description": "Wind 45-54 mph and load > 30,000 lb: No Travel",
    },
    {
        "min_wind_mph": 35.0,
        "max_wind_mph": 45.0,
        "min_load_lb": 40_000.0,  # load STRICTLY > 40,000
        "escalate_to": "SEVERE",
        "description": "Wind 35-44 mph and load > 40,000 lb: Severe",
    },
]

# ---------------------------------------------------------------------------
# RISK_RULES: JSON-serialisable dict exposed by the API in Phase 2.
# Frontend uses this so no thresholds are ever hard-coded in components.
# ---------------------------------------------------------------------------
RISK_RULES: dict = {
    "levels": ["LOW", "MODERATE", "HIGH", "SEVERE", "NO_TRAVEL"],
    "variables": {
        "wind_mph": {
            "unit": "mph",
            "description": "Sustained wind speed at 10 m (not gusts)",
            "thresholds": [
                {"level": "LOW", "lower_inclusive": 0.0, "upper_exclusive": 25.0},
                {"level": "MODERATE", "lower_inclusive": 25.0, "upper_exclusive": 35.0},
                {"level": "HIGH", "lower_inclusive": 35.0, "upper_exclusive": 45.0},
                {"level": "SEVERE", "lower_inclusive": 45.0, "upper_exclusive": 55.0},
                {"level": "NO_TRAVEL", "lower_inclusive": 55.0, "upper_exclusive": None},
            ],
        },
        "rain_in_hr": {
            "unit": "in/hr",
            "description": "Precipitation rate (rain)",
            "thresholds": [
                {"level": "LOW", "lower_inclusive": 0.0, "upper_exclusive": 0.10},
                {"level": "MODERATE", "lower_inclusive": 0.10, "upper_exclusive": 0.25},
                {"level": "HIGH", "lower_inclusive": 0.25, "upper_exclusive": 0.50},
                {"level": "SEVERE", "lower_inclusive": 0.50, "upper_inclusive": 1.00},
                {"level": "NO_TRAVEL", "lower_exclusive": 1.00, "upper_exclusive": None},
            ],
        },
        "snow_in_hr": {
            "unit": "in/hr",
            "description": "Precipitation rate (snow/sleet)",
            "thresholds": [
                {"level": "LOW", "lower_inclusive": 0.0, "upper_exclusive": 0.5},
                {"level": "MODERATE", "lower_inclusive": 0.5, "upper_exclusive": 1.0},
                {"level": "HIGH", "lower_inclusive": 1.0, "upper_exclusive": 2.0},
                {"level": "SEVERE", "lower_inclusive": 2.0, "upper_inclusive": 3.0},
                {"level": "NO_TRAVEL", "lower_exclusive": 3.0, "upper_exclusive": None},
            ],
        },
    },
    "load_rules": LOAD_RULES,
    "recommendation_order": [
        "no_travel_miles (ascending)",
        "severe_miles (ascending)",
        "high_miles (ascending)",
        "avg_risk (ascending)",
        "duration_seconds (ascending)",
    ],
    "notes": [
        "Checkpoint risk = worst of wind, rain and snow.",
        "Load rules apply to wind only.",
        "Load comparisons use strict greater-than (> not >=).",
        "Routes with unknown weather rank after fully-known routes.",
        "Routing uses Mapbox driving profile – not truck-restricted.",
    ],
}
