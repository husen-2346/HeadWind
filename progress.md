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
- [x] Phase 2: Backend integrations and API (Mapbox routing, Open-Meteo weather, orchestrator, trip endpoints — 183 tests, 95% coverage)
- [x] Phase 3: Frontend foundation and app shell (Stages A, B, C, D, E complete — 52 Vitest tests, 0 lint/type errors, clean build)
- [x] Phase 4: Planner, map, route cards, recommendation (Stages 0, A, B, C, D, E, F complete — 102 Vitest tests)
- [x] Phase 5: Route detail and checkpoint table (merged into Phase 4)
- [ ] Phase 6: Heatmap and 0-48h slider
- [ ] Phase 7: Landing page, states, mobile, accessibility, performance
- [ ] Phase 8: README, final tests, deploy prep

## Phase 4 Log (Includes Phase 5)
- **Stage 0 (Audit Phase 3 & Gap Closure)**:
  - Audited items (a) through (f): built missing `src/lib/geo.ts` (`haversineMiles`), updated API fetch client timeouts to 30s analyze / 8s others, converted `useAnalyzeTrip` to mutation with previous-data retention and abort capability.
  - Implemented client-side validation in `src/features/planner/validation.ts`: places at least 2 miles apart, load integer 1..100,000, interval 10/25/50, departure within now-1h to now+72h.
  - Built accessible UI primitives: `Combobox` (role="combobox", aria-activedescendant, arrow navigation, Enter/Escape), `NumberInput` (comma formatting, unit suffix), `Tooltip` (accessible hover & focus, Escape closes), `ErrorState`.
  - Replaced drop shadows on panels with crisp hairline borders (`border border-border`).
- **Stage A (Planner Form & URL Sync)**:
  - Created `src/features/planner/PlannerForm.tsx` and `LoadRulesNote.tsx` (reads rules from `useRiskRules()`).
  - Origin & Destination: Combobox bound to `useGeocode`, swap button, clear button, searching/no-matches states.
  - Departure: datetime-local input defaulting to next day 06:00 with origin timezone helper.
  - Load weight: NumberInput with preset chips (20,000 / 42,000 / 60,000 lb).
  - Interval: SegmentedControl 10 / 25 / 50 miles.
  - Analyze button: disabled reason, loading spinner, cancel action aborting request.
  - URL sync: inputs mapped to `o`, `d`, `t`, `w`, `i` on submit; pre-filled on load without auto-submitting.
- **Stage B (Results, Recommendation & Route Cards)**:
  - Created `src/lib/labels.ts`: plain-language mappings for route sources, `decided_by` criteria, and comparison sentences.
  - Created `src/components/routes/RiskBar.tsx`: multi-segment stacked risk bar with hatched unknown segment and accessible text equivalent.
  - Created `src/components/routes/RecommendationBanner.tsx`: verbatim backend headline, recommended badge, collapsible "How we decided" disclosure.
  - Created `src/components/routes/RouteCard.tsx`: letter badge, source label, distance, duration, delta vs fastest, max risk badge, risk bar, ETA, and Details action.
  - Created `src/features/routes/RouteResults.tsx`: handles idle, loading, error, weather unavailable, partial weather, fewer than 3 routes, and backend warnings.
- **Stage C (Interactive Map Layers & Legend)**:
  - Created `src/components/map/geojson.ts`: pure builders for unselected routes, selected casing, risk segments, checkpoints, and terminals.
  - Created `src/components/map/icons.ts`: WebGL symbol image generators for all risk shapes (`circle`, `triangle`, `diamond`, `square`, `octagon`, `ring`) and origin/destination pins.
  - Created `src/components/map/RoutesLayers.tsx`: stable GeoJSON sources updated via `setData`, data-driven segment line styling, hover opacity sync, clicking line selects route, clicking checkpoint selects it, shared reusable Mapbox Popup with token styling.
  - Created `src/components/map/MapLegend.tsx`: dynamic legend reading wind thresholds from `/api/risk-rules` and floating "Fit routes" camera control.
  - Respects `prefers-reduced-motion` with `duration: 0`.
