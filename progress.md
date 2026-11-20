# Headwind Progress & Handoff

## Project Summary
Headwind is a weather-aware truck routing web app (take-home for Spotter). It evaluates 3 route options between an origin and destination, samples weather along checkpoints at the truck's estimated arrival time, calculates weather risks adjusted for cargo load weight, and recommends the safest route balancing weather risk and travel time.

## Stack and Versions
- **Frontend**: Vite 6+, React 19, TypeScript 5.7+, Tailwind CSS 3.4+, React Router v7 / v6, TanStack Query v5, Mapbox GL JS v3, `@fontsource-variable/geist`, `@fontsource-variable/geist-mono`
- **Backend**: Python 3.12+, Django 5.1+, Django REST Framework 3.15+, django-cors-headers, httpx, python-dotenv, pytest, pytest-django, gunicorn, whitenoise
- **APIs**: Mapbox Directions/Geocoding, Open-Meteo Weather Forecast API

## Decisions
- Monorepo containing `frontend/` and `backend/`.
- Strict design tokens defined via CSS custom properties in `src/styles/tokens.css` and mapped to Tailwind theme.
- Geist Sans for UI body/headings, Geist Mono with `tabular-nums` for all numeric data.
- Health check API exposed at `/api/health` returning `{"status": "ok"}`.
- Local-memory caching for backend weather/route caching during active sessions.

## Env Vars (Names Only)
- Backend: `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `MAPBOX_TOKEN`
- Frontend: `VITE_API_BASE_URL`, `VITE_MAPBOX_TOKEN`

## Folder Map
```
headwind/
  docs/               # Assignment, assumptions, design notes, time log
  frontend/           # Vite + React + TS frontend application
    src/
      app/            # App setup, router, providers
      pages/          # Landing, App, DevTokens pages
      components/     # Shared components (ui, map, routes, landing, layout)
      features/       # Domain modules (planner, routes, heatmap)
      hooks/          # Custom React hooks
      lib/            # Utility functions
      styles/         # Design tokens, grid backgrounds, global styles
      types/          # Shared TypeScript type definitions
  backend/            # Django backend application
    config/           # Django settings, root URLs, WSGI/ASGI
    trips/            # Trips app, views, serializers, services, tests
    scripts/          # Standalone verification and spike scripts
```

## How to Run
- Backend test: `cd backend && pytest`
- Backend run: `cd backend && python manage.py runserver 8000`
- Frontend dev: `cd frontend && npm run dev`
- Frontend build: `cd frontend && npm run build`
- Frontend lint: `cd frontend && npm run lint`
- Routing spike: `cd backend && python scripts/spike_routes.py`

## Design Tokens Summary
- Colors:
  - `bg`: `#0B0F14`
  - `surface`: `#121923`
  - `border`: `#1F2A37`
  - `text`: `#E6EDF3`
  - `text-muted`: `#8B98A5`
  - `accent`: `#5CC8FF`
- Risk Ramp:
  - `low`: `#2E9CCA`
  - `moderate`: `#E8C547`
  - `high`: `#F28C28`
  - `severe`: `#D1344B`
  - `no-travel`: `#6A1B4D`
- Type Scale: 12, 14, 16, 20, 28, Display 32, 40, 56 (weights 400 & 500 only)
- Radii: 6px (inputs, badges), 8px (cards), 12px (framed panels)
- Grid: 8px spacing, 1px hairline borders, 2px accent focus ring

## Phase Checklist
- [x] Phase 0: Project setup only (monorepo, docs, design tokens, frontend scaffold, backend scaffold, routing spike)
- [ ] Phase 1: Backend core logic and tests (risk calculation, load rules, ranking logic)
- [ ] Phase 2: Backend integrations and API (Mapbox routing, Open-Meteo weather sampling, trip endpoints)
- [ ] Phase 3: Frontend foundation and app shell (layout, Mapbox GL container, theme providers)
- [ ] Phase 4: Planner, map, route cards, recommendation (trip form, route selection, polyline render)
- [ ] Phase 5: Route detail and checkpoint table (checkpoint timeline, weather risk breakdown)
- [ ] Phase 6: Heatmap and 0-48h slider (corridor weather heatmap, timeline scrubbing)
- [ ] Phase 7: Landing page, states, mobile, accessibility, performance (marketing page, a11y audit, responsiveness)
- [ ] Phase 8: README, final tests, deploy prep (production builds, deployment guides, final walkthrough)

## Current Phase Log
- Initialized git monorepo with `.gitignore` and `.editorconfig`.
- Created documentation in `docs/` (`ASSIGNMENT.md`, `ASSUMPTIONS.md`, `TIME_LOG.md`, `design/NOTES.md`).
- Authored `AGENTS.md` and initial `progress.md`.

## Next Step
- Phase 1: Backend core logic and tests (pure functions in `trips/services/` for weather risk scoring, cargo weight adjustments, and lexicographic route ranking).

## Known Issues
- None in Phase 0.

## Resume Instructions
Read this file and `AGENTS.md`, continue at the first unchecked item in the Phase Checklist.
