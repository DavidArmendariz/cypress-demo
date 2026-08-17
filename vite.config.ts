import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_PORT = process.env.API_PORT ?? '3001'

export default defineConfig({
  plugins: [react()],
  server: {
    // Deliberately not Vite's default 5173: that port is often already taken
    // by another dev server or a container port-forward, and a half-bound port
    // produces ECONNRESET failures in Cypress that look like app bugs.
    port: Number(process.env.WEB_PORT ?? 5180),
    strictPort: true,
    // Everything under /api is proxied to the Express server. This keeps the
    // browser on a single origin, which means cy.request() resolves against
    // baseUrl and the auth cookie is same-origin in tests and in the browser.
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: false,
      },
    },
  },
})
