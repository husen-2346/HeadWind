# Headwind Frontend Architecture

## Overview
Headwind is built with React 18, TypeScript, Vite, Tailwind CSS, Mapbox GL JS v3, Zustand, and TanStack React Query. It is designed to assist commercial dispatchers and truck drivers in evaluating route options under adverse weather conditions, accounting for vehicle cargo weight and dynamic travel times.

---

## Directory Structure & Conventions

```
frontend/src/
├── app/
│   └── App.tsx               # Root router, React Query client, lazy route boundaries
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx      # Fullscreen map layout + floating panel / mobile bottom sheet
│   │   └── Navbar.tsx        # Top navigation for public pages
│   ├── map/
│   │   ├── MapCanvas.tsx     # Mapbox GL JS v3 lifecycle, resize handling, context
│   │   ├── RoutesLayers.tsx  # Dynamic route line strings, casing, and checkpoint symbols
│   │   ├── MapLegend.tsx     # Weather risk legend with live thresholds and fit-routes button
│   │   ├── geojson.ts        # Pure GeoJSON transformation utilities
│   │   ├── icons.ts          # Canvas-generated WebGL checkpoint and pin icons
│   │   └── theme.ts          # Defensive custom dark basemap layer theming
│   ├── routes/
│   │   ├── RouteCard.tsx     # Route card with source, stats, delta, and details action
│   │   ├── RiskBar.tsx       # Stacked accessible multi-segment risk distribution bar
│   │   ├── RecommendationBanner.tsx # Verbatim headline, recommended pill, decision breakdown
│   │   └── CriteriaComparison.tsx   # Ranking criteria rows with faded losing routes
│   └── ui/                   # Reusable atomic design system primitives
│       ├── Button.tsx        # Primary, ghost, subtle buttons with loading states
│       ├── IconButton.tsx    # Accessible 44px min-touch icon buttons
│       ├── Input.tsx         # Inputs with labels, hints, errors, and mono units
│       ├── NumberInput.tsx   # Number input with comma formatting and unit suffix
│       ├── Combobox.tsx      # ARIA compliant autocompleting combobox
│       ├── Tooltip.tsx       # Accessible hover and focusable tooltip with Escape handling
│       ├── SegmentedControl.tsx # Accessible radiogroup with keyboard navigation
│       ├── RiskShape.tsx     # Geometric symbols per risk level (circle, triangle, diamond, square, octagon)
│       ├── RiskBadge.tsx     # Risk shape + label (never color alone) + load escalation tag
│       ├── Pill.tsx          # Status badges (Recommended, Fastest, Live)
│       ├── Card.tsx          # Card container with interactive focus/hover states
│       ├── Panel.tsx         # Scrollable panel with header/footer
│       ├── ProgressBar.tsx   # Multi-segment route risk meters
│       ├── Stat.tsx          # Label + Geist Mono tabular-nums metric
│       ├── Num.tsx           # Inline Geist Mono tabular-nums wrapper
│       ├── Toast.tsx         # Toast notification provider & useToast hook
│       ├── InlineAlert.tsx   # In-panel alerts (info, warning, error) with retry action
│       ├── EmptyState.tsx    # Zero-data feedback placeholder
│       ├── ErrorState.tsx    # Actionable error banner with retry
│       └── icons.tsx         # Curated Lucide icon exports
├── features/
│   ├── planner/
│   │   ├── PlannerForm.tsx   # Origin/destination comboboxes, departure, load weight, presets
│   │   ├── LoadRulesNote.tsx # Active load escalation rules read from /api/risk-rules
│   │   └── validation.ts     # Client-side form validation (proximity, bounds, time window)
│   └── routes/
│       ├── RouteResults.tsx  # Route listing orchestrator (idle, loading, error, warning states)
│       ├── RouteDetailPanel.tsx # Deep inspection view for selected route
│       ├── CheckpointTable.tsx  # Virtualized-style sticky table of weather checkpoints
│       └── criteria.ts       # Lexicographic ranking criteria builder
├── hooks/
│   ├── useAnalyzeTrip.ts     # Mutation hook for /api/analyze with 30s timeout & abort
│   ├── useDebouncedValue.ts  # Debounce utility (default 250ms)
│   ├── useGeocode.ts         # Query hook for /api/geocode autocomplete (>=2 chars)
│   ├── useHealth.ts          # Backend health check query
│   └── useRiskRules.ts       # Query hook for /api/risk-rules (staleTime: Infinity)
├── lib/
│   ├── api/
│   │   ├── client.ts         # Fetch wrapper with typed ApiError & timeout (8s / 30s)
│   │   └── endpoints.ts      # Typed API endpoint functions
│   ├── format.ts             # Formatters: miles, duration, load, mph, in/hr, ETA, deltas
│   ├── geo.ts                # Pure haversine calculation in statute miles
│   ├── labels.ts             # Human-readable labels for sources, criteria, comparisons
│   └── risk.ts               # Risk levels metadata, ordering, and runtime color resolution
├── mocks/
│   ├── dallas-denver.json    # Real fixture captured from Django backend
│   ├── risk-rules.json       # Real risk rules fixture
│   └── index.ts              # Exported typed fixtures
├── pages/
│   ├── AppPage.tsx           # Main application route (/app), lazy loaded
│   ├── DevComponentsPage.tsx # Design system showcase gallery (/dev/components)
│   └── LandingPage.tsx       # Landing page (/)
├── stores/
│   └── appStore.ts           # Zustand store for planner, selection, panel, and URL sync
├── styles/
│   ├── backgrounds.css       # Grid (.bg-grid) and glow (.bg-glow) effects
│   ├── index.css             # Base styles, variable fonts, motion preferences
│   └── tokens.css            # Single source of truth for design tokens
└── types/
    └── api.ts                # TypeScript interfaces mirroring Django backend schemas
```

