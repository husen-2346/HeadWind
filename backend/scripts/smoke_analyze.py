r"""
smoke_analyze.py – Live smoke verification script for Headwind route & weather pipeline.

Evaluates Dallas, TX to Denver, CO with 42,000 lb load, 25-mile checkpoints,
departing tomorrow at 06:00 local time.

Usage:
    cd backend
    .venv\Scripts\python scripts/smoke_analyze.py
"""

from __future__ import annotations

import os
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

# Configure Django settings if not already loaded
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django  # noqa: E402

django.setup()

from dotenv import load_dotenv  # noqa: E402

load_dotenv(backend_dir / ".env")
load_dotenv(backend_dir.parent / ".env")

from trips.clients.mapbox import MapboxClient  # noqa: E402
from trips.clients.open_meteo import OpenMeteoClient  # noqa: E402
from trips.services.candidates import route_similarity  # noqa: E402
from trips.usecases.analyze_trip import TripAnalyzer  # noqa: E402

DALLAS = [-96.7970, 32.7767]
DENVER = [-104.9903, 39.7392]


def main():
    token = os.getenv("MAPBOX_TOKEN", "").strip()
    if not token or token == "pk.your_mapbox_public_token_here":
        print(
            "\n[NOTICE] MAPBOX_TOKEN is not configured or is the default placeholder.\n"
            "Skipping live smoke test. To run live calls against Mapbox and Open-Meteo, set:\n"
            "  MAPBOX_TOKEN=pk.eyJ1... in backend/.env or your environment.\n"
        )
        sys.exit(0)

    # Departure tomorrow at 06:00 local
    tomorrow = datetime.now(UTC) + timedelta(days=1)
    departure_local_str = tomorrow.strftime("%Y-%m-%dT06:00:00")

    print("================================================================================")
    print("                     HEADWIND TRIP ANALYSIS SMOKE TEST                          ")
    print("================================================================================")
    print(f"Origin:      Dallas, TX {DALLAS}")
    print(f"Destination: Denver, CO {DENVER}")
    print(f"Departure:   {departure_local_str} (Origin Local)")
    print("Cargo Load:  42,000 lb")
    print("Interval:    25 miles")
    print("--------------------------------------------------------------------------------\n")

    try:
        analyzer = TripAnalyzer(
            mapbox_client=MapboxClient(token=token),
            weather_client=OpenMeteoClient(),
        )
        result = analyzer.analyze(
            origin=DALLAS,
            destination=DENVER,
            departure_local=departure_local_str,
            load_lb=42000,
            interval_miles=25,
        )
    except Exception as exc:
        # Token redaction safeguard
        err_msg = str(exc)
        if token in err_msg:
            err_msg = err_msg.replace(token, "[REDACTED_MAPBOX_TOKEN]")
        print(f"[ERROR] Live smoke test failed: {err_msg}")
        sys.exit(1)

    summary = result["summary"]
    routes = result["routes"]
    meta = result["meta"]
    timings = meta["timings_ms"]

    print(f"Status:       Weather [{summary['weather_status'].upper()}]")
    print(f"Generated At: {meta['generated_at']}")
    print(
        f"Timings:      Routing: {timings['routing']}ms | Weather: {timings['weather']}ms | "
        f"Analysis: {timings['analysis']}ms | Total: {timings['total']}ms\n"
    )

    print("--------------------------------------------------------------------------------")
    print("ROUTE SUMMARY TABLE")
    print("--------------------------------------------------------------------------------")
    header = (
        f"{'ID':<3} | {'Source':<14} | {'Dist (mi)':<9} | {'Duration':<9} | "
        f"{'No-Trv':<6} | {'Severe':<6} | {'High':<6} | {'AvgRisk':<7} | {'Unknown':<7}"
    )
    print(header)
    print("-" * len(header))

    for r in routes:
        s = r["summary"]
        dur_h = round(r["duration_seconds"] / 3600.0, 1)
        dur_str = f"{dur_h}h"
        avg_r_str = f"{s['avg_risk']:.2f}" if s["avg_risk"] is not None else "N/A"
        row = (
            f"{r['id']:<3} | {r['source']:<14} | {r['distance_miles']:<9.1f} | {dur_str:<9} | "
            f"{s['no_travel_miles']:<6.1f} | {s['severe_miles']:<6.1f} | {s['high_miles']:<6.1f} | "
            f"{avg_r_str:<7} | {s['unknown_miles']:<7.1f}"
        )
        print(row)

    print("--------------------------------------------------------------------------------")
    print("PAIRWISE ROUTE SIMILARITY MATRIX")
    print("--------------------------------------------------------------------------------")
    route_ids = [r["id"] for r in routes]
    sim_header = "     " + " ".join(f"{rid:>6}" for rid in route_ids)
    print(sim_header)
    for r1 in routes:
        row_str = f"{r1['id']:<3}: "
        for r2 in routes:
            sim = route_similarity(r1["geometry"], r2["geometry"])
            row_str += f"{sim:>6.2f} "
        print(row_str)

    print("--------------------------------------------------------------------------------")
    print("RECOMMENDATION")
    print("--------------------------------------------------------------------------------")
    print(f"Recommended: Route {summary['recommended_route_id']}")
    print(f"Headline:    {summary['headline']}")
    print(f"Decided By:  {summary['decided_by']}")
    if summary["warnings"]:
        print(f"Warnings:    {summary['warnings']}")
    print("================================================================================\n")


if __name__ == "__main__":
    main()
