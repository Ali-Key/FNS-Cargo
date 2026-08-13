/**
 * Single source of truth for the FSN Cargo identity.
 *
 * The mark is the original supplied artwork (`public/brand/fsn-mark.png`,
 * transparent RGBA) — not a redrawn approximation, so every surface shows the
 * same glyph. Its one ink is `primary-500` / `signal-500` in
 * `tailwind.config.js`, mirrored for literal-colour consumers by `DECK_HEX`
 * in `utils/status.ts`.
 */
export const FSN_MARK = '/brand/fsn-mark.png'
