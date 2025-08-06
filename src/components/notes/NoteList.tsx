import React, { useMemo, useCallback, memo, useState, useEffect, useRef } from 'react';
import { Plus, List, Grid, Star, Pin, MoreHorizontal } from 'lucide-react';
import NoteCard from './NoteCard';
import ResizeHandle from '../ui/ResizeHandle';
import { Note } from '../../types';
import { useNotebookStore } from '../../store/useNotebookStore';
import { useNoteListResize } from '../../hooks/useNoteListResize';
import { searchIndex } from '../../utils/searchIndex';

interface NoteListProps {
  className?: string;
  onNoteSelect?: () => void;
}

const NoteList: React.FC<NoteListProps> = memo(({ className = '', onNoteSelect }) => {
  const {
    selectedNotebook,
    selectedSubFolder,
    selectedNote,
    searchQuery,
    selectedTags,
    viewMode,
    notesData,
    subFoldersData,
    setSelectedNote,
    setViewMode,
    updateNote,
    addNoteToSubFolder,
    deleteNote
  } = useNotebookStore();

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

  const notes = useMemo(() => {
    const folderNotes = notesData[selectedSubFolder] || [];
    console.log(`📋 ノートリスト更新: subFolder="${selectedSubFolder}", 件数=${folderNotes.length}`);
    console.log(`🗂️ 利用可能なsubFolder:`, Object.keys(notesData));
    console.log(`📝 現在のフォルダのノート一覧:`, folderNotes.map(note => `${note.id}: ${note.title}`));
    return folderNotes;
  }, [notesData, selectedSubFolder]);

  const filteredNotes = useMemo(() => {
    let filtered = notes;

    // 検索クエリによるフィルタリング
    if (searchQuery) {
      // 全文検索インデックスを使用
      const searchResults = searchIndex.search(searchQuery, {
        subFolderId: selectedSubFolder,
        tags: selectedTags
      });
      
      // 検索結果のノートIDでフィルタリング
      filtered = notes.filter(note => searchResults.includes(note.id));
    } else if (selectedTags.length > 0) {
      // タグのみでフィルタリング
      filtered = filtered.filter(note =>
        selectedTags.every(tag => note.tags?.includes(tag))
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

  const handleAddNote = useCallback(() => {
    console.error('🚨🚨🚨 +ボタンがクリックされました！ 🚨🚨🚨');
    alert('🆕 +ボタンがクリックされました！');
    
    console.log(`🆕 新しいノートを作成: subFolder="${selectedSubFolder}"`);
    console.log(`📊 作成前のノート数: ${notes.length}`);
    console.log(`🗂️ 現在のnotesData:`, notesData);
    console.log(`📁 selectedNotebook: "${selectedNotebook}", selectedSubFolder: "${selectedSubFolder}"`);
    
    if (!selectedSubFolder) {
      console.error('❌ selectedSubFolderが空です！');
      // 利用可能なsubFolderがあれば最初のものを使用
      const availableSubFolders = Object.keys(notesData);
      if (availableSubFolders.length > 0) {
        const fallbackSubFolder = availableSubFolders[0];
        console.log(`🔄 フォールバック: "${fallbackSubFolder}" を使用`);
        addNoteToSubFolder(fallbackSubFolder, 'rich');
        console.log(`✅ addNoteToSubFolder呼び出し完了 (フォールバック)`);
      } else {
        console.error('❌ 利用可能なsubFolderがありません！');
        alert('ノートを作成するフォルダが見つかりません。先にフォルダを作成してください。');
      }
      return;
    }
    
    addNoteToSubFolder(selectedSubFolder, 'rich');
    console.log(`✅ addNoteToSubFolder呼び出し完了`);
  }, [selectedSubFolder, addNoteToSubFolder, notes.length, notesData, selectedNotebook]);

  const handleToggleFavorite = useCallback((noteId: number) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      updateNote(noteId, { isFavorite: !note.isFavorite });
    }
  }, [notes, updateNote]);

  const handleTogglePin = useCallback((noteId: number) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      updateNote(noteId, { isPinned: !note.isPinned });
    }
  }, [notes, updateNote]);

  const handleDelete = useCallback((noteId: number) => {
    if (window.confirm('このノートを削除しますか？')) {
      deleteNote(noteId);
    }
  }, [deleteNote]);

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
                if (!selectedSubFolder) return 'ノート';
                const subFolder = subFoldersData[selectedNotebook]?.find(sf => sf.id === selectedSubFolder);
                return subFolder ? `${subFolder.name} (${notes.length})` : `ノート (${notes.length})`;
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
                    onClick={() => setViewMode('list')}
                    className={`p-1 rounded transition-colors ${
                      viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                    }`}
                  >
                    <List size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1 rounded transition-colors ${
                      viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
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
                          setViewMode('list');
                          setShowOptionsMenu(false);
                        }}
                        className={`w-full flex items-center px-3 py-2 text-sm text-left hover:bg-gray-100 transition-colors ${
                          viewMode === 'list' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <List size={14} className="mr-2" />
                        リスト表示
                      </button>
                      <button
                        onClick={() => {
                          setViewMode('grid');
                          setShowOptionsMenu(false);
                        }}
                        className={`w-full flex items-center px-3 py-2 text-sm text-left hover:bg-gray-100 transition-colors ${
                          viewMode === 'grid' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
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
          {sortedNotes.length === 0 ? (
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
                  <div className={viewMode === 'grid' ? 'grid gap-3 items-start' : 'space-y-2'} style={viewMode === 'grid' ? { gridTemplateColumns: 'repeat(auto-fit, 220px)', justifyContent: 'start' } : undefined}>
                    {pinnedNotes.map(note => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        isSelected={selectedNote?.id === note.id}
                        onClick={() => handleNoteClick(note)}
                        onToggleFavorite={handleToggleFavorite}
                        onTogglePin={handleTogglePin}
                        onDelete={handleDelete}
                        onUpdateNote={updateNote}
                        viewMode={viewMode}
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
                  <div className={viewMode === 'grid' ? 'grid gap-3 items-start' : 'space-y-2'} style={viewMode === 'grid' ? { gridTemplateColumns: 'repeat(auto-fit, 220px)', justifyContent: 'start' } : undefined}>
                    {favoriteNotes.map(note => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        isSelected={selectedNote?.id === note.id}
                        onClick={() => handleNoteClick(note)}
                        onToggleFavorite={handleToggleFavorite}
                        onTogglePin={handleTogglePin}
                        onDelete={handleDelete}
                        onUpdateNote={updateNote}
                        viewMode={viewMode}
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
                  <div className={viewMode === 'grid' ? 'grid gap-3 items-start' : 'space-y-2'} style={viewMode === 'grid' ? { gridTemplateColumns: 'repeat(auto-fit, 220px)', justifyContent: 'start' } : undefined}>
                    {regularNotes.map(note => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        isSelected={selectedNote?.id === note.id}
                        onClick={() => handleNoteClick(note)}
                        onToggleFavorite={handleToggleFavorite}
                        onTogglePin={handleTogglePin}
                        onDelete={handleDelete}
                        onUpdateNote={updateNote}
                        viewMode={viewMode}
                      />
                    ))}
                  </div>
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