- **Stage D (Route Detail & Checkpoint Table)**:
  - Added `panelState = "detail"` to Zustand store.
  - Created `src/features/routes/criteria.ts`: `buildCriteriaRows` helper implementing exact lexicographic ranking order, fading eliminated non-winning routes, highlighting deciding criterion.
  - Created `src/components/routes/CriteriaComparison.tsx`: visual ranking comparison bar chart.
  - Created `src/features/routes/CheckpointTable.tsx`: sticky header, right-aligned tabular numerals, keyboard selection (Arrow keys, Enter, Space), `content-visibility: auto` rendering optimization, and escalation tooltip.
  - Created `src/features/routes/RouteDetailPanel.tsx`: detail inspection view with back button, 3 key metrics, criteria comparison, and checkpoint table.
- **Stage E (Mobile & Performance)**:
  - Mobile bottom sheet with collapsed summary bar and edit toggle.
  - Code-split Mapbox GL JS into dedicated vendor chunk (`manualChunks: { mapbox: ["mapbox-gl"] }`), keeping landing bundle at 209 kB.
  - All test suites passing: **17 test files, 102 passed unit tests**, 0 lint errors, 0 type errors.

## Phase 3 Log
- **Stage A (Housekeeping & Tooling)**:
  - Deleted stray file `tatus` from workspace root.
  - Reconciled versions across `README.md`, `package.json`, and `progress.md` (Vite 6, React 18, TS 5.6, Tailwind 3.4, Python 3.13.7).
  - Created `backend/.python-version` pinned to `3.13.7`.
  - Ran security checks on `git ls-files` and `git log -p -S` verifying zero leaked tokens or unignored `.env` files.
  - Added frontend test & runtime dependencies: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `zustand`, `lucide-react`.
  - Configured Vite dev proxy (`/api` -> `http://localhost:8000`).
  - Added npm scripts: `typecheck` (`tsc --noEmit`), `test` (`vitest`), `test:run` (`vitest run`).
  - Verified Geist Sans Variable and Geist Mono Variable font assets (`.woff2`) are properly extracted and mapped in production build (`dist/assets/`).
- **Stage C (Design System Components & Gallery)**:
  - Created atomic UI primitives in `src/components/ui/`: `Button`, `IconButton`, `Input`, `SegmentedControl`, `RiskShape`, `RiskBadge`, `Pill`, `Surface`, `Card`, `Panel`, `Divider`, `Skeleton`, `ProgressBar`, `Stat`, `Num`, `VisuallyHidden`, `ToastProvider` / `useToast`, `InlineAlert`, `EmptyState`, and curated `icons.tsx`.
  - Built standardized formatters in `src/lib/format.ts`: `formatMiles`, `formatDuration`, `formatLoad`, `formatMph`, `formatInHr`, `formatEta`, `formatDayTime`, `formatDelta`. All tabular numbers enforce Geist Mono (`font-mono tabular-nums`).
  - Built risk utilities in `src/lib/risk.ts`: `RISK_LEVELS`, `RISK_ORDER`, `getRiskColor` (reads :root CSS variables at runtime), `levelFromIndex`, `compareLevels`, `isEscalated`.
  - Replaced `/dev/tokens` with comprehensive interactive component gallery `/dev/components` (`DevComponentsPage.tsx`) showcasing all components, interactive states, and risk indicators on `.bg-grid`.
