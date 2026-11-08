import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg-rgb) / <alpha-value>)",
        surface: "rgb(var(--surface-rgb) / <alpha-value>)",
        card: "rgb(var(--card-rgb) / <alpha-value>)",
        border: {
          DEFAULT: "rgb(var(--border-rgb) / <alpha-value>)",
          strong: "rgb(var(--border-strong-rgb) / <alpha-value>)",
        },
        text: {
          DEFAULT: "rgb(var(--text-rgb) / <alpha-value>)",
          muted: "rgb(var(--text-muted-rgb) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--primary-rgb) / <alpha-value>)",
          glow: "rgb(var(--primary-rgb) / <alpha-value>)",
          foreground: "var(--primary-foreground)",
        },
        success: "rgb(110 231 183 / <alpha-value>)",
        warning: "rgb(252 211 77 / <alpha-value>)",
        destructive: "rgb(251 113 133 / <alpha-value>)",
        accent: "rgb(232 121 249 / <alpha-value>)",
        tumor: {
          ncr: "var(--tumor-ncr)",
          ed: "var(--tumor-ed)",
          et: "var(--tumor-et)",
        },
      },
      fontFamily: {
        // System fonts keep the local application fully usable without a network
        // request during build or at first render.
        sans: ["var(--font-poppins)", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "10px",
        lg: "16px",
        xl: "20px",
      },
      boxShadow: {
        glow: "0 0 28px -8px rgb(103 232 249 / 0.4)",
        card: "0 16px 48px -24px rgb(0 0 0 / 0.65)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
