/**
 * LandingPage.tsx – Production landing page for Headwind.
 *
 * Implements strict design fidelity matching docs/design/01-05 images without their defects.
 * Zero mapbox-gl code in this route. All numbers sourced from fixtures or canonical rules.
 */

import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { HeatmapSection } from "@/components/landing/HeatmapSection";
import { RiskRulesSection } from "@/components/landing/RiskRulesSection";
import { WhyThisRouteSection } from "@/components/landing/WhyThisRouteSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col antialiased selection:bg-accent/25 selection:text-text scroll-smooth motion-reduce:scroll-auto">
      {/* 1. Sticky Accessible Navbar */}
      <LandingNavbar />

      <main className="flex-1 flex flex-col">
        {/* 2. Hero Section with SVG Route Preview */}
        <HeroSection />

        {/* 3. How It Works (Time-Distance Simulation) */}
        <HowItWorksSection />

        {/* 4. Corridor Heatmap Preview */}
        <HeatmapSection />

        {/* 5. Risk Rules & Real Cargo Weight Slider */}
        <RiskRulesSection />

        {/* 6. Why This Route Criteria Comparison */}
        <WhyThisRouteSection />

        {/* 7. CTA Band with Contour Lines */}
        <CtaSection />
      </main>

      {/* 8. Footer with Disclaimer & Attributions */}
      <LandingFooter />
    </div>
  );
}

export default LandingPage;
