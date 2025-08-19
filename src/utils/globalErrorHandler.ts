// グローバルエラーハンドラー
import { logger } from './logger';

export interface ErrorReport {
  message: string;
  stack?: string;
  url?: string;
  line?: number;
  column?: number;
  timestamp: string;
  userAgent: string;
  pathname: string;
}

class GlobalErrorHandler {
  private errors: ErrorReport[] = [];
  private maxErrors = 50;
  private listeners: ((error: ErrorReport) => void)[] = [];

  constructor() {
    this.setupErrorHandlers();
  }

  private setupErrorHandlers() {
    // JavaScript エラーをキャッチ
    window.addEventListener('error', (event) => {
      const error: ErrorReport = {
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        line: event.lineno,
        column: event.colno,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        pathname: window.location.pathname
      };
      
      this.recordError(error);
    });

    // Promise の未処理エラーをキャッチ
    window.addEventListener('unhandledrejection', (event) => {
      const error: ErrorReport = {
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        pathname: window.location.pathname
      };
      
      this.recordError(error);
    });

    // リソース読み込みエラーをキャッチ
    window.addEventListener('error', (event) => {
      if (event.target !== window && event.target) {
        const target = event.target as HTMLElement;
        const error: ErrorReport = {
          message: `Resource failed to load: ${target.tagName}`,
          url: (target as any).src || (target as any).href,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          pathname: window.location.pathname
        };
        
        this.recordError(error);
      }
    }, true);
  }

  recordError(error: ErrorReport) {
    // エラーをログに記録
    logger.error('Global error caught:', error);

    // エラーリストに追加
    this.errors.unshift(error);
    
    // 最大数を超えた場合は古いエラーを削除
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // リスナーに通知
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error handler listener:', listenerError);
      }
    });

    // ローカルストレージに保存（デバッグ用）
    if (process.env.NODE_ENV === 'development') {
      try {
        localStorage.setItem('app-errors', JSON.stringify(this.errors.slice(0, 10)));
      } catch (storageError) {
        console.error('Failed to save errors to localStorage:', storageError);
      }
    }
  }

  // エラーリスナーを追加
  addListener(listener: (error: ErrorReport) => void) {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // エラーレポートを取得
  getErrors(): ErrorReport[] {
    return [...this.errors];
  }

  // エラーを手動で記録
  reportError(error: Error, context?: string) {
    const errorReport: ErrorReport = {
      message: context ? `${context}: ${error.message}` : error.message,
      stack: error.stack || 'No stack trace available',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      pathname: window.location.pathname
    };
    
    this.recordError(errorReport);
  }

  // エラーをクリア
  clearErrors() {
    this.errors = [];
    if (process.env.NODE_ENV === 'development') {
      try {
        localStorage.removeItem('app-errors');
      } catch (error) {
        console.error('Failed to clear errors from localStorage:', error);
      }
    }
  }

  // エラー統計を取得
  getErrorStats() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentErrors = this.errors.filter(error => 
      new Date(error.timestamp) > oneHourAgo
    );
    
    const dailyErrors = this.errors.filter(error => 
      new Date(error.timestamp) > oneDayAgo
    );

    const errorTypes = this.errors.reduce((acc, error) => {
      const type = error.message.split(':')[0] || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.errors.length,
      recent: recentErrors.length,
      daily: dailyErrors.length,
      types: errorTypes
    };
  }
}

// シングルトンインスタンス
export const globalErrorHandler = new GlobalErrorHandler();

// React エラーをレポートするヘルパー関数
export const reportReactError = (error: Error, errorInfo: any) => {
  const errorReport: ErrorReport = {
    message: `React Error: ${error.message}`,
    stack: error.stack + '\n\nComponent Stack:' + errorInfo.componentStack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    pathname: window.location.pathname
  };
  
  globalErrorHandler.recordError(errorReport);
};

// API エラーをレポートするヘルパー関数
export const reportApiError = (url: string, status: number, message: string) => {
  const errorReport: ErrorReport = {
    message: `API Error: ${status} - ${message}`,
    url,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    pathname: window.location.pathname
  };
  
  globalErrorHandler.recordError(errorReport);
};

// 開発モードでのエラー表示
if (process.env.NODE_ENV === 'development') {
  globalErrorHandler.addListener((error) => {
    console.group('🚨 Global Error Caught');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('URL:', error.url);
    console.error('Time:', error.timestamp);
    console.groupEnd();
  });
}