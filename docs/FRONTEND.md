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
│   │   └── theme.ts          # Defensive custom dark basemap layer theming
│   └── ui/                   # Reusable atomic design system primitives
│       ├── Button.tsx        # Primary, ghost, subtle buttons with loading states
│       ├── IconButton.tsx    # Accessible 44px min-touch icon buttons
│       ├── Input.tsx         # Inputs with labels, hints, errors, and mono units
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
│       └── icons.tsx         # Curated Lucide icon exports
├── hooks/
│   ├── useAnalyzeTrip.ts     # Mutation hook for /api/analyze with 60s timeout
│   ├── useDebouncedValue.ts  # Debounce utility (default 250ms)
│   ├── useGeocode.ts         # Query hook for /api/geocode autocomplete
│   ├── useHealth.ts          # Backend health check query
│   └── useRiskRules.ts       # Query hook for /api/risk-rules (staleTime: Infinity)
├── lib/
│   ├── api/
│   │   ├── client.ts         # Fetch wrapper with typed ApiError & timeout
│   │   └── endpoints.ts      # Typed API endpoint functions
│   ├── format.ts             # Formatters: miles, duration, load, mph, in/hr, ETA, deltas
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
│   └── appStore.ts           # Zustand store for selection, panel, mode, and forecast hour
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
   - Motion reduced queries (`@media (prefers-reduced-motion: reduce)`) in CSS and Skeletons.

---

## Mapbox GL JS v3 Integration

1. **Bundle Separation**:
   - `mapbox-gl` is lazy-loaded through dynamic imports inside `MapCanvas.tsx` and the `AppPage` route chunk.
   - The landing page bundle does not include `mapbox-gl` or `mapbox-gl.css`.

2. **Custom Dark Basemap Theme**:
   - `applyHeadwindMapTheme(map)` modifies basemap layers on `mapbox://styles/mapbox/dark-v11`:
     - Lowers background and water contrast to `#0B0F14` and `#070A0E`.
     - De-emphasizes secondary roads and borders to `#1A232E` and `#263545`.
     - Suppresses distracting POI, transit, and commercial icons.
     - Leaves high-contrast headroom for route lines, risk colors, and weather heatmap tiles.

3. **Fallback Grace**:
   - If `VITE_MAPBOX_TOKEN` is unset or invalid, `MapCanvas` renders a styled placeholder banner guiding the user to configure `.env`.

---

## State Management (`useAppStore`)

The Zustand store tracks:
- `selectedRouteId`: Active route ID or `null`.
- `hoveredRouteId`: Route hovered in cards or on the map.
- `selectedCheckpointIndex`: Checkpoint index inspected on route or `null`.
- `panelState`: `"open"` or `"collapsed"`.
- `mode`: `"routes"` or `"heatmap"`.
- `forecastHour`: Scrubber hour offset `0..48` (clamped).

---

## Verification Commands

- `npm run lint` – Run ESLint across code and test files.
- `npm run typecheck` – Run TypeScript compiler without emitting.
- `npm run test:run` – Run Vitest test suites.
- `npm run build` – Typecheck and compile production Vite bundle.
