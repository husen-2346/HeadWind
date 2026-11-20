/**
 * index.ts – Typed mock fixtures for development, testing, and offline previews.
 */

import dallasDenverData from "./dallas-denver.json";
import riskRulesData from "./risk-rules.json";
import type { RiskRulesResponse, TripAnalysisResponse } from "@/types/api";

export const dallasDenverFixture = dallasDenverData as unknown as TripAnalysisResponse;
export const riskRulesFixture = riskRulesData as unknown as RiskRulesResponse;
export { generateMockHeatmap } from "./heatmapMock";
