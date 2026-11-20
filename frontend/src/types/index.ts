/**
 * Shared TypeScript domain models for Headwind.
 * Full route, weather, and checkpoint types to be implemented in Phase 1 & 2.
 */

export type RiskLevel = "low" | "moderate" | "high" | "severe" | "no-travel";

export interface HealthCheckResponse {
  status: "ok";
}
