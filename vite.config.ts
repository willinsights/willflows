import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      // Unified SW: workbox precaching + push handlers in src/sw.ts
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // We manage SW registration manually (see PWAUpdateListener) to avoid implicit reloads.
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['favicon.ico', 'pwa-icon.png'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      manifest: {
        name: 'WillFlow - Gestão de Projetos',
        short_name: 'WillFlow',
        description: 'Sistema de gestão de projetos para fotógrafos e filmmakers',
        theme_color: '#8224e3',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/auth',
        scope: '/',
        icons: [
          { src: '/pwa-icon.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate heavy libraries into their own chunks
          'framer': ['framer-motion'],
          'recharts': ['recharts'],
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-accordion',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
          ],
          'dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'date': ['date-fns'],
        },
      },
    },
    // Increase chunk size warning limit slightly since we're intentionally chunking
    chunkSizeWarningLimit: 600,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "src/test/"],
    },
  },
}));
