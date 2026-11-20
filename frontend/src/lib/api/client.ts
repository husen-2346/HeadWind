/**
 * client.ts – Strongly-typed fetch wrapper with timeout and AbortSignal support.
 */

import type { ApiErrorResponse } from "@/types/api";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  signal?: AbortSignal;
}

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "";

/**
 * Execute an API fetch call, enforcing JSON encoding/decoding, timeouts, and sanitized error mapping.
 */
export async function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 10000, signal: callerSignal, ...init } = options;

  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  // Link caller signal if provided
  if (callerSignal) {
    callerSignal.addEventListener("abort", () => {
      controller.abort();
    });
  }

  // Construct URL
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const normalizedBase = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const url = `${normalizedBase}${normalizedEndpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (timedOut) {
      throw new ApiError("timeout", `Request to ${endpoint} timed out after ${timeoutMs}ms`, 408);
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError("aborted", "Request was aborted by the client", 0);
    }
    throw new ApiError(
      "network_error",
      err instanceof Error ? err.message : "Network connection failed",
      0
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let errorBody: ApiErrorResponse | null = null;
    try {
      errorBody = (await response.json()) as ApiErrorResponse;
    } catch {
      // Unparseable error body
    }

    if (errorBody && errorBody.error && typeof errorBody.error.code === "string") {
      throw new ApiError(
        errorBody.error.code,
        errorBody.error.message || `Request failed with status ${response.status}`,
        response.status,
        errorBody.error.details
      );
    }

    throw new ApiError(
      "bad_response",
      `HTTP error ${response.status} ${response.statusText}`,
      response.status
    );
  }

  try {
    return (await response.json()) as T;
  } catch (err: unknown) {
    throw new ApiError(
      "bad_response",
      err instanceof Error ? err.message : "Failed to parse JSON response",
      response.status
    );
  }
}
