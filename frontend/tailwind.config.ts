import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        border: "var(--color-border)",
        text: "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
        accent: "var(--color-accent)",
        risk: {
          low: "var(--color-risk-low)",
          moderate: "var(--color-risk-moderate)",
          high: "var(--color-risk-high)",
          severe: "var(--color-risk-severe)",
          "no-travel": "var(--color-risk-no-travel)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        12: ["var(--font-size-12)", { lineHeight: "var(--line-height-12)" }],
        14: ["var(--font-size-14)", { lineHeight: "var(--line-height-14)" }],
        16: ["var(--font-size-16)", { lineHeight: "var(--line-height-16)" }],
        20: ["var(--font-size-20)", { lineHeight: "var(--line-height-20)" }],
        28: ["var(--font-size-28)", { lineHeight: "var(--line-height-28)" }],
        "display-32": [
          "var(--font-size-display-32)",
          {
            lineHeight: "var(--line-height-display-32)",
            letterSpacing: "var(--letter-spacing-display-32)",
          },
        ],
        "display-40": [
          "var(--font-size-display-40)",
          {
            lineHeight: "var(--line-height-display-40)",
            letterSpacing: "var(--letter-spacing-display-40)",
          },
        ],
        "display-56": [
          "var(--font-size-display-56)",
          {
            lineHeight: "var(--line-height-display-56)",
            letterSpacing: "var(--letter-spacing-display-56)",
          },
        ],
      },
      fontWeight: {
        normal: "400",
        medium: "500",
      },
      borderRadius: {
        input: "var(--radius-input)",
        badge: "var(--radius-badge)",
        card: "var(--radius-card)",
        panel: "var(--radius-panel)",
      },
      borderWidth: {
        DEFAULT: "1px",
        hairline: "1px",
      },
      ringColor: {
        accent: "var(--color-accent)",
      },
      ringWidth: {
        DEFAULT: "2px",
        focus: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
