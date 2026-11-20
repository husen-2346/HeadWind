import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LandingPage } from "@/pages/LandingPage";

function renderLanding() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe("Stage C: Landing Page", () => {
  it("renders exactly one h1 with the approved headline", () => {
    renderLanding();

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(/drive around the weather, not into it/i);
  });

  it("renders all navbar links and section anchors", () => {
    renderLanding();

    expect(screen.getAllByText("How it works").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Risk rules").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Heatmap").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/launch app/i).length).toBeGreaterThan(0);
  });

  it("dynamically updates the wind ruler when load weight slider changes", () => {
    renderLanding();

    const slider = screen.getByLabelText(/cargo load weight slider/i);
    expect(slider).toBeInTheDocument();

    // Default 42,000 lb -> >40k lb triggers SEVERE on 35-44 mph
    expect(screen.getAllByText("SEVERE").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/42,000 lb/i).length).toBeGreaterThan(0);

    // Change to 20,000 lb (<30k lb)
    fireEvent.change(slider, { target: { value: "20000" } });
    expect(screen.getAllByText(/20,000 lb/i).length).toBeGreaterThan(0);

    // At 20,000 lb, 35-44 mph is normal HIGH
    expect(screen.getAllByText("HIGH").length).toBeGreaterThan(0);
  });

  it("renders How It Works section with Mile 520 exact labels", () => {
    renderLanding();

    expect(screen.getAllByText(/mile 520/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/truck 1 \(dep 06:00\)/i)).toBeInTheDocument();
    expect(screen.getByText(/truck 2 \(dep 10:00\)/i)).toBeInTheDocument();
  });

  it("renders footer with attribution and commercial planning disclaimer", () => {
    renderLanding();

    expect(screen.getByText(/built by/i)).toBeInTheDocument();
    expect(screen.getByText(/planning aid and advisory system/i)).toBeInTheDocument();
    expect(screen.getByText(/open-meteo \(cc by 4.0\)/i)).toBeInTheDocument();
    expect(screen.getByText(/mapbox directions v5/i)).toBeInTheDocument();
  });
});
