import type { Config } from "tailwindcss";

// Paleta derivada do teal da Zupper (#459BAC) em versao escura, clima "Black Friday":
// fundo quase preto azulado, vidro translucido, brilho ciano.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["'Plus Jakarta Sans Variable'", "system-ui", "sans-serif"] },
      colors: {
        ink: { 950: "#030d13", 900: "#05161f", 800: "#081f2b", 700: "#0c2d3d", 600: "#12415a" },
        zup: { 50: "#e8f7fa", 100: "#c4ebf2", 200: "#93d9e6", 300: "#62c4d6", 400: "#459bac", 500: "#37889a", 600: "#2b6f7e", 700: "#1f5360" },
        glow: "#6fe3f7",
        "muted-foreground": "#8db3bd",
        sol: "#f5c542",
        mata: "#7bc74d",
        alerta: "#ff6b6b",
      },
      boxShadow: {
        holo: "0 0 0 1px rgba(111,227,247,.14), 0 18px 60px -24px rgba(69,155,172,.55), inset 0 1px 0 rgba(255,255,255,.06)",
        neon: "0 0 24px -4px rgba(111,227,247,.55)",
      },
      keyframes: {
        scan: { "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(100%)" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        pulseRing: { "0%": { transform: "scale(.6)", opacity: ".8" }, "100%": { transform: "scale(2.2)", opacity: "0" } },
      },
      animation: {
        scan: "scan 7s linear infinite",
        floaty: "floaty 5s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
        pulseRing: "pulseRing 2.2s ease-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
