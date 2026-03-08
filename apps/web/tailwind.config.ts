import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // ── Seer Color Tokens ──────────────────────
      colors: {
        bg: {
          primary: "#080809",
          secondary: "#121217",
          tertiary: "#1A1A21",
        },
        surface: {
          DEFAULT: "#13131A",
          elevated: "#1A1A21",
        },
        text: {
          primary: "rgba(255,255,255,0.92)",
          secondary: "rgba(255,255,255,0.45)",
          tertiary: "rgba(255,255,255,0.25)",
        },
        accent: {
          DEFAULT: "#617AFF",
          soft: "rgba(97,122,255,0.12)",
        },
        danger: "#FF5252",
        success: "#3DDC90",
        bubble: {
          user: "#5270FF",
          assistant: "rgba(255,255,255,0.04)",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.05)",
          light: "rgba(255,255,255,0.08)",
        },
      },

      // ── Typography ─────────────────────────────
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      letterSpacing: {
        label: "3px",
        luxury: "4.5px",
        title: "1.2px",
      },

      // ── Animations ─────────────────────────────
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "typing-bounce": {
          "0%, 60%, 100%": { transform: "translateY(0)" },
          "30%": { transform: "translateY(-4px)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.8s ease-in-out infinite",
        "typing-bounce": "typing-bounce 1.2s ease-in-out infinite",
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
      },

      // ── Accent Gradient ────────────────────────
      backgroundImage: {
        "accent-gradient": "linear-gradient(135deg, #617AFF, #8C61F2)",
        "shimmer-gradient":
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
      },
    },
  },

  plugins: [
    // ── Custom Utilities ───────────────────────
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".glass": {
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          backgroundColor: "rgba(255,255,255,0.03)",
          border: "0.5px solid rgba(255,255,255,0.06)",
        },
        ".glass-bubble": {
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          backgroundColor: "rgba(255,255,255,0.04)",
          border: "0.5px solid rgba(255,255,255,0.05)",
        },
        ".glass-card": {
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          backgroundColor: "rgba(19,19,26,0.85)",
          border: "0.5px solid rgba(255,255,255,0.06)",
          borderRadius: "20px",
        },
        ".tracking-label": {
          letterSpacing: "3px",
          textTransform: "uppercase",
          fontSize: "10px",
          fontWeight: "600",
        },
        ".tracking-luxury": {
          letterSpacing: "4.5px",
          textTransform: "uppercase",
          fontSize: "9px",
          fontWeight: "500",
        },
      });
    }),
  ],
};

export default config;
