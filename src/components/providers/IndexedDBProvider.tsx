// IndexedDB Provider Component
// Handles initialization and provides loading states for IndexedDB

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useIndexedDBStore } from '../../store/useIndexedDBStore';
import { indexedDBManager } from '../../utils/indexedDBManager';
import { EnhancedOfflineProvider } from '../../contexts/EnhancedOfflineContext';
import SyncToastNotifications from '../ui/SyncToastNotifications';

// ==================== TYPES ====================

interface IndexedDBContextType {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  retryInitialization: () => void;
}

// ==================== CONTEXT ====================

const IndexedDBContext = createContext<IndexedDBContextType | null>(null);

export const useIndexedDBContext = () => {
  const context = useContext(IndexedDBContext);
  if (!context) {
    throw new Error('useIndexedDBContext must be used within IndexedDBProvider');
  }
  return context;
};

// ==================== PROVIDER COMPONENT ====================

interface IndexedDBProviderProps {
  children: React.ReactNode;
}

export const IndexedDBProvider: React.FC<IndexedDBProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const initialize = useIndexedDBStore(state => state.initialize);
  const storeInitialized = useIndexedDBStore(state => state.isInitialized);
  const storeLoading = useIndexedDBStore(state => state.isLoading);
  const storeError = useIndexedDBStore(state => state.lastError);

  // Initialize IndexedDB and store
  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      if (!mounted) return;

      setIsLoading(true);
      setError(null);

      try {
        console.log('[IndexedDBProvider] Starting initialization...');
        
        // Initialize the store (which includes IndexedDB initialization)
        await initialize();
        
        if (mounted) {
          setIsInitialized(true);
          setIsLoading(false);
          console.log('[IndexedDBProvider] Initialization completed successfully');
        }
      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to initialize database';
          setError(errorMessage);
          setIsLoading(false);
          console.error('[IndexedDBProvider] Initialization failed:', err);
        }
      }
    };

    initializeApp();

    return () => {
      mounted = false;
    };
  }, [initialize, retryCount]);

  // Sync with store state
  useEffect(() => {
    setIsInitialized(storeInitialized);
    setIsLoading(storeLoading);
    if (storeError) {
      setError(storeError);
    }
  }, [storeInitialized, storeLoading, storeError]);

  const retryInitialization = () => {
    setRetryCount(prev => prev + 1);
  };

  const contextValue: IndexedDBContextType = {
    isInitialized,
    isLoading,
    error,
    retryInitialization
  };

  return (
    <IndexedDBContext.Provider value={contextValue}>
      <EnhancedOfflineProvider 
        enableDiagnostics={false}
        autoStartMonitoring={false}
      >
        {children}
        <SyncToastNotifications position="top-right" maxToasts={4} />
      </EnhancedOfflineProvider>
    </IndexedDBContext.Provider>
  );
};

// ==================== LOADING COMPONENT ====================

interface LoadingScreenProps {
  error?: string | null;
  onRetry?: (() => void);
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ error, onRetry }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          {/* Logo */}
          <div className="mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-white">📝</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">NoteSpace</h1>
          </div>

          {error ? (
            /* Error State */
            <div className="mb-6">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl text-red-600 dark:text-red-400">⚠️</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                初期化エラー
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                データベースの初期化に失敗しました
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700 dark:text-red-300 font-mono">
                  {error}
                </p>
              </div>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  再試行
                </button>
              )}
            </div>
          ) : (
            /* Loading State */
            <div className="mb-6">
              <div className="mb-4">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                初期化中...
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                データベースを準備しています
              </p>
            </div>
          )}

          {/* Features List */}
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              NoteSpace の特徴:
            </h3>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>• オフライン対応の堅牢なデータ保存</li>
              <li>• 自動同期とバックアップ</li>
              <li>• 高速な検索とタグ機能</li>
              <li>• ワークスペース別の整理</li>
            </ul>
          </div>
        </div>

        {/* Technical Info */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            IndexedDB による永続化データベース
          </p>
        </div>
      </div>
    </div>
  );
};

// ==================== INITIALIZATION WRAPPER ====================

interface InitializationWrapperProps {
  children: React.ReactNode;
}

export const InitializationWrapper: React.FC<InitializationWrapperProps> = ({ children }) => {
  const { isInitialized, isLoading, error, retryInitialization } = useIndexedDBContext();

  if (isLoading || !isInitialized) {
    const retryHandler = error ? retryInitialization : undefined;
    return <LoadingScreen error={error} {...(retryHandler && { onRetry: retryHandler })} />;
  }

  return <>{children}</>;
};

// ==================== HOOKS ====================

export const useIndexedDBStatus = () => {
  const context = useIndexedDBContext();
  return {
    isReady: context.isInitialized && !context.isLoading,
    isLoading: context.isLoading,
    error: context.error,
    retry: context.retryInitialization
  };
};

// Helper hook for database statistics
export const useIndexedDBStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isInitialized } = useIndexedDBContext();

  const refreshStats = React.useCallback(async () => {
    if (!isInitialized) return;

    setIsLoading(true);
    try {
      const dbStats = await indexedDBManager.getStats();
      setStats(dbStats);
    } catch (error) {
      console.error('[IndexedDBProvider] Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return {
    stats,
    isLoading,
    refresh: refreshStats
  };
};

// Debug helpers for browser console
declare global {
  interface Window {
    debugIndexedDB: () => Promise<any>;
    resetIndexedDB: () => Promise<boolean>;
  }
}

// Add debug functions to window for development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.debugIndexedDB = async () => {
    try {
      const debugInfo = await indexedDBManager.getDebugInfo();
      console.log('🗄️ IndexedDB Debug Info:', debugInfo);
      return debugInfo;
    } catch (error) {
      console.error('❌ Failed to get debug info:', error);
    }
  };

  window.resetIndexedDB = async (): Promise<boolean> => {
    try {
      console.log('🔄 Resetting IndexedDB...');
      await indexedDBManager.resetDatabase();
      console.log('✅ IndexedDB reset complete. Please refresh the page.');
      return true;
    } catch (error) {
      console.error('❌ Failed to reset IndexedDB:', error);
      return false;
    }
  };
}

export default IndexedDBProvider;