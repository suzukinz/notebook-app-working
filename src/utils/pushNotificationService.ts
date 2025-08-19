// Push Notification Service for NoteSpace - Phase 4
// Manages push subscription, notification display, and action handling

import { indexedDBManager } from './indexedDBManager';

// ==================== TYPES ====================

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  vibrate?: number[];
  renotify?: boolean;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  syncUpdates: boolean;
  conflictAlerts: boolean;
  backupReminders: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  priority: 'all' | 'important' | 'critical';
}

export interface PushMetrics {
  totalSent: number;
  totalReceived: number;
  totalClicked: number;
  totalDismissed: number;
  clickRate: number;
  lastNotificationTime: number;
  subscriptionUpdatedAt: number;
}

// ==================== CONFIGURATION ====================

const NOTIFICATION_CONFIG = {
  VAPID_PUBLIC_KEY: 'your-vapid-public-key', // Replace with actual VAPID key
  DEFAULT_ICON: '/icon-192x192.svg',
  DEFAULT_BADGE: '/icon-72x72.svg',
  MAX_PENDING_NOTIFICATIONS: 10,
  NOTIFICATION_TTL: 24 * 60 * 60 * 1000, // 24 hours
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5000, // 5 seconds
};

const NOTIFICATION_TYPES = {
  SYNC_COMPLETE: 'sync-complete',
  SYNC_ERROR: 'sync-error',
  CONFLICT_DETECTED: 'conflict-detected',
  BACKUP_REMINDER: 'backup-reminder',
  UPDATE_AVAILABLE: 'update-available',
  STORAGE_WARNING: 'storage-warning',
  CUSTOM: 'custom'
};

