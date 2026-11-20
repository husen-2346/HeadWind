"""
recommend.py – Route ranking and recommendation engine.

Implements the lexicographic ranking spec:

Ranking key (sort ascending, tuple comparison):
    (
        unknown_miles > 0,            # incomplete data ranks last
        round(no_travel_miles, 1),
        round(severe_miles, 1),
        round(high_miles, 1),
        round(avg_risk, 2),
        round(duration_seconds / 60), # whole minutes
        route_id,                     # deterministic tie-break
    )

No Django imports. No network calls.
"""

from __future__ import annotations

from .types import Recommendation, RouteComparison, RouteSummary

# Human-readable criterion labels (in key tuple order, skipping route_id)
_CRITERIA: list[tuple[str, str]] = [
    ("has_unknown", "unknown weather"),
    ("no_travel_miles", "no_travel_miles"),
    ("severe_miles", "severe_miles"),
    ("high_miles", "high_miles"),
    ("avg_risk", "avg_risk"),
    ("duration_minutes", "duration_minutes"),
    ("route_id", "route_id (tie)"),
]


def _ranking_key(route_id: str, summary: RouteSummary) -> tuple:
    """Compute the sort key for a single route.

    Returns a tuple that sorts ascending (best route sorts smallest).
    """
    return (
        summary.unknown_miles > 0,  # bool: False < True
        round(summary.no_travel_miles, 1),
        round(summary.severe_miles, 1),
        round(summary.high_miles, 1),
        round(summary.avg_risk, 2),
        round(summary.duration_seconds / 60),  # whole minutes
        route_id,  # str: lexicographic
    )


def _key_components(route_id: str, summary: RouteSummary) -> dict[str, object]:
    """Return the key components as a named dict for comparison display."""
    k = _ranking_key(route_id, summary)
    return {
        "has_unknown": k[0],
        "no_travel_miles": k[1],
        "severe_miles": k[2],
        "high_miles": k[3],
        "avg_risk": k[4],
        "duration_minutes": k[5],
        "route_id": k[6],
    }


def _first_differing_criterion(
    best_components: dict[str, object],
    other_components: dict[str, object],
) -> tuple[str, object, object]:
    """Return (criterion_name, best_value, other_value) for the first criterion
    where best_components and other_components differ.

    Returns ("tie", None, None) if all components are identical.
    """
    for key, label in _CRITERIA:
        bv = best_components[key]
        ov = other_components[key]
        if bv != ov:
            return label, bv, ov
    return "tie", None, None


def _format_duration_diff(best_seconds: float, other_seconds: float) -> str:
    """Return a human-readable string for the absolute time difference."""
    diff_minutes = abs(round((best_seconds - other_seconds) / 60))
    if diff_minutes == 0:
        return "less than 1 min"
    if diff_minutes == 1:
        return "1 min"
    return f"{diff_minutes} min"


