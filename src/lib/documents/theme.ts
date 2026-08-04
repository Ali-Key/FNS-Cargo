// Hex mirrors of the Tailwind brand tokens (tailwind.config.js) — @react-pdf/renderer
// documents render outside the DOM and cannot consume Tailwind classes, so this is the
// one place hardcoding hex is correct. Never import these into a DOM/Tailwind component;
// use the `navy-*`/`primary-*`/`steel-*` classes there instead.
export const PDF_COLORS = {
  navy900: '#0b1f3a',
  navy800: '#18305c',
  navy700: '#23427f',
  navy500: '#456fc6',
  primary500: '#f4b400',
  steel700: '#334155',
  steel500: '#64748b',
  steel300: '#cbd5e1',
  steel200: '#e2e8f0',
  steel100: '#f1f5f9',
  steel50: '#f8fafc',
  white: '#ffffff',
  statusDelivered: '#16a34a',
  statusDelayed: '#dc2626',
} as const
