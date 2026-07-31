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
          return 'vendor'
        },
      },
    },
  },
})
