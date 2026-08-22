/**
 * Flag artwork is derived from the country's ISO code rather than stored, so
 * adding a market in Settings → Countries is one form and no asset upload.
 * flagcdn serves the same public PNGs the site already used when the country
 * list was hardcoded.
 */
export function countryFlagUrl(code: string, width: 40 | 80 | 160 = 160): string | null {
  const iso = code.trim().toLowerCase()
  // flagcdn keys on the two-letter ISO 3166-1 alpha-2 code. Anything else (a
  // three-letter code, an internal marker) has no flag, and the caller falls
  // back to the code itself rather than requesting a 404.
  if (!/^[a-z]{2}$/.test(iso)) return null
  return `https://flagcdn.com/w${width}/${iso}.png`
}

/**
 * "Somalia, China and Turkey" — the served markets as a sentence fragment, for
 * the marketing copy that enumerates them. Returns an empty string when the
 * list has not loaded, so callers fall back to a country-free sentence rather
 * than printing a stale one.
 */
export function formatCountryList(names: string[], conjunction = 'and'): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} ${conjunction} ${names[names.length - 1]}`
}
