import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Navigation } from "@/components/ui/icons";

export function NotFoundPage() {
  useEffect(() => {
    document.title = "404 Not Found — Headwind";
  }, []);

  return (
    <div className="min-h-screen bg-bg bg-grid flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full bg-surface/90 border border-border rounded-panel p-8 backdrop-blur-md shadow-2xl space-y-6">
        <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/30 text-accent flex items-center justify-center mx-auto">
          <Navigation className="w-6 h-6 rotate-45" />
        </div>
        <div className="space-y-2">
          <span className="text-11 font-mono uppercase tracking-widest text-accent font-semibold">
            404 Error
          </span>
          <h1 className="text-24 font-bold text-text">Route Not Found</h1>
          <p className="text-14 text-text-muted">
            The coordinates or waypoint you requested could not be located in our flight corridor.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/" className="w-full sm:w-auto">
            <Button variant="subtle" size="md" className="w-full" leadingIcon={<ArrowLeft className="w-4 h-4" />}>
              Landing Page
            </Button>
          </Link>
          <Link to="/app" className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full">
              Open Dispatcher
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
