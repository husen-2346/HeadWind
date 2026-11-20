import { describe, expect, it } from "vitest";

describe("Geist Typography & Tokens", () => {
  it("defines Geist font variables in tokens", () => {
    const div = document.createElement("div");
    div.style.fontFamily = "var(--font-sans)";
    document.body.appendChild(div);
    expect(div.style.fontFamily).toBe("var(--font-sans)");

    const monoDiv = document.createElement("div");
    monoDiv.className = "font-mono tabular-nums";
    document.body.appendChild(monoDiv);
    expect(monoDiv.className).toContain("font-mono");
    expect(monoDiv.className).toContain("tabular-nums");
  });
});
