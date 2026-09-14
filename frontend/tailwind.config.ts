import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        card: "var(--card)",
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        text: {
          DEFAULT: "var(--text)",
          muted: "var(--text-muted)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          glow: "var(--primary-glow)",
          foreground: "var(--primary-foreground)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        destructive: "var(--destructive)",
        tumor: {
          ncr: "var(--tumor-ncr)",
          ed: "var(--tumor-ed)",
          et: "var(--tumor-et)",
        },
      },
      fontFamily: {
        // System fonts keep the local application fully usable without a network
        // request during build or at first render.
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "10px",
        lg: "16px",
        xl: "20px",
      },
      boxShadow: {
        glow: "0 8px 24px -10px rgb(0 109 166 / 0.55)",
        card: "0 1px 2px 0 rgb(16 42 67 / 0.04), 0 10px 28px -20px rgb(16 42 67 / 0.22)",
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
