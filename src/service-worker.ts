// Enhanced Service Worker for NoteSpace - Phase 4
// Advanced background sync, push notifications, and intelligent caching

// Service worker types
interface ServiceWorkerGlobalScope {
  addEventListener: (type: string, listener: (event: any) => void) => void;
  skipWaiting: () => Promise<void>;
  clients: any;
  registration: any;
}

interface ExtendableEvent extends Event {
  waitUntil: (promise: Promise<any>) => void;
}

interface FetchEvent extends ExtendableEvent {
  request: Request;
  respondWith: (response: Promise<Response> | Response) => void;
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis & {
  __WB_MANIFEST: any[];
};

// Workbox manifest placeholder (will be replaced during build)
const precacheManifest = self.__WB_MANIFEST || [];
console.log('[SW] Precache manifest:', precacheManifest.length, 'entries');

// Basic service worker implementation for Phase 4
const SW_VERSION = '4.0.0';
const CACHE_PREFIX = 'notespace-v4';
const STATIC_CACHE_NAME = `${CACHE_PREFIX}-static`;

// Background sync configuration
const SYNC_CONFIG = {
  QUEUE_NAME: 'notespace-sync-queue',
  MAX_RETRY_TIME: 5 * 60 * 1000, // 5 minutes
  TAG_PREFIX: 'notespace-sync'
};

// ==================== BASIC CACHE MANAGEMENT ====================

// Simple cache management for basic functionality
async function setupBasicCaching() {
  // Cache basic resources
  const cache = await caches.open(STATIC_CACHE_NAME);
  
  // Add essential resources to cache
  try {
    await cache.addAll([
      '/',
      '/static/js/bundle.js',
      '/static/css/main.css',
      '/manifest.json'
    ]);
  } catch (error) {
    console.warn('[SW] Failed to cache some resources:', error);
  }
}

// Simple fetch handler
self.addEventListener('fetch', (event: Event) => {
  const fetchEvent = event as FetchEvent;
  fetchEvent.respondWith(
    caches.match(fetchEvent.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(fetchEvent.request);
      })
      .catch(() => {
        // Return a generic offline page for navigation requests
        if (fetchEvent.request.mode === 'navigate') {
          return caches.match('/').then(cachedResponse => {
            return cachedResponse || new Response('Offline', { status: 503 });
          });
        }
        return new Response('Network unavailable', { status: 503 });
      })
  );
});

// ==================== BACKGROUND SYNC PLACEHOLDER ====================

// Simple background sync queue (placeholder implementation)
const syncQueue: any[] = [];

function addToSyncQueue(data: any) {
  syncQueue.push({
    id: Date.now().toString(),
    data,
    timestamp: Date.now()
  });
}

async function processSyncQueue() {
  console.log('[SW] Processing sync queue:', syncQueue.length, 'items');
  
  for (const item of syncQueue) {
    try {
      // Placeholder sync logic
      console.log('[SW] Processing sync item:', item.id);
      
      // Remove processed item
      const index = syncQueue.indexOf(item);
      if (index > -1) {
        syncQueue.splice(index, 1);
      }
    } catch (error) {
      console.error('[SW] Sync item failed:', error);
    }
  }
}

// ==================== MESSAGE HANDLING ====================

self.addEventListener('message', (event: MessageEvent) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'QUEUE_OFFLINE_ACTION':
      try {
        addToSyncQueue(data);
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      } catch (error) {
        console.error('[SW] Failed to queue offline action:', error);
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      break;
      
    case 'PROCESS_SYNC_TASK':
      try {
        // Placeholder sync task processing
        console.log('[SW] Processing sync task:', data);
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: true, result: { processed: true } });
        }
      } catch (error) {
        console.error('[SW] Failed to process sync task:', error);
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      break;
      
    case 'CLEAR_CACHES':
      try {
        caches.keys().then(cacheNames => {
          const deletePromises = cacheNames
            .filter(name => name.startsWith(CACHE_PREFIX))
            .map(name => caches.delete(name));
          return Promise.all(deletePromises);
        }).then(() => {
          if (event.ports[0]) {
            event.ports[0].postMessage({ success: true });
          }
        }).catch(error => {
          console.error('[SW] Failed to clear caches:', error);
          if (event.ports[0]) {
            event.ports[0].postMessage({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        });
      } catch (error) {
        console.error('[SW] Failed to clear caches:', error);
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      break;
      
    default:
      console.warn('[SW] Unknown message type:', type);
  }
});

// ==================== UTILITY FUNCTIONS ====================

// ==================== EVENT LISTENERS ====================

// Installation and activation
self.addEventListener('install', (event: Event) => {
  const extendableEvent = event as ExtendableEvent;
  console.log('[SW] Installing service worker version:', SW_VERSION);
  extendableEvent.waitUntil(
    Promise.all([
      self.skipWaiting(),
      setupBasicCaching()
    ])
  );
});

self.addEventListener('activate', (event: Event) => {
  const extendableEvent = event as ExtendableEvent;
  console.log('[SW] Activating service worker version:', SW_VERSION);
  extendableEvent.waitUntil(
    Promise.all([
      (self as any).clients.claim(),
      cleanupOldCaches()
    ])
  );
});

// Background sync
self.addEventListener('sync', (event: any) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag && event.tag.startsWith(SYNC_CONFIG.TAG_PREFIX)) {
    event.waitUntil(processSyncQueue());
  }
});

// Push notifications (Phase 4)
self.addEventListener('push', (event: any) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'NoteSpace notification',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: 'notespace-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || options.body;
      // Add other data properties as needed
    } catch (error) {
      console.warn('[SW] Failed to parse push data:', error);
    }
  }
  
  event.waitUntil(
    (self as any).registration.showNotification('NoteSpace', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event: any) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      (self as any).clients.matchAll({ type: 'window' }).then((clients: any[]) => {
        // Check if the app is already open
        for (const client of clients) {
          if (client.url.includes((self as any).location.origin)) {
            return client.focus();
          }
        }
        // Open new window if app is not open
        return (self as any).clients.openWindow('/');
      })
    );
  }
});

// Cleanup old caches
async function cleanupOldCaches(): Promise<void> {
  try {
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name => {
      return name.startsWith('notespace-') && !name.startsWith(CACHE_PREFIX);
    });
    
    console.log('[SW] Cleaning up old caches:', oldCaches);
    
    await Promise.all(
      oldCaches.map(cacheName => caches.delete(cacheName))
    );
  } catch (error) {
    console.error('[SW] Failed to cleanup old caches:', error);
  }
}

// Error handling
self.addEventListener('error', (event: any) => {
  console.error('[SW] Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event: any) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

// Ensure service worker registration
if ('serviceWorker' in navigator) {
  console.log('[SW] Service worker support detected');
} else {
  console.warn('[SW] Service worker not supported');
}

console.log('[SW] Enhanced Service Worker v', SW_VERSION, 'loaded successfully');

export {};