import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // The new service worker installs and takes over by itself, so users never
      // get stuck on an old version. Fine for a demo; a production app might
      // prompt "Update available" instead.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'Shastho Record',
        short_name: 'Shastho',
        description: 'Your medical history, in one place.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f9fafb',
        theme_color: '#0d9488',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache only the built app files (JS, CSS, HTML, icons).
        // We deliberately add NO runtime caching: API responses and record
        // images are private medical data and must never sit in a cache.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Any page URL (e.g. /patient/access) opened offline gets the app shell,
        // and React Router renders the right screen.
        navigateFallback: '/index.html',
      },
    }),
  ],
})