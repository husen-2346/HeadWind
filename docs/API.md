# Headwind API Specification

Headwind backend provides REST endpoints for weather-aware truck route analysis, geocoding, and risk threshold inspection.

- **Base URL**: `http://localhost:8000/api`
- **Content Type**: `application/json`
- **Error Format**: `{"error": {"code": str, "message": str, "details"?: any}}`

---

## Endpoints Summary

| Method | Endpoint | Description | Rate Limit |
|---|---|---|---|
| `GET` | `/api/health` | Health check endpoint | Unlimited |
| `GET` | `/api/risk-rules` | Canonical weather risk levels and load rules | Unlimited |
| `GET` | `/api/geocode?q=...` | Forward geocoding search suggestions | 60 req / min |
| `POST` | `/api/analyze` | Full trip route analysis, weather lookup, and ranking | 12 req / min |
| `POST` | `/api/heatmap` | 49-hour weather risk corridor heatmap | 12 req / min |

---

## 1. GET /api/health

Verifies backend service operational state.

### Response `200 OK`
```json
{
  "status": "ok"
}
```

### Curl Example
```bash
curl -X GET http://localhost:8000/api/health
```

---

## 2. GET /api/risk-rules

Returns JSON-serializable risk thresholds, variable descriptions, load escalation rules, and recommendation priority order. Enables frontend components to stay decoupled from hard-coded business numbers.

### Response `200 OK`
```json
{
  "levels": ["LOW", "MODERATE", "HIGH", "SEVERE", "NO_TRAVEL"],
  "variables": {
    "wind_mph": {
      "unit": "mph",
      "description": "Sustained wind speed at 10 m (not gusts)",
      "thresholds": [
        {"level": "LOW", "lower_inclusive": 0.0, "upper_exclusive": 25.0},
        {"level": "MODERATE", "lower_inclusive": 25.0, "upper_exclusive": 35.0},
        {"level": "HIGH", "lower_inclusive": 35.0, "upper_exclusive": 45.0},
        {"level": "SEVERE", "lower_inclusive": 45.0, "upper_exclusive": 55.0},
        {"level": "NO_TRAVEL", "lower_inclusive": 55.0, "upper_exclusive": null}
      ]
    },
    "rain_in_hr": { ... },
    "snow_in_hr": { ... }
  },
  "load_rules": [
    {
      "min_wind_mph": 55.0,
      "max_wind_mph": null,
      "min_load_lb": 0.0,
      "escalate_to": "NO_TRAVEL",
      "description": "Wind >= 55 mph: No Travel for any load"
    },
    {
      "min_wind_mph": 45.0,
      "max_wind_mph": 55.0,
      "min_load_lb": 30000.0,
      "escalate_to": "NO_TRAVEL",
      "description": "Wind 45-54 mph and load > 30,000 lb: No Travel"
    },
    {
      "min_wind_mph": 35.0,
      "max_wind_mph": 45.0,
      "min_load_lb": 40000.0,
      "escalate_to": "SEVERE",
      "description": "Wind 35-44 mph and load > 40,000 lb: Severe"
    }
  ],
  "recommendation_order": [
    "no_travel_miles (ascending)",
    "severe_miles (ascending)",
    "high_miles (ascending)",
    "avg_risk (ascending)",
    "duration_seconds (ascending)"
  ]
}
```

### Curl Example
```bash
curl -X GET http://localhost:8000/api/risk-rules
```

---

## 3. GET /api/geocode

Forward geocoding search for city, state, or address lookups. Uses Mapbox Geocoding v6.

### Query Parameters
- `q` (string, required): Search query string. Must be at least 2 characters.

### Response `200 OK`
```json
[
  {
    "name": "Dallas, Texas, United States",
    "lat": 32.7767,
    "lon": -96.7970,
    "place_formatted": "Dallas, Texas, United States"
  }
]
```

### Error Responses
- `400 Bad Request` if `q` is missing or shorter than 2 characters:
```json
{
  "error": {
    "code": "validation_error",
    "message": "Query parameter 'q' must be at least 2 characters."
  }
}
```

### Curl Example
```bash
curl -X GET "http://localhost:8000/api/geocode?q=Denver"
```

---

## 4. POST /api/analyze

End-to-end trip analysis evaluating up to 3 driving routes, checkpoint weather sampling along estimated arrival times, load risk escalation, and route ranking.

### Request Body Schema
| Field | Type | Required | Description |
|---|---|---|---|
| `origin` | `[lon, lat]` or `{"lat", "lon"}` | Yes | Starting point coordinates. Longitude in `[-180, 180]`, Latitude in `[-90, 90]`. |
| `destination` | `[lon, lat]` or `{"lat", "lon"}` | Yes | Ending point coordinates. Must be at least 2.0 miles from origin. |
| `departure_local` | `string` (ISO 8601) | Yes | Departure time in origin local time (e.g. `2026-11-20T06:00:00`). Valid window: `[-1h, +72h]`. |
| `load_lb` | `integer` | No | Cargo load weight in pounds (min 1, default `40000`). |
| `interval_miles` | `integer` | No | Sampling checkpoint interval: `10`, `25`, or `50` (default `25`). |

#### Example Request Body
```json
{
  "origin": [-96.7970, 32.7767],
  "destination": [-104.9903, 39.7392],
  "departure_local": "2026-11-20T06:00:00",
  "load_lb": 42000,
  "interval_miles": 25
}
```

