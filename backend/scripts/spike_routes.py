"""
Spike script: Mapbox Directions API route generation.
Tests generating 3 alternative routes from Dallas, TX to Denver, CO.

Usage:
  python scripts/spike_routes.py
"""

import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

# Load .env from backend root or parent if present
backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(backend_dir / ".env")
load_dotenv(backend_dir.parent / ".env")

MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN", "").strip()

# Coordinates: [longitude, latitude]
# Dallas, TX: -96.7970, 32.7767
# Denver, CO: -104.9903, 39.7392
ORIGIN_LON, ORIGIN_LAT = -96.7970, 32.7767
DEST_LON, DEST_LAT = -104.9903, 39.7392

METERS_TO_MILES = 0.000621371
SECONDS_TO_HOURS = 1.0 / 3600.0


def main():
    if not MAPBOX_TOKEN or MAPBOX_TOKEN == "pk.your_mapbox_public_token_here":
        print(
            "ERROR: MAPBOX_TOKEN is not set or contains the default placeholder.\n"
            "Please set MAPBOX_TOKEN in backend/.env or your environment before running this script.\n"
            "Example:\n"
            "  MAPBOX_TOKEN=pk.eyJ1... python scripts/spike_routes.py\n"
        )
        sys.exit(1)

    url = (
        f"https://api.mapbox.com/directions/v5/mapbox/driving/"
        f"{ORIGIN_LON},{ORIGIN_LAT};{DEST_LON},{DEST_LAT}"
    )

    params = {
        "alternatives": "true",
        "geometries": "geojson",
        "overview": "full",
        "steps": "false",
        "access_token": MAPBOX_TOKEN,
    }

    print("Requesting routes from Mapbox Directions API...")
    print(f"Origin: Dallas, TX ({ORIGIN_LAT}, {ORIGIN_LON})")
    print(f"Destination: Denver, CO ({DEST_LAT}, {DEST_LON})")

    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPStatusError as e:
        print(f"HTTP error occurred: {e.response.status_code} - {e.response.text}")
        sys.exit(1)
    except Exception as e:
        print(f"Request failed: {e}")
        sys.exit(1)

    routes = data.get("routes", [])
    num_routes = len(routes)
    print(f"\nRoutes returned: {num_routes}")

    if num_routes < 3:
        print(
            f"\n[WARNING] Expected 3 routes, but Mapbox returned only {num_routes} route(s).\n"
            f"Mapbox Directions API may not always find 3 viable driving alternatives between these points.\n"
            f"Handling routes when fewer than 3 alternatives exist will be addressed in Phase 2.\n"
        )

    for i, route in enumerate(routes, start=1):
        distance_mi = route.get("distance", 0) * METERS_TO_MILES
        duration_hr = route.get("duration", 0) * SECONDS_TO_HOURS
        geometry = route.get("geometry", {})
        coords = geometry.get("coordinates", [])
        num_points = len(coords)

        print(f"Route {i}:")
        print(f"  Distance: {distance_mi:.1f} miles")
        print(f"  Duration: {duration_hr:.2f} hours")
        print(f"  Geometry coordinates: {num_points} points")

    print(
        "\nNOTE: Mapbox Directions API uses a standard driving profile and does NOT have a dedicated truck profile."
        "\nRoutes do not account for bridge weight ratings, clearances, or hazmat restrictions."
        "\nThis limitation is documented in docs/ASSUMPTIONS.md."
    )


if __name__ == "__main__":
    main()
