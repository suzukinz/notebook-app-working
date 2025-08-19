import React, { useState, useCallback, useMemo, Suspense, lazy } from 'react';
import { 
  Home, 
  FileText, 
  Share2, 
  Settings, 
  Plus,
  Search,
  Star,
  Clock,
  ChevronRight,
  Trash2,
  BookOpen,
  Folder,
  Edit3,
  Filter,
  X
} from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { useHaptics } from '../../hooks/useHaptics';
import type { Note } from '../../types';
import MobileEditor from './MobileEditor';
import MobileMarkdownEditor from './MobileMarkdownEditor';
import WorkspaceCreateModal from './WorkspaceCreateModal';
import NotebookCreateModal from './NotebookCreateModal';
import SubFolderCreateModal from './SubFolderCreateModal';
import EditorTypeSelector from './EditorTypeSelector';
import ConfirmDialog from './ConfirmDialog';
import BasicTextareaTest from './BasicTextareaTest';
import AdaptiveFAB from './AdaptiveFAB';
import SmartBreadcrumb from './SmartBreadcrumb';
import MobileSettings from './MobileSettings';
import MobileTagFilter from './MobileTagFilter';
import EmptyStateIllustration from '../ui/EmptyStateIllustration';
import LoadingSpinner from '../ui/LoadingSpinner';

// Lazy load マインドマップコンポーネント
const ObsidianGraphView = lazy(() => import('../mindmap/ObsidianGraphView'));

// Helper functions for safe content access
const getNoteSafeContent = (note: Note): string => {
  if (!note.pages || note.pages.length === 0 || !note.pages[0] || !note.pages[0].content) {
    return 'コンテンツなし';
  }
  const content = note.pages[0].content.replace(/<[^>]*>/g, '');
  return content.substring(0, 100) + (content.length > 100 ? '...' : '');
};

const checkContentMatch = (note: Note, query: string): boolean => {
  if (!note.pages || note.pages.length === 0 || !note.pages[0] || !note.pages[0].content) {
    return false;
  }
  const content = note.pages[0].content.replace(/<[^>]*>/g, '').toLowerCase();
  return content.includes(query.toLowerCase());
};

type MobileTab = 'workspace' | 'notes' | 'mindmap' | 'settings';

const MobileApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MobileTab>('workspace');
  const [showEditor, setShowEditor] = useState(false);
  const [showMarkdownEditor, setShowMarkdownEditor] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [showWorkspaceCreate, setShowWorkspaceCreate] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNotebookCreate, setShowNotebookCreate] = useState(false);
  const [notebookToDelete, setNotebookToDelete] = useState<string | null>(null);
  const [showNotebookDeleteConfirm, setShowNotebookDeleteConfirm] = useState(false);
  const [viewMode, setViewMode] = useState<'notebooks' | 'subfolders' | 'notes'>('notebooks');
  const [showSubFolderCreate, setShowSubFolderCreate] = useState(false);
  const [subFolderToDelete, setSubFolderToDelete] = useState<string | null>(null);
  const [showSubFolderDeleteConfirm, setShowSubFolderDeleteConfirm] = useState(false);
  const [showEditorTypeSelector, setShowEditorTypeSelector] = useState(true); // デバッグ: 強制表示
  const [showSettings, setShowSettings] = useState(false);
  
  const { tapFeedback, successFeedback, selectionFeedback } = useHaptics();
  
  const {
    workspaces,
    notebooks,
    notesData,
    subFoldersData,
    selectedWorkspace,
    selectedNotebook,
    selectedSubFolder,
    showMindMap,
    // selectedNote,
    setSelectedWorkspace,
    setSelectedNotebook,
    setSelectedSubFolder,
    setSelectedNote,
    addNoteToSubFolder,
    deleteWorkspace,
    setShowMindMap,
    // deleteNotebook, // まだ未実装の場合
    // addSubFolder,   // 使用されていない
    // deleteSubFolder // まだ未実装の場合
  } = useNotebookStore();

  // スワイプジェスチャーの検出
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0]?.clientX || 0);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0]?.clientX || 0);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    const tabs: MobileTab[] = ['workspace', 'notes', 'mindmap', 'settings'];
    const currentIndex = tabs.indexOf(activeTab);

    if (isLeftSwipe && currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]!);
    }
    if (isRightSwipe && currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]!);
    }
  };

  // 現在選択されたサブフォルダのノート一覧（メモ化）
  const currentNotes = useMemo(() => notesData[selectedSubFolder] || [], [notesData, selectedSubFolder]);
  
  const recentNotes = useMemo(() => 
    currentNotes
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10),
    [currentNotes]
  );

  const favoriteNotes = useMemo(() => 
    currentNotes.filter(note => note.isFavorite),
    [currentNotes]
  );

  // handleCreateNote function - commented out as it's replaced by AdaptiveFAB
  // const handleCreateNote = () => {
  //   tapFeedback();
  //   
  //   console.log('=== handleCreateNote Debug ===');
  //   console.log('selectedWorkspace:', selectedWorkspace);
  //   console.log('selectedNotebook:', selectedNotebook);
  //   console.log('selectedSubFolder:', selectedSubFolder);
  //   console.log('workspaces:', workspaces);
  //   console.log('notebooks:', notebooks);
  //   console.log('subFoldersData:', subFoldersData);
  //   
  //   // ワークスペースが選択されていない場合、最初のワークスペースを選択
  //   let currentWorkspace = selectedWorkspace;
  //   if (!currentWorkspace && workspaces.length > 0) {
  //     currentWorkspace = workspaces[0].id;
  //     setSelectedWorkspace(currentWorkspace);
  //     console.log('Auto-selected workspace:', currentWorkspace);
  //   }
  //   
  //   // ノートブックが選択されていない場合、最初のノートブックを選択
  //   const currentNotebooks = notebooks[currentWorkspace] || [];
  //   let currentNotebook = selectedNotebook;
  //   if (!currentNotebook && currentNotebooks.length > 0) {
  //     currentNotebook = currentNotebooks[0].id;
  //     setSelectedNotebook(currentNotebook);
  //     console.log('Auto-selected notebook:', currentNotebook);
  //   }
  //   
  //   // サブフォルダーが選択されていない場合、最初のサブフォルダーを選択
  //   const currentSubFolders = subFoldersData[currentNotebook] || [];
  //   let currentSubFolder = selectedSubFolder;
  //   if (!currentSubFolder && currentSubFolders.length > 0) {
  //     currentSubFolder = currentSubFolders[0].id;
  //     setSelectedSubFolder(currentSubFolder);
  //     console.log('Auto-selected subfolder:', currentSubFolder);
  //   }
  //   
  //   console.log('Final selections:', {
  //     workspace: currentWorkspace,
  //     notebook: currentNotebook,
  //     subFolder: currentSubFolder
  //   });
  //   
  //   // 新規ノートを作成（エディタタイプ選択画面を表示）
  //   if (currentSubFolder) {
  //     console.log('Opening editor type selector...');
  //     setShowEditorTypeSelector(true);
  //   } else if (currentNotebook) {
  //     // サブフォルダーがない場合の処理
  //     console.log('No subfolder found, showing alert');
  //     alert('ノートを作成するには、まずサブフォルダーを作成してください。');
  //   } else {
  //     console.log('No workspace/notebook found, showing alert');
  //     alert('ノートを作成するには、まずワークスペースとノートブックを作成してください。');
  //   }
  // };

  const handleEditorTypeSelect = useCallback((editorType: 'rich' | 'markdown') => {
    console.log('=== handleEditorTypeSelect Debug ===');
    console.log('editorType:', editorType);
    console.log('selectedSubFolder:', selectedSubFolder);
    
    // 適切なサブフォルダーが選択されているかチェック
    if (!selectedSubFolder) {
      alert('ノートを作成するには、まずサブフォルダーを選択してください。');
      setShowEditorTypeSelector(false);
      return;
    }
    
    try {
      // ノートを作成
      addNoteToSubFolder(selectedSubFolder, editorType);
      console.log('Note created successfully');
      
      // 作成されたノートに応じてエディタを開く
      if (editorType === 'markdown') {
        console.log('Opening markdown editor');
        setShowMarkdownEditor(true);
      } else {
        console.log('Opening rich text editor');
        setShowEditor(true);
      }
      
      setShowEditorTypeSelector(false);
      successFeedback();
    } catch (error) {
      console.error('Failed to create note:', error);
      alert('ノートの作成に失敗しました。もう一度お試しください。');
      setShowEditorTypeSelector(false);
    }
  }, [selectedSubFolder, addNoteToSubFolder, setShowMarkdownEditor, setShowEditor, setShowEditorTypeSelector, successFeedback]);

  const handleDeleteWorkspace = useCallback((workspaceId: string) => {
    setWorkspaceToDelete(workspaceId);
    setShowDeleteConfirm(true);
  }, []);

  const confirmDeleteWorkspace = useCallback(() => {
    if (workspaceToDelete) {
      deleteWorkspace(workspaceToDelete);
      setWorkspaceToDelete(null);
      // 削除したワークスペースが選択されていた場合、選択を解除
      if (selectedWorkspace === workspaceToDelete) {
        setSelectedWorkspace('');
        setSelectedNotebook('');
        setSelectedSubFolder('');
        setViewMode('notebooks');
      }
      successFeedback();
    }
    setShowDeleteConfirm(false);
  }, [workspaceToDelete, deleteWorkspace, selectedWorkspace, setSelectedWorkspace, setSelectedNotebook, setSelectedSubFolder, setViewMode, successFeedback]);

  const handleDeleteNotebook = useCallback((notebookId: string) => {
    setNotebookToDelete(notebookId);
    setShowNotebookDeleteConfirm(true);
  }, []);

  const confirmDeleteNotebook = useCallback(() => {
    if (notebookToDelete) {
      // deleteNotebook(notebookToDelete); // 一時的に無効化
      console.log('Delete notebook:', notebookToDelete);
      setNotebookToDelete(null);
      // 削除したノートブックが選択されていた場合、選択を解除
      if (selectedNotebook === notebookToDelete) {
        setSelectedNotebook('');
        setViewMode('notebooks');
      }
      successFeedback();
    }
    setShowNotebookDeleteConfirm(false);
  }, [notebookToDelete, selectedNotebook, setSelectedNotebook, setViewMode, successFeedback]);

  const handleDeleteSubFolder = useCallback((subFolderId: string) => {
    setSubFolderToDelete(subFolderId);
    setShowSubFolderDeleteConfirm(true);
  }, []);

  const confirmDeleteSubFolder = useCallback(() => {
    if (subFolderToDelete) {
      // deleteSubFolder(subFolderToDelete); // 一時的に無効化
      console.log('Delete subfolder:', subFolderToDelete);
      setSubFolderToDelete(null);
      // 削除したサブフォルダーが選択されていた場合、選択を解除
      if (selectedSubFolder === subFolderToDelete) {
        setSelectedSubFolder('');
        setViewMode('subfolders');
      }
      successFeedback();
    }
    setShowSubFolderDeleteConfirm(false);
  }, [subFolderToDelete, selectedSubFolder, setSelectedSubFolder, setViewMode, successFeedback]);

  const renderWorkspaceTab = () => (
    <div className="h-full bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">ワークスペース</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">プロジェクトを選択してください</p>
          </div>
          <button
            onClick={() => {
              tapFeedback();
              setShowWorkspaceCreate(true);
            }}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Plus size={20} className="text-white" />
          </button>
        </div>
      </div>

      {/* ワークスペース一覧 */}
      <div className="p-4 space-y-3">
        {workspaces.length === 0 ? (
          <div className="text-center py-16 px-4">
            <EmptyStateIllustration type="workspace" className="w-40 h-40 mx-auto mb-6" />
            <h3 className="text-2xl font-bold brand-gradient-text mb-3">
              ワークスペースがありません
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm mx-auto leading-relaxed">
              プロジェクトを整理するための最初のワークスペースを作成して、効率的なノート管理を始めましょう
            </p>
            <button
              onClick={() => {
                tapFeedback();
                setShowWorkspaceCreate(true);
              }}
              className="group relative px-8 py-4 brand-gradient-primary text-white font-semibold rounded-2xl 
                       shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95
                       before:absolute before:inset-0 before:rounded-2xl before:opacity-0 
                       before:bg-gradient-to-r before:from-white/20 before:to-transparent
                       hover:before:opacity-100 before:transition-opacity before:duration-300"
            >
              <span className="relative z-10 flex items-center space-x-2">
                <Plus size={20} />
                <span>ワークスペースを作成</span>
              </span>
            </button>
          </div>
        ) : (
          workspaces.map((workspace) => (
            <div key={workspace.id} className="relative">
              <div
                className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 active:bg-gray-50 dark:active:bg-gray-700 transition-colors ${
                  selectedWorkspace === workspace.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => {
                  selectionFeedback();
                  setSelectedWorkspace(workspace.id);
                  setActiveTab('notes');
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold mr-3"
                      style={{ backgroundColor: workspace.color }}
                    >
                      {workspace.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{workspace.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {notebooks[workspace.id]?.length || 0} ノートブック
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        tapFeedback();
                        handleDeleteWorkspace(workspace.id);
                      }}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors mr-2"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                    <ChevronRight size={20} className="text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderNotesTab = () => {
    if (!selectedWorkspace) {
      return (
        <div className="h-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              ワークスペースを選択してください
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              まずワークスペースタブからワークスペースを選択してください
            </p>
            <button
              onClick={() => {
                tapFeedback();
                setActiveTab('workspace');
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
            >
              ワークスペースに移動
            </button>
          </div>
        </div>
      );
    }

    const currentNotebooks = notebooks[selectedWorkspace] || [];

    if (viewMode === 'notebooks') {
      return (
        <div className="h-full bg-gray-50 dark:bg-gray-900">
          {/* スマートブレッドクラム */}
          <SmartBreadcrumb 
            currentView="notebooks"
            onNavigate={(view) => {
              if (view === 'workspace') {
                setViewMode('notebooks');
              }
            }}
          />
          
          {/* ヘッダーアクション */}
          <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">ノートブック一覧</h2>
              <button
                onClick={() => {
                  tapFeedback();
                  setShowNotebookCreate(true);
                }}
                className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Plus size={20} className="text-white" />
              </button>
            </div>
          </div>

          {/* ノートブック一覧 */}
          <div className="p-4 space-y-3">
            {currentNotebooks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  ノートブックがありません
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  最初のノートブックを作成しましょう
                </p>
                <button
                  onClick={() => {
                    tapFeedback();
                    setShowNotebookCreate(true);
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                >
                  ノートブックを作成
                </button>
              </div>
            ) : (
              currentNotebooks.map((notebook) => {
                const subfolderCount = subFoldersData[notebook.id]?.length || 0;
                const noteCount = Object.values(notesData).flat().filter(note => 
                  subFoldersData[notebook.id]?.some(sf => notesData[sf.id]?.includes(note))
                ).length;
                
                return (
                  <div key={notebook.id} className="relative">
                    <div
                      className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 active:bg-gray-50 dark:active:bg-gray-700 transition-colors ${
                        selectedNotebook === notebook.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => {
                        selectionFeedback();
                        setSelectedNotebook(notebook.id);
                        setViewMode('subfolders');
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white mr-3"
                            style={{ backgroundColor: notebook.color }}
                          >
                            <BookOpen size={20} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{notebook.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {notebook.description || 'ノートブックの説明'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {subfolderCount} サブフォルダー • {noteCount} ノート
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              tapFeedback();
                              handleDeleteNotebook(notebook.id);
                            }}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors mr-2"
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                          <ChevronRight size={20} className="text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      );
    }

    // サブフォルダー表示モード
    if (viewMode === 'subfolders') {
      const currentSubFolders = subFoldersData[selectedNotebook] || [];
      
      return (
        <div className="h-full bg-gray-50 dark:bg-gray-900">
          {/* スマートブレッドクラム */}
          <SmartBreadcrumb 
            currentView="subfolders"
            onNavigate={(view) => {
              if (view === 'workspace') {
                setViewMode('notebooks');
              } else if (view === 'notebooks') {
                setViewMode('notebooks');
              }
            }}
          />
          
          {/* ヘッダーアクション */}
          <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">サブフォルダー一覧</h2>
              <button
                onClick={() => {
                  tapFeedback();
                  setShowSubFolderCreate(true);
                }}
                className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Plus size={20} className="text-white" />
              </button>
            </div>
          </div>

          {/* サブフォルダー一覧 */}
          <div className="p-4 space-y-3">
            {currentSubFolders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Folder size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  サブフォルダーがありません
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  最初のサブフォルダーを作成しましょう
                </p>
                <button
                  onClick={() => {
                    tapFeedback();
                    setShowSubFolderCreate(true);
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                >
                  サブフォルダーを作成
                </button>
              </div>
            ) : (
              currentSubFolders.map((subFolder) => {
                const noteCount = notesData[subFolder.id]?.length || 0;
                
                return (
                  <div key={subFolder.id} className="relative">
                    <div
                      className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 active:bg-gray-50 dark:active:bg-gray-700 transition-colors ${
                        selectedSubFolder === subFolder.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => {
                        selectionFeedback();
                        setSelectedSubFolder(subFolder.id);
                        setViewMode('notes');
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white mr-3"
                            style={{ backgroundColor: subFolder.color }}
                          >
                            <Folder size={20} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{subFolder.name}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {noteCount} ノート
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              tapFeedback();
                              handleDeleteSubFolder(subFolder.id);
                            }}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors mr-2"
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                          <ChevronRight size={20} className="text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      );
    }

    // ノート表示モード
    return (
      <div className="h-full bg-gray-50 dark:bg-gray-900">
        {/* スマートブレッドクラム */}
        <SmartBreadcrumb 
          currentView="notes"
          onNavigate={(view) => {
            if (view === 'workspace') {
              setViewMode('notebooks');
            } else if (view === 'notebooks') {
              setViewMode('notebooks');
            } else if (view === 'subfolders') {
              setViewMode('subfolders');
            }
          }}
        />
        
        {/* ヘッダーアクション */}
        <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">ノート一覧</h2>
          </div>
        </div>

        {/* エディタタイプ選択ボタン */}
        <div className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => handleEditorTypeSelect('rich')}
              className="flex-1 flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Edit3 size={20} className="text-blue-600 dark:text-blue-400 mr-2" />
              <span className="font-medium text-blue-700 dark:text-blue-300">リッチテキスト</span>
            </button>
            
            <button
              onClick={() => handleEditorTypeSelect('markdown')}
              className="flex-1 flex items-center justify-center p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <FileText size={20} className="text-green-600 dark:text-green-400 mr-2" />
              <span className="font-medium text-green-700 dark:text-green-300">Markdown</span>
            </button>
          </div>
        </div>

        {/* 検索バー */}
        <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="relative mb-3">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ノートを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-12 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => setShowTagFilter(!showTagFilter)}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg transition-colors ${
                showTagFilter || selectedTags.length > 0
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title="タグフィルター"
            >
              <Filter size={16} />
            </button>
          </div>
          
          {/* タグフィルター */}
          {showTagFilter && (
            <MobileTagFilter
              selectedTags={selectedTags}
              onTagSelect={setSelectedTags}
              onClose={() => setShowTagFilter(false)}
            />
          )}
          
          {/* 選択中のタグ表示 */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                  className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800"
                >
                  <span className="mr-1">{tag}</span>
                  <X size={10} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ノート一覧 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 検索結果表示 */}
          {(searchQuery || selectedTags.length > 0) && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {searchQuery && selectedTags.length > 0 
                  ? `「${searchQuery}」+ ${selectedTags.length}タグの検索結果: `
                  : searchQuery 
                    ? `「${searchQuery}」の検索結果: `
                    : `${selectedTags.length}タグの絞り込み結果: `
                } {
                  currentNotes.filter(note => {
                    const matchesSearch = !searchQuery || 
                      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      checkContentMatch(note, searchQuery);
                    const matchesTags = selectedTags.length === 0 || 
                      selectedTags.every(tag => (note.tags || []).includes(tag));
                    return matchesSearch && matchesTags;
                  }).length
                } 件
              </p>
            </div>
          )}

          {/* お気に入りノート */}
          {favoriteNotes.filter(note => {
            const matchesSearch = !searchQuery || 
              note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              checkContentMatch(note, searchQuery);
            const matchesTags = selectedTags.length === 0 || 
              selectedTags.every(tag => (note.tags || []).includes(tag));
            return matchesSearch && matchesTags;
          }).length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <Star size={18} className="mr-2 text-yellow-500" />
                お気に入り
              </h2>
              <div className="space-y-3">
                {favoriteNotes
                  .filter(note => {
                    const matchesSearch = !searchQuery || 
                      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      checkContentMatch(note, searchQuery);
                    const matchesTags = selectedTags.length === 0 || 
                      selectedTags.every(tag => (note.tags || []).includes(tag));
                    return matchesSearch && matchesTags;
                  })
                  .map((note) => (
                    <div
                      key={note.id}
                      className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 
                               shadow-md hover:shadow-2xl border border-gray-200/50 dark:border-gray-700/50 
                               active:bg-gray-50 dark:active:bg-gray-700 
                               transition-all duration-500 transform hover:scale-105 active:scale-95
                               glass-morphism hover:backdrop-blur-lg
                               before:absolute before:inset-0 before:rounded-2xl before:opacity-0 
                               before:bg-gradient-to-br before:from-blue-500/10 before:to-purple-500/10
                               hover:before:opacity-100 before:transition-opacity before:duration-300"
                      onClick={() => {
                        tapFeedback();
                        setSelectedNote(note);
                        // ノートのエディタタイプに基づいて適切なエディタを開く
                        if (note.editorType === 'markdown') {
                          setShowMarkdownEditor(true);
                        } else {
                          setShowEditor(true);
                        }
                      }}
                    >
                      <h3 className="font-semibold text-lg brand-gradient-text relative z-10 
                                  group-hover:scale-105 transition-transform duration-300">
                      {note.title}
                    </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {getNoteSafeContent(note)}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(note.updatedAt).toLocaleDateString()}
                        </span>
                        <Star size={16} className="text-yellow-500 fill-current" />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 最近のノート */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
              <Clock size={18} className="mr-2 text-blue-500" />
              {searchQuery ? '検索結果' : '最近のノート'}
            </h2>
            <div className="space-y-3">
              {recentNotes
                .filter(note => {
                  const matchesSearch = !searchQuery || 
                    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    checkContentMatch(note, searchQuery);
                  const matchesTags = selectedTags.length === 0 || 
                    selectedTags.every(tag => (note.tags || []).includes(tag));
                  return matchesSearch && matchesTags;
                })
                .map((note) => (
                  <div
                    key={note.id}
                    className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 
                               shadow-md hover:shadow-2xl border border-gray-200/50 dark:border-gray-700/50 
                               active:bg-gray-50 dark:active:bg-gray-700 
                               transition-all duration-500 transform hover:scale-105 active:scale-95
                               glass-morphism hover:backdrop-blur-lg
                               before:absolute before:inset-0 before:rounded-2xl before:opacity-0 
                               before:bg-gradient-to-br before:from-blue-500/10 before:to-purple-500/10
                               hover:before:opacity-100 before:transition-opacity before:duration-300"
                    onClick={() => {
                      tapFeedback();
                      setSelectedNote(note);
                      // ノートのエディタタイプに基づいて適切なエディタを開く
                      if (note.editorType === 'markdown') {
                        setShowMarkdownEditor(true);
                      } else {
                        setShowEditor(true);
                      }
                    }}
                  >
                    <h3 className="font-semibold text-lg brand-gradient-text relative z-10 
                                  group-hover:scale-105 transition-transform duration-300">
                      {note.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {getNoteSafeContent(note)}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </span>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>
                  </div>
                ))}
            </div>

            {/* 検索結果なしの表示 */}
            {(searchQuery || selectedTags.length > 0) && recentNotes.filter(note => {
              const matchesSearch = !searchQuery || 
                note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (note.pages[0]?.content || '').toLowerCase().includes(searchQuery.toLowerCase());
              const matchesTags = selectedTags.length === 0 || 
                selectedTags.every(tag => (note.tags || []).includes(tag));
              return matchesSearch && matchesTags;
            }).length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  検索結果が見つかりません
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  別のキーワードで検索してください
                </p>
                <button
                  onClick={() => {
                    tapFeedback();
                    setSearchQuery('');
                    setSelectedTags([]);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  検索をクリア
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMindmapTab = () => {
    return (
      <div className="h-full bg-gray-50 dark:bg-gray-900">
        {/* ヘッダー */}
        <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">マインドマップ</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">ノート間の関係性を視覚化</p>
            </div>
            <button
              onClick={() => {
                tapFeedback();
                setShowMindMap(true);
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              開く
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-4">
          {/* マインドマップ機能の説明 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Share2 size={32} className="text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                グラフビューで探索
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                ワークスペース、ノートブック、サブフォルダー、ノートの関係性を
                インタラクティブなグラフで視覚化できます。
              </p>
            </div>
          </div>

          {/* 機能一覧 */}
          <div className="space-y-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400">🔍</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">検索機能</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Ctrl+F でノードを検索</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400">⌨️</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">キーボード操作</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">矢印キーでノードを選択・移動</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-600 dark:text-yellow-400">💾</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">レイアウト保存</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">お気に入りの配置を保存</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400">🎨</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">レイアウト切り替え</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">上下左右の柔軟なレイアウト</p>
                </div>
              </div>
            </div>
          </div>

          {/* クイックアクション */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">クイックアクション</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  tapFeedback();
                  // ワークスペースビューで開く
                  setShowMindMap(true);
                }}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 dark:text-blue-400">🏢</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">ワークスペース</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">全体を表示</p>
                </div>
              </button>

              <button
                onClick={() => {
                  tapFeedback();
                  if (selectedWorkspace) {
                    setShowMindMap(true);
                  } else {
                    alert('ワークスペースを選択してください');
                  }
                }}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="text-center">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-green-600 dark:text-green-400">📚</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">現在の選択</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">フォーカス表示</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };


  const renderSettingsTab = () => {
    if (showSettings) {
      return <MobileSettings onClose={() => setShowSettings(false)} />;
    }
    
    return (
      <div className="h-full bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">設定</h1>
        </div>
        
        <div className="p-4">
          <button
            onClick={() => {
              tapFeedback();
              setShowSettings(true);
            }}
            className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Settings size={20} />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900 dark:text-white">詳細設定</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">テーマ、通知、プライバシーなど</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </div>
          </button>
        </div>
        
        {/* 基本テストエリア（開発中） */}
        <BasicTextareaTest />
      </div>
    );
  };

  const tabs = [
    { id: 'workspace', label: 'ワークスペース', icon: Home, render: renderWorkspaceTab },
    { id: 'notes', label: 'ノート', icon: FileText, render: renderNotesTab },
    { id: 'mindmap', label: 'マップ', icon: Share2, render: renderMindmapTab },
    { id: 'settings', label: '設定', icon: Settings, render: renderSettingsTab }
  ];

  return (
    <div 
      className="h-screen bg-white dark:bg-gray-900 flex flex-col relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* メインコンテンツ */}
      <div className="flex-1 pb-20 overflow-hidden">
        {tabs.find(tab => tab.id === activeTab)?.render()}
      </div>

      {/* 適応的FAB */}
      {activeTab === 'notes' && (
        <AdaptiveFAB
          onCreateNote={handleEditorTypeSelect}
          onVoiceInput={() => {
            // 音声入力機能の実装予定
            console.log('Voice input requested');
          }}
          onSettings={() => {
            setActiveTab('settings');
          }}
        />
      )}

      {/* ボトムタブナビゲーション */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-2 py-2 z-10">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => {
                  selectionFeedback();
                  setActiveTab(tab.id as MobileTab);
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[64px] transition-colors ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-blue-600 dark:text-blue-400' : ''} />
                <span className={`text-xs mt-1 ${isActive ? 'font-medium' : ''}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* エディタタイプ選択 */}
      <EditorTypeSelector
        isOpen={showEditorTypeSelector}
        onClose={() => setShowEditorTypeSelector(false)}
        onSelect={handleEditorTypeSelect}
      />

      {/* エディタ表示（ノートのeditorTypeに基づく） */}
      <MobileEditor 
        isOpen={showEditor} 
        onClose={() => setShowEditor(false)}
      />

      <MobileMarkdownEditor 
        isOpen={showMarkdownEditor} 
        onClose={() => setShowMarkdownEditor(false)}
      />

      {/* ワークスペース作成モーダル */}
      <WorkspaceCreateModal
        isOpen={showWorkspaceCreate}
        onClose={() => setShowWorkspaceCreate(false)}
      />

      {/* ノートブック作成モーダル */}
      <NotebookCreateModal
        isOpen={showNotebookCreate}
        onClose={() => setShowNotebookCreate(false)}
      />

      {/* サブフォルダー作成モーダル */}
      <SubFolderCreateModal
        isOpen={showSubFolderCreate}
        onClose={() => setShowSubFolderCreate(false)}
      />

      {/* ワークスペース削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setWorkspaceToDelete(null);
        }}
        onConfirm={confirmDeleteWorkspace}
        title="ワークスペースを削除"
        message={`"${workspaces.find(w => w.id === workspaceToDelete)?.name}" を削除しますか？\n\nこの操作は取り消せません。`}
        confirmText="削除"
        cancelText="キャンセル"
        type="danger"
      />

      {/* ノートブック削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={showNotebookDeleteConfirm}
        onClose={() => {
          setShowNotebookDeleteConfirm(false);
          setNotebookToDelete(null);
        }}
        onConfirm={confirmDeleteNotebook}
        title="ノートブックを削除"
        message={`"${notebooks[selectedWorkspace]?.find(nb => nb.id === notebookToDelete)?.name}" を削除しますか？\n\nこの操作は取り消せません。`}
        confirmText="削除"
        cancelText="キャンセル"
        type="danger"
      />

      {/* サブフォルダー削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={showSubFolderDeleteConfirm}
        onClose={() => {
          setShowSubFolderDeleteConfirm(false);
          setSubFolderToDelete(null);
        }}
        onConfirm={confirmDeleteSubFolder}
        title="サブフォルダーを削除"
        message={`"${subFoldersData[selectedNotebook]?.find(sf => sf.id === subFolderToDelete)?.name}" を削除しますか？\n\nこの操作は取り消せません。`}
        confirmText="削除"
        cancelText="キャンセル"
        type="danger"
      />

      {/* マインドマップ表示 */}
      {showMindMap && (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50">
          <div className="h-full w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">マインドマップ</h2>
              <button
                onClick={() => {
                  tapFeedback();
                  setShowMindMap(false);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="h-[calc(100%-64px)]">
              <Suspense fallback={
                <div className="h-full flex items-center justify-center">
                  <LoadingSpinner text="マインドマップを読み込み中..." />
                </div>
              }>
                <ObsidianGraphView />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileApp;