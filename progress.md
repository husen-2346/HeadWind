# Headwind Progress & Handoff

## Project Summary
Headwind is a weather-aware truck routing web app (take-home for Spotter). It evaluates 3 route options between an origin and destination, samples weather along checkpoints at the truck's estimated arrival time, calculates weather risks adjusted for cargo load weight, and recommends the safest route balancing weather risk and travel time.

## Stack and Versions
- **Frontend**: Vite 6+, React 18, TypeScript 5.6+, Tailwind CSS 3.4+, React Router v6, TanStack Query v5, Mapbox GL JS v3, `@fontsource-variable/geist`, `@fontsource-variable/geist-mono`
- **Backend**: Python 3.13, Django 5.1.3, Django REST Framework 3.15.2, django-cors-headers 4.6, httpx 0.28.1, python-dotenv 1.0.1, pytest 8.3.4, pytest-django 4.9, pytest-cov 6.0, ruff 0.8.3, gunicorn 23.0, whitenoise 6.8.2

## Decisions
- Monorepo with `frontend/` and `backend/`.
- Design tokens in `src/styles/tokens.css`, mapped to Tailwind theme.
- Geist Sans for UI body/headings; Geist Mono + `tabular-nums` for all numeric data.
- `/api/health` → `{"status": "ok"}`.
- Local-memory caching for backend weather/route caching.
- **Phase 1 decisions**: see `docs/ASSUMPTIONS.md` (all moved from "Proposed" to "Decided").

## Env Vars (Names Only)
- Backend: `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `MAPBOX_TOKEN`
- Frontend: `VITE_API_BASE_URL`, `VITE_MAPBOX_TOKEN`

## Folder Map
```
headwind/
  docs/                    # ASSIGNMENT.md, ASSUMPTIONS.md, LOGIC.md, TIME_LOG.md, design/
  frontend/                # Vite + React + TS frontend
    src/
      app/                 # Router + providers
      pages/               # Landing, App, DevTokens
      components/          # ui/, map/, routes/, landing/, layout/
      features/            # planner/, routes/, heatmap/
      hooks/, lib/, styles/, types/
  backend/
    config/                # Django settings, URLs, WSGI/ASGI
    trips/
      services/            # Pure domain logic (no Django)
        constants.py       # Thresholds, RISK_RULES, LOAD_RULES, EARTH_RADIUS_MILES
        types.py           # RiskLevel(IntEnum), Weather, Checkpoint, CheckpointRisk,
                           # RouteSummary, RouteComparison, Recommendation
        geo.py             # haversine_miles, cumulative_miles, point_at_mile
        sampling.py        # sample_checkpoints, segment_miles_owned
        eta.py             # eta_seconds_at_mile, linear_profile, eta_datetime
        risk.py            # classify_wind/rain/snow, classify_checkpoint
        analysis.py        # analyze_route
        recommend.py       # rank_routes
        __init__.py        # Public API exports
      tests/               # test_health, test_risk, test_geo_sampling, test_eta,
                           # test_analysis, test_recommend, test_end_to_end
      views.py, serializers.py, urls.py
    scripts/spike_routes.py
    requirements.txt, requirements-dev.txt, pyproject.toml, pytest.ini
```

## Public API (trips/services)
```python
# Constants
EARTH_RADIUS_MILES: float
RISK_RULES: dict          # JSON-serialisable, exposed by GET /api/risk-rules in Phase 2
LOAD_RULES: list[dict]

# Types
RiskLevel(IntEnum): LOW=0, MODERATE=1, HIGH=2, SEVERE=3, NO_TRAVEL=4
Weather(wind_mph, rain_in_hr, snow_in_hr)       # all Optional[float]
Checkpoint(index, mile, lat, lon)
CheckpointRisk(level, wind_level, rain_level, snow_level, escalated_by_load, escalation_reason)
RouteSummary(distance_miles, duration_seconds, miles_by_level, unknown_miles,
             severe_miles, high_miles, no_travel_miles, avg_risk, max_level)
Recommendation(best_route_id, ranked_route_ids, decided_by, comparisons, headline)

# Geo
haversine_miles(lat1, lon1, lat2, lon2) -> float          # conventional (lat, lon)
cumulative_miles(geometry)              -> list[float]     # geometry in GeoJSON [lon, lat]
point_at_mile(geometry, cumulative, mile) -> (lat, lon)

# Sampling
sample_checkpoints(geometry, total_distance_miles, interval_miles) -> list[Checkpoint]
segment_miles_owned(checkpoints, total_miles) -> list[float]      # sum == total_miles

