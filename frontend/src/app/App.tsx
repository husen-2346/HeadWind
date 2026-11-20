import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LandingPage } from "@/pages/LandingPage";
import { DevComponentsPage } from "@/pages/DevComponentsPage";

// Lazy-load AppPage so Mapbox GL JS v3 is chunked separately and never in the initial bundle
const AppPage = React.lazy(() => import("@/pages/AppPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoading() {
  return (
    <div className="w-screen h-dvh bg-bg flex flex-col items-center justify-center gap-3">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <span className="text-12 font-mono text-text-muted">Loading Headwind...</span>
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/app" element={<AppPage />} />
            {import.meta.env.DEV && (
              <>
                <Route path="/dev/components" element={<DevComponentsPage />} />
                <Route path="/dev/tokens" element={<Navigate to="/dev/components" replace />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
