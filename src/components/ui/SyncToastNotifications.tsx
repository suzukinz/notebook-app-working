// Sync Toast Notifications - Phase 3 Wave 2  
// Real-time toast notifications for sync status updates

import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Wifi, 
} from 'lucide-react';
import { useEnhancedOffline } from '../../contexts/EnhancedOfflineContext';

interface Toast {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info' | 'sync';
  title: string;
  message: string;
  duration?: number | undefined;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  progress?: number; // 0-100 for progress bar
}

interface SyncToastNotificationsProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxToasts?: number;
}

const SyncToastNotifications: React.FC<SyncToastNotificationsProps> = ({
  position = 'top-right',
  maxToasts = 5
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { 
    networkStatus, 
    syncStatus, 
    conflicts, 
    preferences,
    retryFailedSync,
    dismissError 
  } = useEnhancedOffline();

  // ==================== TOAST MANAGEMENT ====================

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    if (preferences.notificationLevel === 'none') return;
    if (preferences.notificationLevel === 'critical_only' && toast.type !== 'error') return;
    if (preferences.notificationLevel === 'errors_only' && !['error', 'warning'].includes(toast.type)) return;

    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = {
      id,
      duration: toast.persistent ? undefined : (toast.duration || 5000),
      ...toast
    };

    setToasts(prev => {
      const updated = [newToast, ...prev];
      return updated.slice(0, maxToasts);
    });

    // Auto dismiss
    if (newToast.duration) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  }, [preferences.notificationLevel, maxToasts, removeToast]);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // ==================== EVENT HANDLERS ====================

  // Network status changes
  useEffect(() => {
    const wasOnline = localStorage.getItem('lastNetworkStatus') === 'online';
    localStorage.setItem('lastNetworkStatus', networkStatus.isOnline ? 'online' : 'offline');

    if (!wasOnline && networkStatus.isOnline) {
      addToast({
        type: 'success',
        title: 'オンラインになりました',
        message: '同期が再開されます',
        duration: 3000
      });
    } else if (wasOnline && !networkStatus.isOnline) {
      addToast({
        type: 'warning',
        title: 'オフラインになりました',
        message: '変更は後で同期されます',
        persistent: true
      });
    }
  }, [networkStatus.isOnline, addToast]);

  // Sync status changes
  useEffect(() => {
    if (syncStatus.isActive) {
      const queueTotal = syncStatus.queue.pending + syncStatus.queue.processing;
      if (queueTotal > 0) {
        addToast({
          type: 'sync',
          title: '同期中...',
          message: `${queueTotal}項目を同期しています`,
          progress: syncStatus.queue.processing > 0 ? 50 : 10,
          persistent: true
        });
      }
    } else {
      // Remove sync toasts when sync completes
      setToasts(prev => prev.filter(toast => toast.type !== 'sync'));
      
      // Show completion message if there were items synced
      if (syncStatus.lastSync) {
        const lastSyncTime = new Date(syncStatus.lastSync);
        const now = new Date();
        const timeDiff = now.getTime() - lastSyncTime.getTime();
        
        // Only show if sync just completed (within 5 seconds)
        if (timeDiff < 5000) {
          addToast({
            type: 'success',
            title: '同期完了',
            message: '全ての変更が同期されました',
            duration: 3000
          });
        }
      }
    }
  }, [syncStatus.isActive, syncStatus.queue, syncStatus.lastSync, addToast]);

  // Conflict detection
  useEffect(() => {
    const previousConflictCount = parseInt(localStorage.getItem('conflictCount') || '0');
    const currentConflictCount = conflicts.length;
    
    localStorage.setItem('conflictCount', currentConflictCount.toString());

    if (currentConflictCount > previousConflictCount) {
      const newConflicts = currentConflictCount - previousConflictCount;
      addToast({
        type: 'warning',
        title: `競合が発生しました`,
        message: `${newConflicts}件の競合を解決してください`,
        persistent: true,
        action: {
          label: '解決する',
          onClick: () => {
            // This would open the conflict resolution modal
            console.log('Open conflict resolution modal');
          }
        }
      });
    } else if (currentConflictCount < previousConflictCount && currentConflictCount === 0) {
      addToast({
        type: 'success',
        title: '競合解決完了',
        message: '全ての競合が解決されました',
        duration: 4000
      });
    }
  }, [conflicts.length, addToast]);

  // Sync errors
  useEffect(() => {
    syncStatus.errors.forEach(error => {
      const errorId = `error-${error.id}`;
      
      // Check if we already have a toast for this error
      if (!toasts.find(toast => toast.id === errorId)) {
        addToast({
          type: error.severity === 'critical' ? 'error' : 'warning',
          title: '同期エラー',
          message: error.message,
          persistent: error.severity === 'critical',
          action: error.autoRetryCount < error.maxRetries ? {
            label: '再試行',
            onClick: () => {
              retryFailedSync(error.id);
              removeToast(errorId);
            }
          } : {
            label: '閉じる',
            onClick: () => {
              dismissError(error.id);
              removeToast(errorId);
            }
          }
        });
      }
    });
  }, [syncStatus.errors, toasts, addToast, removeToast, retryFailedSync, dismissError]);

  // ==================== RENDER HELPERS ====================

  const getToastIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'sync':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'info':
      default:
        return <Wifi className="w-5 h-5 text-blue-500" />;
    }
  };

  const getToastStyles = (type: Toast['type']) => {
    const base = 'bg-white border border-gray-200 shadow-lg';
    switch (type) {
      case 'success':
        return `${base} border-l-4 border-l-green-500`;
      case 'warning':
        return `${base} border-l-4 border-l-amber-500`;
      case 'error':
        return `${base} border-l-4 border-l-red-500`;
      case 'sync':
        return `${base} border-l-4 border-l-blue-500`;
      case 'info':
      default:
        return `${base} border-l-4 border-l-blue-500`;
    }
  };

  const getPositionStyles = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-right':
      default:
        return 'top-4 right-4';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className={`fixed ${getPositionStyles()} z-50 space-y-2 max-w-sm w-full`}>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className={`${getToastStyles(toast.type)} rounded-lg p-4 transform transition-all duration-300 ease-in-out ${
            index === 0 ? 'translate-x-0 opacity-100' : 'translate-x-0 opacity-95'
          }`}
          style={{
            animationDelay: `${index * 100}ms`
          }}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {getToastIcon(toast.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">
                  {toast.title}
                </h4>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <p className="mt-1 text-sm text-gray-600">
                {toast.message}
              </p>
              
              {/* Progress bar for sync operations */}
              {toast.progress !== undefined && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${toast.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* Action button */}
              {toast.action && (
                <div className="mt-3">
                  <button
                    onClick={toast.action.onClick}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    {toast.action.label}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {/* Clear all button when there are many toasts */}
      {toasts.length > 2 && (
        <div className="flex justify-center mt-2">
          <button
            onClick={clearAllToasts}
            className="text-xs text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded px-2 py-1"
          >
            すべて閉じる
          </button>
        </div>
      )}
    </div>
  );
};

export default SyncToastNotifications;