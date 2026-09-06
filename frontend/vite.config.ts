import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      // In dev the FastAPI proxy is reachable at /api without CORS friction.
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  build: { chunkSizeWarningLimit: 1200 },
})
