import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // PWA instalable en Android desde Chrome («Instalar aplicación»). Los iconos salen del logo
    // (src/assets/travelwrap-logo.png), que tiene el dibujo dentro de la zona segura: sirve también como maskable
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'TravelWrap',
        short_name: 'TravelWrap',
        description: 'Gestión de viajes grupales, gastos y tareas',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        // Azul de la cabecera de la app (barra de estado) y crema del fondo del logo (pantalla de carga)
        theme_color: '#1A365D',
        background_color: '#FAF9F3',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
})