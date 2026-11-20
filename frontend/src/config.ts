/**
 * config.ts – Global app configuration and environment variables.
 */

export const REPO_URL =
  (import.meta.env.VITE_REPO_URL as string) || "https://github.com/husen-2346/HeadWind";

export const LOOM_URL =
  (import.meta.env.VITE_LOOM_URL as string) || "";
