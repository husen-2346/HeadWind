# Project Assumptions

## Status: DECIDED (Phase 1 complete)

All rules below were decided during Phase 1 implementation and are now
locked for Phases 2–8. Changes require an explicit decision log entry.

---

### 1. Threshold Intervals (half-open, lower-inclusive)

**Wind (mph, sustained 10 m speed — not gusts):**

| Level | Range |
|---|---|
| Low | [0, 25) |
| Moderate | [25, 35) |
| High | [35, 45) |
| Severe | [45, 55) |
| No Travel | [55, ∞) |

**Rain (in/hr):**

| Level | Range |
|---|---|
| Low | [0, 0.10) |
| Moderate | [0.10, 0.25) |
| High | [0.25, 0.50) |
| Severe | [0.50, 1.00] ← upper bound inclusive |
| No Travel | (1.00, ∞) ← strictly greater than 1.00 |

**Snow (in/hr):**

| Level | Range |
|---|---|
| Low | [0, 0.5) |
| Moderate | [0.5, 1.0) |
| High | [1.0, 2.0) |
| Severe | [2.0, 3.0] ← upper bound inclusive |
| No Travel | (3.0, ∞) ← strictly greater than 3.0 |

> The top band for rain and snow is closed on the lower end of No Travel
> because the spec says No Travel is *strictly greater than* 1.00 / 3.0,
> which means 1.00 and 3.0 themselves are Severe.

---

### 2. Checkpoint Risk = Worst of Wind, Rain, Snow

The final checkpoint risk level is `max(wind_level, rain_level, snow_level)`
after applying load escalation to the wind level. Each variable is
classified independently first.

---

### 3. Load Rules Apply to Wind Only

Load weight only modifies the wind risk level. Rain and snow are
classified purely by their own thresholds. Load comparisons use **strict
greater-than** (> not ≥). Load of exactly 30,000 or 40,000 lb is NOT
escalated.

| Condition | Escalates Wind To |
|---|---|
| wind ≥ 55 mph, any load | No Travel (already from threshold) |
| 45 ≤ wind < 55 AND load > 30,000 lb | No Travel |
| 35 ≤ wind < 45 AND load > 40,000 lb | Severe |

A load rule can only **raise** the final level (never lower it).
`escalated_by_load` is `True` only when the load rule changed the result.

---

### 4. Segment Mileage Ownership (Midpoint Rule)

Each checkpoint owns the miles from the midpoint between it and the
previous checkpoint to the midpoint between it and the next:
- First checkpoint: owns from mile 0 to its midpoint with the second.
- Last checkpoint: owns from its midpoint with the second-to-last to `total_miles`.
- Owned miles always sum exactly to `total_miles`.

---

### 5. No Travel Route Ordering

Any route containing **any** No Travel miles ranks below every route
without No Travel, regardless of Severe/High/avg risk counts. Within
the No-Travel tier, routes are sorted by no_travel_miles ascending,
then the remaining criteria.

---

### 6. Lexicographic Ranking Key (Ascending, Best First)

```python
(
    unknown_miles > 0,            # incomplete data ranks last
    round(no_travel_miles, 1),
    round(severe_miles, 1),
    round(high_miles, 1),
    round(avg_risk, 2),
    round(duration_seconds / 60), # whole minutes
    route_id,                     # deterministic alphabetic tie-break
)
```

- `decided_by` is the first criterion where best ≠ runner-up.
- `comparisons` lists the first separating criterion vs every non-best route.
- `headline` is a single plain-English sentence generated from named helpers.

---

### 7. Sustained Wind (Not Gusts)

Phase 2 will request the **sustained wind speed at 10 m** from Open-Meteo
(`windspeed_10m`). Wind gusts (`windgusts_10m`) will be fetched and
stored for reference but will NOT be used in risk classification.
Decision on gusts will be revisited after Phase 2 data inspection.

---

### 8. Departure Time = Origin's Local Time Zone

