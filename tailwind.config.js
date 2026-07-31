/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep Maritime Navy (#0B3B7A) anchors navy-700
        navy: {
          50: '#eaf1fb',
          100: '#d3e3f7',
          200: '#a8c7ef',
          300: '#7ba8e3',
          400: '#4d8fe0',
          500: '#2e6bc2',
          600: '#1650a0',
          700: '#0b3b7a',
          800: '#092d5e',
          900: '#08213f',
          950: '#05162a',
        },
        // Steel doubles as the canvas/border/text-secondary neutral ramp
        steel: {
          50: '#f7f8fa',
          100: '#eef1f4',
          200: '#e3e7ed',
          300: '#c7cfd8',
          400: '#98a5b4',
          500: '#5a6673',
          600: '#46505c',
          700: '#363e48',
          800: '#262d35',
          900: '#171d24',
          950: '#0f1720',
        },
        // Signal Orange (#F26B1D) anchors accent-500
        accent: {
          25: '#fff3eb',
          50: '#fff4ed',
          100: '#ffe4d2',
          200: '#ffc7a3',
          300: '#ffa26c',
          400: '#f8863f',
          500: '#f26b1d',
          600: '#d8540f',
          700: '#b5420c',
          800: '#8f350d',
          900: '#742c0d',
        },
        status: {
          delivered: '#0f8a54',
          transit: '#1d6fd1',
          pending: '#d97706',
          delayed: '#dc2626',
          cancelled: '#6b7280',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        display: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.6' }],
        base: ['16px', { lineHeight: '1.6' }],
        lg: ['18px', { lineHeight: '1.6' }],
        xl: ['20px', { lineHeight: '1.5' }],
        '2xl': ['24px', { lineHeight: '1.4' }],
        '3xl': ['32px', { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        '4xl': ['40px', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        '5xl': ['56px', { lineHeight: '1.08', letterSpacing: '-0.02em' }],
        '6xl': ['72px', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        card: '12px',
        control: '10px',
        badge: '999px',
      },
      boxShadow: {
        // Three elevation levels only.
        'elevation-1': '0 1px 2px rgba(15,23,32,0.06)',
        'elevation-2': '0 4px 16px rgba(15,23,32,0.08)',
        'elevation-3': '0 16px 40px rgba(15,23,32,0.12)',
      },
      transitionTimingFunction: {
        'out-premium': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        180: '180ms',
        240: '240ms',
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
        'route-dots': 'radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)',
      },
      animation: {
        'fade-up': 'fadeUp 0.24s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 0.18s ease-out both',
        'route-draw': 'routeDraw 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        routeDraw: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}