# ETA
eta_seconds_at_mile(mile, cumulative_miles_profile, cumulative_seconds_profile) -> float
linear_profile(total_miles, total_seconds) -> (miles_prof, secs_prof)
eta_datetime(departure, seconds) -> datetime    # departure MUST be tz-aware

# Risk
classify_wind(mph)       -> RiskLevel
classify_rain(in_hr)     -> RiskLevel
classify_snow(in_hr)     -> RiskLevel
classify_checkpoint(weather, load_lb) -> CheckpointRisk

# Analysis
analyze_route(checkpoints, weather_by_checkpoint, load_lb,
              total_miles, duration_seconds) -> (list[CheckpointRisk], RouteSummary)

# Recommend
rank_routes(summaries_by_route_id) -> Recommendation
```

## How to Run
- Backend test + coverage: `cd backend && .venv\Scripts\pytest -q --cov=trips/services`
- Backend lint: `cd backend && .venv\Scripts\ruff check . && .venv\Scripts\ruff format --check .`
- Backend run: `cd backend && .venv\Scripts\python manage.py runserver 8000`
- Frontend dev: `cd frontend && npm run dev`
- Frontend build: `cd frontend && npm run build`
- Frontend lint: `cd frontend && npm run lint`
- Routing spike: `cd backend && .venv\Scripts\python scripts/spike_routes.py`

## Design Tokens Summary
- Colors: `bg` #0B0F14, `surface` #121923, `border` #1F2A37, `text` #E6EDF3, `text-muted` #8B98A5, `accent` #5CC8FF
- Risk: `low` #2E9CCA, `moderate` #E8C547, `high` #F28C28, `severe` #D1344B, `no-travel` #6A1B4D
- Type Scale: 12/14/16/20/28, Display 32/40/56 (weights 400 & 500)
- Radii: 6px inputs/badges, 8px cards, 12px panels

## Phase Checklist
- [x] Phase 0: Project setup (monorepo, docs, tokens, frontend scaffold, backend scaffold, routing spike)
- [x] Phase 1: Backend core logic and tests (risk, sampling, ETA, analysis, ranking — 127 tests, 98% coverage)
- [ ] Phase 2: Backend integrations and API (Mapbox routing, Open-Meteo weather, trip endpoints)
- [ ] Phase 3: Frontend foundation and app shell
- [ ] Phase 4: Planner, map, route cards, recommendation
- [ ] Phase 5: Route detail and checkpoint table
- [ ] Phase 6: Heatmap and 0-48h slider
- [ ] Phase 7: Landing page, states, mobile, accessibility, performance
- [ ] Phase 8: README, final tests, deploy prep

## Phase 1 Log
- Created `backend/trips/services/`: constants.py, types.py, geo.py, sampling.py, eta.py, risk.py, analysis.py, recommend.py, __init__.py
- 127 tests across test_risk.py, test_geo_sampling.py, test_eta.py, test_analysis.py, test_recommend.py, test_end_to_end.py
- Coverage: **98%** (trips/services)
- Added `pyproject.toml` (ruff config + pytest config), `requirements-dev.txt`
- Updated `docs/ASSUMPTIONS.md` from "Proposed" → "Decided" with full rule set
- Created `docs/LOGIC.md` plain-language pipeline explainer with worked example
- **Ambiguities resolved:**
  - Rain 1.00 and snow 3.0: assigned to Severe (not No Travel) — spec says No Travel is *strictly greater than*
  - Load comparisons: strict `>` (30,000 and 40,000 lb exactly are NOT escalated)
  - Haversine great-circle ≈ 662 miles Dallas→Denver (road is ~921 mi); tests use real values
  - `decided_by` = criterion separating best from runner-up (not from worst); for A(46 severe)/B(0 severe,28 high)/C(0 severe,61 high): B beats C on `high_miles` (both have 0 severe), so `decided_by=high_miles`

## Next Step
Phase 2: Backend integrations and API
  - Mapbox Directions API integration: fetch up to 3 routes, extract geometry, distance, duration
  - Open-Meteo weather integration: query forecast at each checkpoint ETA
  - `GET /api/risk-rules` exposing `RISK_RULES`
  - `POST /api/trips` → accept origin/dest/departure/load, return ranked routes with full checkpoint data
  - Cache responses to avoid duplicate API calls within a session

## Known Issues
- Phase 2 must handle Mapbox returning fewer than 3 alternatives (design a fallback)
- `segment_miles_owned`: line 62 of sampling.py is unreachable in current test paths (empty geometry guard before this branch)

## Resume Instructions
Read this file and `AGENTS.md`, continue at the first unchecked item in the Phase Checklist.
