import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/generate_reply': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/send_reply': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/login': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/logout': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/oauth2callback': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
