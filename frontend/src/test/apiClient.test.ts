import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, ApiError } from "@/lib/api/client";

describe("API Client (apiFetch)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("successfully parses 200 JSON responses", async () => {
    const mockData = { status: "ok" };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await apiFetch<{ status: string }>("/api/health");
    expect(result).toEqual(mockData);
  });

  it("maps structured 4xx error payloads to ApiError with code, message, and details", async () => {
    const errorBody = {
      error: {
        code: "validation_error",
        message: "Origin and destination must be at least 2.0 miles apart.",
        details: { distance_miles: 1.1 },
      },
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(errorBody), {
        status: 400,
        statusText: "Bad Request",
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(apiFetch("/api/analyze")).rejects.toThrow(ApiError);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(errorBody), {
        status: 400,
        statusText: "Bad Request",
        headers: { "Content-Type": "application/json" },
      })
    );

    try {
      await apiFetch("/api/analyze");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe("validation_error");
      expect(apiErr.message).toBe("Origin and destination must be at least 2.0 miles apart.");
      expect(apiErr.status).toBe(400);
      expect(apiErr.details).toEqual({ distance_miles: 1.1 });
    }
  });

  it("handles non-JSON error responses gracefully as bad_response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html>Bad Gateway</html>", {
        status: 502,
        statusText: "Bad Gateway",
      })
    );

    try {
      await apiFetch("/api/analyze");
      expect.fail("Expected ApiError to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe("bad_response");
      expect(apiErr.status).toBe(502);
    }
  });

  it("maps network errors to code network_error with status 0", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Failed to fetch"));

    try {
      await apiFetch("/api/health");
      expect.fail("Expected ApiError to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe("network_error");
      expect(apiErr.status).toBe(0);
      expect(apiErr.message).toContain("Failed to fetch");
    }
  });

  it("maps timeout to code timeout with status 408", async () => {
    vi.useFakeTimers();

    vi.spyOn(globalThis, "fetch").mockImplementationOnce((_url, init) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal;
        signal?.addEventListener("abort", () => {
          const err = new Error("The operation was aborted.");
          err.name = "AbortError";
          reject(err);
        });
      });
    });

    const promise = apiFetch("/api/analyze", { timeoutMs: 50 });

    vi.advanceTimersByTime(60);

    try {
      await promise;
      expect.fail("Expected timeout ApiError");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe("timeout");
      expect(apiErr.status).toBe(408);
    } finally {
      vi.useRealTimers();
    }
  });

  it("supports explicit AbortSignal cancellation", async () => {
    const controller = new AbortController();

    vi.spyOn(globalThis, "fetch").mockImplementationOnce((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("The operation was aborted.");
          err.name = "AbortError";
          reject(err);
        });
      });
    });

    const promise = apiFetch("/api/analyze", { signal: controller.signal });
    controller.abort();

    try {
      await promise;
      expect.fail("Expected aborted ApiError");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe("aborted");
    }
  });
});
