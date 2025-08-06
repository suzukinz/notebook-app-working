import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import Sidebar from './components/layout/Sidebar';
import NoteList from './components/notes/NoteList';
import RichNoteEditor from './components/notes/RichNoteEditor';
import KeyboardShortcutsHelp from './components/ui/KeyboardShortcutsHelp';
import ErrorBoundary from './components/ui/ErrorBoundary';
import PWAInstallPrompt from './components/ui/PWAInstallPrompt';
import OfflineIndicator from './components/ui/OfflineIndicator';
import AutoSyncStatus from './components/ui/AutoSyncStatus';
import LoadingSpinner from './components/ui/LoadingSpinner';
import MobileApp from './components/mobile/MobileApp';
import { AuthModal } from './components/auth/AuthModal';
import { WelcomePage } from './components/auth/WelcomePage';
import { useGlobalKeyboardShortcuts, useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { scheduleIntegrityCheck } from './utils/dataIntegrity';
import { supabase } from './utils/supabaseSync';
import './index.css';

// グローバルエラーハンドラーを初期化（副作用のため明示的に記述）
import './utils/globalErrorHandler';

// Lazy load heavy components
const ObsidianGraphView = lazy(() => import('./components/mindmap/ObsidianGraphView'));
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const AddFolderDialog = lazy(() => import('./components/dialogs/AddFolderDialog'));
const KeyboardShortcutsDialog = lazy(() => import('./components/dialogs/KeyboardShortcutsDialog'));
const AccessibilitySettingsDialog = lazy(() => import('./components/dialogs/AccessibilitySettingsDialog'));
const DataExportImportDialog = lazy(() => import('./components/dialogs/DataExportImportDialog'));

const AppContent: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false);
  const [showDataManager, setShowDataManager] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const { user, loading: authLoading } = useSupabaseAuth();

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
      key: 'Escape',
      action: () => {
        if (showKeyboardHelp) {
          setShowKeyboardHelp(false);
        } else if (showAccessibilitySettings) {
          setShowAccessibilitySettings(false);
        } else if (showDataManager) {
          setShowDataManager(false);
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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
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
      {/* デスクトップ版 */}
      <Sidebar className="flex" />
      <NoteList className="hidden sm:flex" />
      <div className="flex-1 flex flex-col">
        {/* デスクトップヘッダー - 必要に応じて表示 */}
        {false && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex justify-end items-center space-x-2">
            <KeyboardShortcutsHelp />
          </div>
        )}
        <RichNoteEditor className="flex-1" />
      </div>
      
      {/* グラフビュー（Lazy Loading） */}
      <Suspense fallback={<LoadingSpinner text="グラフビューを読み込み中..." className="absolute inset-0 bg-white/80 z-40" />}>
        <ObsidianGraphView />
      </Suspense>

      {/* ダッシュボード（Lazy Loading） */}
      <Suspense fallback={<LoadingSpinner text="ダッシュボードを読み込み中..." className="absolute inset-0 bg-white/80 z-40" />}>
        <Dashboard />
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
      
      {/* 自動同期ステータス（デスクトップ版） */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex items-center space-x-2">
          <AutoSyncStatus />
          <OfflineIndicator />
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AccessibilityProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  );
};

export default App;