### Response `200 OK`
```json
{
  "request": {
    "origin": [-96.797, 32.7767],
    "destination": [-104.9903, 39.7392],
    "departure_local": "2026-11-20T06:00:00",
    "departure_utc": "2026-11-20T12:00:00Z",
    "origin_timezone": "America/Chicago",
    "load_lb": 42000,
    "interval_miles": 25
  },
  "summary": {
    "recommended_route_id": "A",
    "headline": "Route A has 0.0 Severe miles vs 46.2 on Route B.",
    "decided_by": "severe_miles",
    "weather_status": "complete",
    "warnings": []
  },
  "routes": [
    {
      "id": "A",
      "name": "US-287 N",
      "source": "primary",
      "distance_miles": 806.4,
      "duration_seconds": 45864,
      "summary": {
        "distance_miles": 806.4,
        "duration_seconds": 45864,
        "miles_by_level": {
          "low": 720.0,
          "moderate": 86.4,
          "high": 0.0,
          "severe": 0.0,
          "no_travel": 0.0
        },
        "unknown_miles": 0.0,
        "severe_miles": 0.0,
        "high_miles": 0.0,
        "no_travel_miles": 0.0,
        "avg_risk": 0.11,
        "max_level": "moderate"
      },
      "geometry": [
        [-96.797, 32.7767],
        [-97.332, 33.125],
        ...
      ],
      "risk_segments": [
        {
          "level": "low",
          "start_mile": 0.0,
          "end_mile": 720.0,
          "geometry": [[-96.797, 32.7767], ...]
        },
        {
          "level": "moderate",
          "start_mile": 720.0,
          "end_mile": 806.4,
          "geometry": [...]
        }
      ],
      "checkpoints": [
        {
          "index": 0,
          "mile": 0.0,
          "lat": 32.7767,
          "lon": -96.797,
          "eta_utc": "2026-11-20T12:00:00Z",
          "eta_local": "2026-11-20T06:00:00-06:00",
          "weather": {
            "wind_mph": 12.4,
            "rain_in_hr": 0.0,
            "snow_in_hr": 0.0
          },
          "risk": {
            "level": "low",
            "wind_level": "low",
            "rain_level": "low",
            "snow_level": "low",
            "escalated_by_load": false,
            "escalation_reason": null
          }
        }
      ]
    }
  ],
  "meta": {
    "generated_at": "2026-11-20T09:30:00Z",
    "route_count": 3,
    "timings_ms": {
      "routing": 240,
      "weather": 380,
      "analysis": 12,
      "total": 632
    },
    "data_sources": {
      "routing": "Mapbox Directions v5",
      "weather": "Open-Meteo Forecast (CC BY 4.0)"
    }
  }
}
```

### Weather Status Values
- `"complete"`: All checkpoints across all candidate routes successfully fetched weather forecasts.
- `"partial"`: Some checkpoint weather queries failed or returned missing data; missing checkpoints classified with `risk.level = null` and counted in `unknown_miles`.
- `"unavailable"`: Open-Meteo API unreachable or failed; route geometries and travel times return normally with weather set to `null` and `recommendation = null`.

### Curl Example
```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "origin": [-96.7970, 32.7767],
    "destination": [-104.9903, 39.7392],
    "departure_local": "2026-11-21T06:00:00",
    "load_lb": 42000,
    "interval_miles": 25
  }'
```

---

## 5. POST /api/heatmap

Generates a 49-hour weather risk corridor across candidate routes between origin and destination, evaluating risk indices (0–4, or -1 for unknown) at each hour from the current UTC hour (`start_utc`). Reuses directions cached during trip analysis.

### Request Body
```json
{
  "origin": [-96.7970, 32.7767],
  "destination": [-104.9903, 39.7392],
  "departure_local": "2026-11-21T06:00:00",
  "load_lb": 42000
}
```

### Response `200 OK`
```json
{
  "meta": {
    "start_utc": "2026-11-20T12:00:00Z",
    "hour_count": 49,
    "timezone": "America/Chicago",
    "timezone_abbr": "CST",
    "load_lb": 42000,
    "departure_hour_offset": 18,
    "weather_status": "ok",
    "point_count": 142
  },
  "warnings": [],
  "points": [
    {
      "lat": 32.75,
      "lon": -96.75,
      "levels": [0, 0, 1, 1, 2, 2, 3, ...]
    }
  ]
}
```

---

## 6. Error Codes & Handling

All error responses return a standardized format:

```json
{
  "error": {
    "code": "error_code_string",
    "message": "Human readable error description.",
    "details": null
  }
}
```

| HTTP Status | Error Code | Trigger Condition |
|---|---|---|
| `400` | `validation_error` | Missing fields, coordinates out of range, origin/destination < 2 mi apart, or departure outside window `[-1h, +72h]`. |
| `404` | `no_route_found` | Mapbox Directions found 0 driving routes between coordinates. |
| `429` | `rate_limited` | Exceeded rate limit (12 req/min on `/analyze`, 60 req/min on `/geocode`). |
| `502` | `upstream_routing_error` | Mapbox API returned 5xx, network timeout, or invalid response. Tokens are stripped. |
| `502` | `upstream_weather_error` | Open-Meteo API returned 5xx or network timeout. Handled gracefully during analysis. |
| `500` | `internal_error` | Unexpected unhandled server exception. |

---

## 7. Caching & Performance
- **Directions Cache**: Keyed to `[lat, lon]` rounded to 4 decimal places (~11 m precision), cached for 3600 seconds.
- **Weather Cache**: Keyed to `[lat, lon]` rounded to 2 decimal places (~1.1 km precision), cached for 1800 seconds.
- **Heatmap Cache**: Keyed to origin, destination, load, and UTC start hour, cached for 600 seconds (10 minutes).
- **GZip Compression**: Responses over 200 bytes are gzip-compressed via Django `GZipMiddleware`.
