import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { APP_DESCRIPTION, BRAND_NAME, THEME_COLOR } from './src/web/site/brand.js'
import { PRERENDERED_PAGES, siteHeadTags } from './src/web/site/pageMeta.js'
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

// The SPA shell, kept as spa.html (launch plan W7). After the build, scripts/prerender.mjs writes the static home page
// over dist/index.html (Vercel serves "/" from the file system), so every other route, the service worker's navigation
// fallback and the coach page's link-preview function use this copy of the shell. Emitted here, before the service
// worker is generated, so spa.html is in its precache.
function spaShell() {
  return {
    name: 'spa-shell',
    enforce: 'post',
    generateBundle(_, bundle) {
      const index = bundle['index.html']
      if (!index || index.type !== 'asset') throw new Error('spa-shell: index.html is not in the bundle')
      this.emitFile({ type: 'asset', fileName: 'spa.html', source: index.source })
    },
  }
}

// The static pages (W7): the service worker must never answer them from its cache, so a visitor always gets the file.
const PRERENDERED_NAVIGATIONS = PRERENDERED_PAGES.map((p) => (p.path === '/' ? /^\/$/ : new RegExp(`^${p.path}\\/?$`)))

export default defineConfig(({ isSsrBuild }) => ({
  // The prerender's server bundle (`vite build --ssr src/web/site/prerender.jsx`) needs React only.
  plugins: isSsrBuild ? [react()] : [
    react(),
    brandHtml(),
    spaShell(),
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
        // index.html becomes the static home page after this step (scripts/prerender.mjs) and the other static pages
        // are written then too: none of them is precached (a precache entry is hashed now and would not match).
        // The share image is for link unfurlers, not the app.
        globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js', 'index.html', 'prerendered/**', 'og-image.png'],
        // Every SPA route is answered with the shell (spa.html), never with the static home page.
        navigateFallback: 'spa.html',
        // Not the SPA: the AASA file (a static JSON file), the Vercel functions under /api/, and the static pages,
        // which a visitor must get from the network (W7). /privacy, /terms and /delete-account are SPA routes.
        navigateFallbackDenylist: [/^\/\.well-known\//, /^\/api\//, ...PRERENDERED_NAVIGATIONS],
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
}))
