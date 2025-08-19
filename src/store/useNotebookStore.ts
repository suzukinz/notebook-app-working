import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { NotebookStore, NotebookState, NodePosition, Note } from '../types';
import { exportData, importData, downloadData, uploadFile } from '../utils/dataManager';
import { offlineManager } from '../utils/offlineManager';
import { debounce } from '../utils/debounce';
import { logger } from '../utils/logger';
import { autoSyncManager } from '../utils/autoSyncManager';
import { searchIndex, saveSearchIndex, loadSearchIndex } from '../utils/searchIndex';
import { supabase } from '../utils/supabaseSync';
import { syncStateManager } from '../utils/syncStateManager';
import { syncCoordinator } from '../utils/syncCoordinator';
import { activityTracker } from '../utils/activityTracker';
// import { syncManager } from '../utils/supabaseSync';

// 初期データ - デフォルトフォルダを含む4段階階層
const subFoldersInitial = {
  'projects': [
    { id: 'frontend', name: 'Frontend', color: 'blue', count: 0 },
    { id: 'backend', name: 'Backend', color: 'green', count: 0 },
    { id: 'database', name: 'Database', color: 'yellow', count: 0 }
  ],
  'meetings': [
    { id: 'standup', name: 'Standup', color: 'orange', count: 0 },
    { id: 'planning', name: 'Planning', color: 'red', count: 0 }
  ],
  'diary': [
    { id: 'daily', name: '日記', color: 'pink', count: 0 },
    { id: 'travel', name: '旅行', color: 'purple', count: 0 }
  ],
  'tech': [
    { id: 'programming', name: 'プログラミング', color: 'indigo', count: 0 },
    { id: 'tools', name: 'ツール', color: 'gray', count: 0 }
  ]
};

const notesInitial = {
  'frontend': [],
  'backend': [],
  'database': [],
  'standup': [],
  'planning': [],
  'daily': [],
  'travel': [],
  'programming': [],
  'tools': []
};

// ローカルストレージからデータを読み込む
const loadFromStorage = () => {
  try {
    const stored = localStorage.getItem('notebook-store');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.error('Failed to load from localStorage:', error);
  }
  return null;
};

// ローカルストレージにデータを保存する（デバウンス化）
const saveToStorage = debounce((data: Partial<NotebookState>) => {
  try {
    localStorage.setItem('notebook-store', JSON.stringify(data));
    logger.info('Data saved to localStorage');
  } catch (error) {
    logger.error('Failed to save to localStorage:', error);
  }
}, 1000); // 1秒のデバウンス

const storedData = loadFromStorage();

// 検索インデックスの初期化
loadSearchIndex();

// ストアデータから検索インデックスを初期リビルド
if (storedData?.notesData) {
  searchIndex.rebuild(storedData.notesData);
}

// 検索インデックスの更新（デバウンス化）
const updateSearchIndex = debounce((notesData: Record<string, Note[]>) => {
  searchIndex.rebuild(notesData);
  saveSearchIndex();
}, 2000); // 2秒のデバウンス

// ✅ 緊急修正: 同期関数が既に下部で定義されているので削除

// ✅ SuperClaude強化: デバウンス化された同期処理は
const debouncedSupabaseSync = debounce((state: NotebookState) => {
  // Supabase同期のデバウンス処理（バッチ処理用）
  if (syncStateManager.canTriggerSync() && !state.isSyncing) {
    syncCoordinator.scheduleSupabaseSync(state, 4) // 低優先度（バッチ）
      .then(() => {
        logger.debug('✅ Batch Supabase sync scheduled');
      })
      .catch((error) => {
        logger.warn('⚠️ Batch Supabase sync failed:', error);
      });
  }
}, 5000); // 5秒デバウンス（バッチ処理）

// Supabaseにデータを同期する関数
const syncSupabaseData = async (state: NotebookState) => {
  if (!supabase) return;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // プロファイルが存在するか確認、なければ作成
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      console.log('👤 プロファイルを作成中...');
      await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    // ワークスペースを同期
    for (const workspace of state.workspaces) {
      await supabase
        .from('workspaces')
        .upsert({
          id: workspace.id,
          name: workspace.name,
          user_id: user.id,
          updated_at: new Date().toISOString()
        });
    }

    // ノートブックを同期
    for (const [workspaceId, notebooks] of Object.entries(state.notebooks)) {
      for (const notebook of notebooks) {
        await supabase
          .from('notebooks')
          .upsert({
            id: notebook.id,
            name: notebook.name,
            color: notebook.color,
            image: notebook.image,
            workspace_id: workspaceId,
            user_id: user.id,
            updated_at: new Date().toISOString()
          });
      }
    }

    // サブフォルダを同期
    for (const [notebookId, subfolders] of Object.entries(state.subFoldersData)) {
      for (const subfolder of subfolders) {
        await supabase
          .from('subfolders')
          .upsert({
            id: subfolder.id,
            name: subfolder.name,
            color: subfolder.color,
            image: subfolder.image,
            notebook_id: notebookId,
            user_id: user.id,
            updated_at: new Date().toISOString()
          });
      }
    }

    // ノートを同期
    for (const [subfolderId, notes] of Object.entries(state.notesData)) {
      for (const note of notes) {
        try {
          const noteData = {
            id: note.id.toString(),
            title: note.title || 'Untitled',
            content: note.pages?.[0]?.content || '',
            content_type: note.editorType || 'rich',
            pages: note.pages || [],
            tags: note.tags || [],
            is_favorite: note.isFavorite || false,
            is_pinned: note.isPinned || false,
            subfolder_id: subfolderId,
            user_id: user.id,
            updated_at: new Date().toISOString()
          };
          
          console.log('📤 Supabaseに送信するノートデータ:', noteData);
          
          const result = await supabase
            .from('notes')
            .upsert(noteData);
            
          if (result.error) {
            console.error('❌ Supabase upsert エラー:', result.error);
          }
        } catch (error) {
          console.error('❌ ノート同期エラー:', error);
        }
      }
    }

    logger.info('✅ Supabaseへのデータ同期完了');
  } catch (error) {
    logger.error('❌ Supabase同期エラー:', error);
  }
};

