import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Redirige les appels /api vers le backend local (evite d'avoir besoin de 2 tunnels ngrok separes)
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
    // Necessaire pour accepter les requetes venant d'un domaine ngrok (sinon Vite les bloque par securite)
    allowedHosts: true,
  },
})
