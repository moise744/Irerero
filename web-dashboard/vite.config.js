import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // true = listen on 0.0.0.0 so other devices on Wi‑Fi (e.g. your phone) can open http://<PC-ip>:3000
    host: true,
    port: 3000,
    strictPort: false,
    open: false,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/ws':  { target: 'ws://localhost:8000',  ws: true }
    }
  }
})
