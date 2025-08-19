// Service Worker Registration and Lifecycle Management
// Integrates with existing OfflineManager for seamless offline sync

interface ServiceWorkerStatus {
  isRegistered: boolean;
  isControlling: boolean;
  isWaiting: boolean;
  version?: string;
  error?: string;
}

interface ServiceWorkerMessage {
  type: string;
  data?: any;
}

class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;
  private statusCallbacks: ((status: ServiceWorkerStatus) => void)[] = [];
  private messageCallbacks: ((message: ServiceWorkerMessage) => void)[] = [];
  private isRegistering = false;
  private registrationPromise: Promise<ServiceWorkerRegistration> | null = null;

  private constructor() {
    this.setupMessageListener();
  }

  public static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  // ==================== REGISTRATION ====================
  public async register(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers are not supported in this browser');
    }

    if (this.isRegistering) {
      return this.registrationPromise!;
    }

    if (this.registration) {
      console.log('[SWManager] Service worker already registered');
      return this.registration;
    }

    this.isRegistering = true;
    console.log('[SWManager] Registering service worker...');

    try {
      this.registrationPromise = navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      this.registration = await this.registrationPromise;

      console.log('[SWManager] Service worker registered successfully:', this.registration.scope);

      // Setup event listeners for the registration
      this.setupRegistrationListeners();

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      this.notifyStatusChange();
      return this.registration;

    } catch (error) {
      console.error('[SWManager] Service worker registration failed:', error);
      this.isRegistering = false;
      this.registrationPromise = null;
      this.notifyStatusChange();
      throw error;
    } finally {
      this.isRegistering = false;
    }
  }

  // ==================== UNREGISTRATION ====================
  public async unregister(): Promise<boolean> {
    if (!this.registration) {
      console.log('[SWManager] No service worker to unregister');
      return true;
    }

    try {
      const result = await this.registration.unregister();
      console.log('[SWManager] Service worker unregistered:', result);
      
      this.registration = null;
      this.registrationPromise = null;
      
      // Clear all caches
      await this.clearAllCaches();
      
      this.notifyStatusChange();
      return result;
    } catch (error) {
      console.error('[SWManager] Failed to unregister service worker:', error);
      return false;
    }
  }

  // ==================== LIFECYCLE MANAGEMENT ====================
  private setupRegistrationListeners(): void {
    if (!this.registration) return;

    // Listen for updates
    this.registration.addEventListener('updatefound', () => {
      console.log('[SWManager] Service worker update found');
      const newWorker = this.registration!.installing;

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          console.log('[SWManager] New service worker state:', newWorker.state);
          
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is waiting
            this.notifyStatusChange();
            this.showUpdateNotification();
          }
        });
      }
    });

    // Listen for controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SWManager] Service worker controller changed');
      this.notifyStatusChange();
      
      // Reload the page to ensure all assets are from the new service worker
      if (navigator.serviceWorker.controller) {
        if (process.env.REACT_APP_DISABLE_AUTO_RELOAD === 'true') {
          console.warn('[SWManager] Auto reload disabled by flag');
          return;
        }
        window.location.reload();
      }
    });
  }

  private setupMessageListener(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data;
        console.log('[SWManager] Received message from SW:', type);
        
        // Notify message callbacks
        this.messageCallbacks.forEach(callback => {
          callback({ type, data });
        });

        // Handle specific message types
        switch (type) {
          case 'SW_ACTIVATED':
            console.log('[SWManager] Service worker activated with version:', data.version);
            this.notifyStatusChange();
            break;
          
          case 'SYNC_COMPLETE':
            console.log('[SWManager] Background sync completed:', data);
            break;
          
          case 'AUTO_BACKUP_REQUEST':
            console.log('[SWManager] Auto backup requested');
            break;
        }
      });
    }
  }

  // ==================== UPDATE MANAGEMENT ====================
  public async skipWaiting(): Promise<void> {
    if (this.registration && this.registration.waiting) {
      console.log('[SWManager] Skipping waiting and activating new service worker');
      
      // Send message to waiting service worker to skip waiting
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Wait for controller change
      return new Promise<void>((resolve) => {
        const handleControllerChange = () => {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          resolve();
        };
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      });
    }
  }

  private showUpdateNotification(): void {
    // You can integrate this with your existing notification system
    console.log('[SWManager] New version available - showing update notification');
    
    // Example: Show a toast or modal
    const event = new CustomEvent('sw-update-available', {
      detail: {
        message: 'A new version of the app is available',
        action: () => this.skipWaiting()
      }
    });
    window.dispatchEvent(event);
  }

  // ==================== COMMUNICATION ====================
  public async sendMessage(message: ServiceWorkerMessage): Promise<any> {
    if (!navigator.serviceWorker.controller) {
      throw new Error('No active service worker to send message to');
    }

    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      // Timeout after 10 seconds
      const timeout = setTimeout(() => {
        reject(new Error('Service worker message timeout'));
      }, 10000);

      channel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        resolve(event.data);
      };

      navigator.serviceWorker.controller!.postMessage(message, [channel.port2]);
    });
  }

  public postMessage(message: ServiceWorkerMessage): void {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message);
    } else {
      console.warn('[SWManager] No service worker controller available');
    }
  }

  // ==================== STATUS MANAGEMENT ====================
  public getStatus(): ServiceWorkerStatus {
    const status: ServiceWorkerStatus = {
      isRegistered: !!this.registration,
      isControlling: !!navigator.serviceWorker.controller,
      isWaiting: !!(this.registration?.waiting)
    };

    if (!('serviceWorker' in navigator)) {
      status.error = 'Service workers not supported';
    }

    return status;
  }

  public onStatusChange(callback: (status: ServiceWorkerStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  public onMessage(callback: (message: ServiceWorkerMessage) => void): () => void {
    this.messageCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.messageCallbacks.indexOf(callback);
      if (index > -1) {
        this.messageCallbacks.splice(index, 1);
      }
    };
  }

  private notifyStatusChange(): void {
    const status = this.getStatus();
    this.statusCallbacks.forEach(callback => callback(status));
  }

  // ==================== CACHE MANAGEMENT ====================
  public async getCacheStatus(): Promise<any> {
    try {
      return await this.sendMessage({ type: 'GET_CACHE_STATUS' });
    } catch (error) {
      console.error('[SWManager] Failed to get cache status:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  public async clearAllCaches(): Promise<void> {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[SWManager] All caches cleared from main thread');
      }

      // Also tell service worker to clear its caches
      if (navigator.serviceWorker.controller) {
        await this.sendMessage({ type: 'CLEAR_CACHE' });
      }
    } catch (error) {
      console.error('[SWManager] Failed to clear caches:', error);
    }
  }

  // ==================== BACKGROUND SYNC ====================
  public async registerBackgroundSync(tag: string): Promise<void> {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    if ('sync' in this.registration) {
      try {
        // TypeScript workaround for sync API
        const syncRegistration = this.registration as any;
        await syncRegistration.sync.register(tag);
        console.log('[SWManager] Background sync registered:', tag);
      } catch (error) {
        console.error('[SWManager] Failed to register background sync:', error);
        throw error;
      }
    } else {
      console.warn('[SWManager] Background sync not supported');
    }
  }

  public async triggerSync(): Promise<void> {
    this.postMessage({ type: 'SYNC_OFFLINE_ACTIONS' });
  }

  // ==================== PUSH NOTIFICATIONS ====================
  public async enablePushNotifications(): Promise<PushSubscription | null> {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    if (!('PushManager' in window)) {
      console.warn('[SWManager] Push messaging not supported');
      return null;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.log('[SWManager] Notification permission denied');
        return null;
      }

      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        // Add your VAPID public key here if using push notifications
      });

      console.log('[SWManager] Push subscription created:', subscription);
      return subscription;
    } catch (error) {
      console.error('[SWManager] Failed to create push subscription:', error);
      return null;
    }
  }

  // ==================== UTILITY METHODS ====================
  public isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  public isOnline(): boolean {
    return navigator.onLine;
  }

  public async waitForControlling(): Promise<void> {
    if (navigator.serviceWorker.controller) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const handleControllerChange = () => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          resolve();
        }
      };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    });
  }

  // ==================== ERROR HANDLING ====================
  public async handleError(error: Error): Promise<void> {
    console.error('[SWManager] Error occurred:', error);
    
    // Report error to service worker for logging
    if (navigator.serviceWorker.controller) {
      this.postMessage({
        type: 'CLIENT_ERROR',
        data: {
          message: error.message,
          stack: error.stack,
          timestamp: Date.now()
        }
      });
    }
  }

  // ==================== DEVELOPMENT HELPERS ====================
  public async getDebugInfo(): Promise<any> {
    const status = this.getStatus();
    const cacheStatus = await this.getCacheStatus().catch(() => ({ error: 'Failed to get cache status' }));
    
    return {
      status,
      cacheStatus,
      registration: this.registration ? {
        scope: this.registration.scope,
        active: !!this.registration.active,
        installing: !!this.registration.installing,
        waiting: !!this.registration.waiting
      } : null,
      navigator: {
        onLine: navigator.onLine,
        serviceWorkerSupported: 'serviceWorker' in navigator,
        pushSupported: 'PushManager' in window,
        notificationSupported: 'Notification' in window
      }
    };
  }
}

// Export singleton instance
export const serviceWorkerManager = ServiceWorkerManager.getInstance();
export type { ServiceWorkerStatus, ServiceWorkerMessage };