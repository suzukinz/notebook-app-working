// Zustandストア用のメモ化セレクター
import { useMemo } from 'react';
import { useNotebookStore } from '../store/useNotebookStore';
import { Note } from '../types';

// ノート関連のセレクター
export const useNotebookSelectors = () => {
  const store = useNotebookStore();

  // 現在選択されたサブフォルダのノート一覧
  const currentNotes = useMemo(() => {
    return store.notesData[store.selectedSubFolder] || [];
  }, [store.notesData, store.selectedSubFolder]);

  // フィルタリングされたノート一覧
  const filteredNotes = useMemo(() => {
    const notes = currentNotes;
    
    return notes.filter(note => {
      const matchesSearch = store.searchQuery === '' || 
        note.title.toLowerCase().includes(store.searchQuery.toLowerCase()) ||
        note.pages.some(page => 
          page.title.toLowerCase().includes(store.searchQuery.toLowerCase()) ||
          page.content.toLowerCase().includes(store.searchQuery.toLowerCase())
        );

      const matchesTags = store.selectedTags.length === 0 || 
        store.selectedTags.every(tag => note.tags.includes(tag));

      return matchesSearch && matchesTags;
    });
  }, [currentNotes, store.searchQuery, store.selectedTags]);

  // ソートされたノート一覧
  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      // ピン留めされたノートを最初に
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      // 次にお気に入り
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      
      // 最後に更新日時順
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [filteredNotes]);

  // 分類されたノート
  const categorizedNotes = useMemo(() => {
    const pinned: Note[] = [];
    const favorite: Note[] = [];
    const regular: Note[] = [];

    sortedNotes.forEach(note => {
      if (note.isPinned) {
        pinned.push(note);
      } else if (note.isFavorite) {
        favorite.push(note);
      } else {
        regular.push(note);
      }
    });

    return { pinned, favorite, regular };
  }, [sortedNotes]);

  // 現在選択されたワークスペースのノートブック一覧
  const currentNotebooks = useMemo(() => {
    return store.notebooks[store.selectedWorkspace] || [];
  }, [store.notebooks, store.selectedWorkspace]);

  // 現在選択されたノートブックのサブフォルダ一覧
  const currentSubFolders = useMemo(() => {
    return store.subFoldersData[store.selectedNotebook] || [];
  }, [store.subFoldersData, store.selectedNotebook]);

  // 統計情報
  const statistics = useMemo(() => {
    const totalNotes = Object.values(store.notesData).flat().length;
    const totalPages = Object.values(store.notesData)
      .flat()
      .reduce((total, note) => total + note.pages.length, 0);
    const pinnedCount = Object.values(store.notesData)
      .flat()
      .filter(note => note.isPinned).length;
    const favoriteCount = Object.values(store.notesData)
      .flat()
      .filter(note => note.isFavorite).length;

    return {
      totalNotes,
      totalPages,
      pinnedCount,
      favoriteCount,
      currentSubFolderNotes: currentNotes.length,
      filteredNotesCount: filteredNotes.length
    };
  }, [store.notesData, currentNotes.length, filteredNotes.length]);

  // 検索関連
  const searchInfo = useMemo(() => {
    const hasActiveSearch = store.searchQuery !== '' || store.selectedTags.length > 0;
    const searchResultCount = filteredNotes.length;
    const totalSearchable = currentNotes.length;

    return {
      hasActiveSearch,
      searchResultCount,
      totalSearchable,
      hasResults: searchResultCount > 0
    };
  }, [store.searchQuery, store.selectedTags, filteredNotes.length, currentNotes.length]);

  return {
    // 基本データ
    currentNotes,
    filteredNotes,
    sortedNotes,
    categorizedNotes,
    currentNotebooks,
    currentSubFolders,
    
    // 統計
    statistics,
    searchInfo,
    
    // 基本状態
    selectedNote: store.selectedNote,
    selectedWorkspace: store.selectedWorkspace,
    selectedNotebook: store.selectedNotebook,
    selectedSubFolder: store.selectedSubFolder,
    searchQuery: store.searchQuery,
    selectedTags: store.selectedTags,
    viewMode: store.viewMode,
    
    // アクション（必要に応じて）
    setSelectedNote: store.setSelectedNote,
    setSearchQuery: store.setSearchQuery,
    setSelectedTags: store.setSelectedTags,
    setViewMode: store.setViewMode
  };
};

// 個別のセレクター（より細かい最適化が必要な場合）
export const useCurrentNotes = () => {
  return useNotebookStore(state => state.notesData[state.selectedSubFolder] || []);
};

export const useSelectedNote = () => {
  return useNotebookStore(state => state.selectedNote);
};

export const useSearchState = () => {
  return useNotebookStore(state => ({
    searchQuery: state.searchQuery,
    selectedTags: state.selectedTags
  }));
};

export const useWorkspaceData = () => {
  return useNotebookStore(state => ({
    workspaces: state.workspaces,
    selectedWorkspace: state.selectedWorkspace,
    notebooks: state.notebooks[state.selectedWorkspace] || []
  }));
};