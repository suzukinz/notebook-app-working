// Enhanced Service Worker for NoteSpace - Phase 4
// Advanced background sync, push notifications, and intelligent caching

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { BackgroundSync } from 'workbox-background-sync';

// ==================== TYPES ====================

interface OfflineAction {
  id: string;
  action: 'create' | 'update' | 'delete';
  entityType: 'note' | 'workspace' | 'setting' | 'attachment';
  entityId: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  priority: 'high' | 'normal' | 'low';
  maxRetries: number;
}

interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  currentAction?: string;
}

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// ==================== CONFIGURATION ====================

const CACHE_VERSION = '2.1.0';
const APP_NAME = 'notespace';
const DEBUG = process.env.NODE_ENV === 'development';

// Cache names
const STATIC_CACHE = `${APP_NAME}-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `${APP_NAME}-dynamic-v${CACHE_VERSION}`;
const IMAGES_CACHE = `${APP_NAME}-images-v${CACHE_VERSION}`;
const API_CACHE = `${APP_NAME}-api-v${CACHE_VERSION}`;

// Background sync tags
const SYNC_TAGS = {
  OFFLINE_ACTIONS: 'offline-actions-sync',
  PERIODIC_BACKUP: 'periodic-backup',
  DATA_REFRESH: 'data-refresh',
  PUSH_SUBSCRIPTION: 'push-subscription-sync'
};

// Retry configurations
const RETRY_CONFIG = {
  maxRetryDelay: 5 * 60 * 1000, // 5 minutes
  initialRetryDelay: 1000, // 1 second
  backoffFactor: 2,
  maxRetries: 5
};

// ==================== UTILITY FUNCTIONS ====================

const log = (...args: any[]) => {
  // ServiceWorkerのログを無効化（デバッグ時のみコメントアウト）
  // if (DEBUG) {
  //   console.log('[Enhanced SW]', ...args);
  // }
};

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// ==================== BACKGROUND SYNC SETUP ====================

// Background sync for offline actions
const offlineActionsSync = new BackgroundSync(SYNC_TAGS.OFFLINE_ACTIONS, {
  maxRetentionTime: 24 * 60, // 24 hours in minutes
});

// Background sync for periodic backup
const periodicBackupSync = new BackgroundSync(SYNC_TAGS.PERIODIC_BACKUP, {
  maxRetentionTime: 7 * 24 * 60, // 7 days in minutes
});

// ==================== INSTALLATION & ACTIVATION ====================

self.addEventListener('install', (event: ExtendableEvent) => {
  log('Installing enhanced service worker...');
  
  event.waitUntil(
    Promise.all([
      // Precache static assets
      self.skipWaiting(),
      
      // Initialize offline queue
      initializeOfflineQueue(),
      
      // Setup periodic sync if supported
      setupPeriodicSync()
    ])
  );
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  log('Activating enhanced service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      cleanupOutdatedCaches(),
      cleanupOldCaches(),
      
      // Take control of all clients
      self.clients.claim(),
      
      // Initialize background sync
      initializeBackgroundSync(),
      
      // Register for push notifications if supported
      setupPushNotifications()
    ]).then(() => {
      log('Enhanced service worker activated successfully');
      notifyClients('SW_ACTIVATED', { version: CACHE_VERSION });
    })
  );
});

// ==================== CACHING STRATEGIES ====================

// Precache static assets (handled by workbox)
if (typeof self.__WB_MANIFEST !== 'undefined') {
  precacheAndRoute(self.__WB_MANIFEST);
}

// Strategy 1: Cache First for static assets
registerRoute(
  ({ request }) => isStaticAsset(request),
  new CacheFirst({
    cacheName: STATIC_CACHE,
    plugins: [{
      cacheKeyWillBeUsed: async ({ request }) => {
        return `${request.url}?v=${CACHE_VERSION}`;
      }
    }]
  })
);

// Strategy 2: Stale While Revalidate for images
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: IMAGES_CACHE,
    plugins: [{
      cacheWillUpdate: async ({ response }) => {
        return response.status === 200 ? response : null;
      }
    }]
  })
);

// Strategy 3: Network First for API calls with fallback
registerRoute(
  ({ url }) => isApiRequest(url),
  new NetworkFirst({
    cacheName: API_CACHE,
    networkTimeoutSeconds: 10,
    plugins: [{
      cacheWillUpdate: async ({ response }) => {
        return response.status === 200 ? response : null;
      },
      requestWillFetch: async ({ request }) => {
        // Add retry logic for API requests
        return addRetryLogic(request);
      }
    }]
  })
);

// ==================== BACKGROUND SYNC HANDLERS ====================

self.addEventListener('sync', (event: SyncEvent) => {
  log('Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case SYNC_TAGS.OFFLINE_ACTIONS:
      event.waitUntil(handleOfflineActionsSync());
      break;
      
    case SYNC_TAGS.PERIODIC_BACKUP:
      event.waitUntil(handlePeriodicBackup());
      break;
      
    case SYNC_TAGS.DATA_REFRESH:
      event.waitUntil(handleDataRefresh());
      break;
      
    case SYNC_TAGS.PUSH_SUBSCRIPTION:
      event.waitUntil(handlePushSubscriptionSync());
      break;
      
    default:
      log('Unknown sync tag:', event.tag);
  }
});

async function handleOfflineActionsSync(): Promise<void> {
  try {
    log('Starting offline actions sync...');
    
    const offlineActions = await getOfflineActions();
    if (offlineActions.length === 0) {
      log('No offline actions to sync');
      return;
    }
    
    const progress: SyncProgress = {
      total: offlineActions.length,
      completed: 0,
      failed: 0
    };
    
    notifyClients('SYNC_STARTED', progress);
    
    // Sort by priority and timestamp
    const sortedActions = offlineActions.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.timestamp - b.timestamp;
    });
    
    // Process actions with exponential backoff
    for (const action of sortedActions) {
      try {
        progress.currentAction = `${action.action} ${action.entityType}`;
        notifyClients('SYNC_PROGRESS', progress);
        
        const success = await syncSingleAction(action);
        if (success) {
          await removeOfflineAction(action.id);
          progress.completed++;
        } else {
          progress.failed++;
          await incrementRetryCount(action.id);
        }
      } catch (error) {
        log('Failed to sync action:', action.id, error);
        progress.failed++;
        await incrementRetryCount(action.id);
      }
    }
    
    notifyClients('SYNC_COMPLETED', progress);
    log(`Offline sync completed: ${progress.completed}/${progress.total} successful`);
    
  } catch (error) {
    log('Offline actions sync failed:', error);
    notifyClients('SYNC_ERROR', { error: error.message });
  }
}

async function handlePeriodicBackup(): Promise<void> {
  try {
    log('Starting periodic backup...');
    
    // Request backup data from clients
    const backupData = await requestBackupFromClients();
    
    if (backupData) {
      await saveBackupToStorage(backupData);
      log('Periodic backup completed successfully');
    }
    
  } catch (error) {
    log('Periodic backup failed:', error);
  }
}

async function handleDataRefresh(): Promise<void> {
  try {
    log('Starting data refresh...');
    
    // Clear API cache to force fresh data
    const cache = await caches.open(API_CACHE);
    await cache.delete('/api/notes');
    await cache.delete('/api/workspaces');
    
    notifyClients('DATA_REFRESH_COMPLETED', { timestamp: Date.now() });
    
  } catch (error) {
    log('Data refresh failed:', error);
  }
}

// ==================== PUSH NOTIFICATIONS ====================

self.addEventListener('push', (event: PushEvent) => {
  log('Push notification received');
  
  let notificationData;
  try {
    notificationData = event.data ? event.data.json() : {};
  } catch (error) {
    notificationData = { title: 'NoteSpace', body: 'New update available' };
  }
  
  const {
    title = 'NoteSpace',
    body = 'You have a new notification',
    icon = '/icon-192x192.svg',
    badge = '/icon-72x72.svg',
    tag = 'default',
    data = {},
    actions = []
  } = notificationData;
  
  const notificationOptions = {
    body,
    icon,
    badge,
    tag,
    data,
    actions,
    requireInteraction: data.priority === 'high',
    silent: data.priority === 'low'
  };
  
  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  log('Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  const { action, data } = event;
  const url = data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Try to focus existing window
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
  
  // Handle notification actions
  if (action) {
    handleNotificationAction(action, data);
  }
});

// ==================== MESSAGE HANDLING ====================

self.addEventListener('message', async (event: ExtendableMessageEvent) => {
  const { type, data } = event.data;
  log('Received message:', type);
  
  try {
    switch (type) {
      case 'QUEUE_OFFLINE_ACTION':
        await queueOfflineAction(data);
        event.ports[0]?.postMessage({ success: true });
        break;
        
      case 'FORCE_SYNC':
        await triggerBackgroundSync(SYNC_TAGS.OFFLINE_ACTIONS);
        event.ports[0]?.postMessage({ success: true });
        break;
        
      case 'REQUEST_BACKUP':
        await triggerBackgroundSync(SYNC_TAGS.PERIODIC_BACKUP);
        event.ports[0]?.postMessage({ success: true });
        break;
        
      case 'REFRESH_DATA':
        await triggerBackgroundSync(SYNC_TAGS.DATA_REFRESH);
        event.ports[0]?.postMessage({ success: true });
        break;
        
      case 'GET_SYNC_STATUS':
        const status = await getSyncStatus();
        event.ports[0]?.postMessage(status);
        break;
        
      case 'SUBSCRIBE_PUSH':
        await subscribeToPush(data);
        event.ports[0]?.postMessage({ success: true });
        break;
        
      case 'CLEAR_CACHES':
        await clearAllCaches();
        event.ports[0]?.postMessage({ success: true });
        break;
        
      default:
        log('Unknown message type:', type);
        event.ports[0]?.postMessage({ error: 'Unknown message type' });
    }
  } catch (error) {
    log('Message handler error:', error);
    event.ports[0]?.postMessage({ error: error.message });
  }
});

// ==================== OFFLINE QUEUE MANAGEMENT ====================

async function initializeOfflineQueue(): Promise<void> {
  try {
    const db = await openDatabase();
    // Queue is initialized in IndexedDB by the main app
    log('Offline queue initialized');
  } catch (error) {
    log('Failed to initialize offline queue:', error);
  }
}

async function queueOfflineAction(actionData: Partial<OfflineAction>): Promise<void> {
  const action: OfflineAction = {
    id: generateId(),
    timestamp: Date.now(),
    retryCount: 0,
    priority: 'normal',
    maxRetries: RETRY_CONFIG.maxRetries,
    ...actionData
  } as OfflineAction;
  
  const db = await openDatabase();
  const transaction = db.transaction(['offline_queue'], 'readwrite');
  const store = transaction.objectStore('offline_queue');
  
  await new Promise((resolve, reject) => {
    const request = store.add(action);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
  // Schedule background sync
  if ('serviceWorker' in self && 'sync' in self.ServiceWorkerRegistration.prototype) {
    await self.registration.sync.register(SYNC_TAGS.OFFLINE_ACTIONS);
  }
  
  log('Offline action queued:', action.id);
}

async function getOfflineActions(): Promise<OfflineAction[]> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(['offline_queue'], 'readonly');
    const store = transaction.objectStore('offline_queue');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    log('Failed to get offline actions:', error);
    return [];
  }
}

async function removeOfflineAction(actionId: string): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(['offline_queue'], 'readwrite');
  const store = transaction.objectStore('offline_queue');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(actionId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function incrementRetryCount(actionId: string): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(['offline_queue'], 'readwrite');
  const store = transaction.objectStore('offline_queue');
  
  const getRequest = store.get(actionId);
  getRequest.onsuccess = () => {
    const action = getRequest.result;
    if (action) {
      action.retryCount++;
      
      // Remove if max retries exceeded
      if (action.retryCount >= action.maxRetries) {
        store.delete(actionId);
        log('Action exceeded max retries, removing:', actionId);
      } else {
        store.put(action);
      }
    }
  };
}

// ==================== SYNC OPERATIONS ====================

async function syncSingleAction(action: OfflineAction): Promise<boolean> {
  try {
    // Apply exponential backoff
    if (action.retryCount > 0) {
      const delay = Math.min(
        RETRY_CONFIG.initialRetryDelay * Math.pow(RETRY_CONFIG.backoffFactor, action.retryCount - 1),
        RETRY_CONFIG.maxRetryDelay
      );
      await wait(delay);
    }
    
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(action)
    });
    
    if (response.ok) {
      log('Action synced successfully:', action.id);
      return true;
    } else {
      log('Action sync failed:', action.id, response.status);
      return false;
    }
  } catch (error) {
    log('Action sync error:', action.id, error);
    return false;
  }
}

async function triggerBackgroundSync(tag: string): Promise<void> {
  if ('serviceWorker' in self && 'sync' in self.ServiceWorkerRegistration.prototype) {
    await self.registration.sync.register(tag);
    log('Background sync registered:', tag);
  } else {
    log('Background sync not supported');
  }
}

// ==================== HELPER FUNCTIONS ====================

function isStaticAsset(request: Request): boolean {
  const url = new URL(request.url);
  return url.pathname.includes('/static/') || 
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.svg') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.ico');
}

function isApiRequest(url: URL): boolean {
  return url.pathname.startsWith('/api/');
}

async function addRetryLogic(request: Request): Promise<Request> {
  // Add retry headers if needed
  const headers = new Headers(request.headers);
  headers.set('X-SW-Retry', 'true');
  
  return new Request(request.url, {
    method: request.method,
    headers,
    body: request.body,
    mode: request.mode,
    credentials: request.credentials,
    cache: request.cache,
    redirect: request.redirect,
    referrer: request.referrer
  });
}

async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('NoteSpaceDB', 5);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('offline_queue')) {
        db.createObjectStore('offline_queue', { keyPath: 'id' });
      }
    };
  });
}

async function notifyClients(type: string, data?: any): Promise<void> {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type, data });
  });
}

async function getSyncStatus(): Promise<any> {
  const offlineActions = await getOfflineActions();
  
  return {
    queueSize: offlineActions.length,
    pendingActions: offlineActions.filter(a => a.retryCount === 0).length,
    retryingActions: offlineActions.filter(a => a.retryCount > 0).length,
    lastSync: await getLastSyncTime(),
    isOnline: navigator.onLine
  };
}

async function getLastSyncTime(): Promise<string | null> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(['sync_state'], 'readonly');
    const store = transaction.objectStore('sync_state');
    
    return new Promise((resolve) => {
      const request = store.get('lastSyncTime');
      request.onsuccess = () => {
        resolve(request.result?.value || null);
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// ==================== PUSH NOTIFICATION HELPERS ====================

async function setupPushNotifications(): Promise<void> {
  if ('PushManager' in self) {
    log('Push notifications supported');
  } else {
    log('Push notifications not supported');
  }
}

async function subscribeToPush(subscriptionData: PushSubscriptionData): Promise<void> {
  // Store subscription data for sync
  const db = await openDatabase();
  const transaction = db.transaction(['sync_state'], 'readwrite');
  const store = transaction.objectStore('sync_state');
  
  return new Promise((resolve, reject) => {
    const request = store.put({
      key: 'pushSubscription',
      value: subscriptionData,
      timestamp: Date.now()
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function handleNotificationAction(action: string, data: any): Promise<void> {
  log('Handling notification action:', action, data);
  
  switch (action) {
    case 'sync':
      await triggerBackgroundSync(SYNC_TAGS.OFFLINE_ACTIONS);
      break;
    case 'backup':
      await triggerBackgroundSync(SYNC_TAGS.PERIODIC_BACKUP);
      break;
    default:
      log('Unknown notification action:', action);
  }
}

async function handlePushSubscriptionSync(): Promise<void> {
  try {
    log('Syncing push subscription...');
    
    const db = await openDatabase();
    const transaction = db.transaction(['sync_state'], 'readonly');
    const store = transaction.objectStore('sync_state');
    
    const request = store.get('pushSubscription');
    request.onsuccess = async () => {
      const subscription = request.result?.value;
      if (subscription) {
        // Send subscription to server
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
        log('Push subscription synced');
      }
    };
  } catch (error) {
    log('Push subscription sync failed:', error);
  }
}

// ==================== PERIODIC SYNC ====================

async function setupPeriodicSync(): Promise<void> {
  if ('periodicSync' in self.registration) {
    try {
      await (self.registration as any).periodicSync.register('backup', {
        minInterval: 24 * 60 * 60 * 1000, // 24 hours
      });
      log('Periodic sync registered');
    } catch (error) {
      log('Periodic sync registration failed:', error);
    }
  } else {
    log('Periodic sync not supported');
  }
}

// ==================== CACHE MANAGEMENT ====================

async function cleanupOldCaches(): Promise<void> {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => 
    name.startsWith(APP_NAME) && !name.includes(CACHE_VERSION)
  );
  
  await Promise.all(oldCaches.map(cacheName => caches.delete(cacheName)));
  log('Old caches cleaned up:', oldCaches.length);
}

async function clearAllCaches(): Promise<void> {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  log('All caches cleared');
}

// ==================== BACKUP MANAGEMENT ====================

async function requestBackupFromClients(): Promise<any> {
  const clients = await self.clients.matchAll();
  
  if (clients.length === 0) {
    return null;
  }
  
  // Request backup from the first available client
  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };
    
    clients[0].postMessage({
      type: 'REQUEST_BACKUP_DATA'
    }, [messageChannel.port2]);
    
    // Timeout after 30 seconds
    setTimeout(() => resolve(null), 30000);
  });
}

async function saveBackupToStorage(backupData: any): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(['sync_state'], 'readwrite');
  const store = transaction.objectStore('sync_state');
  
  return new Promise((resolve, reject) => {
    const request = store.put({
      key: 'autoBackup',
      value: {
        data: backupData,
        timestamp: Date.now()
      }
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ==================== ERROR HANDLING ====================

self.addEventListener('error', (event: ErrorEvent) => {
  log('Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  log('Unhandled promise rejection:', event.reason);
});

// Initialize
log('Enhanced Service Worker loaded successfully');