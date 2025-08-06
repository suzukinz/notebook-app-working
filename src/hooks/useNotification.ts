// 通知管理用のカスタムフック
import { useState, useCallback } from 'react';
import { AppError, getUserFriendlyMessage } from '../utils/errorHandler';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  details?: string;
  duration?: number;
  dismissible?: boolean;
}

interface UseNotificationReturn {
  notifications: Notification[];
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  showError: (error: AppError) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

export const useNotification = (): UseNotificationReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      id,
      duration: 5000,
      dismissible: true,
      ...notification
    };

    setNotifications(prev => [...prev, newNotification]);

    // 自動削除
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        dismissNotification(id);
      }, newNotification.duration);
    }
  }, [dismissNotification]);

  const showError = useCallback((error: AppError) => {
    const notification: Omit<Notification, 'id'> = {
      type: 'error',
      message: getUserFriendlyMessage(error),
      duration: error.severity === 'critical' ? 0 : 7000 // critical errors don't auto-dismiss
    };
    
    if (error.details) {
      notification.details = error.details;
    }
    
    showNotification(notification);
  }, [showNotification]);

  const showSuccess = useCallback((message: string) => {
    showNotification({
      type: 'success',
      message,
      duration: 3000
    });
  }, [showNotification]);

  const showInfo = useCallback((message: string) => {
    showNotification({
      type: 'info',
      message,
      duration: 4000
    });
  }, [showNotification]);

  const showWarning = useCallback((message: string) => {
    showNotification({
      type: 'warning',
      message,
      duration: 5000
    });
  }, [showNotification]);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    showNotification,
    showError,
    showSuccess,
    showInfo,
    showWarning,
    dismissNotification,
    clearAllNotifications
  };
};