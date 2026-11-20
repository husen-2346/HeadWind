"""
trips/services/__init__.py

Public API for the Headwind risk engine.
Import from here to stay decoupled from the internal module layout.
"""

from .analysis import analyze_route
from .constants import EARTH_RADIUS_MILES, LOAD_RULES, RISK_RULES
from .eta import eta_datetime, eta_seconds_at_mile, linear_profile
from .geo import cumulative_miles, haversine_miles, point_at_mile
from .recommend import rank_routes
from .risk import classify_checkpoint, classify_rain, classify_snow, classify_wind
from .sampling import sample_checkpoints, segment_miles_owned
from .types import (
    Checkpoint,
    CheckpointRisk,
    Recommendation,
    RiskLevel,
    RouteComparison,
    RouteSummary,
    Weather,
)

__all__ = [
    # constants
    "EARTH_RADIUS_MILES",
    "LOAD_RULES",
    "RISK_RULES",
    # types
    "Checkpoint",
    "CheckpointRisk",
    "Recommendation",
    "RiskLevel",
    "RouteComparison",
    "RouteSummary",
    "Weather",
    # geo
    "cumulative_miles",
    "haversine_miles",
    "point_at_mile",
    # sampling
    "sample_checkpoints",
    "segment_miles_owned",
    # eta
    "eta_datetime",
    "eta_seconds_at_mile",
    "linear_profile",
    # risk
    "classify_wind",
    "classify_rain",
    "classify_snow",
    "classify_checkpoint",
    # analysis
    "analyze_route",
    # recommend
    "rank_routes",
]
