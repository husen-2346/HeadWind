/**
 * api.ts – TypeScript models mirroring the Headwind Django API responses.
 *
 * Source of truth: backend/trips/responses.py, serializers.py, views.py
 */

export type RiskLevelName = "low" | "moderate" | "high" | "severe" | "no_travel";

export type RiskLevelIndex = 0 | 1 | 2 | 3 | 4;

export const RISK_LEVEL_INDEX_MAP: Record<RiskLevelName, RiskLevelIndex> = {
  low: 0,
  moderate: 1,
  high: 2,
  severe: 3,
  no_travel: 4,
};

export type WeatherStatus = "complete" | "partial" | "unavailable";

export interface Warning {
  code: string;
  message: string;
}

export interface WeatherSummary {
  wind_mph: number | null;
  rain_in_hr: number | null;
  snow_in_hr: number | null;
}

export interface CheckpointRisk {
  level: RiskLevelName | null;
  wind_level: RiskLevelName | null;
  rain_level: RiskLevelName | null;
  snow_level: RiskLevelName | null;
  escalated_by_load: boolean;
  escalation_reason: string | null;
}

export interface Checkpoint {
  index: number;
  mile: number;
  lat: number;
  lon: number;
  eta_utc: string;
  eta_local: string;
  weather: WeatherSummary;
  risk: CheckpointRisk;
}

export interface RiskSegment {
  level: RiskLevelName | "unknown";
  start_mile: number;
  end_mile: number;
  geometry: [number, number][];
}

export interface MilesByLevel {
  low: number;
  moderate: number;
  high: number;
  severe: number;
  no_travel: number;
}

export interface RouteSummary {
  distance_miles: number;
  duration_seconds: number;
  miles_by_level: MilesByLevel;
  unknown_miles: number;
  severe_miles: number;
  high_miles: number;
  no_travel_miles: number;
  avg_risk: number | null;
  max_level: RiskLevelName | null;
}

export interface RouteOption {
  id: string;
  name: string;
  source: string;
  distance_miles: number;
  duration_seconds: number;
  summary: RouteSummary;
  geometry: [number, number][];
  risk_segments: RiskSegment[];
  checkpoints: Checkpoint[];
}

export interface RouteComparison {
  route_id: string;
  criterion: string;
  best_value: unknown;
  other_value: unknown;
}

export interface Recommendation {
  best_route_id: string;
  ranked_route_ids: string[];
  decided_by: string;
  comparisons: RouteComparison[];
  headline: string;
}

export interface TripAnalysisRequest {
  origin: [number, number]; // [lon, lat]
  destination: [number, number]; // [lon, lat]
  departure_local: string; // ISO 8601 string
  load_lb?: number;
  interval_miles?: 10 | 25 | 50;
}

export interface TripAnalysisResponse {
  request: {
    origin: [number, number];
    destination: [number, number];
    departure_local: string;
    departure_utc: string;
    origin_timezone: string;
    load_lb: number;
    interval_miles: number;
  };
  summary: {
    recommended_route_id: string | null;
    headline: string;
    decided_by: string | null;
    weather_status: WeatherStatus;
    warnings: Warning[];
  };
  routes: RouteOption[];
  meta: {
    generated_at: string;
    route_count: number;
    timings_ms: {
      routing: number;
      weather: number;
      analysis: number;
      total: number;
    };
    data_sources: {
      routing: string;
      weather: string;
    };
  };
}

export interface GeocodeResult {
  name: string;
  lat: number;
  lon: number;
  place_formatted?: string;
}

export interface RiskRuleThreshold {
  level: string;
  lower_inclusive?: number;
  upper_exclusive?: number | null;
  lower_exclusive?: number;
}

export interface LoadRule {
  min_wind_mph: number;
  max_wind_mph: number | null;
  min_load_lb: number;
  escalate_to: string;
  description: string;
}

export interface RiskRulesResponse {
  levels: string[];
  variables: Record<
    string,
    {
      unit: string;
      description: string;
      thresholds: RiskRuleThreshold[];
    }
  >;
  load_rules: LoadRule[];
  recommendation_order: string[];
  notes: string[];
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
}

export interface HealthResponse {
  status: string;
}