- **Stage D (App Shell & Base Map)**:
  - Created Zustand application state in `src/stores/appStore.ts` managing `selectedRouteId`, `hoveredRouteId`, `selectedCheckpointIndex`, `panelState` ("open" | "collapsed"), `mode` ("routes" | "heatmap"), and `forecastHour` (0..48).
  - Created `src/components/layout/AppShell.tsx`: Fullscreen layout (`h-dvh`, `overflow-hidden`), floating left panel on desktop (`w-[400px]`, `rounded-panel`, `shadow-2xl`), responsive mobile bottom sheet behavior, wordmark with cyan dot indicator, collapse toggle, planner placeholder, and reserved scrubber slot.
  - Created `src/components/map/theme.ts`: Custom dark basemap adjustments for `dark-v11` (darkest water `#070A0E`, low-contrast land `#0B0F14`, subtle roads `#1A232E`, muted labels `#8B98A5`, suppressed POIs and transit clutter).
  - Created `src/components/map/MapCanvas.tsx`: Mapbox GL JS v3 with US continental center `[-98.5795, 39.8283]`, zoom 3.8, mercator projection, ResizeObserver handling, React 18 StrictMode-safe cleanup, `useMap()` context hook, and friendly token missing / error fallback UI.
  - Chunked `mapbox-gl` into an async chunk via `React.lazy` on `AppPage.tsx` — landing page bundle is kept light (208 kB) without mapbox in the initial load.
  - Updated `index.html`: title "Headwind | Weather-Aware Truck Routing", meta description, theme-color `#0B0F14`, SVG favicon.
- **Stage E (Tests, Documentation & Verification)**:
  - Created `docs/FRONTEND.md`: Comprehensive frontend architecture documentation covering folder conventions, design token rules, risk visualization requirements, Mapbox theming, state flow, and verification commands.
  - Added full Vitest test suites:
    - `src/test/format.test.ts` (18 tests covering all metric formats, units, deltas, and edge cases)
    - `src/test/risk.test.ts` (7 tests covering risk ordering, shapes, color resolving, level comparison, escalation)
    - `src/test/components.test.tsx` (9 tests covering Button, Input, SegmentedControl keyboard nav, RiskBadge, RiskShape)
    - `src/test/appStore.test.ts` (5 tests covering selection, panel toggle, hour clamping, reset)
  - Full frontend suite: **9 test suites, 52 passed tests**.
  - TypeScript strict check: 0 errors (`tsc --noEmit`).
  - ESLint check: 0 errors (`eslint .`).
  - Production build: clean Vite build with separated CSS and JS chunks.
  - Backend verification: 183 pytest tests passing (100%).

## Phase 2 Log
- Created `backend/trips/clients/`: `http.py` (retries, timeouts, token redaction), `mapbox.py` (Directions v5, Geocode v6), `open_meteo.py` (chunking <=50, parallel fetching, unit checks)
- Extended `backend/trips/services/`:
  - `candidates.py`: `offset_waypoint` (lateral via-points), `simplify_polyline` (non-recursive RDP), `route_similarity` (bidirectional spatial-grid), `select_routes` (greedy diversity selection)
  - `geo.py`: `geometry_slice` (sub-polyline extraction between mile markers)
  - `eta.py`: `build_profile_from_annotations` (annotation profile scaling, downsampling to <=2000 points, fallback)
  - `weather_lookup.py`: `lookup_weather` (UTC timestamps, linear wind interpolation, preceding-hour precipitation bucket rule, rain+showers summation)
- Created `backend/trips/timezones.py`: `get_timezone_at` (TimezoneFinder), `resolve_departure` (departure window validation `[-1h, +72h]`)
- Created `backend/trips/errors.py`: unified `AppError` hierarchy, `drf_exception_handler` with token redaction
- Created `backend/trips/cache.py`: `LocMemCache` wrapper (directions TTL 3600s, weather TTL 1800s)
- Created `backend/trips/serializers.py`: `CoordinateField`, `AnalyzeTripRequestSerializer` (2-mile origin-dest validation, ISO departure, load bounds)
- Created `backend/trips/responses.py`: standard response builder adhering to API schema
- Created `backend/trips/usecases/analyze_trip.py`: orchestrator pipeline (`TripAnalyzer`) coordinating routing, diversity variants, checkpoint ETAs, weather queries, risk segments, and recommendations
- Configured Views and Endpoints:
  - `GET /api/health` -> `{"status": "ok"}`
  - `GET /api/risk-rules` -> canonical `RISK_RULES`
  - `GET /api/geocode?q=...` -> Mapbox geocoding proxy (throttled at 60 req/min)
  - `POST /api/analyze` -> Full trip analysis (throttled at 12 req/min)
