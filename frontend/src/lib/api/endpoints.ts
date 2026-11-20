/**
 * endpoints.ts – Typed API endpoint callers for Headwind backend.
 */

import { apiFetch } from "./client";
import type {
  GeocodeResult,
  HealthResponse,
  RiskRulesResponse,
  TripAnalysisRequest,
  TripAnalysisResponse,
} from "@/types/api";

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/api/health", {
    method: "GET",
    signal,
    timeoutMs: 10000,
  });
}

export async function getRiskRules(signal?: AbortSignal): Promise<RiskRulesResponse> {
  return apiFetch<RiskRulesResponse>("/api/risk-rules", {
    method: "GET",
    signal,
    timeoutMs: 10000,
  });
}

export async function geocode(q: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({ q });
  return apiFetch<GeocodeResult[]>(`/api/geocode?${params.toString()}`, {
    method: "GET",
    signal,
    timeoutMs: 10000,
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
    timeoutMs: 60000,
  });
}
