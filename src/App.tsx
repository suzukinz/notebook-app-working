import React, { useState, useEffect, Suspense } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { IndexedDBProvider, InitializationWrapper } from './components/providers/IndexedDBProvider';
import Sidebar from './components/layout/Sidebar';
import IconSidebar from './components/layout/IconSidebar';
import NoteList from './components/notes/NoteList';
import { useNotebookStore } from './store/useNotebookStore';
import { useIndexedDBStore } from './store/useIndexedDBStore';
import KeyboardShortcutsHelp from './components/ui/KeyboardShortcutsHelp';
import ErrorBoundary from './components/ui/ErrorBoundary';
import PWAInstallPrompt from './components/ui/PWAInstallPrompt';
import OfflineIndicator from './components/ui/OfflineIndicator';
import AutoSyncStatus from './components/ui/AutoSyncStatus';
import EnhancedOfflineIndicator from './components/ui/EnhancedOfflineIndicator';
import SupabaseSyncButton from './components/ui/SupabaseSyncButton';
import ConflictResolutionModal from './components/ui/ConflictResolutionModal';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { AuthModal } from './components/auth/AuthModal';
import { WelcomePage } from './components/auth/WelcomePage';
import { useGlobalKeyboardShortcuts, useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { scheduleIntegrityCheck } from './utils/dataIntegrity';
import { supabase } from './utils/supabaseSync';
import { usePerformanceMonitor } from './utils/performanceMonitor';
import PerformanceWarning from './components/ui/PerformanceWarning';
// Import lazy components from centralized location
import {
  ObsidianGraphView,
  InlineDashboard,
  HomePage,
  Timeline,
  MobileApp,
  RichNoteEditor,
  AddFolderDialog,
  KeyboardShortcutsDialog,
  AccessibilitySettingsDialog,
  DataExportImportDialog,
  SupabaseDebug
} from './components/LazyComponents';
import './index.css';

// グローバルエラーハンドラーを初期化（副作用のため明示的に記述）
import './utils/globalErrorHandler';
// IndexedDBリセットユーティリティ（開発環境のみ）
if (process.env.NODE_ENV === 'development') {
  import('./utils/resetIndexedDB');
}

const AppContent: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false);
  const [showDataManager, setShowDataManager] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDebugTool, setShowDebugTool] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timelineDates, setTimelineDates] = useState<Date[]>([]);
  
  const { user, loading: authLoading } = useSupabaseAuth();
  const { generateReport, getSummary } = usePerformanceMonitor();
  
  // Gradual migration: Use IndexedDB store for UI state, keep localStorage store as fallback
  const indexedDBViewMode = useIndexedDBStore(state => state.viewMode);
  const indexedDBShowNoteList = useIndexedDBStore(state => state.showNoteList);
  const indexedDBInitialized = useIndexedDBStore(state => state.isInitialized);
  
  // Fallback to localStorage store if IndexedDB not ready
  const legacyStore = useNotebookStore();
  const viewMode = indexedDBInitialized ? indexedDBViewMode : legacyStore.viewMode;
  const showNoteList = indexedDBInitialized ? indexedDBShowNoteList : legacyStore.showNoteList;

  // キーボードショートカットの追加設定
  const additionalShortcuts = [
    {
      key: '/',
      ctrl: true,
      action: () => setShowKeyboardHelp(true),
      description: 'キーボードショートカットヘルプを表示'
    },
    {
      key: ',',
      ctrl: true,
      action: () => setShowAccessibilitySettings(true),
      description: 'アクセシビリティ設定を表示'
    },
    {
      key: 'e',
      ctrl: true,
      shift: true,
      action: () => setShowDataManager(true),
      description: 'データエクスポート・インポートを表示'
    },
    {
      key: 'd',
      ctrl: true,
      shift: true,
      action: () => setShowDebugTool(true),
      description: 'Supabase診断ツールを表示'
    },
    {
      key: 'c',
      ctrl: true,
      shift: true,
      action: () => setShowConflictModal(true),
      description: '競合解決モーダルを表示'
    },
    {
      key: 'p',
      ctrl: true,
      shift: true,
      action: () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('=== Performance Report ===');
          console.log(generateReport());
          const summary = getSummary();
          console.table(summary);
        }
      },
      description: 'パフォーマンスレポートを表示 (開発環境のみ)'
    },
    {
      key: 'Escape',
      action: () => {
        if (showKeyboardHelp) {
          setShowKeyboardHelp(false);
        } else if (showAccessibilitySettings) {
          setShowAccessibilitySettings(false);
        } else if (showDataManager) {
          setShowDataManager(false);
        } else if (showConflictModal) {
          setShowConflictModal(false);
        }
      },
      description: 'ダイアログを閉じる'
    }
  ];

  useKeyboardShortcuts(additionalShortcuts);
  
  // グローバルキーボードショートカット
  useGlobalKeyboardShortcuts();

  // データ整合性チェックの開始
  useEffect(() => {
    scheduleIntegrityCheck();
  }, []);

  // パフォーマンス監視の初期化
  useEffect(() => {
    // 初期化時にスタートマークを設定
    performance.mark('search-start');
    
    // パフォーマンス監視開始をログ出力
    console.log('🚀 [Performance] パフォーマンス監視システム開始');
    
    return () => {
      // クリーンアップは不要（PerformanceObserverが自動的に管理）
      return undefined;
    };
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileSize = window.innerWidth < 768;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      
      setIsMobile(isMobileSize || (isTouchDevice && window.innerWidth < 1024));
      
      // PWAモードの場合、bodyにクラスを追加
      if (isPWA) {
        document.body.classList.add('pwa-mode');
      }
      
      // セーフエリア対応のクラスを追加
      if (isMobileSize) {
        document.body.classList.add('safe-area-inset');
      } else {
        document.body.classList.remove('safe-area-inset');
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // PWAの display-mode 変更の監視
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => checkMobile();
    displayModeQuery.addEventListener('change', handleDisplayModeChange);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      displayModeQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  if (isMobile) {
    return (
      <>
        <MobileApp />
        
        {/* PWA インストールプロンプト */}
        <PWAInstallPrompt />
        
        {/* オフラインインジケーター */}
        <OfflineIndicator />
        
        {/* ダイアログ（Lazy Loading） */}
        <Suspense fallback={<LoadingSpinner size="sm" />}>
          <AddFolderDialog />
        </Suspense>
        
        {/* キーボードショートカットヘルプダイアログ（Lazy Loading） */}
        <Suspense fallback={<LoadingSpinner size="sm" />}>
          <KeyboardShortcutsDialog 
            isOpen={showKeyboardHelp}
            onClose={() => setShowKeyboardHelp(false)}
          />
        </Suspense>
        
        {/* アクセシビリティ設定ダイアログ（モバイル版・Lazy Loading） */}
        <Suspense fallback={<LoadingSpinner size="sm" />}>
          <AccessibilitySettingsDialog
            isOpen={showAccessibilitySettings}
            onClose={() => setShowAccessibilitySettings(false)}
          />
        </Suspense>
        
        {/* データエクスポート・インポートダイアログ（モバイル版・Lazy Loading） */}
        <Suspense fallback={<LoadingSpinner size="sm" />}>
          <DataExportImportDialog
            isOpen={showDataManager}
            onClose={() => setShowDataManager(false)}
          />
        </Suspense>
      </>
    );
  }

  // Supabaseが設定されていない場合はローカルモードで動作
  const isSupabaseConfigured = !!supabase;
  
  // 認証読み込み中
  if (isSupabaseConfigured && authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <LoadingSpinner text="読み込み中..." />
      </div>
    );
  }
  
  // Supabaseが設定されていて、未ログインの場合
  if (isSupabaseConfigured && !user) {
    return (
      <>
        <WelcomePage onLogin={() => setShowAuthModal(true)} />
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* 左側アイコンサイドバー - 常に表示 */}
      <IconSidebar className="flex" />
      
      {/* 通常のサイドバー - ノートモードの時のみ表示 */}
      {viewMode === 'notes' && <Sidebar className="flex" />}
      
      {/* ノートリスト - viewModeがnotesかつshowNoteListの時のみ表示 */}
      {viewMode === 'notes' && showNoteList && <NoteList className="flex" />}
      
      {/* 中央メインエリア - viewModeに応じて切り替え */}
      <div className="flex-1 flex flex-col">
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute top-0 right-0 bg-red-100 text-red-800 text-xs p-2 z-50">
            Current viewMode: {viewMode}
          </div>
        )}
        {viewMode === 'home' && (
          <Suspense fallback={<LoadingSpinner text="ホームダッシュボードを読み込み中..." className="flex-1 flex items-center justify-center" />}>
            <HomePage className="flex-1" />
          </Suspense>
        )}
        
        {viewMode === 'notes' && (
          <>
            {/* デスクトップヘッダー - 必要に応じて表示 */}
            {false && (
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex justify-end items-center space-x-2">
                <KeyboardShortcutsHelp />
              </div>
            )}
            <RichNoteEditor className="flex-1" />
          </>
        )}
        
        {viewMode === 'dashboard' && (
          <Suspense fallback={<LoadingSpinner text="ダッシュボードを読み込み中..." className="flex-1 flex items-center justify-center" />}>
            <InlineDashboard timelineDates={timelineDates} onDateSelect={setSelectedDate} />
          </Suspense>
        )}
      </div>
      
      {/* 右側タイムラインサイドバー - 常に表示 */}
      <div className="w-80 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 overflow-y-auto bg-white dark:bg-gray-800">
        <Suspense fallback={<LoadingSpinner text="タイムラインを読み込み中..." />}>
          <Timeline 
            selectedDate={selectedDate} 
            onTimelineEntriesChange={setTimelineDates}
          />
        </Suspense>
      </div>
      
      {/* グラフビュー（Lazy Loading） */}
      <Suspense fallback={<LoadingSpinner text="グラフビューを読み込み中..." className="absolute inset-0 bg-white/80 z-40" />}>
        <ObsidianGraphView />
      </Suspense>
      
      {/* ダイアログ（Lazy Loading） */}
      <Suspense fallback={<LoadingSpinner size="sm" />}>
        <AddFolderDialog />
      </Suspense>
      
      {/* PWA インストールプロンプト */}
      <PWAInstallPrompt />
      
      {/* キーボードショートカットヘルプダイアログ（Lazy Loading） */}
      <Suspense fallback={<LoadingSpinner size="sm" />}>
        <KeyboardShortcutsDialog 
          isOpen={showKeyboardHelp}
          onClose={() => setShowKeyboardHelp(false)}
        />
      </Suspense>
      
      {/* アクセシビリティ設定ダイアログ（Lazy Loading） */}
      <Suspense fallback={<LoadingSpinner size="sm" />}>
        <AccessibilitySettingsDialog
          isOpen={showAccessibilitySettings}
          onClose={() => setShowAccessibilitySettings(false)}
        />
      </Suspense>
      
      {/* データエクスポート・インポートダイアログ（Lazy Loading） */}
      <Suspense fallback={<LoadingSpinner size="sm" />}>
        <DataExportImportDialog
          isOpen={showDataManager}
          onClose={() => setShowDataManager(false)}
        />
      </Suspense>
      
      {/* Supabase診断ツール (Ctrl+Shift+D) */}
      {showDebugTool && (
        <Suspense fallback={<LoadingSpinner size="sm" />}>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <SupabaseDebug />
              <button
                onClick={() => setShowDebugTool(false)}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 w-full"
              >
                閉じる
              </button>
            </div>
          </div>
        </Suspense>
      )}
      
      {/* 自動同期ステータス（デスクトップ版） */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex flex-col items-end space-y-2">
          {/* Supabase同期ボタン */}
          <SupabaseSyncButton />
          
          {/* 既存の同期ステータス */}
          <div className="flex items-center space-x-2">
            <AutoSyncStatus />
            <OfflineIndicator />
            <EnhancedOfflineIndicator variant="compact" className="opacity-90" />
          </div>
        </div>
      </div>
      
      {/* 競合解決モーダル */}
      <ConflictResolutionModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
      />
      
      {/* パフォーマンス警告表示 */}
      <PerformanceWarning />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AccessibilityProvider>
        <ThemeProvider>
          <IndexedDBProvider>
            <InitializationWrapper>
              <AppContent />
            </InitializationWrapper>
          </IndexedDBProvider>
        </ThemeProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  );
};

export default App;