- Created `backend/scripts/smoke_analyze.py`: live verification script testing Dallas to Denver live corridor (tested and passing with COMPLETE weather status)
- Created `docs/API.md`: full endpoint specification, request/response models, error catalog, curl examples
- Updated `docs/ASSUMPTIONS.md`: documented route generation, Open-Meteo rules, caching, rate limits, CC BY 4.0 attribution
- **Test suite**: 183 passed tests (56 new tests across test_stage_a.py, test_stage_b.py, test_stage_c.py, test_stage_d.py)
- **Coverage**: **95%** across all backend code

## Phase 5 Log (Stage A - Backend Heatmap)
- Implemented `offset_point`, `bearing_degrees`, and `corridor_points` in `backend/trips/services/geo.py`:
  - `offset_point(lat, lon, bearing_deg, miles)` computes destination point using spherical haversine formula.
  - `bearing_degrees(lat1, lon1, lat2, lon2)` calculates true north forward bearing.
  - `corridor_points(geometries, spacing_miles, lateral_miles, cell_deg, max_points)` generates lateral offset corridor points at -lateral, 0, and +lateral miles perpendicular to route bearing, snapped to 0.25-deg grid, deduped, and capped at 300 points.
- Created `CorridorHeatmapAnalyzer` in `backend/trips/usecases/heatmap.py`:
  - 49-hour forecast risk indexing across all corridor points from current UTC hour (`start_utc`).
  - Evaluates risk levels (0–4 or -1 for unknown) using canonical risk and load escalation rules.
  - 10-minute caching keyed by `(origin, destination, load_lb, start_utc_iso)`.
- Added `POST /api/heatmap` in `trips/views.py` and `trips/urls.py` with 12 req/min rate limit.
- 194 passed backend tests (11 new tests in `test_heatmap.py`).
- 96% test coverage across all backend code. Ruff check & format clean.

## Phase 5 Log (Stage B - Frontend Heatmap & Scrubber)
- Extended types in `frontend/src/types/api.ts` (`HeatmapPoint`, `HeatmapMeta`, `HeatmapResponse`, `HeatmapRequest`).
- Added API client endpoint `fetchHeatmap` in `frontend/src/lib/api/endpoints.ts`.
- Created deterministic mock generator `frontend/src/mocks/heatmapMock.ts`.
- Implemented `useHeatmap` hook with automatic TanStack query caching (10m stale time), `?mock=1` support, and prefetching on trip analysis.
- Created Mapbox circle heatmap visualization `HeatmapLayer.tsx` (blur 0.85, opacity 0.5, `circle-sort-key`, 60 fps paint updates via `requestAnimationFrame`).
- Implemented `HeatmapPanel.tsx` (time readout, 5-level risk scale legend + No Data row, grid stats).
- Implemented `TimeScrubber.tsx` (WAI-ARIA slider, 49 ticks, max risk ribbon, play/pause loop, prefers-reduced-motion support, departure marker pin).
- Added `SegmentedControl` mode toggle ("Routes | Heatmap") in `AppShell.tsx`.
- 18 test suites, 108 tests passing.

