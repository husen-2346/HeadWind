"""
trips/services/__init__.py

Public API for the Headwind risk engine.
Import from here to stay decoupled from the internal module layout.
"""

from .analysis import analyze_route
from .candidates import (
    offset_waypoint,
    route_similarity,
    select_routes,
    simplify_polyline,
)
from .constants import (
    EARTH_RADIUS_MILES,
    LOAD_RULES,
    MAX_DISTANCE_MULTIPLIER,
    MAX_DURATION_MULTIPLIER,
    RISK_RULES,
    SIMILARITY_DUPLICATE_THRESHOLD,
    SIMILARITY_SAMPLE_MILES,
    SIMILARITY_TOLERANCE_MILES,
    SIMPLIFY_TOLERANCE_DEG,
)
from .eta import (
    build_profile_from_annotations,
    eta_datetime,
    eta_seconds_at_mile,
    linear_profile,
)
from .geo import cumulative_miles, geometry_slice, haversine_miles, point_at_mile
from .recommend import rank_routes
from .risk import classify_checkpoint, classify_rain, classify_snow, classify_wind
from .sampling import sample_checkpoints, segment_miles_owned
from .types import (
    Checkpoint,
    CheckpointRisk,
    Recommendation,
    RiskLevel,
    RouteCandidate,
    RouteComparison,
    RouteSummary,
    Weather,
)
from .weather_lookup import lookup_weather

__all__ = [
    # constants
    "EARTH_RADIUS_MILES",
    "LOAD_RULES",
    "RISK_RULES",
    "MAX_DISTANCE_MULTIPLIER",
    "MAX_DURATION_MULTIPLIER",
    "SIMILARITY_DUPLICATE_THRESHOLD",
    "SIMILARITY_SAMPLE_MILES",
    "SIMILARITY_TOLERANCE_MILES",
    "SIMPLIFY_TOLERANCE_DEG",
    # types
    "Checkpoint",
    "CheckpointRisk",
    "Recommendation",
    "RiskLevel",
    "RouteCandidate",
    "RouteComparison",
    "RouteSummary",
    "Weather",
    # geo
    "cumulative_miles",
    "geometry_slice",
    "haversine_miles",
    "point_at_mile",
    # sampling
    "sample_checkpoints",
    "segment_miles_owned",
    # candidates
    "offset_waypoint",
    "route_similarity",
    "select_routes",
    "simplify_polyline",
    # eta
    "build_profile_from_annotations",
    "eta_datetime",
    "eta_seconds_at_mile",
    "linear_profile",
    # risk
    "classify_wind",
    "classify_rain",
    "classify_snow",
    "classify_checkpoint",
    # weather lookup
    "lookup_weather",
    # analysis
    "analyze_route",
    # recommend
    "rank_routes",
]
