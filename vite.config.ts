import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/morc/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Mind Orchestrator',
        short_name: 'MOrchestrator',
        description: '考えを自由に配置できる、オフライン対応マインドマップ',
        lang: 'ja',
        theme_color: '#193b36',
        background_color: '#f4f1e8',
        display: 'standalone',
        scope: '/morc/',
        start_url: '/morc/',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/morc/index.html',
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [],
      },
    }),
  ],
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', css: true },
})
