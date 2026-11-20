/**
 * LandingNavbar.tsx – Responsive landing page navigation bar.
 *
 * Sticky with 1px border, smooth hash links, and accessible mobile dialog sheet with Escape & focus management.
 */

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { REPO_URL } from "@/config";

export function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  // Focus trap for mobile sheet
  useEffect(() => {
    if (mobileMenuOpen && mobileMenuRef.current) {
      const focusable = mobileMenuRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 w-full bg-bg/95 border-b border-border backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Wordmark */}
        <Link
          to="/"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
          <span className="text-18 font-bold tracking-tight text-text">
            HEADWIND
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-6">
          <a
            href="#how-it-works"
            className="text-13 font-mono text-text-muted hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm px-1 py-0.5"
          >
            How it works
          </a>
          <a
            href="#risk-rules"
            className="text-13 font-mono text-text-muted hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm px-1 py-0.5"
          >
            Risk rules
          </a>
          <a
            href="#heatmap"
            className="text-13 font-mono text-text-muted hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm px-1 py-0.5"
          >
            Heatmap
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-13 font-mono text-text-muted hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm px-1 py-0.5"
          >
            GitHub
          </a>
        </nav>

        {/* CTA Launch App Button */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/app">
            <Button variant="primary" size="sm" className="font-medium text-13 px-4">
              Launch app
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-text" /> : <Menu className="w-5 h-5 text-text" />}
          </IconButton>
        </div>
      </div>

      {/* Mobile Drawer Sheet */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="md:hidden border-b border-border bg-surface px-4 py-5 space-y-4"
        >
          <nav className="flex flex-col space-y-3">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="text-14 font-mono text-text hover:text-accent py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
            >
              How it works
            </a>
            <a
              href="#risk-rules"
              onClick={() => setMobileMenuOpen(false)}
              className="text-14 font-mono text-text hover:text-accent py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
            >
              Risk rules
            </a>
            <a
              href="#heatmap"
              onClick={() => setMobileMenuOpen(false)}
              className="text-14 font-mono text-text hover:text-accent py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
            >
              Heatmap
            </a>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-14 font-mono text-text hover:text-accent py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
            >
              GitHub Repository
            </a>
          </nav>

          <div className="pt-2">
            <Link to="/app" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" size="md" className="w-full text-14">
                Launch app
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