// Supabaseからデータを読み込む関数
const loadSupabaseData = async (userId: string): Promise<Partial<NotebookState> | null> => {
  if (!supabase) return null;
  
  try {
    // 各テーブルからデータを取得
    const [workspacesRes, notebooksRes, subfoldersRes, notesRes] = await Promise.all([
      supabase.from('workspaces').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('notebooks').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('subfolders').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('notes').select('*').eq('user_id', userId).order('created_at')
    ]);

    if (workspacesRes.error) throw workspacesRes.error;
    if (notebooksRes.error) throw notebooksRes.error;
    if (subfoldersRes.error) throw subfoldersRes.error;
    if (notesRes.error) throw notesRes.error;

    // データを変換
    const workspaces = workspacesRes.data.map((w: any) => ({
      id: w.id,
      name: w.name,
      icon: '📁',
      color: 'blue'
    }));

    const notebooks: Record<string, any[]> = {};
    notebooksRes.data.forEach((n: any) => {
      if (!notebooks[n.workspace_id]) notebooks[n.workspace_id] = [];
      notebooks[n.workspace_id]!.push({
        id: n.id,
        name: n.name,
        color: n.color || 'blue',
        image: n.image,
        count: 0 // ノート数の初期値を0に設定
      });
    });

    const subFoldersData: Record<string, any[]> = {};
    subfoldersRes.data.forEach((s: any) => {
      if (!subFoldersData[s.notebook_id]) subFoldersData[s.notebook_id] = [];
      subFoldersData[s.notebook_id]!.push({
        id: s.id,
        name: s.name,
        color: s.color || 'blue',
        image: s.image,
        count: 0 // サブフォルダ内のノート数の初期値を0に設定
      });
    });

    const notesData: Record<string, any[]> = {};
    notesRes.data.forEach((n: any) => {
      if (!notesData[n.subfolder_id]) notesData[n.subfolder_id] = [];
      
      // pagesが配列か文字列かをチェック
      let pages;
      try {
        if (typeof n.pages === 'string') {
          pages = JSON.parse(n.pages);
        } else if (Array.isArray(n.pages)) {
          pages = n.pages;
        } else {
          pages = [{ id: 0, title: "Page 1", content: n.content || '' }];
        }
      } catch (e) {
        pages = [{ id: 0, title: "Page 1", content: n.content || '' }];
      }
      
      notesData[n.subfolder_id]!.push({
        id: parseInt(n.id),
        title: n.title,
        pages: pages,
        tags: n.tags || [],
        isFavorite: n.is_favorite || false,
        isPinned: n.is_pinned || false,
        editorType: n.content_type === 'markdown' ? 'markdown' : 'rich',
        createdAt: n.created_at,
        ...(n.updated_at && { updatedAt: n.updated_at })
      });
    });

    // 実際のノート数に基づいてカウントを再計算
    const updatedSubFoldersData = { ...subFoldersData };
    const updatedNotebooks = { ...notebooks };
    
    // サブフォルダのカウントを実際のノート数で更新
    Object.keys(updatedSubFoldersData).forEach(notebookId => {
      const subFolders = updatedSubFoldersData[notebookId];
      if (!subFolders) return;
      
      const subFolderCount = subFolders.length; // サブフォルダの数
      
      updatedSubFoldersData[notebookId] = subFolders.map(subFolder => {
        const noteCount = notesData[subFolder.id]?.length || 0;
        return { ...subFolder, count: noteCount };
      });
      
      // 対応するノートブックのカウントをサブフォルダ数で更新
      Object.keys(updatedNotebooks).forEach(workspaceId => {
        const workspaceNotebooks = updatedNotebooks[workspaceId];
        if (!workspaceNotebooks) return;
        
        updatedNotebooks[workspaceId] = workspaceNotebooks.map(notebook => 
          notebook.id === notebookId 
            ? { ...notebook, count: subFolderCount }
            : notebook
        );
      });
    });

    logger.info('✅ Supabaseからのデータ読み込み完了（カウント計算済み）');
    
    return {
      workspaces,
      notebooks: updatedNotebooks,
      subFoldersData: updatedSubFoldersData,
      notesData
    };
  } catch (error) {
    logger.error('❌ Supabaseデータ読み込みエラー:', error);
    return null;
  }
};

