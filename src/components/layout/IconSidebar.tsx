import React from 'react';
import { 
  StickyNote, 
  BarChart3, 
  Map, 
  Settings, 
  Download, 
  User, 
  FileText,
  Cloud,
  Home,
  LogOut
} from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { useIndexedDBStore } from '../../store/useIndexedDBStore';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';

interface IconSidebarProps {
  className?: string;
}

const IconSidebar: React.FC<IconSidebarProps> = ({ className = '' }) => {
  const { user, signOut } = useSupabaseAuth();
  
  // Use IndexedDB store if initialized, otherwise fallback to legacy store
  const indexedDBStore = useIndexedDBStore();
  const legacyStore = useNotebookStore();
  
  const store = indexedDBStore.isInitialized ? indexedDBStore : legacyStore;
  
  const { 
    viewMode, 
    setViewMode, 
    showMindMap,
    setShowMindMap,
    setShowNoteList,
    selectedWorkspace, 
    selectedNotebook, 
    selectedSubFolder,
    isSyncing 
  } = store;

  const [showSettingsDialog, setShowSettingsDialog] = React.useState(false);
  const [showDataExportDialog, setShowDataExportDialog] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const handleNotesClick = () => {
    setShowMindMap(false); // グラフビューを閉じる
    setViewMode('notes');
    setShowNoteList(true); // ノートリストも表示
    // アイコンサイドバーは表示したまま
  };

  const handleHomeClick = () => {
    setShowMindMap(false); // グラフビューを閉じる
    setViewMode('home');
    setShowNoteList(false); // ホーム時はノートリストを非表示
  };

  const handleDashboardClick = () => {
    setShowMindMap(false); // グラフビューを閉じる
    setViewMode('dashboard');
    setShowNoteList(false); // ダッシュボード時はノートリストを非表示
  };

  const handleGraphViewClick = () => {
    setShowMindMap(true);
    setViewMode('notes'); // グラフビューを閉じた後の戻り先
  };

  const iconButtons = [
    {
      id: 'home',
      icon: <Home />,
      label: 'ホーム',
      onClick: handleHomeClick,
      isActive: viewMode === 'home' && !showMindMap
    },
    {
      id: 'notes',
      icon: <StickyNote />,
      label: 'ノート',
      onClick: handleNotesClick,
      isActive: viewMode === 'notes' && !showMindMap
    },
    {
      id: 'dashboard', 
      icon: <BarChart3 />,
      label: 'ダッシュボード',
      onClick: handleDashboardClick,
      isActive: viewMode === 'dashboard' && !showMindMap
    },
    {
      id: 'graph',
      icon: <Map />,
      label: 'グラフビュー',
      onClick: handleGraphViewClick,
      isActive: showMindMap
    },
    {
      id: 'settings',
      icon: <Settings />,
      label: '設定',
      onClick: () => setShowSettingsDialog(true),
      isActive: false
    },
    {
      id: 'export',
      icon: <Download />,
      label: 'データエクスポート',
      onClick: () => setShowDataExportDialog(true),
      isActive: false
    },
    {
      id: 'account',
      icon: user && isSyncing ? <Cloud /> : <User />,
      label: user ? (isSyncing ? '同期中' : user.email?.split('@')[0] || 'アカウント') : 'アカウント情報',
      onClick: () => setShowUserMenu(!showUserMenu),
      isActive: showUserMenu
    }
  ];

  // 現在の状態を表示するための情報
  const currentInfo = React.useMemo(() => {
    if (selectedWorkspace && selectedNotebook && selectedSubFolder) {
      return {
        workspace: selectedWorkspace,
        notebook: selectedNotebook,
        subfolder: selectedSubFolder
      };
    }
    return null;
  }, [selectedWorkspace, selectedNotebook, selectedSubFolder]);

  return (
    <div className={`bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen ${className}`} style={{ width: '48px' }}>
      {/* ヘッダー - よりコンパクト */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center h-12">
        <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </div>

      {/* アイコンボタンリスト - 間隔を狭く */}
      <div className="flex-1 flex flex-col items-center py-2 space-y-1">
        {iconButtons.map((button) => (
          <button
            key={button.id}
            onClick={button.onClick}
            className={`
              p-2 w-10 h-10 flex items-center justify-center rounded-md transition-all duration-200 group relative
              ${button.isActive 
                ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
              }
            `}
            title={button.label}
          >
            <div className="w-4 h-4">
              {React.cloneElement(button.icon, { size: 16 })}
            </div>
            
            {/* ツールチップ - よりスタイリッシュ */}
            <div className="absolute left-full ml-3 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 transform -translate-y-1/2">
              {button.label}
              {/* 矢印 */}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700"></div>
            </div>
          </button>
        ))}
      </div>

      {/* 現在の状態表示（下部） - より小さく */}
      {currentInfo && (
        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mb-1"></div>
            <div className="text-xs text-gray-400 dark:text-gray-500 text-center leading-3">
              {currentInfo.workspace.substring(0, 3)}
            </div>
          </div>
        </div>
      )}

      {/* 設定ダイアログ */}
      {showSettingsDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">設定</h3>
            <p className="text-gray-600 dark:text-gray-400">設定機能は準備中です。</p>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowSettingsDialog(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ユーザーメニュー */}
      {showUserMenu && user && (
        <div className="fixed left-12 top-0 bottom-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg z-40">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.email?.split('@')[0]}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            
            {isSyncing && (
              <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 mb-2">
                <Cloud className="w-3 h-3 animate-pulse" />
                <span>同期中...</span>
              </div>
            )}
          </div>
          
          <div className="p-4">
            <button
              onClick={() => {
                signOut();
                setShowUserMenu(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>ログアウト</span>
            </button>
          </div>
          
          {/* クリックして閉じるオーバーレイ */}
          <div 
            className="fixed inset-0 -z-10" 
            onClick={() => setShowUserMenu(false)}
          />
        </div>
      )}

      {/* データエクスポートダイアログ */}
      {showDataExportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">データエクスポート</h3>
            <p className="text-gray-600 dark:text-gray-400">データエクスポート機能は準備中です。</p>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowDataExportDialog(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IconSidebar;