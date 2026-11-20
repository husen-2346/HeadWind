import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlannerForm } from "@/features/planner";
import { useAppStore } from "@/stores/appStore";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderPlanner(search = "") {
  window.history.pushState({}, "Test", `/${search}`);
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PlannerForm />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe("PlannerForm", () => {
  beforeEach(() => {
    useAppStore.setState({
      origin: null,
      destination: null,
      originInput: "",
      destinationInput: "",
      departureLocal: "2026-11-21T06:00",
      loadLb: 42000,
      intervalMiles: 25,
      analysisResult: null,
    });
  });

  it("renders all form elements with accessible labels", () => {
    renderPlanner();

    expect(screen.getByLabelText("Origin")).toBeInTheDocument();
    expect(screen.getByLabelText("Destination")).toBeInTheDocument();
    expect(screen.getByLabelText("Departure Time")).toBeInTheDocument();
    expect(screen.getByLabelText("Cargo Weight")).toBeInTheDocument();
    expect(screen.getByText("Weather check every")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /analyze routes/i })).toBeInTheDocument();
  });

  it("updates load weight when preset chips are clicked", () => {
    renderPlanner();

    const chip60k = screen.getByRole("button", { name: "60,000 lb" });
    fireEvent.click(chip60k);

    expect(useAppStore.getState().loadLb).toBe(60000);
    expect(screen.getByLabelText("Cargo Weight")).toHaveValue("60,000");
  });

  it("swaps origin and destination when swap button is clicked", () => {
    const dallas = { label: "Dallas, TX", lat: 32.7767, lon: -96.797 };
    const denver = { label: "Denver, CO", lat: 39.7392, lon: -104.9903 };

    useAppStore.getState().setOrigin(dallas);
    useAppStore.getState().setDestination(denver);

    renderPlanner();

    const swapBtn = screen.getByRole("button", { name: /swap origin and destination/i });
    fireEvent.click(swapBtn);

    expect(useAppStore.getState().origin?.label).toBe("Denver, CO");
    expect(useAppStore.getState().destination?.label).toBe("Dallas, TX");
  });

  it("displays validation error when attempting to submit incomplete form", () => {
    renderPlanner();

    const submitBtn = screen.getByRole("button", { name: /analyze routes/i });
    fireEvent.click(submitBtn);

    expect(screen.getAllByText(/please select an origin/i).length).toBeGreaterThan(0);
  });

  it("pre-fills form from URL query parameters without auto-submitting", () => {
    const oParam = encodeURIComponent("Dallas, TX") + "|32.77670,-96.79700";
    const dParam = encodeURIComponent("Denver, CO") + "|39.73920,-104.99030";
    renderPlanner(`?o=${oParam}&d=${dParam}&w=50000&i=50`);

    expect(useAppStore.getState().origin?.label).toBe("Dallas, TX");
    expect(useAppStore.getState().destination?.label).toBe("Denver, CO");
    expect(useAppStore.getState().loadLb).toBe(50000);
    expect(useAppStore.getState().intervalMiles).toBe(50);

    // Verify it did not auto-submit (analysisResult remains null)
    expect(useAppStore.getState().analysisResult).toBeNull();
  });
});