export const useNotebookStore = create<NotebookStore>()(
  devtools(
    (set, get) => {
      // 状態変更時の自動保存 - Serena MCP分析に基づく安全な実装
      const originalSet = set;
      let updateCounter = 0; // 呼び出し回数カウンター
      let lastUpdateTime = 0; // 最後の更新時刻
      
      const wrappedSet = (state: Partial<NotebookState> | ((state: NotebookState) => Partial<NotebookState>)) => {
        const now = Date.now();
        
        // ⭐️ 無限ループ防止: より严格な制限
        if (now - lastUpdateTime < 100) {
          updateCounter++;
          if (updateCounter > 5) {
            console.warn('🚨 wrappedSet: 無限ループを防止しました');
            return;
          }
        } else {
          updateCounter = 0;
        }
        lastUpdateTime = now;
        
        // 🔄 統一ループ防止システム（一時的に無効化）
        // if (!syncStateManager.canTriggerSync()) {
        //   logger.debug('Sync operation blocked by syncStateManager');
        //   return;
        // }
        
        syncStateManager.setSyncFlag('isUpdatingFromStorage', true);
        
        try {
          originalSet(state);
          
          const currentState = get();
          const persistData = {
            selectedWorkspace: currentState.selectedWorkspace,
            selectedNotebook: currentState.selectedNotebook,
            selectedSubFolder: currentState.selectedSubFolder,
            selectedNote: currentState.selectedNote, // ⭐️ 追加: selectedNoteも永続化
            currentPage: currentState.currentPage, // ⭐️ 追加: currentPageも永続化
            expandedNotebooks: currentState.expandedNotebooks,
            expandedSubFolders: currentState.expandedSubFolders,
            viewMode: currentState.viewMode,
            showNoteList: currentState.showNoteList,
            sidebarExpanded: currentState.sidebarExpanded,
            workspaces: currentState.workspaces,
            notebooks: currentState.notebooks,
            notesData: currentState.notesData,
            subFoldersData: currentState.subFoldersData,
          };
          
          // ローカルストレージ保存
          saveToStorage(persistData);
          
          // IndexedDBにも手動でバックアップ保存（データ永続化のため）
          try {
            if (typeof window !== 'undefined' && window.indexedDB) {
              // IndexedDBManagerを使って重要データを保存
              const indexedDBManager = (window as any).indexedDBManager;
              if (indexedDBManager && indexedDBManager.isInitialized) {
                // 非同期でバックアップ（エラーは無視）
                setTimeout(async () => {
                  try {
                    await indexedDBManager.setSetting('legacy_backup', {
                      workspaces: currentState.workspaces,
                      notebooks: currentState.notebooks,
                      subFoldersData: currentState.subFoldersData,
                      notesData: currentState.notesData,
                      timestamp: Date.now()
                    });
                    console.log('🔄 Legacy data backed up to IndexedDB');
                  } catch (error) {
                    console.log('⚠️ Failed to backup legacy data:', error);
                  }
                }, 100);
              }
            }
          } catch (error) {
            // IndexedDBエラーは無視（フォールバック）
            console.log('⚠️ IndexedDB backup skipped:', error);
          }
          
          // 検索インデックス更新（エラーハンドリング付き）
          try {
            updateSearchIndex(currentState.notesData);
          } catch (error) {
            logger.warn('Failed to update search index:', error);
          }
          
          // ✅ SuperClaude強化版: 安全な同期処理の再有効化
          // SyncCoordinatorを使用したインテリジェントな同期制御
          
          // デバイス間同期（高優先度）
          if (syncStateManager.canTriggerSync('noteUpdate') && autoSyncManager.isRunning()) {
            syncCoordinator.scheduleDeviceSync(currentState, 8) // 高優先度
              .then(() => {
                logger.debug('✅ Device sync scheduled via SyncCoordinator');
              })
              .catch((error) => {
                logger.warn('⚠️ Device sync scheduling failed:', error);
              });
          }

          // Supabase同期（中優先度 + バッチ処理）
          if (syncStateManager.canTriggerSync('noteUpdate') && !get().isSyncing) {
            // 即座同期（中優先度）
            syncCoordinator.scheduleSupabaseSync(currentState, 6)
              .then(() => {
                logger.debug('✅ Immediate Supabase sync scheduled');
              })
              .catch((error) => {
                logger.warn('⚠️ Immediate Supabase sync failed:', error);
              });
            
            // バッチ同期（デバウンス化）
            debouncedSupabaseSync(currentState);
          }
          
        } finally {
          syncStateManager.setSyncFlag('isUpdatingFromStorage', false);
          syncStateManager.setOperationFlag('noteUpdate', false); // 操作完了フラグ
        }
      };
      
      return {
      // 初期状態（ストレージから復元または空の状態）
      selectedWorkspace: storedData?.selectedWorkspace || 'work',
      selectedNotebook: storedData?.selectedNotebook || 'projects',
      selectedSubFolder: storedData?.selectedSubFolder || 'frontend',
      selectedNote: storedData?.selectedNote || null, // ⭐️ 修正: selectedNoteの復元
      currentPage: typeof storedData?.currentPage === 'number' ? storedData.currentPage : 0, // ⭐️ 修正: currentPageの安全な復元
      isSyncing: false,
      
      searchQuery: '',
      selectedTags: [],
      listViewMode: 'list',
      showNoteList: false, // 強制的にデフォルト値を適用
      sidebarExpanded: false, // 強制的にデフォルト値を適用（アイコン表示）
      
      expandedNotebooks: storedData?.expandedNotebooks || [],
      expandedSubFolders: storedData?.expandedSubFolders || [],
      
      showMindMap: false,
      showDashboard: false,
      // Fix for routing issue: Ensure viewMode defaults to 'home' if stored data is problematic
      viewMode: (() => {
        const storedViewMode = storedData?.viewMode;
        // If no stored data or stored data is valid, use stored value, otherwise default to 'home'
        if (!storedViewMode || ['home', 'notes', 'dashboard'].includes(storedViewMode)) {
          return storedViewMode || 'home';
        }
        console.log('🔧 Invalid viewMode in storage, defaulting to home:', storedViewMode);
        return 'home';
      })(),
      mindMapZoom: 1,
      mindMapLevel: 'workspace',
      mindMapFocus: null,
      mindMapHistory: [],
      
      previewNote: null,
      previewPage: 0,
      
      notesData: (() => {
        const storedNotes = storedData?.notesData || {};
        // 既存データが存在する場合はそれを優先、空の場合のみデフォルトを適用
        if (Object.keys(storedNotes).length > 0) {
          return storedNotes;
        }
        return notesInitial;
      })(),
      subFoldersData: (() => {
        const storedSubFolders = storedData?.subFoldersData || {};
        // 既存データが存在する場合はそれを優先、空の場合のみデフォルトを適用
        if (Object.keys(storedSubFolders).length > 0) {
          return storedSubFolders;
        }
        return subFoldersInitial;
      })(),
      
      showAddFolderDialog: false,
      newFolderName: '',
      newFolderColor: 'gray',
      
      editableTitle: '',
      editablePageTitle: '',
      editableContent: '',
      previewEditableTitle: '',
      previewEditablePageTitle: '',
      previewEditableContent: '',
      
      // 動的データ - 既存データを優先
      workspaces: (() => {
        const storedWorkspaces = storedData?.workspaces || [];
        // 既存データが存在する場合はそれを優先、空の場合のみデフォルトを適用
        if (storedWorkspaces.length > 0) {
          return storedWorkspaces;
        }
        return [
          { id: 'work', name: 'Work', icon: '💼', color: 'blue' },
          { id: 'personal', name: 'Personal', icon: '🏠', color: 'green' },
          { id: 'learning', name: 'Learning', icon: '📚', color: 'purple' }
        ];
      })(),
      notebooks: (() => {
        const storedNotebooks = storedData?.notebooks || {};
        // 既存データが存在する場合はそれを優先、空の場合のみデフォルトを適用
        if (Object.keys(storedNotebooks).length > 0) {
          return storedNotebooks;
        }
        return {
          'work': [
            { id: 'projects', name: 'Projects', color: 'blue', count: 3 },
            { id: 'meetings', name: 'Meetings', color: 'green', count: 2 }
          ],
          'personal': [
            { id: 'diary', name: 'Diary', color: 'pink', count: 2 }
          ],
          'learning': [
            { id: 'tech', name: 'Tech', color: 'purple', count: 2 }
          ]
        };
      })(),
      
      // マインドマップノード位置
      mindMapNodePositions: storedData?.mindMapNodePositions || {},
      
      // アクション
      setSelectedWorkspace: (workspace) => wrappedSet({ selectedWorkspace: workspace }),
      setSelectedNotebook: (notebook) => wrappedSet({ selectedNotebook: notebook }),
      setSelectedSubFolder: (subFolder) => wrappedSet({ selectedSubFolder: subFolder }),
      setSelectedNote: (note) => wrappedSet({ selectedNote: note, currentPage: 0 }),
      setCurrentPage: (page) => {
        console.log(`🎯 [TRACE] setCurrentPage開始: ${page}`);
        
        // 同期チェック
        const currentState = get();
        console.log(`📊 [TRACE] setCurrentPage詳細: ${currentState.currentPage} → ${page}`);
        console.log(`📄 [TRACE] selectedNote: ${currentState.selectedNote?.id || 'null'}, pages.length=${currentState.selectedNote?.pages.length || 0}`);
        
        // ⭐️ 軽量化: originalSetを使用して副作用を最小化
        originalSet((state: NotebookState) => ({ 
          ...state, 
          currentPage: Math.max(0, page) // 負の値を防ぐ
        }));
        console.log(`✅ [TRACE] setCurrentPage完了: ${page}`);
      },
      
      setSearchQuery: (query) => wrappedSet({ searchQuery: query }),
      setSelectedTags: (tags) => wrappedSet({ selectedTags: tags }),
      setListViewMode: (mode) => wrappedSet({ listViewMode: mode }),
      setShowNoteList: (show) => wrappedSet({ showNoteList: show }),
      setSidebarExpanded: (expanded) => wrappedSet({ sidebarExpanded: expanded }),
      
      toggleNotebookExpanded: (notebook) => wrappedSet((state: NotebookState) => ({
        expandedNotebooks: state.expandedNotebooks.includes(notebook)
          ? state.expandedNotebooks.filter(n => n !== notebook)
          : [...state.expandedNotebooks, notebook]
      })),
      
      toggleSubFolderExpanded: (subFolder) => wrappedSet((state: NotebookState) => ({
        expandedSubFolders: state.expandedSubFolders.includes(subFolder)
          ? state.expandedSubFolders.filter(sf => sf !== subFolder)
          : [...state.expandedSubFolders, subFolder]
      })),
      
      setShowMindMap: (show) => wrappedSet({ showMindMap: show }),
      setShowDashboard: (show) => wrappedSet({ showDashboard: show }),
      setViewMode: (mode) => wrappedSet({ viewMode: mode }),
      setMindMapZoom: (zoom) => wrappedSet({ mindMapZoom: zoom }),
      setMindMapLevel: (level) => wrappedSet({ mindMapLevel: level }),
      setMindMapFocus: (focus) => wrappedSet({ mindMapFocus: focus }),
      
      addToMindMapHistory: (item) => wrappedSet((state: NotebookState) => ({
        mindMapHistory: [...state.mindMapHistory, item]
      })),
      
      setPreviewNote: (note) => wrappedSet({ previewNote: note }),
      setPreviewPage: (page) => wrappedSet({ previewPage: page }),
      
      updateNote: (noteId, updates) => {
        // ✅ SuperClaude修正: Promise-based updateNote for guaranteed synchronization
        return new Promise<void>((resolve) => {
          // 🚨 緊急修正: リモート変更中の場合は同期処理をスキップしてlocalSetを直接使用
          if (syncStateManager.getSyncFlags().isApplyingRemoteChange || 
              syncStateManager.getSyncFlags().isUpdatingFromStorage) {
            logger.debug('🔄 Skipping sync - using direct set to prevent loop');
            
            // wrappedSetではなくoriginalSetを直接使用してループを完全に防ぐ
            originalSet((state: NotebookState) => {
              const newNotesData = { ...state.notesData };
              let updatedNote = null;
              
              // 全てのサブフォルダーからノートを検索して更新
              Object.keys(newNotesData).forEach(subFolderId => {
                if (newNotesData[subFolderId]) {
                  newNotesData[subFolderId] = newNotesData[subFolderId]!.map(note => {
                    if (note.id === noteId) {
                      updatedNote = { ...note, ...updates, updatedAt: new Date().toISOString().split('T')[0]! };
                      return updatedNote;
                    }
                    return note;
                  });
                }
              });
              
              // selectedNoteも更新する
              const newSelectedNote = state.selectedNote && state.selectedNote.id === noteId 
                ? updatedNote 
                : state.selectedNote;
              
              return { 
                notesData: newNotesData,
                selectedNote: newSelectedNote
              };
            });
            resolve(); // 即座に解決
            return; // Early return to prevent broadcast
          }

          // オフライン操作をキューに追加
          if (!navigator.onLine) {
            offlineManager.queueAction({
              type: 'UPDATE_NOTE',
              data: { noteId, updates }
            });
          }
          
          // ✅ SuperClaude強化: 安全なノート更新同期
          syncStateManager.setOperationFlag('noteUpdate', true, 15000); // 15秒タイムアウト
          
          // デバイス間同期（ノート更新用カスタムデータ）
          if (syncStateManager.canTriggerSync('noteUpdate') && autoSyncManager.isRunning()) {
            syncCoordinator.scheduleSync({
              id: `note_update_${noteId}_${Date.now()}`,
              type: 'device',
              operation: 'update',
              priority: 9, // 高優先度（リアルタイム更新）
              data: { noteId, updates },
              timeout: 10000
            })
            .then(() => {
              logger.debug('✅ Note update device sync scheduled');
            })
            .catch((error) => {
              logger.warn('⚠️ Failed to schedule note update sync:', error);
            });
          }
          
          // ✅ 修正: wrappedSetの完了を待って確実に状態更新を同期
          wrappedSet((state: NotebookState) => {
            const newNotesData = { ...state.notesData };
            let updatedNote = null;
            
            // 全てのサブフォルダーからノートを検索して更新
            Object.keys(newNotesData).forEach(subFolderId => {
              if (newNotesData[subFolderId]) {
                newNotesData[subFolderId] = newNotesData[subFolderId]!.map(note => {
                  if (note.id === noteId) {
                    updatedNote = { ...note, ...updates, updatedAt: new Date().toISOString().split('T')[0]! };
                    return updatedNote;
                  }
                  return note;
                });
              }
            });
            
            // selectedNoteも更新する
            const newSelectedNote = state.selectedNote && state.selectedNote.id === noteId 
              ? updatedNote 
              : state.selectedNote;
            
            // アクティビティ追跡（リモート変更の場合はスキップ）
            if (updatedNote && !syncStateManager.getSyncFlags().isApplyingRemoteChange) {
              activityTracker.recordNoteUpdated((updatedNote as any).title || 'ノート', {
                noteId: noteId.toString(),
                updates: Object.keys(updates)
              });
            }
            
            return { 
              notesData: newNotesData,
              selectedNote: newSelectedNote
            };
          });
          
          // 操作フラグをリセット
          syncStateManager.setOperationFlag('noteUpdate', false);
          
          // ✅ 修正: 次のティックでresolveして確実に状態更新を完了
          setTimeout(resolve, 0);
        });
      },
      
      addNote: (subFolderId, note) => wrappedSet((state: NotebookState) => {
        const newNotesData = { ...state.notesData };
        const allNotes = Object.values(newNotesData).flat();
        const newId = allNotes.length > 0 ? (Math.max(...allNotes.map(n => parseInt(n.id) || 0)) + 1).toString() : '1'; // ✅ ID統一修正
        
        if (!newNotesData[subFolderId]) {
          newNotesData[subFolderId] = [];
        }
        
        newNotesData[subFolderId]!.push({
          ...note,
          id: newId
        });
        
        // サブフォルダのカウントを更新
        const newSubFoldersData = { ...state.subFoldersData };
        Object.keys(newSubFoldersData).forEach(notebookId => {
          const subFolders = newSubFoldersData[notebookId];
          if (!subFolders) return;
          
          newSubFoldersData[notebookId] = subFolders.map(subFolder => 
            subFolder.id === subFolderId 
              ? { ...subFolder, count: subFolder.count + 1 }
              : subFolder
          );
        });
        
        return { notesData: newNotesData, subFoldersData: newSubFoldersData };
      }),
      
      addNoteToSubFolder: (subFolderId, editorType: 'rich' | 'markdown' = 'rich') => wrappedSet((state: NotebookState) => {
        // 1. 関数の開始
        logger.info(`addNoteToSubFolder: 関数開始 - subFolderId: ${subFolderId}, editorType: ${editorType}`);
        
        const newNote = {
          title: '新しいノート',
          tags: [],
          createdAt: new Date().toISOString().split('T')[0]!,
          updatedAt: new Date().toISOString().split('T')[0]!,
          isPinned: false,
          isFavorite: false,
          editorType,
          pages: [
            {
              id: '1', // ✅ ID統一修正: number → string
              title: '新しいページ',
              content: ''
            }
          ]
        };
        
        const newNotesData = { ...state.notesData };
        const allNotes = Object.values(newNotesData).flat();
        const newId = allNotes.length > 0 ? (Math.max(...allNotes.map(n => parseInt(n.id) || 0)) + 1).toString() : '1'; // ✅ ID統一修正
        
        // 2. 新しいノートのID生成
        logger.info(`addNoteToSubFolder: 新しいノートID生成 - newId: ${newId}`);
        
        if (!newNotesData[subFolderId]) {
          newNotesData[subFolderId] = [];
        }
        
        const noteWithId = { ...newNote, id: newId };
        
        // オフライン操作をキューに追加
        if (!navigator.onLine) {
          offlineManager.queueAction({
            type: 'CREATE_NOTE',
            data: { subFolderId, note: noteWithId }
          });
        }
        
        newNotesData[subFolderId]!.push(noteWithId);
        
        // 3. ノートの追加完了
        logger.info(`addNoteToSubFolder: ノート追加完了 - noteId: ${newId}, title: ${noteWithId.title}`);
        
        // サブフォルダのカウントを更新
        const newSubFoldersData = { ...state.subFoldersData };
        Object.keys(newSubFoldersData).forEach(notebookId => {
          const subFolders = newSubFoldersData[notebookId];
          if (!subFolders) return;
          
          newSubFoldersData[notebookId] = subFolders.map(subFolder => {
            if (subFolder.id === subFolderId) {
              return { ...subFolder, count: subFolder.count + 1 };
            }
            return subFolder;
          });
        });

        // ノートブックのカウントはサブフォルダ数なので、ノートが追加されても変更しない
        
        // 4. アクティビティ追跡
        activityTracker.recordNoteCreated(noteWithId.title, {
          noteId: noteWithId.id.toString(),
          subFolderId: subFolderId,
          editorType: editorType
        });

        // 5. 関数の終了
        logger.info(`addNoteToSubFolder: 関数終了 - 選択されたサブフォルダ: ${subFolderId}, 選択されたノート: ${noteWithId.id}`);
        
        return { 
          notesData: newNotesData, 
          subFoldersData: newSubFoldersData,
          selectedSubFolder: subFolderId,
          selectedNote: noteWithId
        };
      }),
      
      deleteNote: (noteId) => wrappedSet((state: NotebookState) => {
        // オフライン操作をキューに追加
        if (!navigator.onLine) {
          offlineManager.queueAction({
            type: 'DELETE_NOTE',
            data: { noteId }
          });
        }
        
        const newNotesData = { ...state.notesData };
        let deletedFromSubFolderId: string | null = null;
        
        // 全てのサブフォルダーからノートを検索して削除
        Object.keys(newNotesData).forEach(subFolderId => {
          const notesArray = newNotesData[subFolderId];
          if (notesArray) {
            const originalLength = notesArray.length;
            newNotesData[subFolderId] = notesArray.filter(note => note.id !== noteId);
            // ノートが実際に削除された場合、そのサブフォルダIDを記録
            if (newNotesData[subFolderId]!.length < originalLength) {
              deletedFromSubFolderId = subFolderId;
            }
          }
        });

        // サブフォルダのカウントを更新
        const newSubFoldersData = { ...state.subFoldersData };
        if (deletedFromSubFolderId) {
          Object.keys(newSubFoldersData).forEach(notebookId => {
            const subFolders = newSubFoldersData[notebookId];
            if (!subFolders) return;
            
            newSubFoldersData[notebookId] = subFolders.map(subFolder => {
              if (subFolder.id === deletedFromSubFolderId) {
                return { ...subFolder, count: Math.max(0, subFolder.count - 1) };
              }
              return subFolder;
            });
          });
        }

        // ノートブックのカウントはサブフォルダ数なので、ノートが削除されても変更しない
        
        return { 
          notesData: newNotesData,
          subFoldersData: newSubFoldersData
        };
      }),
      
      addSubFolder: (notebookId, subFolder) => {
        const newSubFolderId = `folder_${Date.now()}`;
        const subFolderWithId = {
          ...subFolder,
          id: newSubFolderId
        };
        
        console.log('📁 レガシーストア: フォルダ作成開始', { notebookId, subFolderWithId });
        
        // オフライン操作をキューに追加
        if (!navigator.onLine) {
          offlineManager.queueAction({
            type: 'CREATE_FOLDER',
            data: { notebookId, subFolder: subFolderWithId }
          });
        }
        
        // 個別操作の同期をブロードキャスト
        if (autoSyncManager.isRunning()) {
          autoSyncManager.broadcastFolderCreate(notebookId, subFolderWithId);
        }
        
        wrappedSet((state: NotebookState) => {
          const newSubFoldersData = { ...state.subFoldersData };
          
          if (!newSubFoldersData[notebookId]) {
            newSubFoldersData[notebookId] = [];
          }
          
          newSubFoldersData[notebookId]!.push(subFolderWithId);
          
          // 新しいサブフォルダ用の空のノート配列を作成
          const newNotesData = { ...state.notesData };
          newNotesData[newSubFolderId] = [];
          
          // ノートブックのカウント（サブフォルダ数）を更新
          const newNotebooks = { ...state.notebooks };
          const subFolderCount = newSubFoldersData[notebookId]!.length;
          Object.keys(newNotebooks).forEach(workspaceId => {
            const workspaceNotebooks = newNotebooks[workspaceId];
            if (!workspaceNotebooks) return;
            
            newNotebooks[workspaceId] = workspaceNotebooks.map(notebook => 
              notebook.id === notebookId 
                ? { ...notebook, count: subFolderCount }
                : notebook
            );
          });
          
          console.log('✅ レガシーストア: フォルダ作成完了', { newSubFolderId, newSubFoldersData });
          
          return { 
            subFoldersData: newSubFoldersData,
            notesData: newNotesData,
            notebooks: newNotebooks,
            selectedSubFolder: newSubFolderId
          };
        });
      },
      
      setShowAddFolderDialog: (show) => wrappedSet({ showAddFolderDialog: show }),
      setNewFolderName: (name) => wrappedSet({ newFolderName: name }),
      setNewFolderColor: (color) => wrappedSet({ newFolderColor: color }),
      
      setEditableTitle: (title) => wrappedSet({ editableTitle: title }),
      setEditablePageTitle: (title) => wrappedSet({ editablePageTitle: title }),
      setEditableContent: (content) => wrappedSet({ editableContent: content }),
      setPreviewEditableTitle: (title) => wrappedSet({ previewEditableTitle: title }),
      setPreviewEditablePageTitle: (title) => wrappedSet({ previewEditablePageTitle: title }),
      setPreviewEditableContent: (content) => wrappedSet({ previewEditableContent: content }),
      
      // 動的データ操作
      addWorkspace: (workspace: { name: string; icon: string; color: string }) => {
        // 一意のIDを生成
        const generateUniqueId = (state: NotebookState) => {
          const baseId = workspace.name.toLowerCase().replace(/\s+/g, '-');
          let counter = 1;
          let candidateId = baseId;
          
          const isIdTaken = (id: string) => state.workspaces.some((ws) => ws.id === id);
          
          while (isIdTaken(candidateId)) {
            candidateId = `${baseId}-${counter}`;
            counter++;
          }
          
          return candidateId;
        };

        // 現在の状態を取得してIDを生成
        const currentState = get();
        const newId = generateUniqueId(currentState);
        
        const newWorkspace = {
          id: newId,
          name: workspace.name,
          icon: workspace.icon,
          color: workspace.color
        };
        
        // 個別操作の同期をブロードキャスト
        if (autoSyncManager.isRunning()) {
          autoSyncManager.broadcastWorkspaceAdd(newWorkspace);
        }
        
        wrappedSet((state: NotebookState) => {
          return {
            workspaces: [...state.workspaces, newWorkspace],
            notebooks: {
              ...state.notebooks,
              [newWorkspace.id]: []
            },
            selectedWorkspace: newId, // 新しいワークスペースを自動選択
            selectedNotebook: '', // 新しいワークスペースには最初ノートブックがない
            selectedSubFolder: '',
            selectedNote: null
          };
        });
      },

      addNotebook: (notebook: { name: string; color: string; description?: string; image?: string }) => wrappedSet((state: NotebookState) => {
        // 一意のIDを生成
        let baseId = notebook.name.toLowerCase().replace(/\s+/g, '-');
        let newId = baseId;
        let counter = 1;
        
        // 既存のIDと重複しないようにする（すべてのワークスペースの全ノートブックをチェック）
        const allNotebooks = Object.values(state.notebooks).flat();
        // eslint-disable-next-line no-loop-func
        while (allNotebooks.some(nb => nb.id === newId)) {
          newId = `${baseId}-${counter}`;
          counter++;
        }
        
        // デフォルトフォルダを作成
        const defaultFolders = [
          { id: `${newId}-general`, name: '一般', color: 'gray', count: 0 },
          { id: `${newId}-notes`, name: 'ノート', color: 'blue', count: 0 }
        ];
        
        const newNotebook = {
          id: newId,
          workspaceId: state.selectedWorkspace,
          name: notebook.name,
          color: notebook.color,
          count: defaultFolders.length, // フォルダ数をカウントに設定
          ...(notebook.description && { description: notebook.description }),
          ...(notebook.image && { image: notebook.image })
        };
        
        const currentWorkspaceNotebooks = state.notebooks[state.selectedWorkspace] || [];
        
        // 新しいノートデータも作成
        const newNotesData = { ...state.notesData };
        defaultFolders.forEach(folder => {
          newNotesData[folder.id] = [];
        });
        
        return {
          notebooks: {
            ...state.notebooks,
            [state.selectedWorkspace]: [...currentWorkspaceNotebooks, newNotebook]
          },
          subFoldersData: {
            ...state.subFoldersData,
            [newNotebook.id]: defaultFolders
          },
          notesData: newNotesData
        };
      }),
      
      editWorkspace: (workspaceId: string, updates: { name: string; icon: string; color: string }) => wrappedSet((state: NotebookState) => {
        const updatedWorkspaces = state.workspaces.map(ws => 
          ws.id === workspaceId ? { ...ws, ...updates } : ws
        );
        
        return {
          workspaces: updatedWorkspaces
        };
      }),
      
      deleteWorkspace: (workspaceId: string) => wrappedSet((state: NotebookState) => {
        // 最後のワークスペースは削除できない
        if (state.workspaces.length <= 1) return state;
        
        const filteredWorkspaces = state.workspaces.filter(ws => ws.id !== workspaceId);
        const newSelectedWorkspace = state.selectedWorkspace === workspaceId 
          ? filteredWorkspaces[0]?.id || ''
          : state.selectedWorkspace;
        
        // 関連するノートブックも削除
        const newNotebooks = { ...state.notebooks };
        delete newNotebooks[workspaceId];
        
        // 関連するノートブックのIDを取得
        const workspaceNotebooks = state.notebooks[workspaceId] || [];
        const notebookIds = workspaceNotebooks.map(nb => nb.id);
        
        // 関連するサブフォルダデータも削除
        const newSubFoldersData = { ...state.subFoldersData };
        const newNotesData = { ...state.notesData };
        
        notebookIds.forEach(nbId => {
          const subFolders = newSubFoldersData[nbId] || [];
          // サブフォルダに関連するノートも削除
          subFolders.forEach(sf => {
            delete newNotesData[sf.id];
          });
          delete newSubFoldersData[nbId];
        });
        
        // 選択中のノートブックやサブフォルダがあれば、新しいワークスペースのデフォルトに変更
        const defaultNotebooks = {
          work: 'projects',
          personal: 'diary',
          learning: 'tech'
        };
        const newSelectedNotebook = defaultNotebooks[newSelectedWorkspace as keyof typeof defaultNotebooks] || 'projects';
        
        return {
          workspaces: filteredWorkspaces,
          selectedWorkspace: newSelectedWorkspace,
          selectedNotebook: newSelectedNotebook,
          selectedSubFolder: 'frontend',
          selectedNote: null,
          notebooks: newNotebooks,
          subFoldersData: newSubFoldersData,
          notesData: newNotesData
        };
      }),
      
      // データ管理機能
      exportAllData: (options?: { type?: 'full' | 'workspace' | 'settings-only'; workspaceId?: string; includeSettings?: boolean; includeTheme?: boolean; includeAccessibility?: boolean; filename?: string }) => {
        const state = get();
        const dataString = exportData(state, options);
        const filename = options?.filename || `notebook-backup-${new Date().toISOString().split('T')[0]}.json`;
        downloadData(dataString, filename);
      },
      
      importAllData: async () => {
        try {
          const jsonString = await uploadFile();
          const result = importData(jsonString);
          
          if (!result.success || !result.data) {
            alert(`データの読み込みに失敗しました。${result.error || 'ファイル形式を確認してください。'}`);
            return;
          }
          
          if (window.confirm('現在のデータを上書きしますか？この操作は取り消せません。')) {
            wrappedSet({
              workspaces: result.data.workspaces,
              notebooks: result.data.notebooks,
              notesData: result.data.notesData,
              subFoldersData: result.data.subFoldersData,
              selectedWorkspace: result.data.workspaces[0]?.id || 'work',
              selectedNotebook: '',
              selectedSubFolder: '',
              selectedNote: null,
            });
            alert('データの読み込みが完了しました。');
          }
        } catch (error) {
          logger.error('Import failed:', error);
          alert('データの読み込みに失敗しました。');
        }
      },
      
      // Supabase同期
      syncWithSupabase: async (userId: string) => {
        const currentState = get();
        if (currentState.isSyncing) return; // 既に同期中の場合は終了
        
        try {
          wrappedSet({ isSyncing: true }); // 同期開始フラグ
          logger.info('🔄 Supabaseとの同期を開始...');
          
          // Supabaseからデータを読み込み
          const supabaseData = await loadSupabaseData(userId);
          
          if (supabaseData) {
            // ローカルデータと比較してマージ
            const currentState = get();
            const mergedData = {
              workspaces: supabaseData.workspaces?.length ? supabaseData.workspaces : currentState.workspaces,
              notebooks: Object.keys(supabaseData.notebooks || {}).length ? (supabaseData.notebooks ?? currentState.notebooks) : currentState.notebooks,
              subFoldersData: Object.keys(supabaseData.subFoldersData || {}).length ? (supabaseData.subFoldersData ?? currentState.subFoldersData) : currentState.subFoldersData,
              notesData: Object.keys(supabaseData.notesData || {}).length ? (supabaseData.notesData ?? currentState.notesData) : currentState.notesData,
            };
            
            // 状態を更新（同期を避けるため直接originalSetを使用）
            originalSet(mergedData);
            
            // ローカルストレージも更新
            const persistData = {
              selectedWorkspace: currentState.selectedWorkspace || mergedData.workspaces[0]?.id || '',
              selectedNotebook: currentState.selectedNotebook,
              selectedSubFolder: currentState.selectedSubFolder,
              expandedNotebooks: currentState.expandedNotebooks,
              expandedSubFolders: currentState.expandedSubFolders,
              sidebarExpanded: currentState.sidebarExpanded,
              workspaces: mergedData.workspaces,
              notebooks: mergedData.notebooks,
              subFoldersData: mergedData.subFoldersData,
              notesData: mergedData.notesData,
            };
            saveToStorage(persistData);
            
            logger.info('✅ Supabaseとの同期完了');
          }
          
          // 現在の状態をSupabaseに送信
          await syncSupabaseData(get());
          
        } catch (error) {
          logger.error('❌ Supabase同期エラー:', error);
        } finally {
          wrappedSet({ isSyncing: false }); // 同期終了フラグ
        }
      },
      
      // マインドマップノード位置
      setMindMapNodePosition: (nodeId: string, position: NodePosition) => wrappedSet((state) => ({
        mindMapNodePositions: {
          ...state.mindMapNodePositions,
          [nodeId]: position
        }
      })),
      
      clearMindMapNodePositions: () => wrappedSet({ mindMapNodePositions: {} }),
      
      deleteNotebook: (notebookId: string) => wrappedSet((state: NotebookState) => {
        const newNotebooks = { ...state.notebooks };
        
        // ノートブックを削除
        Object.keys(newNotebooks).forEach(workspaceId => {
          const workspaceNotebooks = newNotebooks[workspaceId];
          if (workspaceNotebooks) {
            newNotebooks[workspaceId] = workspaceNotebooks.filter(nb => nb.id !== notebookId);
          }
        });
        
        // 関連するサブフォルダとノートも削除
        const newSubFoldersData = { ...state.subFoldersData };
        const newNotesData = { ...state.notesData };
        
        const subFolders = newSubFoldersData[notebookId] || [];
        // サブフォルダに関連するノートも削除
        subFolders.forEach(sf => {
          delete newNotesData[sf.id];
        });
        delete newSubFoldersData[notebookId];
        
        // 選択中のノートブックが削除されたものだった場合、選択を解除
        const newSelectedNotebook = state.selectedNotebook === notebookId ? '' : state.selectedNotebook;
        const newSelectedSubFolder = state.selectedNotebook === notebookId ? '' : state.selectedSubFolder;
        const newSelectedNote = state.selectedNotebook === notebookId ? null : state.selectedNote;
        
        return {
          notebooks: newNotebooks,
          subFoldersData: newSubFoldersData,
          notesData: newNotesData,
          selectedNotebook: newSelectedNotebook,
          selectedSubFolder: newSelectedSubFolder,
          selectedNote: newSelectedNote
        };
      }),
      
      deleteSubFolder: (subFolderId: string) => wrappedSet((state: NotebookState) => {
        // オフライン操作をキューに追加
        if (!navigator.onLine) {
          offlineManager.queueAction({
            type: 'DELETE_FOLDER',
            data: { subFolderId }
          });
        }
        
        const newSubFoldersData = { ...state.subFoldersData };
        const newNotesData = { ...state.notesData };
        
        // どのノートブックに属するサブフォルダーかを検索
        let parentNotebookId = '';
        Object.keys(newSubFoldersData).forEach(notebookId => {
          const subFolders = newSubFoldersData[notebookId];
          if (subFolders) {
            const hasSubFolder = subFolders.some(sf => sf.id === subFolderId);
            if (hasSubFolder) {
              parentNotebookId = notebookId;
            }
          }
        });
        
        if (parentNotebookId) {
          // サブフォルダーを削除
          const parentSubFolders = newSubFoldersData[parentNotebookId];
          if (parentSubFolders) {
            newSubFoldersData[parentNotebookId] = parentSubFolders.filter(
              sf => sf.id !== subFolderId
            );
          }
          
          // 関連するノートも削除
          delete newNotesData[subFolderId];
        }
        
        // ノートブックのカウント（サブフォルダ数）を更新
        const newNotebooks = { ...state.notebooks };
        if (parentNotebookId) {
          const subFolderCount = newSubFoldersData[parentNotebookId]!.length;
          Object.keys(newNotebooks).forEach(workspaceId => {
            const workspaceNotebooks = newNotebooks[workspaceId];
            if (!workspaceNotebooks) return;
            
            newNotebooks[workspaceId] = workspaceNotebooks.map(notebook => 
              notebook.id === parentNotebookId 
                ? { ...notebook, count: subFolderCount }
                : notebook
            );
          });
        }
        
        // 選択中のサブフォルダーが削除されたものだった場合、選択を解除
        const newSelectedSubFolder = state.selectedSubFolder === subFolderId ? '' : state.selectedSubFolder;
        const newSelectedNote = state.selectedSubFolder === subFolderId ? null : state.selectedNote;
        
        return {
          subFoldersData: newSubFoldersData,
          notesData: newNotesData,
          notebooks: newNotebooks,
          selectedSubFolder: newSelectedSubFolder,
          selectedNote: newSelectedNote
        };
      }),

    };
  },
  {
    name: 'notebook-store-devtools',
  }
));

// IndexedDBストアとの同期用にグローバル参照を設定
if (typeof window !== 'undefined') {
  (window as any).__legacyNotebookStore = useNotebookStore.getState();
  
  // ストアの変更を監視して同期
  useNotebookStore.subscribe((state) => {
    (window as any).__legacyNotebookStore = state;
  });
}