def _build_headline(
    best_id: str,
    best_summary: RouteSummary,
    runner_up_id: str,
    runner_up_summary: RouteSummary,
    decided_by: str,
    all_summaries: dict[str, RouteSummary],
) -> str:
    """Generate a one-sentence human-readable headline.

    Format examples:
        "Route B has 0 Severe miles vs 46 on Route A, and is 42 min slower."
        "Route A has the least No Travel miles (0.0 vs 12.3 on Route B)."
        "Route B has a lower average risk score (1.23 vs 1.78 on Route A)."
        "Route A is 15 min faster with similar risk to Route B."

    The time-difference clause is omitted when the best route is also the
    fastest among all compared routes.
    """
    fastest_seconds = min(s.duration_seconds for s in all_summaries.values())
    best_is_fastest = best_summary.duration_seconds <= fastest_seconds

    def _time_clause() -> str:
        diff = _format_duration_diff(
            best_summary.duration_seconds, runner_up_summary.duration_seconds
        )
        slower_or_faster = (
            "slower"
            if best_summary.duration_seconds > runner_up_summary.duration_seconds
            else "faster"
        )
        return f", and is {diff} {slower_or_faster}"

    time_clause = "" if best_is_fastest else _time_clause()

    if decided_by == "no_travel_miles":
        bv = round(best_summary.no_travel_miles, 1)
        ov = round(runner_up_summary.no_travel_miles, 1)
        return (
            f"Route {best_id} has {bv} No Travel miles vs {ov} on "
            f"Route {runner_up_id}{time_clause}."
        )
    if decided_by == "severe_miles":
        bv = round(best_summary.severe_miles, 1)
        ov = round(runner_up_summary.severe_miles, 1)
        return (
            f"Route {best_id} has {bv} Severe miles vs {ov} on Route {runner_up_id}{time_clause}."
        )
    if decided_by == "high_miles":
        bv = round(best_summary.high_miles, 1)
        ov = round(runner_up_summary.high_miles, 1)
        return f"Route {best_id} has {bv} High miles vs {ov} on Route {runner_up_id}{time_clause}."
    if decided_by == "avg_risk":
        bv = round(best_summary.avg_risk, 2)
        ov = round(runner_up_summary.avg_risk, 2)
        return (
            f"Route {best_id} has a lower avg risk ({bv} vs {ov} on "
            f"Route {runner_up_id}){time_clause}."
        )
    if decided_by == "duration_minutes":
        diff = _format_duration_diff(
            best_summary.duration_seconds, runner_up_summary.duration_seconds
        )
        return f"Route {best_id} is {diff} faster than Route {runner_up_id} with similar risk."
    if decided_by == "unknown weather":
        return (
            f"Route {best_id} has complete weather data; Route {runner_up_id} has unknown segments."
        )
    # Tie or route_id tiebreak
    return (
        f"Route {best_id} and Route {runner_up_id} are equivalent; "
        f"Route {best_id} selected by identifier order."
    )


def rank_routes(
    summaries_by_route_id: dict[str, RouteSummary],
) -> Recommendation:
    """Rank route candidates and return a Recommendation with explanations.

    Args:
        summaries_by_route_id: Mapping of route identifier → RouteSummary.
                               Must contain at least one entry.

    Returns:
        Recommendation with the best route, full ranked order, and
        human-readable explanation.

    Raises:
        ValueError: if summaries_by_route_id is empty.
    """
    if not summaries_by_route_id:
        raise ValueError("summaries_by_route_id must not be empty")

    # Sort by key (ascending = best first)
    ranked = sorted(
        summaries_by_route_id.items(),
        key=lambda item: _ranking_key(item[0], item[1]),
    )

    best_id, best_summary = ranked[0]
    best_components = _key_components(best_id, best_summary)

    comparisons: list[RouteComparison] = []
    for other_id, other_summary in ranked[1:]:
        other_components = _key_components(other_id, other_summary)
        criterion, bv, ov = _first_differing_criterion(best_components, other_components)
        comparisons.append(
            RouteComparison(
                route_id=other_id,
                criterion=criterion,
                best_value=bv,
                other_value=ov,
            )
        )

    # decided_by = criterion that separates best from runner-up
    if len(ranked) > 1:
        runner_up_id, runner_up_summary = ranked[1]
        runner_up_components = _key_components(runner_up_id, runner_up_summary)
        decided_by_label, _, _ = _first_differing_criterion(best_components, runner_up_components)
    else:
        runner_up_id = best_id
        runner_up_summary = best_summary
        decided_by_label = "tie"

    headline = _build_headline(
        best_id,
        best_summary,
        runner_up_id,
        runner_up_summary,
        decided_by_label,
        summaries_by_route_id,
    )

    return Recommendation(
        best_route_id=best_id,
        ranked_route_ids=[rid for rid, _ in ranked],
        decided_by=decided_by_label,
        comparisons=comparisons,
        headline=headline,
    )