## Phase 5 Log (Stage C - Landing Page)
- Configured repo metadata in `frontend/src/config.ts` (`REPO_URL`, `LOOM_URL`).
- Built 8 cohesive landing page sections adhering strictly to design guidelines:
  1. `LandingNavbar`: sticky nav with brand mark, anchor links (`#how-it-works`, `#risk-rules`, `#heatmap`), GitHub repo link, and Launch App CTA. Mobile drawer with focus trap & Escape key.
  2. `HeroSection`: dark grid background (`bg-grid`) + radial glow (`bg-glow`), approved headline, subhead with risk rules summary, Route B summary badge (0 severe, 28 high), sample corridor SVG graphic with 1 origin / 1 dest marker, "Illustrative" label.
  3. `HowItWorksSection`: interactive/static time-distance graph showing 2 trucks departing 4 hours apart encountering storm cell at Mile 520, explaining dynamic checkpoint ETAs.
  4. `HeatmapSection`: corridor heatmap SVG preview, static 49-hour scrubber demo, 5-level risk scale legend.
  5. `RiskRulesSection`: wind, rain, snow threshold rulers with exact units and boundaries. Interactive cargo load slider (0..100k lb) demonstrating live risk escalation (>30k lb and >40k lb thresholds).
  6. `WhyThisRouteSection`: criteria comparison table reusing `CriteriaComparison` on real Dallas-to-Denver routes.
  7. `CtaSection`: high-contrast banner with contour line motif and primary/demo launch links.
  8. `LandingFooter`: attribution to Open-Meteo CC BY 4.0, Mapbox, OpenStreetMap, and commercial planning disclaimer.
- Added demo link sync in `appStore.ts` (`?demo=1` auto-loads Dallas to Denver fixture).
- 19 test suites, 113 tests passing. 0 lint or typecheck errors. Clean production build.

## Phase 5 Log (Stage D - Hardening, A11y, Performance)
- **404 Route**: Implemented `NotFoundPage.tsx` with flight corridor motif, polite messaging, and quick links back to `/` and `/app`.
- **ErrorBoundary**: Implemented robust React ErrorBoundary component (`ErrorBoundary.tsx`) with technical stack details collapsible via `<details>` and "Reload Dispatcher" recovery action.
- **Dynamic Titles & Favicon**: Added custom vector SVG favicon (`favicon.svg` with streamline wind vectors and directional chevron). Dynamic document titles for landing, app dispatcher (`Origin to Destination — Headwind`), and 404.
- **Mobile & Tablet Hardening**:
  - `CheckpointTable`: Enabled horizontal scrolling with `sticky left-0` Mile column pinned so mile markers remain visible on 375px/768px viewports.
  - `PlannerForm`: Auto-collapses the bottom drawer on mobile viewports (<768px) upon successful analysis so the map is instantly visible.
  - `AppShell`: Added floating "Route options" pill button on mobile when the panel is collapsed to quickly reopen the planner drawer.
  - Safe-area-inset-bottom support (`bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]`) ensuring controls stay clear of mobile browser chrome.
  - Production mock guards: guarded `?mock=1` query parameters behind `import.meta.env.DEV`.
- **Accessibility Audit (jest-axe)**:
  - Created `frontend/src/test/a11y.test.tsx` verifying WCAG 2.1 AA compliance across `RiskBadge`, `RouteCard`, `TimeScrubber`, `PlannerForm`, `NotFoundPage`, and all 7 landing sections. **0 violations**.
  - All 20 frontend test suites (125 tests) passing.
- **Lighthouse Production Audit**:
  - Landing page (`/`): **Performance: 90 | Accessibility: 94 | Best Practices: 100 | SEO: 91**.
  - Dispatcher app (`/app`): **Performance: 80 | Accessibility: 100 | Best Practices: 96 | SEO: 91** (80 perf on `/app` is due to WebGL Mapbox GL JS canvas engine initialization and 1.9MB vendor chunk, while critical app bundle is code-split to 95kB).

## Next Step
Stage E: Production config (Django production settings, WhiteNoise, gunicorn, render.yaml, vercel.json, GitHub Actions CI, complete README.md with Mermaid diagrams, docs/WALKTHROUGH.md).

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
Phase 6: Heatmap and 0-48h slider
  - Build weather heatmap layer along the trip corridor using Open-Meteo hourly forecast data.
  - Implement 0–48 hour slider control at the bottom center of the screen.
  - Connect slider time offset to appStore.forecastHour and update heatmap tiles / checkpoint weather dynamically.

## Known Issues
- `segment_miles_owned`: line 62 of sampling.py is unreachable in current test paths (empty geometry guard before this branch)

## Resume Instructions
Read this file and `AGENTS.md`, continue at the first unchecked item in the Phase Checklist (Phase 6).
