import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0F5132",
          dark: "#0B3D26",
          light: "#D1F2E0",
          50: "#EEFAF3",
        },
        alert: {
          DEFAULT: "#F97316",
          dark: "#C2410C",
          light: "#FFEDD5",
        },
        ink: {
          DEFAULT: "#1A1A1A",
          soft: "#4B5563",
          muted: "#6B7280",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.06)",
        float: "0 8px 24px rgba(15,81,50,.35)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
        "3xl": "24px",
      },
      keyframes: {
        "slide-up": { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "toast-in": { from: { opacity: "0", transform: "translateY(-12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "slide-up": "slide-up .22s ease-out",
        "fade-in": "fade-in .18s ease-out",
        "toast-in": "toast-in .2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
