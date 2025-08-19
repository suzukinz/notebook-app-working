// Enhanced Offline Context - Phase 4
// Advanced offline state management with background sync and push notifications

import React, { createContext, useContext, useCallback, useEffect, useReducer, useRef } from 'react';
import { indexedDBManager } from '../utils/indexedDBManager';
import { serviceWorkerManager } from '../utils/serviceWorkerManager';
// Phase 4 utilities
import { backgroundSyncManager } from '../utils/backgroundSyncManager';
import { pushNotificationService } from '../utils/pushNotificationService';
import { offlineQueueProcessor } from '../utils/offlineQueueProcessor';

// ==================== TYPES ====================

export interface NetworkStatus {
  isOnline: boolean;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export interface SyncStatus {
  isActive: boolean;
  queue: {
    pending: number;
    processing: number;
    failed: number;
  };
  lastSync: string | null;
  nextSync: string | null;
  errors: SyncError[];
}

export interface SyncError {
  id: string;
  type: 'network' | 'conflict' | 'storage' | 'auth';
  message: string;
  timestamp: string;
  entityId?: string;
  entityType?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoRetryCount: number;
  maxRetries: number;
}

export interface ConflictInfo {
  id: string;
  entityType: 'note' | 'workspace' | 'setting';
  entityId: string;
  entityTitle: string;
  localVersion: number;
  remoteVersion: number;
  conflictType: 'concurrent_edit' | 'offline_edit' | 'delete_conflict';
  timestamp: string;
  autoResolvable: boolean;
  confidence: number; // 0-1 for auto-resolution confidence
}

export interface OfflineCapabilities {
  storage: {
    available: number; // bytes
    used: number;
    percentage: number;
  };
  features: {
    backgroundSync: boolean;
    pushNotifications: boolean;
    periodicSync: boolean;
    persistentStorage: boolean;
    workboxEnabled: boolean;
    notificationActions: boolean;
  };
  performance: {
    averageSyncTime: number; // ms
    successRate: number; // 0-1
    lastPerformanceCheck: string;
    queueProcessingTime: number;
    backgroundSyncEnabled: boolean;
  };
  pushNotifications: {
    permission: NotificationPermission;
    isSubscribed: boolean;
    endpoint?: string;
    lastNotificationTime?: number;
  };
}

export interface EnhancedOfflineContextType {
  // Status
  networkStatus: NetworkStatus;
  syncStatus: SyncStatus;
  conflicts: ConflictInfo[];
  capabilities: OfflineCapabilities;
  
  // Actions
  forceSyncNow: () => Promise<void>;
  retryFailedSync: (errorId: string) => Promise<void>;
  resolveConflict: (conflictId: string, resolution: 'local' | 'remote' | 'merge') => Promise<void>;
  dismissError: (errorId: string) => void;
  
  // Background Sync
  registerSyncTask: (task: any) => Promise<string>;
  processOfflineQueue: () => Promise<any>;
  retryAllFailedTasks: () => Promise<void>;
  getSyncQueueStatus: () => Promise<any>;
  
  // Push Notifications
  enablePushNotifications: () => Promise<boolean>;
  disablePushNotifications: () => Promise<boolean>;
  updateNotificationPreferences: (prefs: any) => Promise<void>;
  showTestNotification: () => Promise<void>;
  
  // Configuration
  preferences: {
    autoResolveConflicts: boolean;
    syncFrequency: 'realtime' | 'fast' | 'normal' | 'battery_saver';
    notificationLevel: 'all' | 'errors_only' | 'critical_only' | 'none';
    bandwidthMode: 'auto' | 'wifi_only' | 'unlimited';
    backgroundSyncEnabled: boolean;
    pushNotificationsEnabled: boolean;
  };
  updatePreferences: (preferences: Partial<EnhancedOfflineContextType['preferences']>) => Promise<void>;
  
