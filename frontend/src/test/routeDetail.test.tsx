import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { buildCriteriaRows } from "@/features/routes/criteria";
import { CheckpointTable } from "@/features/routes/CheckpointTable";
import { RouteDetailPanel } from "@/features/routes/RouteDetailPanel";
import { useAppStore } from "@/stores/appStore";
import dallasDenverFixture from "@/mocks/dallas-denver.json";
import type { TripAnalysisResponse, RouteOption } from "@/types/api";

describe("Stage D: Route Detail, Criteria Comparison & Checkpoint Table", () => {
  const fixture = dallasDenverFixture as unknown as TripAnalysisResponse;
  const routes = fixture.routes;

  describe("buildCriteriaRows helper", () => {
    it("orders criteria rows: Severe mi, High mi, Avg risk, Time when no_travel is 0", () => {
      const rec = {
        best_route_id: "1",
        ranked_route_ids: ["1", "2", "3"],
        decided_by: "severe_miles",
        comparisons: [],
        headline: "Route 1 has fewest severe miles",
      };

      const result = buildCriteriaRows(routes, rec);
      const rowKeys = result.rows.map((r) => r.key);

      expect(rowKeys).toEqual(["severe_miles", "high_miles", "avg_risk", "duration_seconds"]);
      expect(result.rows[0].isDecidedHere).toBe(true);
    });

    it("includes no_travel row at top only when a route has no_travel_miles > 0", () => {
      const routesWithNoTravel: RouteOption[] = [
        {
          ...routes[0],
          summary: { ...routes[0].summary, no_travel_miles: 15.2 },
        },
        ...routes.slice(1),
      ];

      const result = buildCriteriaRows(routesWithNoTravel, null);
      expect(result.rows[0].key).toBe("no_travel_miles");
    });

    it("fades non-winning routes from the criterion where they lose", () => {
      // Route 1 has 0 severe, Route 2 has 20 severe
      const testRoutes: RouteOption[] = [
        {
          ...routes[0],
          id: "A",
          summary: { ...routes[0].summary, severe_miles: 0, high_miles: 10 },
        },
        {
          ...routes[1],
          id: "B",
          summary: { ...routes[1].summary, severe_miles: 25, high_miles: 0 },
        },
      ];

      const rec = {
        best_route_id: "A",
        ranked_route_ids: ["A", "B"],
        decided_by: "severe_miles",
        comparisons: [],
        headline: "Route A has fewest severe miles",
      };

      const result = buildCriteriaRows(testRoutes, rec);
      const severeRow = result.rows.find((r) => r.key === "severe_miles")!;
      const highRow = result.rows.find((r) => r.key === "high_miles")!;

      const routeBInSevere = severeRow.routes.find((r) => r.routeId === "B")!;
      const routeBInHigh = highRow.routes.find((r) => r.routeId === "B")!;

      expect(routeBInSevere.isFaded).toBe(true);
      expect(routeBInHigh.isFaded).toBe(true); // Persists faded in subsequent rows
    });

    it("adds a note when incomplete data exists", () => {
      const routesWithUnknown: RouteOption[] = [
        {
          ...routes[0],
          summary: { ...routes[0].summary, unknown_miles: 45 },
        },
      ];

      const result = buildCriteriaRows(routesWithUnknown, null);
      expect(result.note).toContain("unforecast checkpoints");
    });
  });

  describe("CheckpointTable", () => {
    const checkpoints = routes[0].checkpoints;

    beforeEach(() => {
      useAppStore.setState({ selectedCheckpointIndex: null });
    });

    it("renders table with column headers and checkpoint rows", () => {
      render(
        <CheckpointTable checkpoints={checkpoints} tripTimezone="America/Chicago" />
      );

      expect(screen.getByText("Mile")).toBeInTheDocument();
      expect(screen.getByText("ETA")).toBeInTheDocument();
      expect(screen.getByText("Wind")).toBeInTheDocument();
      expect(screen.getByText("Rain")).toBeInTheDocument();
      expect(screen.getByText("Snow")).toBeInTheDocument();
      expect(screen.getByText("Risk")).toBeInTheDocument();

      const tableRows = screen.getAllByRole("row");
      // 1 header row + checkpoint rows
      expect(tableRows.length).toBe(checkpoints.length + 1);
    });

    it("selects row on click and updates selectedCheckpointIndex in store", () => {
      render(<CheckpointTable checkpoints={checkpoints} />);

      const firstDataRow = screen.getAllByRole("row")[1];
      fireEvent.click(firstDataRow);

      expect(useAppStore.getState().selectedCheckpointIndex).toBe(checkpoints[0].index);
    });

    it("supports keyboard navigation with ArrowDown and ArrowUp", () => {
      render(<CheckpointTable checkpoints={checkpoints} />);

      const firstDataRow = screen.getAllByRole("row")[1];
      fireEvent.keyDown(firstDataRow, { key: "ArrowDown" });

      expect(useAppStore.getState().selectedCheckpointIndex).toBe(checkpoints[1].index);

      const secondDataRow = screen.getAllByRole("row")[2];
      fireEvent.keyDown(secondDataRow, { key: "ArrowUp" });

      expect(useAppStore.getState().selectedCheckpointIndex).toBe(checkpoints[0].index);
    });
  });

  describe("RouteDetailPanel", () => {
    beforeEach(() => {
      useAppStore.setState({
        analysisResult: fixture,
        selectedRouteId: routes[0].id,
        panelState: "detail",
      });
    });

    it("renders route stats, criteria comparison, and checkpoint table", () => {
      render(<RouteDetailPanel />);

      expect(screen.getByText(/distance/i)).toBeInTheDocument();
      expect(screen.getByText(/duration/i)).toBeInTheDocument();
      expect(screen.getAllByText(/avg risk/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/why this route was recommended/i)).toBeInTheDocument();
      expect(screen.getByText(/weather checkpoints/i)).toBeInTheDocument();
    });

    it("navigates back to route list when back button is clicked", () => {
      render(<RouteDetailPanel />);

      const backBtn = screen.getByRole("button", { name: /back to routes list/i });
      fireEvent.click(backBtn);

      expect(useAppStore.getState().panelState).toBe("open");
    });
  });
});
