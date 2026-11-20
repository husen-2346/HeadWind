# Logic Explainer: Weather-Aware Route Risk Pipeline

This document explains the complete data pipeline in plain language.
It is intended to help you explain the system in a 5-minute video walkthrough.

---

## Overview

The system takes a user's trip request (origin, destination, departure time,
load weight) and produces a ranked list of route options with per-checkpoint
weather risk assessments.

The pipeline has six stages:

```
Routing API → Checkpoint Sampling → ETA Estimation →
  Weather Fetching → Risk Classification → Route Ranking
```

This document covers everything **except** weather fetching (Phase 2).

---

## Stage 1: Checkpoint Sampling

The routing API returns a route geometry (a polyline of [lon, lat] pairs)
and an authoritative total distance in miles.

We place checkpoints at regular intervals:
- **10, 25, or 50 miles** (configurable; default 25 for medium routes)
- Always include mile **0** (departure) and the **destination** (total miles)
- If the total is not a multiple of the interval, the destination is added
  as an extra final checkpoint

The haversine cumulative distances are **scaled** to match the routing API's
distance exactly, so our mile positions are consistent with the API's numbers.

Each checkpoint stores: index, mile, latitude, longitude.

---

## Stage 2: ETA Estimation

For each checkpoint we compute the truck's **estimated arrival time**:

```
ETA at checkpoint = departure_datetime + elapsed_seconds
```

Elapsed seconds at a given mile is computed by **linear interpolation** along
a distance-time profile:
- Phase 1 uses a simple 2-point profile (constant average speed).
- Phase 2 upgrades to a per-leg profile from the routing API.

**Departure time must be timezone-aware** (the origin's local timezone).
All ETAs are stored in UTC internally.

This ETA is then used in Phase 2 to query the **exact weather forecast at
the right moment in time** at each checkpoint location.

---

## Stage 3: Risk Classification

Each checkpoint has a `Weather` object with up to three fields:
`wind_mph`, `rain_in_hr`, `snow_in_hr`.

### Individual Classification

Each variable is classified independently against thresholds:

| Level | Wind (mph) | Rain (in/hr) | Snow (in/hr) |
|---|---|---|---|
| Low | < 25 | < 0.10 | < 0.5 |
| Moderate | [25, 35) | [0.10, 0.25) | [0.5, 1.0) |
| High | [35, 45) | [0.25, 0.50) | [1.0, 2.0) |
| Severe | [45, 55) | [0.50, 1.00] | [2.0, 3.0] |
| No Travel | ≥ 55 | > 1.00 | > 3.0 |

### Load Weight Escalation (Wind Only)

If the cargo load is heavy, the wind risk can be escalated:

| Wind | Load | Escalation |
|---|---|---|
| [45, 55) mph | > 30,000 lb | High → No Travel |
| [35, 45) mph | > 40,000 lb | Moderate/High → Severe |

Escalation is **additive only** — it can never lower a level.
An escalation reason string is generated for display, e.g.:
> "39 mph is High. Load over 40,000 lb raises it to Severe."

### Checkpoint Final Level

`checkpoint_level = max(wind_level, rain_level, snow_level)`

If all three fields are `None`, the checkpoint is **unknown** (no data).

---

## Stage 4: Route Summary

Each checkpoint "owns" a segment of the route using the **midpoint rule**:
- A checkpoint's segment runs from the midpoint with the previous checkpoint
  to the midpoint with the next checkpoint.
- The first checkpoint owns from mile 0; the last owns to the total distance.
- Owned miles always sum to the total route length.

Unknown checkpoints contribute to `unknown_miles` and are excluded from
the risk calculation.

For known checkpoints, we accumulate:
- `miles_by_level`: dict of RiskLevel → total owned miles at that level
- `avg_risk`: mile-weighted mean of the numeric level (0–4) over known miles
- `max_level`: the highest level observed on the route

---

## Stage 5: Route Ranking

Routes are sorted ascending by this priority tuple:

1. `unknown_miles > 0` — incomplete data routes rank last
2. `no_travel_miles` (rounded to 0.1 mi)
3. `severe_miles` (rounded to 0.1 mi)
4. `high_miles` (rounded to 0.1 mi)
5. `avg_risk` (rounded to 0.01)
6. `duration_minutes` (whole minutes)
7. `route_id` (alphabetic, deterministic tie-break)

The first criterion where the best route beats the runner-up is recorded as
`decided_by`, and a plain-English headline is generated.

---

## Worked Example: 100-Mile Route at 25-Mile Intervals, 42,000 lb Load

**Setup:**
- Route length: 100 miles, 5 hours estimated
- Interval: 25 miles → checkpoints at miles 0, 25, 50, 75, 100
- Load: 42,000 lb (triggers escalation for wind in [35, 45) mph)
- Departure: 2024-06-01 06:00 UTC

**Checkpoint ETAs** (linear profile = 20 mph average):

| Mile | ETA (UTC) |
|---|---|
| 0 | 06:00 |
| 25 | 07:15 |
| 50 | 08:30 |
| 75 | 09:45 |
| 100 | 11:00 |

**Weather at each checkpoint** (fetched for the ETA moment):

| Mile | Wind | Rain | Snow | Base Level | Load Escalation | Final Level |
|---|---|---|---|---|---|---|
| 0 | 10 mph | — | — | Low | None | **Low** |
| 25 | 28 mph | — | — | Moderate | None | **Moderate** |
| 50 | 40 mph | — | — | High | +42k lb → Severe | **Severe** |
| 75 | 60 mph | — | — | No Travel | (already max) | **No Travel** |
| 100 | (none) | — | — | — | — | **Unknown** |

**Segment Ownership** (midpoint rule):

| Checkpoint (mile) | Segment | Owned Miles |
|---|---|---|
| 0 | [0, 12.5] | 12.5 |
| 25 | [12.5, 37.5] | 25.0 |
| 50 | [37.5, 62.5] | 25.0 |
| 75 | [62.5, 87.5] | 25.0 |
| 100 | [87.5, 100] | 12.5 (unknown) |

**Route Summary:**

| Metric | Value |
|---|---|
| `unknown_miles` | 12.5 mi |
| `no_travel_miles` | 25.0 mi |
| `severe_miles` | 25.0 mi |
| `high_miles` | 0.0 mi |
| `avg_risk` | (0×12.5 + 1×25 + 3×25 + 4×25) / 87.5 = **2.29** |
| `max_level` | No Travel |

**Ranking:** This route has `no_travel_miles = 25.0` and `unknown_miles > 0`,
so it ranks **after** any route with 0 no_travel_miles and no unknown segments.

---

## Notes for the Video Walkthrough

- Emphasise that the ETA is used to pick the **right hour** of the forecast at each point.
- The load escalation is a one-way ratchet: it can only make things worse, never better.
- The ranking is fully transparent: `decided_by` and `comparisons` tell you exactly
  why Route B won, in terms the user can understand.
- The 1-decimal rounding on mileage means differences under 50 metres are treated
  as ties — a deliberate choice to avoid false precision.
