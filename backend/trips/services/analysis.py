"""
analysis.py – Route-level aggregation of checkpoint risks.

Takes a list of checkpoints with their weather, computes the risk at each,
then aggregates into a RouteSummary using segment-mile ownership.

No Django imports. No network calls.
"""

from __future__ import annotations

from .risk import classify_checkpoint
from .sampling import segment_miles_owned
from .types import Checkpoint, CheckpointRisk, RiskLevel, RouteSummary, Weather


def analyze_route(
    checkpoints: list[Checkpoint],
    weather_by_checkpoint: dict[int, Weather],
    load_lb: float,
    total_miles: float,
    duration_seconds: float,
) -> tuple[list[CheckpointRisk], RouteSummary]:
    """Classify risk at each checkpoint and compute an aggregate RouteSummary.

    Algorithm:
        1. For each checkpoint look up its Weather (or treat it as all-None
           if no entry exists in weather_by_checkpoint).
        2. Classify the checkpoint risk using classify_checkpoint().
        3. Compute segment-mile ownership (midpoint rule).
        4. Aggregate miles_by_level, unknown_miles, avg_risk, max_level.

    Args:
        checkpoints:          Ordered checkpoint list for this route.
        weather_by_checkpoint: Maps checkpoint index → Weather.  Missing
                               keys are treated as fully unknown (all None).
        load_lb:              Cargo weight in pounds. Passed through to
                              classify_checkpoint().
        total_miles:          Authoritative route length (routing API, miles).
        duration_seconds:     Estimated travel time in seconds.

    Returns:
        (checkpoint_risks, route_summary) tuple.

    Raises:
        ValueError: if checkpoints is empty.
        ValueError: if load_lb <= 0 (propagated from classify_checkpoint).
    """
    if not checkpoints:
        raise ValueError("checkpoints must not be empty")

    owned_miles = segment_miles_owned(checkpoints, total_miles)

    checkpoint_risks: list[CheckpointRisk] = []
    miles_by_level: dict[RiskLevel, float] = dict.fromkeys(RiskLevel, 0.0)
    unknown_miles = 0.0
    weighted_risk_sum = 0.0
    known_miles_total = 0.0
    max_level: RiskLevel | None = None

    for cp, owned in zip(checkpoints, owned_miles, strict=False):
        weather = weather_by_checkpoint.get(cp.index, Weather())
        cr = classify_checkpoint(weather, load_lb)
        checkpoint_risks.append(cr)

        if cr.level is None:
            unknown_miles += owned
        else:
            miles_by_level[cr.level] = miles_by_level.get(cr.level, 0.0) + owned
            weighted_risk_sum += cr.level * owned
            known_miles_total += owned
            if max_level is None or cr.level > max_level:
                max_level = cr.level

    avg_risk = weighted_risk_sum / known_miles_total if known_miles_total > 0 else 0.0

    summary = RouteSummary(
        distance_miles=total_miles,
        duration_seconds=duration_seconds,
        miles_by_level=miles_by_level,
        unknown_miles=unknown_miles,
        severe_miles=miles_by_level.get(RiskLevel.SEVERE, 0.0),
        high_miles=miles_by_level.get(RiskLevel.HIGH, 0.0),
        no_travel_miles=miles_by_level.get(RiskLevel.NO_TRAVEL, 0.0),
        avg_risk=avg_risk,
        max_level=max_level,
    )

    return checkpoint_risks, summary
