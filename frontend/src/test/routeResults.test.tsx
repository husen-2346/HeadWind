import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { formatRouteSource, formatDecidedBy, formatComparison } from "@/lib/labels";
import { RiskBar } from "@/components/routes/RiskBar";
import { RouteCard } from "@/components/routes/RouteCard";
import { RouteResults } from "@/features/routes/RouteResults";
import { useAppStore } from "@/stores/appStore";
import dallasDenverFixture from "@/mocks/dallas-denver.json";
import type { TripAnalysisResponse } from "@/types/api";

describe("Stage B: Results, Recommendation & Route Cards", () => {
  describe("labels.ts helpers", () => {
    it("formats known route sources and handles fallbacks", () => {
      expect(formatRouteSource("primary")).toBe("Direct Highway");
      expect(formatRouteSource("exclude_toll")).toBe("Toll-Free Route");
      expect(formatRouteSource("exclude_motorway")).toBe("Non-Interstate Route");
      expect(formatRouteSource("via_offset")).toBe("Corridor Variant");
      expect(formatRouteSource("custom_variant")).toBe("Custom Variant");
      expect(formatRouteSource(null)).toBe("Standard Highway");
    });

    it("formats known decided_by criteria and unexpected fallbacks", () => {
      expect(formatDecidedBy("no_travel_miles")).toBe("Fewest No Travel miles");
      expect(formatDecidedBy("severe_miles")).toBe("Fewest Severe risk miles");
      expect(formatDecidedBy("high_miles")).toBe("Fewest High risk miles");
      expect(formatDecidedBy("avg_risk")).toBe("Lowest average risk score");
      expect(formatDecidedBy("duration_minutes")).toBe("Shortest travel time");
      expect(formatDecidedBy("unknown_custom_rule")).toBe("Unknown Custom Rule");
      expect(formatDecidedBy(null)).toBe("Overall Route Safety");
    });

    it("formats route comparisons clearly", () => {
      const comp = {
        route_id: "B",
        criterion: "severe_miles",
        best_value: 0,
        other_value: 46,
      };
      const text = formatComparison(comp, "A");
      expect(text).toContain("Route A has 0 Severe miles vs 46 on Route B");
    });
  });

  describe("RiskBar", () => {
    it("renders accessible label with all risk mile totals", () => {
      const sampleSummary = {
        distance_miles: 800,
        duration_seconds: 45000,
        miles_by_level: {
          low: 500,
          moderate: 200,
          high: 80,
          severe: 20,
          no_travel: 0,
        },
        unknown_miles: 0,
        severe_miles: 20,
        high_miles: 80,
        no_travel_miles: 0,
        avg_risk: 0.65,
        max_level: "severe" as const,
      };

      render(<RiskBar summary={sampleSummary} routeLabel="Route A" />);
      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("aria-label");
      expect(img.getAttribute("aria-label")).toContain("Route A");
      expect(img.getAttribute("aria-label")).toContain("20 severe miles");
    });
  });

  describe("RouteCard", () => {
    const fixture = dallasDenverFixture as unknown as TripAnalysisResponse;
    const route = fixture.routes[0];

    beforeEach(() => {
      useAppStore.setState({
        selectedRouteId: null,
        hoveredRouteId: null,
        panelState: "open",
      });
    });

    it("selects route on click and on Enter key", () => {
      render(
        <RouteCard
          route={route}
          isRecommended={true}
          fastestDurationSeconds={route.duration_seconds}
        />
      );

      const card = screen.getByRole("button", { name: /route/i });
      fireEvent.click(card);
      expect(useAppStore.getState().selectedRouteId).toBe(route.id);

      useAppStore.setState({ selectedRouteId: null });
      fireEvent.keyDown(card, { key: "Enter" });
      expect(useAppStore.getState().selectedRouteId).toBe(route.id);
    });

    it("sets hoveredRouteId on mouse enter and clears on mouse leave", () => {
      render(
        <RouteCard
          route={route}
          isRecommended={false}
          fastestDurationSeconds={route.duration_seconds}
        />
      );

      const card = screen.getByRole("button", { name: /route/i });
      fireEvent.mouseEnter(card);
      expect(useAppStore.getState().hoveredRouteId).toBe(route.id);

      fireEvent.mouseLeave(card);
      expect(useAppStore.getState().hoveredRouteId).toBeNull();
    });

    it("shows Details button when selected, and opens detail panel on click", () => {
      useAppStore.setState({ selectedRouteId: route.id, panelState: "open" });

      render(
        <RouteCard
          route={route}
          isRecommended={true}
          fastestDurationSeconds={route.duration_seconds}
        />
      );

      const detailsBtn = screen.getByRole("button", { name: /details/i });
      expect(detailsBtn).toBeInTheDocument();

      fireEvent.click(detailsBtn);
      expect(useAppStore.getState().panelState).toBe("detail");
    });
  });

  describe("RouteResults States", () => {
    const fixture = dallasDenverFixture as unknown as TripAnalysisResponse;

    it("renders idle state before analysis", () => {
      useAppStore.setState({ analysisResult: null });
      render(<RouteResults />);
      expect(screen.getByText("Ready to Analyze")).toBeInTheDocument();
    });

    it("renders loading skeletons when isLoading is true", () => {
      render(<RouteResults isLoading />);
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("renders all routes and recommendation banner on success", () => {
      useAppStore.setState({ analysisResult: fixture });
      render(<RouteResults />);

      expect(screen.getByText(/recommendation/i)).toBeInTheDocument();
      expect(screen.getByText(fixture.summary.headline)).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /route/i }).length).toBe(fixture.routes.length);
    });

    it("renders weather unavailable alert when weather_status is unavailable", () => {
      const unavail = {
        ...fixture,
        summary: {
          ...fixture.summary,
          weather_status: "unavailable" as const,
        },
      };
      useAppStore.setState({ analysisResult: unavail });
      render(<RouteResults />);

      expect(screen.getByText("Weather Forecast Unavailable")).toBeInTheDocument();
    });
  });
});
