import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "jest-axe";

import { RiskBadge } from "@/components/ui/RiskBadge";
import { RouteCard } from "@/components/routes/RouteCard";
import { TimeScrubber } from "@/components/map/TimeScrubber";
import { PlannerForm } from "@/features/planner/PlannerForm";
import { NotFoundPage } from "@/pages/NotFoundPage";

import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { HeatmapSection } from "@/components/landing/HeatmapSection";
import { RiskRulesSection } from "@/components/landing/RiskRulesSection";
import { WhyThisRouteSection } from "@/components/landing/WhyThisRouteSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

import { dallasDenverFixture } from "@/mocks";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe("Stage D: Accessibility Audit (jest-axe)", () => {
  it("RiskBadge passes WCAG 2.1 AA across all levels", async () => {
    const { container } = render(
      <div>
        <RiskBadge level="low" />
        <RiskBadge level="moderate" />
        <RiskBadge level="high" />
        <RiskBadge level="severe" />
        <RiskBadge level="no_travel" />
      </div>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("RouteCard passes WCAG 2.1 AA", async () => {
    const route = dallasDenverFixture.routes[0];
    const { container } = render(
      <RouteCard
        route={route}
        isRecommended={true}
        fastestDurationSeconds={route.duration_seconds}
      />
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("TimeScrubber passes WCAG 2.1 AA", async () => {
    const { container } = render(<TimeScrubber />, {
      wrapper: createWrapper(),
    });
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("PlannerForm passes WCAG 2.1 AA", async () => {
    const { container } = render(<PlannerForm />, {
      wrapper: createWrapper(),
    });
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("NotFoundPage passes WCAG 2.1 AA", async () => {
    const { container } = render(<NotFoundPage />, {
      wrapper: createWrapper(),
    });
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("HeroSection passes WCAG 2.1 AA", async () => {
    const { container } = render(<HeroSection />, {
      wrapper: createWrapper(),
    });
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("HowItWorksSection passes WCAG 2.1 AA", async () => {
    const { container } = render(<HowItWorksSection />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("HeatmapSection passes WCAG 2.1 AA", async () => {
    const { container } = render(<HeatmapSection />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("RiskRulesSection passes WCAG 2.1 AA", async () => {
    const { container } = render(<RiskRulesSection />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("WhyThisRouteSection passes WCAG 2.1 AA", async () => {
    const { container } = render(<WhyThisRouteSection />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("CtaSection passes WCAG 2.1 AA", async () => {
    const { container } = render(<CtaSection />, {
      wrapper: createWrapper(),
    });
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("LandingFooter passes WCAG 2.1 AA", async () => {
    const { container } = render(<LandingFooter />, {
      wrapper: createWrapper(),
    });
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
