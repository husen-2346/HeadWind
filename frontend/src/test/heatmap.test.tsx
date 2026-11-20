import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { generateMockHeatmap } from "@/mocks/heatmapMock";
import { dallasDenverFixture } from "@/mocks";
import { HeatmapPanel } from "@/features/heatmap/HeatmapPanel";
import { TimeScrubber } from "@/components/map/TimeScrubber";
import { useAppStore } from "@/stores/appStore";

function renderWithClient(ui: React.ReactElement) {
  const testClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(<QueryClientProvider client={testClient}>{ui}</QueryClientProvider>);
}

describe("Stage B: Frontend Heatmap & Scrubber", () => {
  beforeEach(() => {
    act(() => {
      useAppStore.setState({
        mode: "heatmap",
        forecastHour: 0,
        analysisResult: dallasDenverFixture,
      });
    });
  });

  describe("generateMockHeatmap", () => {
    it("generates deterministic 49-hour corridor points from fixture", () => {
      const mockLight = generateMockHeatmap(dallasDenverFixture, 30000);
      expect(mockLight.meta.hour_count).toBe(49);
      expect(mockLight.points.length).toBeGreaterThan(0);
      expect(mockLight.points[0].levels.length).toBe(49);

      // Verify all points have level in [-1, 4]
      for (const pt of mockLight.points) {
        for (const lvl of pt.levels) {
          expect(lvl).toBeGreaterThanOrEqual(-1);
          expect(lvl).toBeLessThanOrEqual(4);
        }
      }
    });

    it("escalates high risk wave to severe under heavy load (>40,000 lb)", () => {
      const mockLight = generateMockHeatmap(dallasDenverFixture, 30000);
      const mockHeavy = generateMockHeatmap(dallasDenverFixture, 45000);

      const severeLightCount = mockLight.points.flatMap((p) => p.levels).filter((l) => l === 3).length;
      const severeHeavyCount = mockHeavy.points.flatMap((p) => p.levels).filter((l) => l === 3).length;

      expect(severeHeavyCount).toBeGreaterThan(severeLightCount);
    });
  });

  describe("HeatmapPanel", () => {
    it("renders weather corridor title, showing time, and five-level legend", async () => {
      renderWithClient(<HeatmapPanel />);

      expect(screen.getByText(/weather corridor/i)).toBeInTheDocument();
      expect(screen.getByText(/showing:/i)).toBeInTheDocument();
      expect(screen.getByText(/corridor risk scale/i)).toBeInTheDocument();

      // Check all 5 levels + No data
      expect(screen.getByText("Low Risk")).toBeInTheDocument();
      expect(screen.getByText("Moderate")).toBeInTheDocument();
      expect(screen.getByText("High Risk")).toBeInTheDocument();
      expect(screen.getByText("Severe")).toBeInTheDocument();
      expect(screen.getByText("No Travel")).toBeInTheDocument();
      expect(screen.getByText("No data")).toBeInTheDocument();
    });
  });

  describe("TimeScrubber", () => {
    it("renders slider with proper ARIA attributes and major hour labels", () => {
      renderWithClient(<TimeScrubber />);

      const slider = screen.getByRole("slider", { name: /corridor forecast hour/i });
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute("aria-valuemin", "0");
      expect(slider).toHaveAttribute("aria-valuemax", "48");
      expect(slider).toHaveAttribute("aria-valuenow", "0");

      expect(screen.getByText("Now")).toBeInTheDocument();
      expect(screen.getByText("+12h")).toBeInTheDocument();
      expect(screen.getByText("+24h")).toBeInTheDocument();
      expect(screen.getByText("+36h")).toBeInTheDocument();
      expect(screen.getByText("+48h")).toBeInTheDocument();
    });

    it("navigates forecastHour via keyboard arrow keys and page keys", () => {
      renderWithClient(<TimeScrubber />);

      const slider = screen.getByRole("slider", { name: /corridor forecast hour/i });

      // ArrowRight -> +1h
      fireEvent.keyDown(slider, { key: "ArrowRight" });
      expect(useAppStore.getState().forecastHour).toBe(1);

      // PageUp -> +6h (1 + 6 = 7)
      fireEvent.keyDown(slider, { key: "PageUp" });
      expect(useAppStore.getState().forecastHour).toBe(7);

      // ArrowLeft -> -1h (7 - 1 = 6)
      fireEvent.keyDown(slider, { key: "ArrowLeft" });
      expect(useAppStore.getState().forecastHour).toBe(6);

      // End -> 48h
      fireEvent.keyDown(slider, { key: "End" });
      expect(useAppStore.getState().forecastHour).toBe(48);

      // Home -> 0h
      fireEvent.keyDown(slider, { key: "Home" });
      expect(useAppStore.getState().forecastHour).toBe(0);
    });

    it("toggles play/pause playback loop", () => {
      vi.useFakeTimers();
      renderWithClient(<TimeScrubber />);

      const playBtn = screen.getByRole("button", { name: /play timeline forward/i });
      fireEvent.click(playBtn);

      // Advance by 800ms -> 2 ticks of 400ms = 2 hours
      act(() => {
        vi.advanceTimersByTime(800);
      });
      expect(useAppStore.getState().forecastHour).toBe(2);

      // Click pause
      const pauseBtn = screen.getByRole("button", { name: /pause timeline playback/i });
      fireEvent.click(pauseBtn);

      act(() => {
        vi.advanceTimersByTime(800);
      });
      expect(useAppStore.getState().forecastHour).toBe(2);

      vi.useRealTimers();
    });
  });
});