---

## Design Token Discipline

1. **Zero Hardcoded Hex Codes**:
   - All colors are defined in `src/styles/tokens.css` as CSS custom properties (`--color-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-accent`, etc.).
   - Components use Tailwind utility classes (`bg-surface`, `border-border`, `text-text-muted`, `bg-accent`).
   - Hairline borders are strictly enforced (`border border-border`) with zero arbitrary drop shadows on panels.
   - Mapbox GL JS paint properties resolve computed CSS variables dynamically via `getRiskColor(level)` in `src/lib/risk.ts`.

2. **Numerals & Metrics**:
   - All numbers, coordinates, distances, durations, wind speeds, precipitation rates, and timestamps MUST use Geist Mono (`font-mono`) and tabular numbers (`tabular-nums`).

3. **Weather Risk Rules**:
   - Risk colors (`low`, `moderate`, `high`, `severe`, `no_travel`) must **ONLY** be used for weather data visualization.
   - Per AGENTS.md, risk colors must **ALWAYS** be paired with a text label or geometric shape (never color alone).
   - Symbols:
     - `low`: Circle
     - `moderate`: Triangle
     - `high`: Diamond
     - `severe`: Square
     - `no_travel`: Octagon
     - `unknown`: Dashed circle

4. **Touch Targets & Accessibility**:
   - Interactive elements enforce a minimum 44×44px touch target on coarse pointers (`min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0`).
   - High-visibility focus rings (`focus-visible:ring-2 focus-visible:ring-accent`).
   - Motion reduced queries (`@media (prefers-reduced-motion: reduce)`) in CSS, Skeletons, and Mapbox camera transitions (`duration: 0`).

---

## Mapbox GL JS v3 Layer Design & Data Flow

1. **Bundle Separation**:
   - `mapbox-gl` is bundled into a dedicated vendor chunk (`manualChunks: { mapbox: ["mapbox-gl"] }`) and lazy-loaded via `React.lazy` on `/app`.
   - The landing page bundle (`dist/assets/index-*.js`) is 209 kB and contains zero Mapbox runtime code.

2. **Stable Sources & Zero-Flicker Updates**:
   - GeoJSON sources are created once on map load and updated strictly via `source.setData(...)`. Layers are never re-added.
   - Sources:
     - `source-routes-unselected`: FeatureCollection of unselected route lines.
     - `source-routes-selected-casing`: 8px dark casing behind the selected route.
     - `source-routes-selected`: Risk-segmented LineStrings matching `['get', 'level']` with data-driven colors.
     - `source-checkpoints`: Point features with stable numeric IDs for WebGL feature-state.
     - `source-endpoints`: Start and End terminal markers.

3. **Runtime WebGL Checkpoint Symbols**:
   - Generated dynamically as HTML5 Canvas `ImageData` and registered via `map.addImage("checkpoint-<level>")`.
   - Feature-state drives selected marker enlargement (`['case', ['boolean', ['feature-state', 'selected'], false], 1.35, 0.9]`).

4. **Single Shared Popup**:
   - One shared `mapboxgl.Popup` instance reused across all checkpoint clicks and table selections.
   - HTML content constructed with token styles (Mile in Geist Mono, local ETA, wind, rain, snow, and load weight escalation warnings).

---

## Route Detail Panel Flow

1. Clicking "Details" on an active route card or clicking an already-selected card sets `appStore.panelState = "detail"`.
2. Header displays a back button ("All Routes"), letter badge, title, and 3 key metrics (Distance, Duration, Average Risk).
3. `<CriteriaComparison />` renders horizontal bar graphs across Severe miles, High miles, Average risk, and Travel time, showing exactly where non-winning routes were eliminated and highlighting the deciding criterion (`decided_by`).
4. `<CheckpointTable />` displays virtualized-style rows (`content-visibility: auto`) with keyboard selection (`ArrowUp`/`ArrowDown`/`Enter`), sticky header, and hover tooltips for load escalation reasons.

---

## State Management (`useAppStore`)

The Zustand store tracks:
- **Planner Inputs**: `origin`, `destination`, `originInput`, `destinationInput`, `departureLocal`, `loadLb`, `intervalMiles`.
- **URL Synchronization**: `syncPlannerFromUrl` and `getPlannerUrlParams` mapping inputs to `o`, `d`, `t`, `w`, `i` without auto-submitting.
- **Selection State**: `selectedRouteId`, `hoveredRouteId`, `selectedCheckpointIndex`.
- **Panel Mode**: `panelState` (`"open" | "collapsed" | "detail"`).
- **Visualization**: `mode` (`"routes" | "heatmap"`), `forecastHour` (`0..48`).

---

## Verification Commands

- `npm run lint` – Run ESLint across code and test files.
- `npm run typecheck` – Run TypeScript compiler without emitting.
- `npm run test:run` – Run Vitest test suites (17 test files, 102 passing tests).
- `npm run build` – Typecheck and compile production Vite bundle.
