import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/ALMACEN/' : '/',
  build: {
    chunkSizeWarningLimit: 5000,
    assetsDir: 'assets',
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Configuración mejorada para GitHub Pages
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        manualChunks: (id) => {
          // React ecosystem - dividir en chunks más pequeños
          if (id.includes('react-dom')) {
            return 'react-dom';
          }
          if (id.includes('react') && !id.includes('react-dom') && !id.includes('react-router')) {
            return 'react-core';
          }
          if (id.includes('react-router')) {
            return 'react-router';
          }
          
          // Supabase - dividir por funcionalidad
          if (id.includes('@supabase/supabase-js')) {
            return 'supabase-core';
          }
          if (id.includes('@supabase/auth-js')) {
            return 'supabase-auth';
          }
          if (id.includes('@supabase/postgrest-js') || id.includes('@supabase/storage-js')) {
            return 'supabase-api';
          }
          if (id.includes('@supabase/realtime-js')) {
            return 'supabase-realtime';
          }
          
          // GrapesJS - dividir por tamaño
          if (id.includes('grapesjs/dist/grapes.min.js') || id.includes('grapesjs/dist/css')) {
            return 'grapesjs-core';
          }
          if (id.includes('grapesjs') && (id.includes('plugin') || id.includes('preset'))) {
            return 'grapesjs-plugins';
          }
          if (id.includes('grapesjs')) {
            return 'grapesjs-utils';
          }
          
          // Charts - separar librerías grandes
          if (id.includes('chart.js')) {
            return 'chartjs';
          }
          if (id.includes('recharts')) {
            return 'recharts';
          }
          if (id.includes('react-chartjs-2')) {
            return 'react-charts';
          }
          
          // Documents - dividir por tipo
          if (id.includes('jspdf')) {
            return 'pdf-lib';
          }
          if (id.includes('xlsx') || id.includes('papaparse')) {
            return 'excel-lib';
          }
          
          // UI Libraries - dividir Radix UI por grupos
          if (id.includes('@radix-ui/react-dialog') || id.includes('@radix-ui/react-dropdown-menu') || id.includes('@radix-ui/react-alert-dialog')) {
            return 'radix-overlays';
          }
          if (id.includes('@radix-ui/react-select') || id.includes('@radix-ui/react-checkbox') || id.includes('@radix-ui/react-label')) {
            return 'radix-forms';
          }
          if (id.includes('@radix-ui/react-tabs') || id.includes('@radix-ui/react-progress')) {
            return 'radix-navigation';
          }
          if (id.includes('@radix-ui')) {
            return 'radix-core';
          }
          
          // Headless UI
          if (id.includes('@headlessui')) {
            return 'headless-ui';
          }
          
          // Maps
          if (id.includes('leaflet') && !id.includes('react-leaflet')) {
            return 'leaflet';
          }
          if (id.includes('react-leaflet')) {
            return 'react-leaflet';
          }
          
          // Icons
          if (id.includes('lucide-react')) {
            return 'lucide-icons';
          }
          if (id.includes('@heroicons')) {
            return 'hero-icons';
          }
          
          // Forms y validación
          if (id.includes('react-hook-form')) {
            return 'forms';
          }
          if (id.includes('zod')) {
            return 'validation';
          }
          
          // Utilities
          if (id.includes('clsx') || id.includes('class-variance-authority') || id.includes('tailwind-merge')) {
            return 'css-utils';
          }
          if (id.includes('date-fns') || id.includes('dayjs')) {
            return 'date-utils';
          }
          
          // HTTP y networking
          if (id.includes('axios')) {
            return 'http-client';
          }
          if (id.includes('socket.io')) {
            return 'socket';
          }
          
          // Storage
          if (id.includes('idb') || id.includes('localforage')) {
            return 'storage';
          }
          
          // Notifications
          if (id.includes('react-hot-toast') || id.includes('sonner')) {
            return 'notifications';
          }
          
          // Animation
          if (id.includes('framer-motion')) {
            return 'animation';
          }
          
          // Crypto
          if (id.includes('crypto') || id.includes('bcrypt') || id.includes('jsonwebtoken')) {
            return 'crypto';
          }
          
          // PWA
          if (id.includes('workbox')) {
            return 'pwa';
          }
          
          // Vendor catch-all - dividir por tamaño estimado
          if (id.includes('node_modules')) {
            // Librerías grandes conocidas
            if (id.includes('lodash') || id.includes('moment')) {
              return 'utils-heavy';
            }
            return 'vendor-misc';
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
        clientsClaim: true,
        // Configuración específica para GitHub Pages
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/diegoebv\.github\.io\/ALMACEN\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'github-pages-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 días
              }
            }
          }
        ]
      },
      includeAssets: ['favicon.svg', 'icons/*.png', 'icons/*.svg'],
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
  // Configuración específica para GitHub Pages
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        return { js: `/ALMACEN/${filename}` }
      } else {
        return { css: `/ALMACEN/${filename}` }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  }
})
