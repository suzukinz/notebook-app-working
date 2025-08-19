import React, { useMemo, useCallback, memo, useState, useEffect, useRef } from 'react';
import { Plus, List, Grid, Star, Pin, MoreHorizontal } from 'lucide-react';
import NoteCard from './NoteCard';
import ResizeHandle from '../ui/ResizeHandle';
import { Note } from '../../types';
import { useNotebookStore } from '../../store/useNotebookStore';
import { useIndexedDBStore } from '../../store/useIndexedDBStore';
import { useNoteListResize } from '../../hooks/useNoteListResize';
import { searchIndex } from '../../utils/searchIndex';

interface NoteListProps {
  className?: string;
  onNoteSelect?: () => void;
}

const NoteList: React.FC<NoteListProps> = memo(({ className = '', onNoteSelect }) => {
  console.log('📄 NoteList コンポーネントがレンダリングされました');
  
  // Use IndexedDB store if initialized, otherwise fallback to legacy store
  const indexedDBStore = useIndexedDBStore();
  const legacyStore = useNotebookStore();
  
  // Use IndexedDB store for data if initialized
  const dataStore = indexedDBStore.isInitialized ? indexedDBStore : legacyStore;
  
  const selectedNotebook = dataStore.selectedNotebook;
  const selectedSubFolder = dataStore.selectedSubFolder;
  const searchQuery = dataStore.searchQuery;
  const selectedTags = dataStore.selectedTags;

  // Always use legacy store for these UI-specific functions (memoized for stability)
  const selectedNote = useMemo(() => legacyStore.selectedNote, [legacyStore.selectedNote]);
  const listViewMode = useMemo(() => legacyStore.listViewMode || 'list', [legacyStore.listViewMode]);
  const notesData = useMemo(() => legacyStore.notesData || {}, [legacyStore.notesData]);
  const subFoldersData = useMemo(() => legacyStore.subFoldersData || {}, [legacyStore.subFoldersData]);
  const setSelectedNote = useMemo(() => legacyStore.setSelectedNote, [legacyStore.setSelectedNote]);
  const setListViewMode = useMemo(() => legacyStore.setListViewMode, [legacyStore.setListViewMode]);
  const addNoteToSubFolder = useMemo(() => legacyStore.addNoteToSubFolder, [legacyStore.addNoteToSubFolder]);

  // フォルダカラーのスタイルを取得する関数
  const getColorClasses = (color: string) => {
    const colorClasses = {
      red: { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-500' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600', dot: 'bg-orange-500' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', dot: 'bg-yellow-500' },
      green: { bg: 'bg-green-100', text: 'text-green-600', dot: 'bg-green-500' },
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', dot: 'bg-blue-500' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', dot: 'bg-purple-500' },
      pink: { bg: 'bg-pink-100', text: 'text-pink-600', dot: 'bg-pink-500' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', dot: 'bg-indigo-500' },
      gray: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-500' }
    };
    return colorClasses[color as keyof typeof colorClasses] || colorClasses.gray;
  };

  const { noteListWidth, updateNoteListWidth, minWidth, maxWidth } = useNoteListResize();
  const [showViewModeButtons, setShowViewModeButtons] = useState(true);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);

  // リストの幅に応じてビューモードボタンの表示を調整
  useEffect(() => {
    const updateViewModeVisibility = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.clientWidth;
      
      // 幅が300px未満の場合はビューモードボタンを隠す
      if (containerWidth < 300) {
        setShowViewModeButtons(false);
      } else {
        setShowViewModeButtons(true);
      }
    };

    updateViewModeVisibility();

    // ResizeObserverでコンテナのサイズ変更を監視
    const resizeObserver = new ResizeObserver(updateViewModeVisibility);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [noteListWidth]);

  // 外部クリックでオプションメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsButtonRef.current && !optionsButtonRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false);
      }
    };

    if (showOptionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return undefined;
  }, [showOptionsMenu]);

  const computedNotes = useMemo((): { list: any[]; usingIndexedDB: boolean } => {
    const folderNotes = notesData[selectedSubFolder] || [];
    console.log(`📋 ノートリスト表示:`, {
      selectedNotebook,
      selectedSubFolder,
      indexedDBInitialized: indexedDBStore.isInitialized,
      indexedDBNotes: indexedDBStore.notes.length,
      legacyNotes: folderNotes.length,
      notesDataKeys: Object.keys(notesData)
    });

    if (indexedDBStore.isInitialized) {
      const filteredIDB = indexedDBStore.notes.filter(note => 
        note.subFolderId === selectedSubFolder ||
        note.notebookId === selectedNotebook
      );
      console.log(`📋 IndexedDBノート候補: ${filteredIDB.length}件`);
      if (filteredIDB.length > 0) {
        return {
          usingIndexedDB: true,
          list: filteredIDB.map(note => ({
            id: note.id,
            title: note.title,
            content: note.content,
            tags: note.tags || [],
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
            isPinned: !!note.isPinned,
            isFavorite: !!note.isFavorite,
            pages: [{ id: '1', title: 'Page 1', content: note.content }],
            editorType: 'rich' as const
          }))
        };
      }
    }

    if (folderNotes.length > 0) {
      console.log(`📋 レガシーノートを使用: ${folderNotes.length}件`);
      return { usingIndexedDB: false, list: folderNotes };
    }

    console.log(`📋 ノートなし: selectedSubFolder="${selectedSubFolder}"`);
    return { usingIndexedDB: indexedDBStore.isInitialized, list: [] };
  }, [notesData, selectedSubFolder, selectedNotebook, indexedDBStore.isInitialized, indexedDBStore.notes]);

  const notes = computedNotes.list;
  const usingIndexedDBNotes = computedNotes.usingIndexedDB;

  const filteredNotes = useMemo((): any[] => {
    let filtered = notes;

    // 検索クエリによるフィルタリング
    if (searchQuery) {
      // 全文検索インデックスを使用
      const searchResults = searchIndex.search(searchQuery, {
        subFolderId: selectedSubFolder,
        tags: selectedTags
      });
      
      // 検索結果のノートIDでフィルタリング
      filtered = notes.filter((note: any) => searchResults.includes(note.id));
    } else if (selectedTags.length > 0) {
      // タグのみでフィルタリング
      filtered = filtered.filter((note: any) =>
        selectedTags.every((tag: string) => note.tags?.includes(tag))
      );
    }

    return filtered;
  }, [notes, searchQuery, selectedTags, selectedSubFolder]);

  // ソート: ピン留め → お気に入り → 更新日時順
  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      // ピン留めが最優先
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      // お気に入りが次
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      
      // 最後に更新日時順
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [filteredNotes]);

  const handleNoteClick = useCallback((note: Note) => {
    console.log(`🖱️ ノートクリック: ID=${note.id}, title="${note.title}"`);
    console.time('ノート切り替え時間');
    
    setSelectedNote(note);
    onNoteSelect?.();
    
    // 切り替え完了時間を測定
    setTimeout(() => {
      console.timeEnd('ノート切り替え時間');
    }, 100);
  }, [setSelectedNote, onNoteSelect]);

  const handleAddNote = useCallback(async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    console.log(`🆕 新しいノートを作成 - イベント:`, e?.type, e?.target);
    
    // 選択状態を確認
    const currentWorkspace = dataStore.selectedWorkspace;
    const currentNotebook = dataStore.selectedNotebook;  
    const currentSubFolder = dataStore.selectedSubFolder;
    
    console.log(`📍 選択状態:`, { currentWorkspace, currentNotebook, currentSubFolder });
    
    if (!currentSubFolder) {
      console.error('❌ サブフォルダーが選択されていません');
      alert('ノートを作成する前に、フォルダを選択してください。');
      return;
    }
    
    try {
      if (indexedDBStore.isInitialized) {
        // IndexedDBストアを使用（エラーが発生した場合はレガシーストアにフォールバック）
        if (!currentWorkspace || !currentNotebook) {
          console.error('❌ ワークスペースまたはノートブックが選択されていません');
          alert('ノートを作成する前に、ワークスペースとノートブックを選択してください。');
          return;
        }
        
        try {
          const newNote = await indexedDBStore.createNote({
            workspaceId: currentWorkspace,
            notebookId: currentNotebook,
            subFolderId: currentSubFolder,
            title: '新しいノート',
            content: '',
            tags: []
          });
          console.log(`✅ IndexedDB ノートが作成されました: ${newNote.id}`);
          
          // 作成したノートを選択
          const convertedNote = {
            id: newNote.id, // ✅ ID統一修正: string IDを維持
            title: newNote.title,
            content: newNote.content,
            tags: newNote.tags || [],
            createdAt: newNote.createdAt,
            updatedAt: newNote.updatedAt,
            isPinned: false,
            isFavorite: false,
            pages: [{ id: '1', title: 'Page 1', content: newNote.content }], // ✅ ID統一修正: string ID
            editorType: 'rich' as const
          };
          setSelectedNote(convertedNote as any);
        } catch (indexedDBError) {
          console.warn('⚠️ IndexedDB でのノート作成に失敗、レガシーストアにフォールバック:', indexedDBError);
          // レガシーストアにフォールバック
          addNoteToSubFolder(currentSubFolder, 'rich');
          console.log(`✅ レガシー フォールバック addNoteToSubFolder呼び出し完了`);
        }
      } else {
        // レガシーストアを使用
        console.log(`📝 レガシーストアでノート作成: ${currentSubFolder}`);
        addNoteToSubFolder(currentSubFolder, 'rich');
        console.log(`✅ レガシー addNoteToSubFolder呼び出し完了`);
      }
    } catch (error) {
      console.error('❌ ノート作成失敗:', error);
      console.log('エラー詳細:', error);
      alert(`ノートの作成に失敗しました。\nエラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }, [addNoteToSubFolder, indexedDBStore, setSelectedNote, dataStore]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleFavorite = useCallback((noteId: string) => {
    const note = notes.find((n: any) => n.id === noteId);
    if (!note) return;
    if (usingIndexedDBNotes) {
      indexedDBStore.updateNote(noteId, { isFavorite: !note.isFavorite });
    } else {
      legacyStore.updateNote(noteId, { isFavorite: !note.isFavorite } as any);
    }
  }, [notes, usingIndexedDBNotes, indexedDBStore.updateNote, legacyStore.updateNote]);

  const handleTogglePin = useCallback((noteId: string) => {
    const note = notes.find((n: any) => n.id === noteId);
    if (!note) return;
    if (usingIndexedDBNotes) {
      indexedDBStore.updateNote(noteId, { isPinned: !note.isPinned });
    } else {
      legacyStore.updateNote(noteId, { isPinned: !note.isPinned } as any);
    }
  }, [notes, usingIndexedDBNotes, indexedDBStore.updateNote, legacyStore.updateNote]);

  const handleDelete = useCallback((noteId: string) => {
    if (!window.confirm('このノートを削除しますか？')) return;
    if (usingIndexedDBNotes) {
      indexedDBStore.deleteNote(noteId);
    } else {
      legacyStore.deleteNote(noteId as any);
    }
  }, [usingIndexedDBNotes, indexedDBStore.deleteNote, legacyStore.deleteNote]);

  // カテゴリ別にノートを分類
  const pinnedNotes = useMemo(() => sortedNotes.filter(note => note.isPinned), [sortedNotes]);
  const favoriteNotes = useMemo(() => sortedNotes.filter(note => note.isFavorite && !note.isPinned), [sortedNotes]);
  const regularNotes = useMemo(() => sortedNotes.filter(note => !note.isPinned && !note.isFavorite), [sortedNotes]);

  return (
    <div 
      className={`bg-white border-r border-gray-200 flex h-screen ${className}`}
      style={{ width: noteListWidth }}
    >
      <div className="flex-1 flex flex-col">
        {/* ヘッダー */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {(() => {
                if (!selectedSubFolder && !selectedNotebook) return 'ノート';
                const subFolder = subFoldersData[selectedNotebook]?.find((sf: any) => sf.id === selectedSubFolder);
                if (subFolder) {
                  return `${subFolder.name} (${notes.length})`;
                }
                // ノートブック名を表示
                const notebooks = legacyStore.notebooks[legacyStore.selectedWorkspace] || [];
                const notebook = notebooks.find((nb: any) => nb.id === selectedNotebook);
                return notebook ? `${notebook.name} (${notes.length})` : `ノート (${notes.length})`;
              })()}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddNote}
                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                title="新しいノートを追加"
              >
                <Plus size={20} />
              </button>
              
              {showViewModeButtons ? (
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setListViewMode('list')}
                    className={`p-1 rounded transition-colors ${
                      listViewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                    }`}
                  >
                    <List size={16} />
                  </button>
                  <button
                    onClick={() => setListViewMode('grid')}
                    className={`p-1 rounded transition-colors ${
                      listViewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                    }`}
                  >
                    <Grid size={16} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <button
                    ref={optionsButtonRef}
                    onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    title="表示オプション"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  
                  {showOptionsMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px]">
                      <button
                        onClick={() => {
                          setListViewMode('list');
                          setShowOptionsMenu(false);
                        }}
                        className={`w-full flex items-center px-3 py-2 text-sm text-left hover:bg-gray-100 transition-colors ${
                          listViewMode === 'list' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <List size={14} className="mr-2" />
                        リスト表示
                      </button>
                      <button
                        onClick={() => {
                          setListViewMode('grid');
                          setShowOptionsMenu(false);
                        }}
                        className={`w-full flex items-center px-3 py-2 text-sm text-left hover:bg-gray-100 transition-colors ${
                          listViewMode === 'grid' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <Grid size={14} className="mr-2" />
                        グリッド表示
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* フィルター情報 */}
          {(searchQuery || selectedTags.length > 0) && (
            <div className="text-sm text-gray-600">
              {filteredNotes.length} 件のノートが見つかりました
              {searchQuery && (
                <span className="ml-2 text-blue-600">
                  検索: "{searchQuery}"
                </span>
              )}
            </div>
          )}
        </div>

        {/* ノートリスト */}
        <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* ノートブックは選択されているがサブフォルダが選択されていない場合 */}
          {selectedNotebook && !selectedSubFolder ? (
            <div className="p-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">フォルダを選択してください</h3>
                <p className="text-sm text-gray-500">
                  下記のフォルダからノートを表示したいフォルダを選択してください
                </p>
              </div>
              
              {/* 利用可能なフォルダリスト */}
              <div className="space-y-2">
                {subFoldersData[selectedNotebook]?.map((folder: any) => (
                  <button
                    key={folder.id}
                    onClick={() => {
                      dataStore.setSelectedSubFolder(folder.id);
                      console.log(`📁 フォルダ選択: ${folder.name} (ID: ${folder.id})`);
                    }}
                    className="w-full flex items-center p-3 text-left bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <div className={`p-2 rounded-lg mr-3 ${getColorClasses(folder.color).bg}`}>
                      {folder.image ? (
                        <img 
                          src={folder.image} 
                          alt={folder.name}
                          className="w-5 h-5 rounded object-cover"
                        />
                      ) : (
                        <div className={`w-5 h-5 ${getColorClasses(folder.color).dot} rounded`}></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{folder.name}</h4>
                      <p className="text-sm text-gray-500">
                        {notesData[folder.id]?.length || 0} ノート
                      </p>
                    </div>
                    <div className="text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                )) || (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">このノートブックにはまだフォルダがありません</p>
                    <p className="text-sm text-gray-400">
                      左側のサイドバーから新しいフォルダを作成してください
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : sortedNotes.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {notes.length === 0 ? (
                <div>
                  <p className="mb-4">まだノートがありません</p>
                  <button
                    onClick={handleAddNote}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    最初のノートを作成
                  </button>
                </div>
              ) : (
                <p>条件に一致するノートが見つかりませんでした</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* ピン留めされたノート */}
              {pinnedNotes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Pin size={14} className="mr-1" />
                    ピン留め
                  </h3>
                  <div className={listViewMode === 'grid' ? 'grid gap-3 items-start' : 'space-y-2'} style={listViewMode === 'grid' ? { gridTemplateColumns: 'repeat(auto-fit, 220px)', justifyContent: 'start' } : undefined}>
                    {pinnedNotes.map(note => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        isSelected={selectedNote?.id === note.id}
                        onClick={() => handleNoteClick(note)}
                        onToggleFavorite={handleToggleFavorite}
                        onTogglePin={handleTogglePin}
                        onDelete={handleDelete}
                        onUpdateNote={(id: string, updates: Partial<Note>) => {
                          if (usingIndexedDBNotes) {
                            (indexedDBStore.updateNote as any)(id, updates as any);
                          } else {
                            (legacyStore.updateNote as any)(id, updates as any);
                          }
                        }}
                        listViewMode={listViewMode}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* お気に入りノート */}
              {favoriteNotes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Star size={14} className="mr-1" />
                    お気に入り
                  </h3>
                  <div className={listViewMode === 'grid' ? 'grid gap-3 items-start' : 'space-y-2'} style={listViewMode === 'grid' ? { gridTemplateColumns: 'repeat(auto-fit, 220px)', justifyContent: 'start' } : undefined}>
                    {favoriteNotes.map(note => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        isSelected={selectedNote?.id === note.id}
                        onClick={() => handleNoteClick(note)}
                        onToggleFavorite={handleToggleFavorite}
                        onTogglePin={handleTogglePin}
                        onDelete={handleDelete}
                        onUpdateNote={(id: string, updates: Partial<Note>) => {
                          if (usingIndexedDBNotes) {
                            (indexedDBStore.updateNote as any)(id, updates as any);
                          } else {
                            (legacyStore.updateNote as any)(id, updates as any);
                          }
                        }}
                        listViewMode={listViewMode}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 通常のノート */}
              {regularNotes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    すべてのノート
                  </h3>
                  <div className={listViewMode === 'grid' ? 'grid gap-3 items-start' : 'space-y-2'} style={listViewMode === 'grid' ? { gridTemplateColumns: 'repeat(auto-fit, 220px)', justifyContent: 'start' } : undefined}>
                    {regularNotes.map(note => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        isSelected={selectedNote?.id === note.id}
                        onClick={() => handleNoteClick(note)}
                        onToggleFavorite={handleToggleFavorite}
                        onTogglePin={handleTogglePin}
                        onDelete={handleDelete}
                        onUpdateNote={(id: string, updates: Partial<Note>) => {
                          if (usingIndexedDBNotes) {
                            (indexedDBStore.updateNote as any)(id, updates as any);
                          } else {
                            (legacyStore.updateNote as any)(id, updates as any);
                          }
                        }}
                        listViewMode={listViewMode}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* 自己回復: ノートはあるのにフィルタで0件のとき */}
              {notes.length > 0 && sortedNotes.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  <p className="mb-2">条件に一致するノートが見つかりませんでした</p>
                  {usingIndexedDBNotes && indexedDBStore.notes.length > 0 && (
                    <button
                      onClick={() => {
                        const candidate = indexedDBStore.notes.find(n => n.subFolderId === selectedSubFolder) || indexedDBStore.notes[0];
                        if (candidate?.subFolderId) {
                          dataStore.setSelectedSubFolder(candidate.subFolderId);
                        }
                      }}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      自動的に関連フォルダを選択
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* リサイズハンドル */}
      <ResizeHandle
        onResize={updateNoteListWidth}
        minWidth={minWidth}
        maxWidth={maxWidth}
      />
    </div>
  );
});

NoteList.displayName = 'NoteList';

export default NoteList;