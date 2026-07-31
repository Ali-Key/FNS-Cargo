// Visual QA helper: captures full-page screenshots of routes at desktop + mobile
// viewports so rendered output can be reviewed against the reference design.
//
//   node scripts/shoot.mjs                       # default routes, both viewports
//   node scripts/shoot.mjs /about /services      # specific routes
//   BASE=http://localhost:4173 node scripts/shoot.mjs   # against `npm run preview`
//
// Output: <OUT>/<route>-<viewport>.png  (OUT defaults to the scratchpad dir)
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:5173'
const OUT = process.env.OUT || './.screenshots'
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['/', '/services', '/tracking', '/about', '/contact']

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
]

const slug = (r) => (r === '/' ? 'home' : r.replace(/^\//, '').replace(/\//g, '-'))

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const results = []

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: !!vp.isMobile,
    // Scroll-reveal content starts at opacity:0 and only fades in via an
    // IntersectionObserver on scroll. A full-page screenshot never scrolls, so
    // emulate reduced-motion, which forces `.reveal` straight to its visible
    // end state (see src/index.css) — otherwise every below-fold section is blank.
    reducedMotion: 'reduce',
  })
  const page = await ctx.newPage()
  for (const route of routes) {
    const url = BASE + route
    try {
      // 'load' not 'networkidle': Vite's HMR websocket keeps the connection
      // open, so networkidle never settles in dev.
      await page.goto(url, { waitUntil: 'load', timeout: 20000 })
      await page.waitForTimeout(900) // let reveal/fade-in animations + lazy imgs settle
      const file = `${OUT}/${slug(route)}-${vp.name}.png`
      await page.screenshot({ path: file, fullPage: true })
      results.push(`  ok   ${route.padEnd(12)} ${vp.name.padEnd(8)} -> ${file}`)
    } catch (err) {
      results.push(`  FAIL ${route.padEnd(12)} ${vp.name.padEnd(8)} ${err.message.split('\n')[0]}`)
    }
  }
  await ctx.close()
}

await browser.close()
console.log(`\nBASE=${BASE}  OUT=${OUT}\n` + results.join('\n') + '\n')
