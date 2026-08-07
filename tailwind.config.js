/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  theme: {
    extend: {
      colors: {
        /* =========================================
           FNS CARGO PRIMARY BLUE
           Brand: #3865F2
        ========================================= */
        primary: {
          50: "#EEF3FF",
          100: "#DCE7FF",
          200: "#C2D4FF",
          300: "#9CB8FF",
          400: "#7397FF",
          500: "#3865F2",
          600: "#2F57D6",
          700: "#2646B3",
          800: "#1D3690",
          900: "#15296D",
          950: "#0D1945",
        },

        /* =========================================
           FNS CARGO NAVY
           Brand: #0B1F3A
        ========================================= */
        navy: {
          50: "#F2F6FC",
          100: "#E4ECF8",
          200: "#C8D8F1",
          300: "#9EB8E7",
          400: "#6F93DA",
          500: "#456FC6",
          600: "#2E56A7",
          700: "#23427F",
          800: "#18305C",
          900: "#0B1F3A",
          950: "#071321",
        },

        /* =========================================
           FNS CARGO SURFACES & TEXT
        ========================================= */
        surface: "#F8FAFC",
        background: "#FFFFFF",

        ink: "#1F2937",
        secondary: "#64748B",
        "text-secondary": "#64748B",

        border: "#E2E8F0",
        white: "#FFFFFF",

        /* =========================================
           SUCCESS
        ========================================= */
        success: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          300: "#86EFAC",
          400: "#4ADE80",
          500: "#16A34A",
          600: "#15803D",
          700: "#166534",
          800: "#14532D",
          900: "#0F3D22",
        },

        /* =========================================
           WARNING
           Blue-based to avoid yellow/amber branding
        ========================================= */
        warning: {
          50: "#EEF3FF",
          100: "#DCE7FF",
          200: "#C2D4FF",
          300: "#9CB8FF",
          400: "#7397FF",
          500: "#3865F2",
          600: "#2F57D6",
          700: "#2646B3",
          800: "#1D3690",
          900: "#15296D",
        },

        /* =========================================
           DANGER
        ========================================= */
        danger: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#DC2626",
          600: "#B91C1C",
          700: "#991B1B",
          800: "#7F1D1D",
          900: "#651414",
        },

        /* =========================================
           INFO
           FNS blue
        ========================================= */
        info: {
          50: "#EEF3FF",
          100: "#DCE7FF",
          200: "#C2D4FF",
          300: "#9CB8FF",
          400: "#7397FF",
          500: "#3865F2",
          600: "#2F57D6",
          700: "#2646B3",
          800: "#1D3690",
          900: "#15296D",
        },

        /* =========================================
           LEGACY TOKENS
           KEEP FOR COMPATIBILITY
        ========================================= */
        steel: {
          50: "#F7F8FA",
          100: "#EEF1F4",
          200: "#E3E7ED",
          300: "#C7CFD8",
          400: "#98A5B4",
          500: "#5A6673",
          600: "#46505C",
          700: "#363E48",
          800: "#262D35",
          900: "#171D24",
          950: "#0F1720",
        },

        /* =========================================
           SHIPMENT STATUS
        ========================================= */
        status: {
          delivered: "#16A34A", // emerald — done / paid
          transit: "#3865F2", // blue — in motion
          pending: "#F59E0B", // amber — at a depot / needs attention
          delayed: "#DC2626", // red — owing / destructive
          cancelled: "#64748B", // slate — waiting / inactive
        },
      },

      /* =========================================
         TYPOGRAPHY
      ========================================= */
      fontFamily: {
        sans: ['"Inter"', '"Segoe UI"', "system-ui", "sans-serif"],
        display: ['"Inter"', "system-ui", "sans-serif"],
        mono: [
          '"JetBrains Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },

      fontSize: {
        xs: ["12px", { lineHeight: "1.5" }],
        sm: ["14px", { lineHeight: "1.6" }],
        base: ["16px", { lineHeight: "1.6" }],
        lg: ["18px", { lineHeight: "1.6" }],
        xl: ["20px", { lineHeight: "1.5" }],
        "2xl": ["24px", { lineHeight: "1.4" }],
        "3xl": [
          "32px",
          {
            lineHeight: "1.25",
            letterSpacing: "-0.02em",
          },
        ],
        "4xl": [
          "40px",
          {
            lineHeight: "1.15",
            letterSpacing: "-0.02em",
          },
        ],
        "5xl": [
          "56px",
          {
            lineHeight: "1.08",
            letterSpacing: "-0.02em",
          },
        ],
        "6xl": [
          "72px",
          {
            lineHeight: "1.05",
            letterSpacing: "-0.02em",
          },
        ],
      },

      /* =========================================
         BORDER RADIUS
      ========================================= */
      borderRadius: {
        card: "12px",
        control: "10px",
        badge: "999px",
      },

      /* =========================================
         SHADOWS
      ========================================= */
      boxShadow: {
        "elevation-1": "0 1px 2px rgba(15,23,32,0.06)",
        "elevation-2": "0 4px 16px rgba(15,23,32,0.08)",
        "elevation-3": "0 16px 40px rgba(15,23,32,0.12)",
      },

      /* =========================================
         TRANSITIONS
      ========================================= */
      transitionTimingFunction: {
        "out-premium": "cubic-bezier(0.16, 1, 0.3, 1)",
      },

      transitionDuration: {
        180: "180ms",
        240: "240ms",
      },

      /* =========================================
         BACKGROUNDS
      ========================================= */
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",

        "route-dots":
          "radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)",
      },

      /* =========================================
         ANIMATIONS
      ========================================= */
      animation: {
        "fade-up":
          "fadeUp 0.24s cubic-bezier(0.16, 1, 0.3, 1) both",

        "fade-in":
          "fadeIn 0.18s ease-out both",

        "route-draw":
          "routeDraw 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",

        shimmer:
          "shimmer 1.6s ease-in-out infinite",
      },

      keyframes: {
        fadeUp: {
          "0%": {
            opacity: "0",
            transform: "translateY(12px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },

        fadeIn: {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },

        routeDraw: {
          "0%": {
            strokeDashoffset: "1000",
          },
          "100%": {
            strokeDashoffset: "0",
          },
        },

        shimmer: {
          "0%": {
            backgroundPosition: "-200% 0",
          },
          "100%": {
            backgroundPosition: "200% 0",
          },
        },
      },
    },
  },

  plugins: [],
};