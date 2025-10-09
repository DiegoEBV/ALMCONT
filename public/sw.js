// Service Worker avanzado para PWA ALMACEN
const VERSION = '2.0.0';
const CACHE_NAME = `almacen-v${VERSION}`;
const STATIC_CACHE = `almacen-static-v${VERSION}`;
const DYNAMIC_CACHE = `almacen-dynamic-v${VERSION}`;
const RUNTIME_CACHE = `almacen-runtime-v${VERSION}`;

// Configuración de caché
const CACHE_CONFIG = {
  maxEntries: 100,
  maxAgeSeconds: 24 * 60 * 60, // 24 horas
  purgeOnQuotaError: true
};

// Recursos estáticos para cachear
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/favicon.ico'
];

// URLs de API críticas para cachear
const API_CACHE_PATTERNS = [
  { pattern: /\/api\/stock/, strategy: 'NetworkFirst', maxAge: 5 * 60 * 1000 }, // 5 min
  { pattern: /\/api\/materiales/, strategy: 'NetworkFirst', maxAge: 10 * 60 * 1000 }, // 10 min
  { pattern: /\/api\/obras/, strategy: 'NetworkFirst', maxAge: 15 * 60 * 1000 }, // 15 min
  { pattern: /\/api\/usuarios/, strategy: 'NetworkFirst', maxAge: 30 * 60 * 1000 }, // 30 min
  { pattern: /\/api\/reportes/, strategy: 'NetworkOnly' }, // Siempre desde red
  { pattern: /\/api\/auth/, strategy: 'NetworkOnly' } // Siempre desde red
];

// Queue para sincronización background
const BACKGROUND_SYNC_TAG = 'almacen-background-sync';
let syncQueue = [];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Interceptar requests con estrategias avanzadas
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Manejar requests POST/PUT/DELETE para background sync
  if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
    event.respondWith(handleMutatingRequest(request));
    return;
  }
  
  // Solo manejar requests GET para caché
  if (request.method !== 'GET') {
    return;
  }
  
  // Estrategia para recursos estáticos
  if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  
  // Estrategia para APIs según configuración
  const apiConfig = API_CACHE_PATTERNS.find(config => config.pattern.test(url.pathname));
  if (apiConfig) {
    switch (apiConfig.strategy) {
      case 'NetworkFirst':
        event.respondWith(networkFirst(request, DYNAMIC_CACHE, apiConfig.maxAge));
        break;
      case 'NetworkOnly':
        event.respondWith(networkOnly(request));
        break;
      case 'CacheFirst':
        event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
        break;
      default:
        event.respondWith(networkFirst(request, DYNAMIC_CACHE, apiConfig.maxAge));
    }
    return;
  }
  
  // Estrategia por defecto para otros recursos
  if (url.origin === location.origin) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
});

// Estrategia Cache First
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache First failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Estrategia Network First con TTL
async function networkFirst(request, cacheName, maxAge = CACHE_CONFIG.maxAgeSeconds * 1000) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const responseToCache = networkResponse.clone();
      
      // Agregar timestamp para TTL
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-timestamp', Date.now().toString());
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(request, modifiedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Verificar TTL
      const cacheTimestamp = cachedResponse.headers.get('sw-cache-timestamp');
      if (cacheTimestamp && (Date.now() - parseInt(cacheTimestamp)) < maxAge) {
        return cachedResponse;
      } else if (!cacheTimestamp) {
        // Respuesta sin timestamp, asumir válida
        return cachedResponse;
      }
    }
    
    return new Response(
      JSON.stringify({ error: 'Offline - No cached data available' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Estrategia Network Only
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Network unavailable' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Manejar requests mutantes con background sync
async function handleMutatingRequest(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Si falla, agregar a la cola de sincronización
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' ? await request.text() : null,
      timestamp: Date.now()
    };
    
    syncQueue.push(requestData);
    
    // Registrar background sync si está disponible
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        await self.registration.sync.register(BACKGROUND_SYNC_TAG);
      } catch (syncError) {
        console.log('Background sync registration failed:', syncError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Request queued for background sync',
        queued: true 
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Estrategia Stale While Revalidate
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);
  
  return cachedResponse || fetchPromise;
}

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === BACKGROUND_SYNC_TAG) {
    event.waitUntil(processSyncQueue());
  }
});

// Procesar cola de sincronización
async function processSyncQueue() {
  const failedRequests = [];
  
  for (const requestData of syncQueue) {
    try {
      const response = await fetch(requestData.url, {
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.body
      });
      
      if (!response.ok) {
        failedRequests.push(requestData);
      }
    } catch (error) {
      console.log('Background sync failed for:', requestData.url, error);
      failedRequests.push(requestData);
    }
  }
  
  // Mantener solo las requests que fallaron
  syncQueue = failedRequests;
}

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    getCacheStatus().then((status) => {
      event.ports[0].postMessage(status);
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearCache().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
  
  if (event.data && event.data.type === 'GET_SYNC_QUEUE') {
    event.ports[0].postMessage({ 
      queue: syncQueue,
      count: syncQueue.length 
    });
  }
  
  if (event.data && event.data.type === 'FORCE_SYNC') {
    processSyncQueue().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// Obtener estado del caché
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = keys.length;
  }
  
  return status;
}

// Limpiar caché
async function clearCache() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const action = event.action;
  
  // Manejar diferentes acciones
  if (action === 'view') {
    // Abrir la aplicación
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  } else if (action === 'close') {
    // Solo cerrar la notificación (ya se hizo arriba)
    return;
  } else {
    // Acción por defecto: abrir la aplicación
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Manejar notificaciones push
self.addEventListener('push', (event) => {
  console.log('Push message received:', event);
  
  let notificationData = {
    title: 'ALMACEN',
    body: 'Nueva notificación',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'default-notification',
    data: {}
  };
  
  if (event.data) {
    try {
      notificationData = { ...notificationData, ...event.data.json() };
    } catch (error) {
      console.error('Error parsing push data:', error);
      notificationData.body = event.data.text();
    }
  }
  
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    data: notificationData.data,
    requireInteraction: notificationData.requireInteraction || false,
    actions: notificationData.actions || [
      {
        action: 'view',
        title: 'Ver App',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/icons/icon-72x72.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});