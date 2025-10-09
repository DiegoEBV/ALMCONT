import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/ALMACEN/' : '/',
  build: {
    chunkSizeWarningLimit: 600, // Aumentar límite a 600 kB para chunks específicos
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core libraries
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          
          // Router
          if (id.includes('react-router')) {
            return 'router';
          }
          
          // Radix UI Components (separado)
          if (id.includes('@radix-ui')) {
            return 'radix-ui';
          }
          
          // Headless UI Components (separado)
          if (id.includes('@headlessui')) {
            return 'headless-ui';
          }
          
          // Toast notifications
          if (id.includes('react-hot-toast') || id.includes('sonner') || id.includes('react-toastify')) {
            return 'toast';
          }
          
          // Icons
          if (id.includes('lucide-react') || id.includes('@heroicons')) {
            return 'icons';
          }
          
          // Charts
          if (id.includes('chart.js') || id.includes('recharts') || id.includes('react-chartjs-2')) {
            return 'charts';
          }
          
          // GrapesJS and related
          if (id.includes('grapesjs')) {
            return 'grapesjs';
          }
          
          // Maps
          if (id.includes('leaflet') || id.includes('react-leaflet')) {
            return 'maps';
          }
          
          // PDF and Excel
          if (id.includes('jspdf') || id.includes('xlsx') || id.includes('papaparse')) {
            return 'documents';
          }
          
          // PWA and Service Worker
          if (id.includes('workbox') || id.includes('vite-plugin-pwa')) {
            return 'pwa';
          }
          
          // Supabase (separado del chunk database)
          if (id.includes('supabase') || id.includes('@supabase')) {
            return 'supabase';
          }
          
          // SQLite y bases de datos locales
          if (id.includes('better-sqlite3') || id.includes('sqlite')) {
            return 'sqlite';
          }
          
          // Storage y IndexedDB
          if (id.includes('idb') || id.includes('localforage') || id.includes('dexie')) {
            return 'storage';
          }
          
          // Forms and Validation (separado)
          if (id.includes('react-hook-form')) {
            return 'forms';
          }
          
          // Validation libraries (separado)
          if (id.includes('zod') || id.includes('yup') || id.includes('joi') || id.includes('express-validator')) {
            return 'validation';
          }
          
          // HTTP clients
          if (id.includes('axios') || id.includes('fetch') || id.includes('ky')) {
            return 'http';
          }
          
          // Animation libraries
          if (id.includes('framer-motion') || id.includes('react-spring') || id.includes('lottie')) {
            return 'animation';
          }
          
          // Crypto libraries
          if (id.includes('crypto') || id.includes('bcrypt') || id.includes('jsonwebtoken')) {
            return 'crypto';
          }
          
          // Date utilities
          if (id.includes('date-fns') || id.includes('moment') || id.includes('dayjs')) {
            return 'date-utils';
          }
          
          // CSS utilities
          if (id.includes('clsx') || id.includes('class-variance-authority') || id.includes('tailwind-merge') || id.includes('classnames')) {
            return 'css-utils';
          }
          
          // Socket.io
          if (id.includes('socket.io')) {
            return 'socket';
          }
          
          // Other vendor libraries (más específico)
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    traeBadgePlugin({
      variant: 'dark',
      position: 'bottom-right',
      prodOnly: true,
      clickable: true,
      clickUrl: 'https://www.trae.ai/solo?showJoin=1',
      autoTheme: true,
      autoThemeTarget: '#root'
    }), 
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15 MB
        skipWaiting: true,
        clientsClaim: true
      },
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Sistema ALMACEN',
        short_name: 'ALMACEN',
        description: 'Sistema de gestión de almacén para obras de construcción',
        theme_color: '#3B82F6',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: process.env.NODE_ENV === 'production' ? '/ALMACEN/' : '/',
        start_url: process.env.NODE_ENV === 'production' ? '/ALMACEN/' : '/',
        categories: ['business', 'productivity'],
        lang: 'es-ES',
        icons: [
          {
            src: 'icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: 'icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: 'icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png'
          },
          {
            src: 'icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png'
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-192x192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'icons/icon-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  }
})
