# Headwind Walkthrough Video Script (7–8 Minutes)

This document provides a minute-by-minute script and screen-recording guide for recording the Loom walkthrough demonstration for Headwind.

- **Target Duration:** 7:30 (450 seconds)
- **Presenter:** Full Stack Lead Engineer
- **Video Link:** [Headwind Loom Video Walkthrough](https://loom.com/share/placeholder-headwind-walkthrough)
- **Live Demo:** [https://headwind.vercel.app](https://headwind.vercel.app)

---

## Video Outline & Timestamps

| Timestamp | Section | Key Visuals & Actions |
|---|---|---|
| **0:00 – 0:45** | **1. Introduction & Problem Statement** | Landing page hero, headline, overview of Spotter take-home requirements |
| **0:45 – 2:00** | **2. Live Demo: Dallas to Denver Trip Analysis** | Submitting trip in Dispatcher (`/app`), comparing 3 route options, route card metrics |
| **2:00 – 3:30** | **3. Weather Risk Classification & Cargo Load Escalation** | Checkpoint table, interactive weight slider on landing page, risk rules |
| **3:30 – 5:00** | **4. Corridor Heatmap & 0–48h Forecast Scrubber** | Heatmap mode toggle, 49-hour slider, play/pause scrub, departure pin |
| **5:00 – 6:30** | **5. Code Architecture Walkthrough** | Pure Python domain services, Django REST views, React Query + Zustand frontend |
| **6:30 – 7:30** | **6. Edge Cases, Performance & Lessons Learned** | Timezone resolution, candidate generation, Mapbox chunking, a11y score |

---

## Detailed Section Scripts

### Section 1: Introduction & Problem Statement (0:00 – 0:45)
- **Screen:** Headwind Landing Page ([`LandingPage.tsx`](file:///c:/Users/husen/Desktop/Headwind/frontend/src/pages/LandingPage.tsx)).
- **Talking Points:**
  - *"Welcome! I'm presenting Headwind, a production-grade weather-aware truck routing web app built for Spotter's Full Stack Developer evaluation."*
  - *"Long-haul commercial freight dispatchers face a critical challenge: routing decisions cannot treat weather as a static overlay. A storm hitting a mountain pass at 2:00 PM doesn't matter if your truck arrives at 8:00 AM, but is fatal if your truck arrives right as the blizzard peaks."*
  - *"Furthermore, high winds interact directly with truck gross weight: empty or light trailers (>30,000 lb vs >40,000 lb) are susceptible to rollovers at speeds that heavy loads can safely navigate."*
  - *"Headwind dynamically samples weather forecasts along candidate routes at the truck's exact estimated arrival time, calculates multi-variable risk scores, and recommends the safest route balancing weather risk and travel time."*

### Section 2: Live Demo — Dallas to Denver Dispatcher (0:45 – 2:00)
- **Screen:** Dispatcher App ([`AppPage.tsx`](file:///c:/Users/husen/Desktop/Headwind/frontend/src/pages/AppPage.tsx)).
- **Actions:**
  - Click **"Launch Dispatcher"** from the landing navbar.
  - Show the planner drawer: Origin: *Dallas, TX*, Destination: *Denver, CO*, Departure: *Tomorrow 08:00*, Cargo Load: *42,000 lb*, Interval: *25 miles*.
  - Click **"Analyze Routes"**.
- **Talking Points:**
  - *"Here in the Dispatcher, we submit a standard corridor from Dallas to Denver. Headwind's backend orchestrates candidate generation with Mapbox Directions, applies waypoint diversity offsets to guarantee 3 distinct corridors, and samples Open-Meteo forecasts."*
  - *"Look at the results: Route B is recommended! Why? Route A (via Amarillo) is 12 minutes faster, but has 46 miles of Severe weather. Route B has 0 miles of Severe weather and only 28 miles of High risk."*
  - *"The recommendation engine follows strict safety hierarchy: 1) Lowest Severe miles, 2) Lowest High miles, 3) Shortest travel time. Because driver lives and cargo safety come first, Route B wins on High risk miles."*

### Section 3: Weather Risk Classification & Load Escalation (2:00 – 3:30)
- **Screen:** Click on Route B to open [`RouteDetailPanel.tsx`](file:///c:/Users/husen/Desktop/Headwind/frontend/src/features/routes/RouteDetailPanel.tsx) and [`CheckpointTable.tsx`](file:///c:/Users/husen/Desktop/Headwind/frontend/src/features/routes/CheckpointTable.tsx).
- **Actions:**
  - Expand the Checkpoint Table. Hover over checkpoints to see map camera smoothly ease to the location.
  - Scroll horizontally to demonstrate the sticky **Mile** column.
  - Return to the landing page `#risk-rules` section and drag the cargo load slider.
- **Talking Points:**
  - *"In the Checkpoint Table, notice each point shows the exact distance mile marker, ETA in the origin's local time zone, wind speed, rain rate, snow rate, and combined risk level."*
  - *"Every risk classification is paired with a geometric shape and text label — never color alone — meeting WCAG AA requirements."*
  - *"Now observe how cargo weight changes everything: with a 42,000 lb load, sustained crosswinds between 35 and 44 mph are escalated from Moderate to Severe. If the load is over 30,000 lb, 45 to 54 mph winds escalate to No Travel. If wind exceeds 55 mph, it is No Travel for all vehicles regardless of weight."*

### Section 4: Corridor Heatmap & 0–48h Forecast Scrubber (3:30 – 5:00)
- **Screen:** Switch Dispatcher mode to **"Heatmap"** in [`AppShell.tsx`](file:///c:/Users/husen/Desktop/Headwind/frontend/src/components/layout/AppShell.tsx).
- **Actions:**
  - Point out the circular weather heatmap cells rendered along the corridor envelope.
  - Drag the [`TimeScrubber.tsx`](file:///c:/Users/husen/Desktop/Headwind/frontend/src/components/map/TimeScrubber.tsx) from $H+0$ to $H+48$.
  - Click **Play** to demonstrate the automated 60 fps time loop; point out the Departure Pin ($H+X$).
- **Talking Points:**
  - *"When switching to Heatmap mode, the backend evaluates risk at up to 300 corridor points snapped to a 0.25-degree grid over a 49-hour forecast horizon."*
  - *"The Time Scrubber at the bottom displays a continuous risk ribbon reflecting the maximum corridor danger for each hour."*
  - *"As we scrub through the timeline, the Mapbox circle layer uses WebGL data-driven styling with requestAnimationFrame interpolation, providing fluid 60 fps transitions without re-fetching tiles or bogging down the browser thread."*

### Section 5: Code Architecture Walkthrough (5:00 – 6:30)
- **Screen:** VS Code / Code editor displaying project tree.
- **Key Files Highlighted:**
  - [`backend/trips/services/`](file:///c:/Users/husen/Desktop/Headwind/backend/trips/services/): `constants.py`, `types.py`, `geo.py`, `eta.py`, `risk.py`, `recommend.py`.
  - [`backend/trips/usecases/analyze_trip.py`](file:///c:/Users/husen/Desktop/Headwind/backend/trips/usecases/analyze_trip.py).
  - [`frontend/src/features/`](file:///c:/Users/husen/Desktop/Headwind/frontend/src/features/).
- **Talking Points:**
  - *"Let's look at the codebase architecture. Clean separation is enforced throughout."*
  - *"All domain logic in `backend/trips/services/` consists of pure, deterministic functions with zero Django or database dependencies. They take immutable dataclasses and return structured types. Our backend test suite contains 194 pytest tests achieving 96% coverage in under 4 seconds."*
  - *"On the frontend, state is cleanly separated: Zustand manages transient UI interactions (drawer collapse, selected checkpoint, time scrubber hour), while TanStack Query handles server state with a 10-minute stale cache and automatic prefetching."*
  - *"To keep the initial bundle lightweight, Mapbox GL JS is strictly code-split via React.lazy so the marketing landing page loads in milliseconds with zero map overhead."*

### Section 6: Edge Cases, Performance & Lessons Learned (6:30 – 7:30)
- **Screen:** Browser DevTools & Lighthouse Audit Reports.
- **Talking Points:**
  - *"Several critical edge cases were handled:"*
    1. *"Mapbox Alternative Routes: Mapbox Directions often returns only 1 or 2 routes. We built a lateral waypoint candidate generator that calculates perpendicular via-points, runs greedy spatial similarity deduplication, and guarantees up to 3 viable, distinct alternatives."*
    2. *"Timezone Crossing: Long-haul trips frequently cross multiple timezone boundaries. All weather lookups occur in UTC with linear wind interpolation and preceding-hour precipitation summation."*
    3. *"Accessibility & Performance: The entire app was audited with jest-axe and Google Lighthouse. The landing page scores 90 Performance, 94 Accessibility, 100 Best Practices, and 91 SEO. On the dispatcher app, accessibility scored a perfect 100."*
  - *"Thank you for watching! The complete code, CI pipeline, and API documentation are available in the repository."*