  // Diagnostics
  getDetailedStatus: () => Promise<any>;
  exportDiagnostics: () => Promise<string>;
  clearOfflineData: () => Promise<void>;
}

// ==================== STATE MANAGEMENT ====================

type OfflineState = {
  networkStatus: NetworkStatus;
  syncStatus: SyncStatus;
  conflicts: ConflictInfo[];
  capabilities: OfflineCapabilities;
  preferences: EnhancedOfflineContextType['preferences'];
};

type OfflineAction = 
  | { type: 'NETWORK_CHANGED'; payload: Partial<NetworkStatus> }
  | { type: 'SYNC_STATUS_UPDATED'; payload: Partial<SyncStatus> }
  | { type: 'CONFLICT_DETECTED'; payload: ConflictInfo }
  | { type: 'CONFLICT_RESOLVED'; payload: string }
  | { type: 'ERROR_ADDED'; payload: SyncError }
  | { type: 'ERROR_DISMISSED'; payload: string }
  | { type: 'CAPABILITIES_UPDATED'; payload: Partial<OfflineCapabilities> }
  | { type: 'PREFERENCES_UPDATED'; payload: Partial<EnhancedOfflineContextType['preferences']> };

const initialState: OfflineState = {
  networkStatus: {
    isOnline: navigator.onLine,
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false
  },
  syncStatus: {
    isActive: false,
    queue: { pending: 0, processing: 0, failed: 0 },
    lastSync: null,
    nextSync: null,
    errors: []
  },
  conflicts: [],
  capabilities: {
    storage: { available: 0, used: 0, percentage: 0 },
    features: {
      backgroundSync: false,
      pushNotifications: false,
      periodicSync: false,
      persistentStorage: false,
      workboxEnabled: false,
      notificationActions: false
    },
    performance: {
      averageSyncTime: 0,
      successRate: 1.0,
      lastPerformanceCheck: new Date().toISOString(),
      queueProcessingTime: 0,
      backgroundSyncEnabled: false
    },
    pushNotifications: {
      permission: 'default',
      isSubscribed: false
    }
  },
  preferences: {
    autoResolveConflicts: true,
    syncFrequency: 'normal',
    notificationLevel: 'errors_only',
    bandwidthMode: 'auto',
    backgroundSyncEnabled: true,
    pushNotificationsEnabled: false
  }
};

function offlineReducer(state: OfflineState, action: OfflineAction): OfflineState {
  switch (action.type) {
    case 'NETWORK_CHANGED':
      return {
        ...state,
        networkStatus: { ...state.networkStatus, ...action.payload }
      };
      
    case 'SYNC_STATUS_UPDATED':
      return {
        ...state,
        syncStatus: { ...state.syncStatus, ...action.payload }
      };
      
    case 'CONFLICT_DETECTED':
      return {
        ...state,
        conflicts: [...state.conflicts, action.payload]
      };
      
    case 'CONFLICT_RESOLVED':
      return {
        ...state,
        conflicts: state.conflicts.filter(c => c.id !== action.payload)
      };
      
    case 'ERROR_ADDED':
      return {
        ...state,
        syncStatus: {
          ...state.syncStatus,
          errors: [...state.syncStatus.errors, action.payload]
        }
      };
      
    case 'ERROR_DISMISSED':
      return {
        ...state,
        syncStatus: {
          ...state.syncStatus,
          errors: state.syncStatus.errors.filter(e => e.id !== action.payload)
        }
      };
      
    case 'CAPABILITIES_UPDATED':
      return {
        ...state,
        capabilities: { ...state.capabilities, ...action.payload }
      };
      
    case 'PREFERENCES_UPDATED':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload }
      };
      
    default:
      return state;
  }
}

// ==================== CONTEXT IMPLEMENTATION ====================

const EnhancedOfflineContext = createContext<EnhancedOfflineContextType | null>(null);

export const useEnhancedOffline = () => {
  const context = useContext(EnhancedOfflineContext);
  if (!context) {
    throw new Error('useEnhancedOffline must be used within EnhancedOfflineProvider');
  }
  return context;
};

// ==================== PROVIDER COMPONENT ====================

interface EnhancedOfflineProviderProps {
  children: React.ReactNode;
  enableDiagnostics?: boolean;
  autoStartMonitoring?: boolean;
}