const DEFAULT_ACTIONS = {
  SYNC: { action: 'sync', title: 'Sync Now', icon: '/icons/sync.svg' },
  VIEW: { action: 'view', title: 'View', icon: '/icons/view.svg' },
  DISMISS: { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.svg' }
};

// ==================== PUSH NOTIFICATION SERVICE ====================

class PushNotificationService {
  private static instance: PushNotificationService;
  private subscription: PushSubscription | null = null;
  private preferences: NotificationPreferences = this.getDefaultPreferences();
  private metrics: PushMetrics = this.getDefaultMetrics();
  private isInitialized: boolean = false;
  private serviceWorkerReady: boolean = false;

  private constructor() {
    // Don't initialize immediately - wait for proper setup
  }

  // ==================== PUBLIC INITIALIZATION ====================

  public async initializeWithDatabase(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('[PushNotification] Starting initialization...');
      
      // Ensure database is fully initialized
      if (!(indexedDBManager as any).db) {
        console.log('[PushNotification] Waiting for database initialization...');
        await indexedDBManager.initialize();
      }
      
      // Wait for database to have all required stores
      await this.waitForRequiredStores();

      // Now safely initialize the service
      await this.initializeService();
      this.isInitialized = true;
      console.log('[PushNotification] Initialized successfully');
    } catch (error) {
      console.error('[PushNotification] Initialization failed:', error);
      // Don't throw to prevent app crashes
    }
  }

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  // ==================== INITIALIZATION ====================

  private async initializeService(): Promise<void> {
    try {
      // Check for service worker support
      if (!('serviceWorker' in navigator)) {
        console.warn('[PushNotification] Service Worker not supported');
        return;
      }

      // Check for push notification support
      if (!('PushManager' in window)) {
        console.warn('[PushNotification] Push notifications not supported');
        return;
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      this.serviceWorkerReady = true;

      // Load preferences and metrics
      await this.loadPreferences();
      await this.loadMetrics();

      // Try to get existing subscription
      await this.loadExistingSubscription();

      this.isInitialized = true;
      console.log('[PushNotification] Service initialized successfully');

    } catch (error) {
      console.error('[PushNotification] Initialization failed:', error);
    }
  }

  // ==================== SUBSCRIPTION MANAGEMENT ====================

  public async requestPermission(): Promise<NotificationPermission> {
    try {
      if (!('Notification' in window)) {
        throw new Error('Notifications not supported');
      }

      const permission = await Notification.requestPermission();
      console.log('[PushNotification] Permission result:', permission);

      if (permission === 'granted') {
        // Automatically subscribe if permission granted
        await this.subscribe();
      }

      return permission;
    } catch (error) {
      console.error('[PushNotification] Permission request failed:', error);
      return 'denied';
    }
  }

  public async subscribe(): Promise<boolean> {
    try {
      if (!this.serviceWorkerReady) {
        throw new Error('Service worker not ready');
      }

      if (Notification.permission !== 'granted') {
        const permission = await this.requestPermission();
        if (permission !== 'granted') {
          return false;
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      this.subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(NOTIFICATION_CONFIG.VAPID_PUBLIC_KEY)
      });

      // Store subscription data
      const subscriptionData: PushSubscriptionData = {
        endpoint: this.subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(this.subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(this.subscription.getKey('auth')!)
        },
        expirationTime: this.subscription.expirationTime
      };

      await this.saveSubscription(subscriptionData);

      // Send subscription to server
      await this.sendSubscriptionToServer(subscriptionData);

      // Update metrics
      this.metrics.subscriptionUpdatedAt = Date.now();
      await this.saveMetrics();

      console.log('[PushNotification] Successfully subscribed to push notifications');
      return true;

    } catch (error) {
      console.error('[PushNotification] Subscription failed:', error);
      return false;
    }
  }

  public async unsubscribe(): Promise<boolean> {
    try {
      if (this.subscription) {
        const success = await this.subscription.unsubscribe();
        
        if (success) {
          this.subscription = null;
          await this.removeSubscription();
          
          // Notify server about unsubscription
          await this.sendUnsubscribeToServer();
          
          console.log('[PushNotification] Successfully unsubscribed');
        }
        
        return success;
      }
      
      return true; // Already unsubscribed
    } catch (error) {
      console.error('[PushNotification] Unsubscription failed:', error);
      return false;
    }
  }

  public async getSubscriptionStatus(): Promise<{
    isSupported: boolean;
    permission: NotificationPermission;
    isSubscribed: boolean;
    subscription?: PushSubscriptionData;
  }> {
    const subscriptionData = this.subscription ? await this.getSubscriptionData() : null;
    return {
      isSupported: 'PushManager' in window && 'serviceWorker' in navigator,
      permission: Notification.permission,
      isSubscribed: !!this.subscription,
      ...(subscriptionData && { subscription: subscriptionData })
    };
  }

  // ==================== NOTIFICATION DISPLAY ====================

  public async showNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      if (!this.isInitialized || !this.preferences.enabled) {
        return false;
      }

      // Check quiet hours
      if (this.isQuietHours()) {
        console.log('[PushNotification] Notification suppressed due to quiet hours');
        return false;
      }

      // Check priority filter
      if (!this.shouldShowNotification(payload)) {
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const options: NotificationOptions = {
        body: payload.body,
        icon: payload.icon || NOTIFICATION_CONFIG.DEFAULT_ICON,
        badge: payload.badge || NOTIFICATION_CONFIG.DEFAULT_BADGE,
        tag: payload.tag || 'default',
        data: {
          ...payload.data,
          timestamp: Date.now(),
          type: payload.data?.type || NOTIFICATION_TYPES.CUSTOM
        },
        actions: payload.actions || [],
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false,
        renotify: payload.renotify || false
      };

      // Add vibration if enabled
      if (this.preferences.vibrationEnabled && payload.vibrate) {
        options.vibrate = payload.vibrate;
      }

      await registration.showNotification(payload.title, options);

      // Update metrics
      this.metrics.totalSent++;
      await this.saveMetrics();

      console.log('[PushNotification] Notification displayed:', payload.title);
      return true;

    } catch (error) {
      console.error('[PushNotification] Failed to show notification:', error);
      return false;
    }
  }

  public async showSyncCompleteNotification(syncStats: any): Promise<boolean> {
    return this.showNotification({
      title: 'Sync Complete',
      body: `Successfully synced ${syncStats.completed} items`,
      tag: 'sync-complete',
      data: { type: NOTIFICATION_TYPES.SYNC_COMPLETE, stats: syncStats },
      actions: [DEFAULT_ACTIONS.VIEW, DEFAULT_ACTIONS.DISMISS]
    });
  }

  public async showSyncErrorNotification(error: string): Promise<boolean> {
    return this.showNotification({
      title: 'Sync Error',
      body: `Sync failed: ${error}`,
      tag: 'sync-error',
      data: { type: NOTIFICATION_TYPES.SYNC_ERROR, error },
      actions: [DEFAULT_ACTIONS.SYNC, DEFAULT_ACTIONS.DISMISS],
      requireInteraction: true
    });
  }

  public async showConflictNotification(conflictInfo: any): Promise<boolean> {
    return this.showNotification({
      title: 'Conflict Detected',
      body: `Conflict in ${conflictInfo.entityType}: ${conflictInfo.entityTitle}`,
      tag: 'conflict-detected',
      data: { type: NOTIFICATION_TYPES.CONFLICT_DETECTED, conflict: conflictInfo },
      actions: [DEFAULT_ACTIONS.VIEW, DEFAULT_ACTIONS.DISMISS],
      requireInteraction: true
    });
  }

  public async showBackupReminderNotification(): Promise<boolean> {
    return this.showNotification({
      title: 'Backup Reminder',
      body: 'It\'s time to backup your notes',
      tag: 'backup-reminder',
      data: { type: NOTIFICATION_TYPES.BACKUP_REMINDER },
      actions: [
        { action: 'backup', title: 'Backup Now', icon: '/icons/backup.svg' },
        DEFAULT_ACTIONS.DISMISS
      ]
    });
  }

  // ==================== PREFERENCES MANAGEMENT ====================

  public async updatePreferences(newPreferences: Partial<NotificationPreferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...newPreferences };
    await this.savePreferences();
    console.log('[PushNotification] Preferences updated:', this.preferences);
  }

  public getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  public async resetPreferences(): Promise<void> {
    this.preferences = this.getDefaultPreferences();
    await this.savePreferences();
  }

  // ==================== METRICS AND ANALYTICS ====================

  public async recordNotificationClick(_notificationData: any): Promise<void> {
    this.metrics.totalClicked++;
    this.metrics.clickRate = this.metrics.totalClicked / this.metrics.totalSent;
    await this.saveMetrics();
    
    console.log('[PushNotification] Notification click recorded');
  }

  public async recordNotificationDismiss(): Promise<void> {
    this.metrics.totalDismissed++;
    await this.saveMetrics();
  }

  public getMetrics(): PushMetrics {
    return { ...this.metrics };
  }

  public async resetMetrics(): Promise<void> {
    this.metrics = this.getDefaultMetrics();
    await this.saveMetrics();
  }

  // ==================== BADGE MANAGEMENT ====================

  public async updateBadgeCount(count: number): Promise<void> {
    try {
      if ('setAppBadge' in navigator) {
        await (navigator as any).setAppBadge(count);
      }
    } catch (error) {
      console.error('[PushNotification] Badge update failed:', error);
    }
  }

  public async clearBadge(): Promise<void> {
    try {
      if ('clearAppBadge' in navigator) {
        await (navigator as any).clearAppBadge();
      }
    } catch (error) {
      console.error('[PushNotification] Badge clear failed:', error);
    }
  }

  // ==================== PRIVATE METHODS ====================

  private getDefaultPreferences(): NotificationPreferences {
    return {
      enabled: true,
      syncUpdates: true,
      conflictAlerts: true,
      backupReminders: true,
      soundEnabled: true,
      vibrationEnabled: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      priority: 'important'
    };
  }

  private getDefaultMetrics(): PushMetrics {
    return {
      totalSent: 0,
      totalReceived: 0,
      totalClicked: 0,
      totalDismissed: 0,
      clickRate: 0,
      lastNotificationTime: 0,
      subscriptionUpdatedAt: 0
    };
  }

  private async loadPreferences(): Promise<void> {
    try {
      if (!this.isInitialized) {
        console.log('[PushNotification] Skipping preference loading - not initialized yet');
        return;
      }
      
      const saved = await indexedDBManager.getSetting('pushNotificationPreferences');
      if (saved) {
        this.preferences = { ...this.getDefaultPreferences(), ...saved };
        console.log('[PushNotification] Loaded preferences:', this.preferences);
      }
    } catch (error) {
      console.error('[PushNotification] Failed to load preferences:', error);
      // Use defaults and continue
    }
  }

  private async savePreferences(): Promise<void> {
    try {
      if (!this.isInitialized) {
        console.log('[PushNotification] Skipping preference saving - not initialized yet');
        return;
      }
      
      await indexedDBManager.setSetting('pushNotificationPreferences', this.preferences);
    } catch (error) {
      console.error('[PushNotification] Failed to save preferences:', error);
      // Don't throw to prevent breaking the service
    }
  }

  private async loadMetrics(): Promise<void> {
    try {
      const saved = await indexedDBManager.getSetting('pushNotificationMetrics');
      if (saved) {
        this.metrics = { ...this.getDefaultMetrics(), ...saved };
      }
    } catch (error) {
      console.error('[PushNotification] Failed to load metrics:', error);
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      await indexedDBManager.setSetting('pushNotificationMetrics', this.metrics);
    } catch (error) {
      console.error('[PushNotification] Failed to save metrics:', error);
    }
  }

  private async loadExistingSubscription(): Promise<void> {
    try {
      if (!this.serviceWorkerReady) return;
      
      const registration = await navigator.serviceWorker.ready;
      this.subscription = await registration.pushManager.getSubscription();
      
      if (this.subscription) {
        console.log('[PushNotification] Existing subscription found');
      }
    } catch (error) {
      console.error('[PushNotification] Failed to load existing subscription:', error);
    }
  }

  private async getSubscriptionData(): Promise<PushSubscriptionData | null> {
    if (!this.subscription) return null;
    
    return {
      endpoint: this.subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(this.subscription.getKey('p256dh')!),
        auth: this.arrayBufferToBase64(this.subscription.getKey('auth')!)
      },
      expirationTime: this.subscription.expirationTime
    };
  }

  private async saveSubscription(data: PushSubscriptionData): Promise<void> {
    try {
      await indexedDBManager.setSetting('pushSubscription', data);
    } catch (error) {
      console.error('[PushNotification] Failed to save subscription:', error);
    }
  }

  private async removeSubscription(): Promise<void> {
    try {
      await indexedDBManager.deleteSetting('pushSubscription');
    } catch (error) {
      console.error('[PushNotification] Failed to remove subscription:', error);
    }
  }

  private async sendSubscriptionToServer(subscriptionData: PushSubscriptionData): Promise<void> {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionData)
      });
      
      if (!response.ok) {
        throw new Error(`Server subscription failed: ${response.status}`);
      }
      
      console.log('[PushNotification] Subscription sent to server');
    } catch (error) {
      console.error('[PushNotification] Failed to send subscription to server:', error);
      // Don't throw - this is not critical for local functionality
    }
  }

  private async sendUnsubscribeToServer(): Promise<void> {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server unsubscribe failed: ${response.status}`);
      }
      
      console.log('[PushNotification] Unsubscription sent to server');
    } catch (error) {
      console.error('[PushNotification] Failed to send unsubscription to server:', error);
    }
  }

  private isQuietHours(): boolean {
    if (!this.preferences.quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const startParts = this.preferences.quietHours.start.split(':').map(Number);
    const endParts = this.preferences.quietHours.end.split(':').map(Number);
    
    const startHour = startParts[0] || 0;
    const startMin = startParts[1] || 0;
    const endHour = endParts[0] || 0;
    const endMin = endParts[1] || 0;
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  private shouldShowNotification(payload: NotificationPayload): boolean {
    const priority = payload.data?.priority || 'normal';
    
    switch (this.preferences.priority) {
      case 'critical':
        return priority === 'critical';
      case 'important':
        return priority === 'critical' || priority === 'important';
      case 'all':
      default:
        return true;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    
    return window.btoa(binary);
  }

  private async waitForRequiredStores(): Promise<void> {
    try {
      // Wait for database to be ready with required stores
      let attempts = 0;
      const maxAttempts = 10;
      const delayMs = 500;
      
      while (attempts < maxAttempts) {
        const db = (indexedDBManager as any).db;
        if (db && db.objectStoreNames.contains('settings')) {
          console.log('[PushNotification] Required stores are available');
          return;
        }
        
        console.log(`[PushNotification] Waiting for required stores... attempt ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        attempts++;
      }
      
      console.warn('[PushNotification] Timeout waiting for required stores, continuing anyway');
    } catch (error) {
      console.error('[PushNotification] Error waiting for required stores:', error);
    }
  }
}

// ==================== EXPORT SINGLETON ====================

export const pushNotificationService = PushNotificationService.getInstance();
export default pushNotificationService;