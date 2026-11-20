import { describe, expect, it } from "vitest";

describe("Frontend test environment", () => {
  it("vitest and jsdom are operational", () => {
    expect(true).toBe(true);
    const div = document.createElement("div");
    div.textContent = "Headwind";
    document.body.appendChild(div);
    expect(div).toHaveTextContent("Headwind");
  });
});
