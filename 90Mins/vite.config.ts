/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProvider = env.VITE_API_PROVIDER || 'football-data-org'

  return {
    plugins: [
      react(),
      legacy()
    ],
    server: {
      proxy: {
        '/api': {
          target: apiProvider === 'sportsapipro'
            ? 'https://v1.football.sportsapipro.com'
            : apiProvider === 'bsd'
            ? 'https://sports.bzzoiro.com'
            : 'https://api.football-data.org',
          changeOrigin: true,
          rewrite: (path) => {
            if (apiProvider === 'sportsapipro') {
              return path.replace(/^\/api/, '');
            }
            if (apiProvider === 'bsd') {
              return path.replace(/^\/api/, '/api');
            }
            return path.replace(/^\/api/, '/v4');
          },
          headers: apiProvider === 'sportsapipro'
            ? { 'x-api-key': env.VITE_SPORTSAPIPRO_API_KEY || 'dc2a8076-6e55-4835-bb15-45273ed19411' }
            : apiProvider === 'bsd'
            ? { 'Authorization': `Token ${env.VITE_BSD_API_KEY || 'b9ea6348208716b8e17e081cfc0dde98cd546545'}` }
            : { 'X-Auth-Token': env.VITE_FOOTBALL_API_KEY || '5411a20491c14c02a55b91e88fd8dace' },
        },
        // Proxy for BSD images (requires authentication header)
        '/bsd-img': {
          target: 'https://sports.bzzoiro.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/bsd-img/, '/img'),
          headers: {
            'Authorization': `Token ${env.VITE_BSD_API_KEY || 'b9ea6348208716b8e17e081cfc0dde98cd546545'}`
          },
        },
        // Dedicated proxy for SportsAPIPro API (for hybrid usage)
        '/sportsapipro-api': {
          target: 'https://v1.football.sportsapipro.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/sportsapipro-api/, ''),
          headers: {
            'x-api-key': env.VITE_SPORTSAPIPRO_API_KEY || 'dc2a8076-6e55-4835-bb15-45273ed19411'
          },
        }
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    }
  }
})
