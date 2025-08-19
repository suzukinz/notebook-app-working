import React, { useState, useEffect } from 'react';
import { Activity, Plus, PanelLeftClose, PanelLeft } from 'lucide-react';
import SearchBar from '../navigation/SearchBar';
import WorkspaceSelector from '../navigation/WorkspaceSelector';
import NotebookTree from '../navigation/NotebookTree';
import CompactTagFilter from '../ui/CompactTagFilter';
import AddWorkspaceDialog from '../dialogs/AddWorkspaceDialog';
import AddNotebookDialog from '../dialogs/AddNotebookDialog';
import EditWorkspaceDialog from '../dialogs/EditWorkspaceDialog';
import PWAInstallButton from '../ui/PWAInstallButton';
import ResizeHandle from '../ui/ResizeHandle';
import { useNotebookStore } from '../../store/useNotebookStore';
import { useIndexedDBStore } from '../../store/useIndexedDBStore';
import { useSidebarResize } from '../../hooks/useSidebarResize';
import { activityTracker } from '../../utils/activityTracker';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  // Use IndexedDB store for data, but keep legacy store for UI functions
  const indexedDBStore = useIndexedDBStore();
  const legacyStore = useNotebookStore();
  
  // Use IndexedDB store for data if initialized
  const dataStore = indexedDBStore.isInitialized ? indexedDBStore : legacyStore;
  
  // Get selection states from the appropriate store
  const selectedWorkspace = dataStore.selectedWorkspace;
  const selectedNotebook = dataStore.selectedNotebook;
  const selectedSubFolder = dataStore.selectedSubFolder;
  const expandedNotebooks = dataStore.expandedNotebooks;
  const expandedSubFolders = dataStore.expandedSubFolders;
  const searchQuery = dataStore.searchQuery;
  const selectedTags = dataStore.selectedTags;
  const showNoteList = dataStore.showNoteList;
  
  // Use setters from the appropriate store
  const setSelectedWorkspace = dataStore.setSelectedWorkspace;
  const setSelectedNotebook = dataStore.setSelectedNotebook;
  const setSelectedSubFolder = dataStore.setSelectedSubFolder;
  const toggleNotebookExpanded = dataStore.toggleNotebookExpanded;
  const toggleSubFolderExpanded = dataStore.toggleSubFolderExpanded;
  const setSearchQuery = dataStore.setSearchQuery;
  const setSelectedTags = dataStore.setSelectedTags;
  const setShowNoteList = dataStore.setShowNoteList;

  // Always use legacy store for these functions as they're not in IndexedDB store
  const setShowAddFolderDialog = legacyStore.setShowAddFolderDialog;
  const addWorkspace = legacyStore.addWorkspace;
  const addNotebook = legacyStore.addNotebook;
  const editWorkspace = legacyStore.editWorkspace;

  const { sidebarWidth, updateSidebarWidth, minWidth, maxWidth } = useSidebarResize();

  const [showAddWorkspaceDialog, setShowAddWorkspaceDialog] = useState(false);
  const [showAddNotebookDialog, setShowAddNotebookDialog] = useState(false);
  const [showEditWorkspaceDialog, setShowEditWorkspaceDialog] = useState(false);
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

  const [recentActivities, setRecentActivities] = useState<{
    id: string;
    type: 'created' | 'updated' | 'deleted';
    noteTitle: string;
    timestamp: string;
    folder: string;
  }[]>([]);

  // 実際のアクティビティデータを読み込む
  useEffect(() => {
    const loadActivities = () => {
      const activities = activityTracker.getActivities().slice(0, 3); // 最新3件のみ
      const formattedActivities = activities.map(activity => {
        const activityType = activity.type === 'note_created' ? 'created' as const :
                            activity.type === 'note_updated' ? 'updated' as const :
                            activity.type === 'note_deleted' ? 'deleted' as const :
                            'updated' as const;

        return {
          id: activity.id,
          type: activityType,
          noteTitle: activity.description,
          timestamp: formatTimeAgo(activity.timestamp),
          folder: activity.metadata?.subFolderId || 'ノート'
        };
      });
      
      setRecentActivities(formattedActivities);
    };

    loadActivities();

    // リアルタイム更新を購読
    const unsubscribe = activityTracker.subscribe(() => {
      loadActivities();
    });

    return unsubscribe;
  }, []);

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return '今';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分前`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}時間前`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}日前`;
    return time.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

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
        
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">📝 NoteSpace</h1>
          <div className="flex items-center space-x-2">
            <button
              className={`p-2 rounded-lg transition-colors ${
                showNoteList 
                  ? 'text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-300' 
                  : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900'
              }`}
              onClick={() => setShowNoteList(!showNoteList)}
              title={showNoteList ? 'ノートリストを隠す' : 'ノートリストを表示'}
            >
              {showNoteList ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
            </button>
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
            {recentActivities.length > 0 ? (
              recentActivities.map(activity => (
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
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-gray-500">最近のアクティビティはありません</p>
                <p className="text-xs text-gray-400 mt-1">ノートを作成すると表示されます</p>
              </div>
            )}
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