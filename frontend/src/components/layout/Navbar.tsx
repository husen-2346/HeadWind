import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export const Navbar = () => {
  const location = useLocation();

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Planner App", href: "/app" },
    ...(import.meta.env.DEV ? [{ name: "Dev Tokens", href: "/dev/tokens" }] : []),
  ];

  return (
    <nav className="w-full bg-bg border-b border-border z-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-display-32 font-medium tracking-tight text-accent">HEADWIND</span>
          <span className="text-12 text-text-muted font-mono uppercase tracking-widest px-2 py-0.5 rounded-badge border border-border">
            Phase 0
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "text-14 px-3 py-1.5 rounded-input transition-colors font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  isActive
                    ? "text-accent bg-surface border border-border font-medium"
                    : "text-text-muted hover:text-text hover:bg-surface/50"
                )}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
