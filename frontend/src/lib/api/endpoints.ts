/**
 * endpoints.ts – Typed API endpoint callers for Headwind backend.
 */

import { apiFetch } from "./client";
import type {
  GeocodeResult,
  HealthResponse,
  HeatmapRequest,
  HeatmapResponse,
  RiskRulesResponse,
  TripAnalysisRequest,
  TripAnalysisResponse,
} from "@/types/api";

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/api/health", {
    method: "GET",
    signal,
    timeoutMs: 8000,
  });
}

export async function getRiskRules(signal?: AbortSignal): Promise<RiskRulesResponse> {
  return apiFetch<RiskRulesResponse>("/api/risk-rules", {
    method: "GET",
    signal,
    timeoutMs: 8000,
  });
}

export async function geocode(q: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({ q });
  return apiFetch<GeocodeResult[]>(`/api/geocode?${params.toString()}`, {
    method: "GET",
    signal,
    timeoutMs: 8000,
  });
}

export async function analyzeTrip(
  request: TripAnalysisRequest,
  signal?: AbortSignal
): Promise<TripAnalysisResponse> {
  return apiFetch<TripAnalysisResponse>("/api/analyze", {
    method: "POST",
    body: JSON.stringify(request),
    signal,
    timeoutMs: 30000,
  });
}

export async function fetchHeatmap(
  request: HeatmapRequest,
  signal?: AbortSignal
): Promise<HeatmapResponse> {
  return apiFetch<HeatmapResponse>("/api/heatmap", {
    method: "POST",
    body: JSON.stringify(request),
    signal,
    timeoutMs: 30000,
  });
}