export const EnhancedOfflineProvider: React.FC<EnhancedOfflineProviderProps> = ({
  children,
  enableDiagnostics = process.env.NODE_ENV === 'development',
  autoStartMonitoring = true
}) => {
  const [state, dispatch] = useReducer(offlineReducer, initialState);
  const intervalRefs = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const networkInfoRef = useRef<any>(null);

  // ==================== INITIALIZATION ====================

  useEffect(() => {
    const initializeServices = async () => {
      try {
        if (enableDiagnostics) {
          console.log('[EnhancedOffline] Initializing database and Phase 4 services...');
        }

        // Initialize database first
        await indexedDBManager.initialize();

        // Then initialize Phase 4 services with database
        await backgroundSyncManager.initializeWithDatabase();
        await offlineQueueProcessor.initializeWithDatabase();
        await pushNotificationService.initializeWithDatabase();

        if (enableDiagnostics) {
          console.log('[EnhancedOffline] All services initialized successfully');
        }
      } catch (error) {
        console.error('[EnhancedOffline] Service initialization failed:', error);
      }
    };

    initializeServices();
  }, [enableDiagnostics]); // Run once on mount, depends on enableDiagnostics

  // ==================== NETWORK MONITORING ====================

  const updateNetworkStatus = useCallback(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    networkInfoRef.current = connection;

    const networkStatus: Partial<NetworkStatus> = {
      isOnline: navigator.onLine,
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false
    };

    dispatch({ type: 'NETWORK_CHANGED', payload: networkStatus });

    if (enableDiagnostics) {
      console.log('[EnhancedOffline] Network status updated:', networkStatus);
    }
  }, [enableDiagnostics]);

  // ==================== SYNC STATUS MONITORING ====================

  const updateSyncStatus = useCallback(async () => {
    try {
      // Ensure DB is initialized before polling
      await indexedDBManager.initialize();
      const queuedChanges = await indexedDBManager.getQueuedChanges();
      
      const syncStatus: Partial<SyncStatus> = {
        queue: {
          pending: queuedChanges.filter(c => c.status === 'queued').length,
          processing: queuedChanges.filter(c => c.status === 'sending').length,
          failed: queuedChanges.filter(c => c.status === 'error').length
        }
      };

      dispatch({ type: 'SYNC_STATUS_UPDATED', payload: syncStatus });

      if (enableDiagnostics && syncStatus.queue) {
        console.log('[EnhancedOffline] Sync queue status:', syncStatus.queue);
      }
    } catch (error) {
      console.error('[EnhancedOffline] Failed to update sync status:', error);
    }
  }, [enableDiagnostics]);

  // ==================== CAPABILITIES DETECTION ====================

  const updateCapabilities = useCallback(async () => {
    try {
      // Storage quota
      let storage = { available: 0, used: 0, percentage: 0 };
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        storage = {
          available: estimate.quota || 0,
          used: estimate.usage || 0,
          percentage: estimate.quota ? (estimate.usage || 0) / estimate.quota : 0
        };
      }

      // Feature detection
      const features = {
        backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
        pushNotifications: 'serviceWorker' in navigator && 'PushManager' in window,
        periodicSync: 'serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype,
        persistentStorage: 'storage' in navigator && 'persist' in navigator.storage,
        workboxEnabled: typeof window !== 'undefined' && 'serviceWorker' in navigator,
        notificationActions: 'Notification' in window && 'actions' in Notification.prototype
      };

      // Get actual performance metrics from Phase 4 services
      const syncStats = await backgroundSyncManager.getSyncStatus();
      
      const performance = {
        averageSyncTime: syncStats.stats?.averageSyncTime || 0,
        successRate: syncStats.stats?.successRate || 1.0,
        lastPerformanceCheck: new Date().toISOString(),
        queueProcessingTime: 0,
        backgroundSyncEnabled: state.preferences.backgroundSyncEnabled
      };

      // Push notification status from actual service
      const pushStatus = await pushNotificationService.getSubscriptionStatus();
      const pushMetrics = pushNotificationService.getMetrics();
      const pushNotifications: OfflineCapabilities['pushNotifications'] = {
        permission: pushStatus.permission,
        isSubscribed: pushStatus.isSubscribed,
        ...(pushStatus.subscription?.endpoint && { endpoint: pushStatus.subscription.endpoint }),
        ...(pushMetrics.lastNotificationTime && { lastNotificationTime: pushMetrics.lastNotificationTime })
      };

      dispatch({ 
        type: 'CAPABILITIES_UPDATED', 
        payload: { storage, features, performance, pushNotifications }
      });

      if (enableDiagnostics) {
        console.log('[EnhancedOffline] Capabilities updated:', { storage, features, performance, pushNotifications });
      }
    } catch (error) {
      console.error('[EnhancedOffline] Failed to update capabilities:', error);
    }
  }, [enableDiagnostics, state.preferences.backgroundSyncEnabled]);

  // ==================== CONFLICT DETECTION ====================

  const detectConflicts = useCallback(async () => {
    try {
      // This would integrate with actual conflict detection logic
      // For now, this is a placeholder for the conflict detection system
      const changes = await indexedDBManager.getQueuedChanges();
      
      // Look for potential conflicts based on timing and entity overlap
      const recentChanges = changes.filter(c => {
        const changeTime = new Date(c.createdAt).getTime();
        const now = new Date().getTime();
        return (now - changeTime) < 300000; // 5 minutes
      });

      // This is where we would implement actual conflict detection logic
      if (recentChanges.length > 0 && enableDiagnostics) {
        console.log('[EnhancedOffline] Potential conflicts detected:', recentChanges.length);
      }
    } catch (error) {
      console.error('[EnhancedOffline] Conflict detection failed:', error);
    }
  }, [enableDiagnostics]);

  // ==================== EVENT HANDLERS ====================

  // Separate effect for network event listeners (rarely changes)
  useEffect(() => {
    if (!autoStartMonitoring) return;

    // Network status listeners
    const handleOnline = () => updateNetworkStatus();
    const handleOffline = () => updateNetworkStatus();
    const handleConnectionChange = () => updateNetworkStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (networkInfoRef.current) {
      networkInfoRef.current.addEventListener('change', handleConnectionChange);
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (networkInfoRef.current) {
        networkInfoRef.current.removeEventListener('change', handleConnectionChange);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartMonitoring]); // Intentionally omitting updateNetworkStatus to prevent re-initialization

  // Separate effect for initial setup and intervals 
  useEffect(() => {
    if (!autoStartMonitoring) return;

    // Initial status update (ensure DB is ready before first poll)
    (async () => {
      try {
        await indexedDBManager.initialize();
      } catch {}
      updateNetworkStatus();
      updateSyncStatus();
      updateCapabilities();
    })();

    // Set up monitoring intervals
    const intervals = {
      syncStatus: setInterval(updateSyncStatus, 5000),
      capabilities: setInterval(updateCapabilities, 30000),
      conflicts: setInterval(detectConflicts, 10000)
    };
    
    intervalRefs.current = intervals;

    // Cleanup
    return () => {
      Object.values(intervals).forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartMonitoring]); // Intentionally omitting function dependencies to prevent re-initialization

  // ==================== ACTIONS ====================

  const forceSyncNow = useCallback(async () => {
    try {
      dispatch({ 
        type: 'SYNC_STATUS_UPDATED', 
        payload: { isActive: true } 
      });

      if (serviceWorkerManager) {
        await serviceWorkerManager.triggerSync();
      }

      // Update sync status after attempting sync
      setTimeout(updateSyncStatus, 1000);
      
      if (enableDiagnostics) {
        console.log('[EnhancedOffline] Force sync triggered');
      }
    } catch (error) {
      console.error('[EnhancedOffline] Force sync failed:', error);
      
      const syncError: SyncError = {
        id: `sync-error-${Date.now()}`,
        type: 'network',
        message: error instanceof Error ? error.message : 'Force sync failed',
        timestamp: new Date().toISOString(),
        severity: 'medium',
        autoRetryCount: 0,
        maxRetries: 3
      };

      dispatch({ type: 'ERROR_ADDED', payload: syncError });
    } finally {
      dispatch({ 
        type: 'SYNC_STATUS_UPDATED', 
        payload: { isActive: false, lastSync: new Date().toISOString() } 
      });
    }
  }, [updateSyncStatus, enableDiagnostics]);

  const retryFailedSync = useCallback(async (errorId: string) => {
    try {
      const error = state.syncStatus.errors.find(e => e.id === errorId);
      if (!error) return;

      if (error.autoRetryCount >= error.maxRetries) {
        console.warn('[EnhancedOffline] Max retries exceeded for error:', errorId);
        return;
      }

      // Remove the error and attempt retry
      dispatch({ type: 'ERROR_DISMISSED', payload: errorId });
      await forceSyncNow();

      if (enableDiagnostics) {
        console.log('[EnhancedOffline] Retry attempted for error:', errorId);
      }
    } catch (error) {
      console.error('[EnhancedOffline] Retry failed:', error);
    }
  }, [state.syncStatus.errors, forceSyncNow, enableDiagnostics]);

  const resolveConflict = useCallback(async (conflictId: string, resolution: 'local' | 'remote' | 'merge') => {
    try {
      // This would integrate with actual conflict resolution logic
      dispatch({ type: 'CONFLICT_RESOLVED', payload: conflictId });

      if (enableDiagnostics) {
        console.log('[EnhancedOffline] Conflict resolved:', conflictId, 'using', resolution);
      }
    } catch (error) {
      console.error('[EnhancedOffline] Conflict resolution failed:', error);
    }
  }, [enableDiagnostics]);

  const dismissError = useCallback((errorId: string) => {
    dispatch({ type: 'ERROR_DISMISSED', payload: errorId });
  }, []);

  // ==================== BACKGROUND SYNC ACTIONS ====================

  const registerSyncTask = useCallback(async (task: any): Promise<string> => {
    try {
      const taskId = await backgroundSyncManager.registerSyncTask(task);
      
      // Update sync status
      setTimeout(updateSyncStatus, 1000);
      
      if (enableDiagnostics) {
        console.log('[EnhancedOffline] Sync task registered:', taskId);
      }
      
      return taskId;
    } catch (error) {
      console.error('[EnhancedOffline] Failed to register sync task:', error);
      throw error;
    }
  }, [updateSyncStatus, enableDiagnostics]);

  const processOfflineQueue = useCallback(async () => {
    try {
      dispatch({ 
        type: 'SYNC_STATUS_UPDATED', 
        payload: { isActive: true } 
      });

      const result = await offlineQueueProcessor.processQueue();
      
      // Update sync status after processing
      setTimeout(updateSyncStatus, 1000);
      
      if (enableDiagnostics) {
        console.log('[EnhancedOffline] Queue processing completed:', result);
      }
      
      return {
        processed: result.successful,
        failed: result.failed,
        remaining: result.total - result.successful - result.failed
      };
    } catch (error) {
      console.error('[EnhancedOffline] Queue processing failed:', error);
      throw error;
    } finally {
      dispatch({ 
        type: 'SYNC_STATUS_UPDATED', 
        payload: { isActive: false, lastSync: new Date().toISOString() } 
      });
    }
  }, [updateSyncStatus, enableDiagnostics]);

  const retryAllFailedTasks = useCallback(async () => {
    try {
      await offlineQueueProcessor.retryAllFailedOperations();
      
      // Update sync status
      setTimeout(updateSyncStatus, 1000);
      
      if (enableDiagnostics) {
        console.log('[EnhancedOffline] All failed tasks scheduled for retry');
      }
    } catch (error) {
      console.error('[EnhancedOffline] Failed to retry failed tasks:', error);
      throw error;
    }
  }, [updateSyncStatus, enableDiagnostics]);

  const getSyncQueueStatus = useCallback(async () => {
    try {
      const queueOperations = await offlineQueueProcessor.getQueuedOperations();
      const syncStatus = await backgroundSyncManager.getSyncStatus();
      
      return {
        queue: {
          pending: queueOperations.filter((op: any) => op.status === 'queued').length,
          processing: queueOperations.filter((op: any) => op.status === 'processing').length,
          failed: queueOperations.filter((op: any) => op.status === 'failed').length,
          total: queueOperations.length
        },
        sync: syncStatus.stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[EnhancedOffline] Failed to get sync queue status:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, []);

  // ==================== PUSH NOTIFICATION ACTIONS ====================

  const enablePushNotifications = useCallback(async (): Promise<boolean> => {
    try {
      const success = await pushNotificationService.subscribe();
      
      if (success) {
        // updatePreferences will be defined below
        // await updatePreferences({ pushNotificationsEnabled: true });
        
        // Update capabilities to reflect new subscription status
        setTimeout(updateCapabilities, 500);
        
        if (enableDiagnostics) {
          console.log('[EnhancedOffline] Push notifications enabled');
        }
      }
      
      return success;
    } catch (error) {
      console.error('[EnhancedOffline] Failed to enable push notifications:', error);
      return false;
    }
  }, [updateCapabilities, enableDiagnostics]);

  const disablePushNotifications = useCallback(async (): Promise<boolean> => {
    try {
      const success = await pushNotificationService.unsubscribe();
      
      if (success) {
        // updatePreferences will be defined below
        // await updatePreferences({ pushNotificationsEnabled: false });
        
        // Update capabilities to reflect new subscription status
        setTimeout(updateCapabilities, 500);
        
        if (enableDiagnostics) {
          console.log('[EnhancedOffline] Push notifications disabled');
        }
      }
      
      return success;
    } catch (error) {
      console.error('[EnhancedOffline] Failed to disable push notifications:', error);
      return false;
    }
  }, [updateCapabilities, enableDiagnostics]);

  const updateNotificationPreferences = useCallback(async (prefs: any) => {
    try {
      await pushNotificationService.updatePreferences(prefs);
      
      if (enableDiagnostics) {
        console.log('[EnhancedOffline] Notification preferences updated:', prefs);
      }
    } catch (error) {
      console.error('[EnhancedOffline] Failed to update notification preferences:', error);
      throw error;
    }
  }, [enableDiagnostics]);

  const showTestNotification = useCallback(async () => {
    try {
      await pushNotificationService.showNotification({
        title: 'Test Notification',
        body: 'This is a test notification from NoteSpace',
        tag: 'test-notification',
        data: { type: 'test' }
      });
      
      if (enableDiagnostics) {
        console.log('[EnhancedOffline] Test notification shown');
      }
    } catch (error) {
      console.error('[EnhancedOffline] Failed to show test notification:', error);
      throw error;
    }
  }, [enableDiagnostics]);

  const updatePreferences = useCallback(async (newPreferences: Partial<EnhancedOfflineContextType['preferences']>) => {
    try {
      // Save to IndexedDB
      await indexedDBManager.setSetting('enhancedOfflinePreferences', {
        ...state.preferences,
        ...newPreferences
      });

      dispatch({ type: 'PREFERENCES_UPDATED', payload: newPreferences });

      // Update capabilities if background sync preference changed
      if ('backgroundSyncEnabled' in newPreferences) {
        setTimeout(updateCapabilities, 500);
      }

      if (enableDiagnostics) {
        console.log('[EnhancedOffline] Preferences updated:', newPreferences);
      }
    } catch (error) {
      console.error('[EnhancedOffline] Failed to update preferences:', error);
    }
  }, [state.preferences, enableDiagnostics, updateCapabilities]);

  // ==================== DIAGNOSTICS ====================

  const getDetailedStatus = useCallback(async () => {
    try {
      const dbStats = await indexedDBManager.getStats();
      const dbDebugInfo = await indexedDBManager.getDebugInfo();
      
      return {
        timestamp: new Date().toISOString(),
        network: state.networkStatus,
        sync: state.syncStatus,
        conflicts: state.conflicts,
        capabilities: state.capabilities,
        preferences: state.preferences,
        database: {
          stats: dbStats,
          debug: dbDebugInfo
        }
      };
    } catch (error) {
      console.error('[EnhancedOffline] Failed to get detailed status:', error);
      return null;
    }
  }, [state]);

  const exportDiagnostics = useCallback(async () => {
    try {
      const status = await getDetailedStatus();
      return JSON.stringify(status, null, 2);
    } catch (error) {
      console.error('[EnhancedOffline] Failed to export diagnostics:', error);
      return 'Failed to export diagnostics';
    }
  }, [getDetailedStatus]);

  const clearOfflineData = useCallback(async () => {
    try {
      // Clear offline queue
      await offlineQueueProcessor.clearQueue();
      
      // Clear sync state data
      await indexedDBManager.clearSyncStateByPrefix('queue_op_');
      await indexedDBManager.clearSyncStateByPrefix('batch_');
      await indexedDBManager.clearSyncStateByPrefix('sync_meta_');
      
      // Reset sync statistics
      await indexedDBManager.setSyncState('sync_stats', null);
      await indexedDBManager.setSyncState('queue_processor_state', null);
      
      // Clear service worker cache (if available)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_CACHES'
        });
      }
      
      // Update sync status
      setTimeout(updateSyncStatus, 1000);
      setTimeout(updateCapabilities, 1000);
      
      if (enableDiagnostics) {
        console.log('[EnhancedOffline] Offline data cleared');
      }
    } catch (error) {
      console.error('[EnhancedOffline] Failed to clear offline data:', error);
      throw error;
    }
  }, [updateSyncStatus, updateCapabilities, enableDiagnostics]);

  // ==================== CONTEXT VALUE ====================

  const contextValue: EnhancedOfflineContextType = {
    networkStatus: state.networkStatus,
    syncStatus: state.syncStatus,
    conflicts: state.conflicts,
    capabilities: state.capabilities,
    preferences: state.preferences,
    
    forceSyncNow,
    retryFailedSync,
    resolveConflict,
    dismissError,
    
    // Background Sync
    registerSyncTask,
    processOfflineQueue,
    retryAllFailedTasks,
    getSyncQueueStatus,
    
    // Push Notifications
    enablePushNotifications,
    disablePushNotifications,
    updateNotificationPreferences,
    showTestNotification,
    
    updatePreferences,
    
    getDetailedStatus,
    exportDiagnostics,
    clearOfflineData
  };

  return (
    <EnhancedOfflineContext.Provider value={contextValue}>
      {children}
    </EnhancedOfflineContext.Provider>
  );
};

export default EnhancedOfflineProvider;