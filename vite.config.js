import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { APP_DESCRIPTION, BRAND_NAME, THEME_COLOR } from './src/web/site/brand.js'
import { siteHeadTags } from './src/web/site/pageMeta.js'
import { escapeHtml } from './src/web/coachMeta.js'

// The brand reaches index.html and the PWA manifest from src/web/site/brand.js at build time (launch plan W1), so the
// rename changes one file. index.html carries tokens (__BRAND_NAME__, __THEME_COLOR__) and a <!--site-head--> marker
// for the title, description and share tags; a build that leaves one behind fails.
function brandHtml() {
  return {
    name: 'brand-html',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const out = html
          .replace('<!--site-head-->', () => siteHeadTags())
          .replaceAll('__BRAND_NAME__', escapeHtml(BRAND_NAME))
          .replaceAll('__THEME_COLOR__', escapeHtml(THEME_COLOR))
        if (/__[A-Z_]+__|<!--site-head-->/.test(out)) throw new Error('index.html: a brand token was not replaced')
        return out
      },
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    brandHtml(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: BRAND_NAME,
        short_name: BRAND_NAME,
        description: APP_DESCRIPTION,
        theme_color: THEME_COLOR,
        background_color: THEME_COLOR,
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // The AASA file is a static file, not the SPA: a browser that has this
        // service worker must fetch it, never be handed the precached
        // index.html (the default navigateFallback). /privacy, /terms and
        // /delete-account are SPA routes since 2026-10-16 and need no entry.
        navigateFallbackDenylist: [/^\/\.well-known\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
})