Departure date/time entered by the user is interpreted in the **origin
location's local time zone**. It is converted to UTC for all Open-Meteo
API calls. Checkpoint ETAs are expressed in UTC internally and displayed
in local time in the UI.

---

### 9. Routing Is Not Truck-Restricted

Mapbox Directions API uses a standard driving profile. Routes do NOT
account for bridge weight ratings, low clearances, or hazmat
restrictions. This is a known platform limitation noted in the app UI.

---

### 10. ETA Profile

ETA at each checkpoint is computed by **linear interpolation** along a
distance-time profile:
- Phase 1 uses a 2-point linear profile (constant average speed).
- Phase 2 will upgrade to a per-segment profile using Mapbox leg durations
  when available.

---

### 11. Precipitation Units

Rain and snow are measured in **inches per hour** (in/hr), matching
Open-Meteo's `precipitation` field (mm/hr converted) and
`snowfall` field. Conversion: 1 mm = 0.03937 inches.
Phase 2 will apply this conversion on ingestion.

---

### 12. Incomplete Data Routes Rank Last

Routes where any checkpoint has `Weather()` with all fields `None` have
`unknown_miles > 0`. Such routes rank after all complete-data routes,
regardless of their other metrics. Their `unknown_miles` are excluded
from the avg_risk calculation.

---

### 13. Candidate Route Generation & Diversity Fallback

Mapbox Directions v5 often returns only 1 or 2 routes for long-distance corridors
even with `alternatives=true` (e.g. Dallas to Denver yields only 2 alternatives).
To ensure 3 distinct options as required:
1. Primary directions request with `alternatives=true`.
2. Filter candidates:
   - Max distance multiplier: 1.4 × min_distance
   - Max duration multiplier: 1.5 × min_duration
   - Deduplication: similarity ≥ 0.90 discarded (keeping the faster route).
3. If fewer than 3 routes remain, generate variants in parallel (`ThreadPoolExecutor`):
   - `exclude=toll`
   - `exclude=motorway`
   - 4 lateral via-waypoints: perpendicular offsets at 35%, 45%, 55%, 65% along the
     corridor with ±15% and ±25% lateral offset.
4. Merge and run greedy diverse selection. If fewer than 3 distinct routes can be found,
   return what is available and attach warning `code='fewer_routes'`.

---

### 14. Open-Meteo Weather Lookup & Interpolation Rules

1. **Exact UTC Timestamps**: Timestamps from Open-Meteo are in GMT/UTC.
2. **Wind Speed**: Linearly interpolated between the surrounding two hourly forecast marks.
3. **Precipitation**: Open-Meteo hourly precipitation reflects the preceding hour sum.
   Lookup extracts the value at the first hour boundary at or after the checkpoint ETA.
   Total rain is the sum of `rain` and `showers`.
4. **No Extrapolation**: Checkpoints whose ETA falls outside the forecast window return
   `Weather(None, None, None)` and are marked as unknown.
5. **Weather Resilience**: If Open-Meteo is completely unavailable (502 or timeout),
   the pipeline returns route geometry and travel times with `weather_status='unavailable'`
   and `recommendation=null`. It never crashes the user's trip analysis.

---

### 15. Caching and Rate Limiting Policies

- **Directions Cache**: Keyed to origin/destination coordinates at 4 decimal places (~11 m). TTL = 3600 seconds.
- **Weather Cache**: Keyed to checkpoint coordinates at 2 decimal places (~1.1 km). TTL = 1800 seconds.
- **Cache Backend**: Django Local-Memory Cache (`LocMemCache`).
- **Throttling**: DRF `ScopedRateThrottle` enforces:
  - `POST /api/analyze`: 12 requests / minute.
  - `GET /api/geocode`: 60 requests / minute.

---

### 16. Attributions & Licenses

- Routing: Mapbox Directions API v5.
- Geocoding: Mapbox Geocoding API v6.
- Weather: Open-Meteo Weather Forecast API under Creative Commons Attribution 4.0 International (CC BY 4.0).

