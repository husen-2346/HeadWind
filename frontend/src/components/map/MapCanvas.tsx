import React, { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { applyHeadwindMapTheme } from "./theme";
import { AlertTriangle } from "@/components/ui/icons";
import { MapContext } from "./MapContext";

export interface MapCanvasProps {
  children?: React.ReactNode;
  className?: string;
  onMapLoad?: (map: MapboxMap) => void;
}

export function MapCanvas({ children, className, onMapLoad }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapboxMap | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

  useEffect(() => {
    if (!token || token.trim() === "" || token.includes("your_mapbox")) {
      setLoadError("Mapbox access token is missing or placeholder. Add VITE_MAPBOX_TOKEN to your frontend .env file.");
      return;
    }

    if (!containerRef.current) return;

    let isCancelled = false;
    let localMap: MapboxMap | null = null;

    // Dynamically import mapbox-gl to prevent bundling into initial chunks
    import("mapbox-gl").then((mapboxglModule) => {
      if (isCancelled || !containerRef.current) return;

      const mapboxgl = mapboxglModule.default;
      mapboxgl.accessToken = token;

      try {
        localMap = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [-98.5795, 39.8283], // Contiguous US center
          zoom: 3.8,
          projection: "mercator",
          dragRotate: false,
          touchPitch: false,
          pitchWithRotate: false,
          attributionControl: false,
        });

        localMap.addControl(
          new mapboxgl.AttributionControl({ compact: true }),
          "bottom-right"
        );

        localMap.on("load", () => {
          if (isCancelled || !localMap) return;
          applyHeadwindMapTheme(localMap);
          setMap(localMap);
          setIsReady(true);
          onMapLoad?.(localMap);
        });

        localMap.on("error", (e) => {
          if (isCancelled) return;
          if (e?.error?.message && !localMap?.loaded()) {
            setLoadError(`Mapbox error: ${e.error.message}`);
          }
        });
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setLoadError(`Failed to initialize map: ${msg}`);
        }
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      if (localMap && localMap.loaded()) {
        localMap.resize();
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      isCancelled = true;
      resizeObserver.disconnect();
      if (localMap) {
        localMap.remove();
      }
    };
  }, [token, onMapLoad]);

  return (
    <MapContext.Provider value={{ map, isReady, container: containerRef.current }}>
      <div className="relative w-full h-full overflow-hidden bg-bg">
        {/* Map Canvas Container */}
        <div
          ref={containerRef}
          role="region"
          aria-label="Interactive route and weather map"
          className={className || "w-full h-full"}
        />

        {/* Missing Token or Error Fallback */}
        {loadError && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-bg/95 backdrop-blur-sm text-center">
            <div className="p-6 max-w-md bg-surface border border-border rounded-panel space-y-4 shadow-2xl">
              <div className="w-10 h-10 rounded-full bg-risk-moderate/15 text-risk-moderate flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-16 font-medium text-text">Mapbox Access Required</h3>
                <p className="text-12 text-text-muted mt-1">{loadError}</p>
              </div>
              <div className="text-12 font-mono text-left p-3 bg-bg border border-border rounded text-text-muted">
                # frontend/.env<br />
                VITE_MAPBOX_TOKEN=pk.your_token_here
              </div>
            </div>
          </div>
        )}

        {/* Map Children (Markers, Popups, Overlays) */}
        {isReady && children}
      </div>
    </MapContext.Provider>
  );
}
