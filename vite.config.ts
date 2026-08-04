import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    // Split the long-lived vendor code out of the app chunk so a content change
    // does not invalidate the React/Supabase bundles in visitors' caches.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) {
            return 'vendor-react'
          }
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts'
          // framer-motion is used only by dashboard pages. Left in the generic
          // `vendor` chunk it would be module-preloaded by the public entry,
          // which imports that chunk for lucide-react.
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) {
            return 'vendor-motion'
          }
          if (id.includes('react-hook-form') || id.includes('/zod/') || id.includes('@hookform')) {
            return 'vendor-forms'
          }
          // @react-pdf/renderer and exceljs (invoice/export generation) are only ever
          // reached via dynamic import() from admin pages. Naming them into a manual
          // chunk (even a dedicated one) makes Rollup's chunk-graph optimizer treat that
          // chunk as a first-class node it can freely merge other shared modules into —
          // which previously pulled tiny, genuinely-public-needed modules like clsx along
          // with it, promoting a multi-MB chunk into a static import of the public entry.
          // Returning undefined here instead leaves Rollup's default behavior in place,
          // which correctly keeps modules with zero static importers in their own
          // dynamic-import-only chunk(s), with no merge risk.
          if (
            id.includes('@react-pdf') ||
            id.includes('exceljs') ||
            id.includes('/pdfkit/') ||
            id.includes('/fontkit/') ||
            id.includes('/yoga-layout') ||
            id.includes('/archiver') ||
            id.includes('/jszip/') ||
            id.includes('/compress-commons/') ||
            id.includes('/zip-stream/') ||
            id.includes('/crc32-stream/') ||
            id.includes('/unzipper/') ||
            id.includes('/fast-csv') ||
            id.includes('/restructure/') ||
            id.includes('/unicode-properties/') ||
            id.includes('/unicode-trie/') ||
            id.includes('/linebreak/') ||
            id.includes('/png-js/') ||
            id.includes('/brotli/') ||
            id.includes('/bidi-js/') ||
            id.includes('/dfa/') ||
            id.includes('/media-engine/')
          ) {
            return
          }
          return 'vendor'
        },
      },
    },
  },
})
