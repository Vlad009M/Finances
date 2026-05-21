import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      selfDestroying: true,
      registerType: 'autoUpdate',
      includeAssets: ['Aperio.png', 'favicon.svg'],
      manifest: {
        name: 'Aperio — Фінансовий трекер',
        short_name: 'Aperio',
        description: 'Розумний фінансовий трекер з AI аналізом',
        theme_color: '#7c6af7',
        background_color: '#f2f2f5',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'uk',
        icons: [
          { src: 'Aperio.png', sizes: '192x192', type: 'image/png' },
          { src: 'Aperio.png', sizes: '512x512', type: 'image/png' },
          { src: 'Aperio.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        globIgnores: ['**/Aperio.png'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})