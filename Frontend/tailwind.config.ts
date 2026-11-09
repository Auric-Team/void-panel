import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        line: "var(--line)",
        border: "var(--border)",
        "border-soft": "var(--border-soft)",
        surface: "var(--surface)",
        "surface-hover": "var(--surface-hover)",
        "surface-solid": "var(--surface-solid)",
        accent: "var(--accent)",
        "accent-bright": "var(--accent-bright)",
        "accent-ink": "var(--accent-ink)",
        track: "var(--track)",
        thumb: "var(--thumb)",
        success: "var(--success)",
        info: "var(--info)",
        danger: "var(--danger)",
        warning: "var(--warning)",
        focus: "var(--focus)",
      },
      fontFamily: {
        display: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        ui: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        mono: [
          '"JetBrains Mono"',
          '"Cascadia Code"',
          '"Fira Code"',
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "10px",
        pill: "999px",
      },
    },
  },
  plugins: [],
};
export default config;
