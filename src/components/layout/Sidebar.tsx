import React, { useState } from 'react';
import { Activity, Settings, Map, Plus, BarChart3, User, LogOut, Cloud } from 'lucide-react';
import SearchBar from '../navigation/SearchBar';
import WorkspaceSelector from '../navigation/WorkspaceSelector';
import NotebookTree from '../navigation/NotebookTree';
import CompactTagFilter from '../ui/CompactTagFilter';
import AddWorkspaceDialog from '../dialogs/AddWorkspaceDialog';
import AddNotebookDialog from '../dialogs/AddNotebookDialog';
import EditWorkspaceDialog from '../dialogs/EditWorkspaceDialog';
import SettingsDialog from '../dialogs/SettingsDialog';
import PWAInstallButton from '../ui/PWAInstallButton';
import DataManagerButton from '../ui/DataManagerButton';
import DataExportImportDialog from '../dialogs/DataExportImportDialog';
import ResizeHandle from '../ui/ResizeHandle';
import { useNotebookStore } from '../../store/useNotebookStore';
import { useSidebarResize } from '../../hooks/useSidebarResize';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const { user, signOut } = useSupabaseAuth();
  const {
    selectedWorkspace,
    selectedNotebook,
    selectedSubFolder,
    expandedNotebooks,
    expandedSubFolders,
    searchQuery,
    selectedTags,
    setSelectedWorkspace,
    setSelectedNotebook,
    setSelectedSubFolder,
    toggleNotebookExpanded,
    toggleSubFolderExpanded,
    setSearchQuery,
    setSelectedTags,
    setShowAddFolderDialog,
    setShowMindMap,
    setShowDashboard,
    addWorkspace,
    addNotebook,
    editWorkspace
  } = useNotebookStore();

  const { sidebarWidth, updateSidebarWidth, minWidth, maxWidth } = useSidebarResize();

  const [showAddWorkspaceDialog, setShowAddWorkspaceDialog] = useState(false);
  const [showAddNotebookDialog, setShowAddNotebookDialog] = useState(false);
  const [showEditWorkspaceDialog, setShowEditWorkspaceDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showDataExportDialog, setShowDataExportDialog] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<{ id: string; name: string; icon: string; color: string } | null>(null);

  const handleWorkspaceChange = (workspace: string) => {
    setSelectedWorkspace(workspace);
    // ワークスペース変更時にデフォルトのノートブックを選択
    const defaultNotebooks = {
      work: 'projects',
      personal: 'diary',
      learning: 'tech'
    };
    setSelectedNotebook(defaultNotebooks[workspace as keyof typeof defaultNotebooks] || 'projects');
  };

  const handleAddWorkspace = (workspace: { name: string; icon: string; color: string }) => {
    addWorkspace(workspace);
    setShowAddWorkspaceDialog(false);
  };

  const handleAddNotebook = (notebook: { name: string; color: string; description?: string; image?: string }) => {
    addNotebook(notebook);
  };

  const handleEditWorkspace = (workspace: { id: string; name: string; icon: string; color: string }) => {
    setEditingWorkspace(workspace);
    setShowEditWorkspaceDialog(true);
  };

  const handleSaveEditWorkspace = (workspace: { id: string; name: string; icon: string; color: string }) => {
    editWorkspace(workspace.id, workspace);
    setEditingWorkspace(null);
  };

  const recentActivities = [
    { id: '1', type: 'updated' as const, noteTitle: 'React コンポーネント設計', timestamp: '2時間前', folder: 'フロントエンド' },
    { id: '2', type: 'created' as const, noteTitle: 'API設計メモ', timestamp: '4時間前', folder: 'バックエンド' },
    { id: '3', type: 'updated' as const, noteTitle: 'データベース設計', timestamp: '1日前', folder: 'データベース' }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'created': return '📝';
      case 'updated': return '✏️';
      case 'deleted': return '🗑️';
      default: return '📝';
    }
  };

  return (
    <div 
      className={`bg-white border-r border-gray-200 flex h-screen ${className}`}
      style={{ width: sidebarWidth }}
    >
      <div className="flex-1 flex flex-col min-w-0">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200 min-w-0">
        {/* ユーザー情報 (Supabase使用時のみ表示) */}
        {user && (
          <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.email?.split('@')[0]}
                </p>
                <div className="flex items-center gap-1">
                  <Cloud className="w-3 h-3 text-green-600" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">同期中</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="ログアウト"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">📝 NoteSpace</h1>
          <div className="flex items-center space-x-2">
            <button
              className="p-2 text-gray-500 hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors"
              onClick={() => setShowDashboard(true)}
              title="ダッシュボードを表示"
            >
              <BarChart3 size={20} />
            </button>
            <button
              className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              onClick={() => setShowMindMap(true)}
              title="グラフビューで関係性を表示"
            >
              <Map size={20} />
            </button>
            <button 
              onClick={() => setShowSettingsDialog(true)}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Settings size={20} />
            </button>
            <DataManagerButton 
              onClick={() => setShowDataExportDialog(true)}
            />
          </div>
        </div>
        
        <div className="mb-4">
          <PWAInstallButton />
        </div>
        
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          className="mb-3"
        />
        
        <div className="mb-4 w-full overflow-hidden min-w-0">
          <CompactTagFilter
            selectedTags={selectedTags}
            onTagSelect={setSelectedTags}
            className="w-full min-w-0"
          />
        </div>
        
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-medium text-gray-600">ワークスペース</h3>
            <button
              onClick={() => setShowAddWorkspaceDialog(true)}
              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
              title="新しいワークスペースを追加"
            >
              <Plus size={12} />
            </button>
          </div>
          <WorkspaceSelector
            selectedWorkspace={selectedWorkspace}
            onWorkspaceChange={handleWorkspaceChange}
            onEditWorkspace={handleEditWorkspace}
          />
        </div>
      </div>

      {/* ナビゲーション */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <NotebookTree
            selectedWorkspace={selectedWorkspace}
            selectedNotebook={selectedNotebook}
            selectedSubFolder={selectedSubFolder}
            expandedNotebooks={expandedNotebooks}
            expandedSubFolders={expandedSubFolders}
            onNotebookSelect={setSelectedNotebook}
            onSubFolderSelect={setSelectedSubFolder}
            onNotebookToggle={toggleNotebookExpanded}
            onSubFolderToggle={toggleSubFolderExpanded}
            onAddFolderClick={() => setShowAddFolderDialog(true)}
            onAddNotebookClick={() => setShowAddNotebookDialog(true)}
          />
        </div>


        {/* 最近のアクティビティ */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <Activity size={16} className="mr-2" />
            最近のアクティビティ
          </h3>
          <div className="space-y-2">
            {recentActivities.map(activity => (
              <div key={activity.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                <div className="text-sm">{getActivityIcon(activity.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{activity.noteTitle}</p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{activity.folder}</span>
                    <span>•</span>
                    <span>{activity.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* ダイアログ */}
      <AddWorkspaceDialog
        isOpen={showAddWorkspaceDialog}
        onClose={() => setShowAddWorkspaceDialog(false)}
        onAdd={handleAddWorkspace}
      />
      
      <AddNotebookDialog
        isOpen={showAddNotebookDialog}
        onClose={() => setShowAddNotebookDialog(false)}
        onAdd={handleAddNotebook}
      />
      
      <EditWorkspaceDialog
        isOpen={showEditWorkspaceDialog}
        onClose={() => {
          setShowEditWorkspaceDialog(false);
          setEditingWorkspace(null);
        }}
        onEdit={handleSaveEditWorkspace}
        workspace={editingWorkspace}
      />
      
      <SettingsDialog
        isOpen={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
      />
      
      <DataExportImportDialog
        isOpen={showDataExportDialog}
        onClose={() => setShowDataExportDialog(false)}
      />
      </div>
      
      {/* リサイズハンドル */}
      <ResizeHandle
        onResize={updateSidebarWidth}
        minWidth={minWidth}
        maxWidth={maxWidth}
      />
    </div>
  );
};

export default Sidebar;