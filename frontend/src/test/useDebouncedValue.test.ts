import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

describe("useDebouncedValue hook", () => {
  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("denver", 250));
    expect(result.current).toBe("denver");
  });

  it("debounces rapid value changes", () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: "d", delay: 250 } }
    );

    expect(result.current).toBe("d");

    // Fast keystrokes
    rerender({ value: "da", delay: 250 });
    rerender({ value: "dal", delay: 250 });
    rerender({ value: "dallas", delay: 250 });

    // Value should still be initial before timer advances
    expect(result.current).toBe("d");

    // Advance halfway
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe("d");

    // Advance past delay
    act(() => {
      vi.advanceTimersByTime(110);
    });
    expect(result.current).toBe("dallas");

    vi.useRealTimers();
  });
});
