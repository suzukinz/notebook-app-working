// 強化された検索機能のReactフック
import { useState, useCallback, useEffect, useMemo } from 'react';
import { enhancedSearchIndex, SearchFilters, SearchResult } from '../utils/enhancedSearchIndex';
import { useNotebookStore } from '../store/useNotebookStore';
import { Note } from '../types';
import { performanceMonitor } from '../utils/performanceMonitor';

// 検索履歴エントリ
interface SearchHistoryEntry {
  id: string;
  query: string;
  timestamp: string;
  resultCount: number;
}

// 検索統計
interface SearchStats {
  documentCount: number;
  indexEntryCount: number;
  lastUpdated: string;
  isIndexing: boolean;
}

// 検索状態
interface SearchState {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  hasSearched: boolean;
  searchTime: number;
  error: string | null;
  filters: SearchFilters;
  history: SearchHistoryEntry[];
  stats: SearchStats;
  suggestions: string[];
}

// デバウンス用の型
type DebouncedFunction = (...args: any[]) => void;

// デバウンス関数
function debounce(func: Function, wait: number): DebouncedFunction {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export const useEnhancedSearch = () => {
  // 状態管理
  const [state, setState] = useState<SearchState>({
    query: '',
    results: [],
    isSearching: false,
    hasSearched: false,
    searchTime: 0,
    error: null,
    filters: {
      sortBy: 'relevance',
      sortOrder: 'desc',
      limit: 50
    },
    history: [],
    stats: {
      documentCount: 0,
      indexEntryCount: 0,
      lastUpdated: '',
      isIndexing: false
    },
    suggestions: []
  });

  // ストアから状態取得
  const { notesData, selectedWorkspace, selectedNotebook, selectedSubFolder } = useNotebookStore();

  // 検索履歴をLocalStorageから読み込み
  useEffect(() => {
    const loadSearchHistory = () => {
      try {
        const stored = localStorage.getItem('notespace-search-history');
        if (stored) {
          const history: SearchHistoryEntry[] = JSON.parse(stored);
          setState(prev => ({ ...prev, history }));
        }
      } catch (error) {
        console.error('検索履歴読み込みエラー:', error);
      }
    };

    loadSearchHistory();
  }, []);

  // 検索履歴保存
  const saveSearchHistory = useCallback((entry: SearchHistoryEntry) => {
    setState(prev => {
      const newHistory = [entry, ...prev.history.slice(0, 19)]; // 最大20件
      try {
        localStorage.setItem('notespace-search-history', JSON.stringify(newHistory));
      } catch (error) {
        console.error('検索履歴保存エラー:', error);
      }
      return { ...prev, history: newHistory };
    });
  }, []);

  // インデックス統計更新
  const updateStats = useCallback(async () => {
    try {
      const stats = await enhancedSearchIndex.getIndexStats();
      setState(prev => ({ 
        ...prev, 
        stats: { 
          ...stats, 
          isIndexing: prev.stats.isIndexing 
        } 
      }));
    } catch (error) {
      console.error('統計更新エラー:', error);
    }
  }, []);

  // 初期化時に統計更新
  useEffect(() => {
    updateStats();
  }, [updateStats]);

  // ノートデータ変更時のインデックス更新
  useEffect(() => {
    const rebuildIndex = async () => {
      if (Object.keys(notesData).length === 0) return;

      setState(prev => ({ ...prev, stats: { ...prev.stats, isIndexing: true } }));

      try {
        console.log('🔄 検索インデックス再構築開始...');
        await enhancedSearchIndex.clearIndex();

        for (const [subFolderId, notes] of Object.entries(notesData)) {
          for (const note of notes) {
            await enhancedSearchIndex.addDocument(
              note,
              subFolderId,
              selectedNotebook || 'default',
              selectedWorkspace || 'default'
            );
          }
        }

        await updateStats();
        console.log('✅ 検索インデックス再構築完了');
      } catch (error) {
        console.error('❌ インデックス再構築エラー:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'インデックスの更新に失敗しました',
          stats: { ...prev.stats, isIndexing: false }
        }));
      } finally {
        setState(prev => ({ ...prev, stats: { ...prev.stats, isIndexing: false } }));
      }
    };

    // デバウンスしてインデックス更新
    const debouncedRebuild = debounce(rebuildIndex, 1000);
    debouncedRebuild();
    return undefined;
  }, [notesData, selectedNotebook, selectedWorkspace, updateStats]);

  // 検索実行
  const executeSearch = useCallback(async (searchQuery: string, searchFilters?: Partial<SearchFilters>) => {
    if (!searchQuery.trim()) {
      setState(prev => ({ 
        ...prev, 
        results: [], 
        hasSearched: false,
        error: null 
      }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isSearching: true, 
      error: null 
    }));

    const startTime = performance.now();

    try {
      // フィルタ準備
      const filters: SearchFilters = {
        ...state.filters,
        ...searchFilters,
        query: searchQuery
      };

      // 現在の選択状態をフィルタに反映
      if (selectedSubFolder && selectedSubFolder !== '') {
        filters.subFolderIds = [selectedSubFolder];
      }
      if (selectedNotebook && selectedNotebook !== '') {
        filters.notebookIds = [selectedNotebook];
      }
      if (selectedWorkspace && selectedWorkspace !== '') {
        filters.workspaceIds = [selectedWorkspace];
      }

      // 検索実行（パフォーマンス監視付き）
      const results = await performanceMonitor.measureSearchPerformance(
        () => enhancedSearchIndex.search(filters),
        searchQuery
      );
      const searchTime = performance.now() - startTime;

      // 検索履歴に追加
      const historyEntry: SearchHistoryEntry = {
        id: Date.now().toString(),
        query: searchQuery,
        timestamp: new Date().toISOString(),
        resultCount: results.length
      };
      saveSearchHistory(historyEntry);

      setState(prev => ({
        ...prev,
        results,
        searchTime,
        hasSearched: true,
        isSearching: false,
        filters
      }));

      console.log(`🔍 検索完了: "${searchQuery}" -> ${results.length}件 (${searchTime.toFixed(2)}ms)`);
    } catch (error) {
      console.error('検索エラー:', error);
      setState(prev => ({
        ...prev,
        error: '検索中にエラーが発生しました',
        isSearching: false,
        results: [],
        hasSearched: true
      }));
    }
  }, [state.filters, selectedSubFolder, selectedNotebook, selectedWorkspace, saveSearchHistory]);

  // デバウンス検索
  const debouncedSearch = useMemo(
    () => debounce(executeSearch, 300),
    [executeSearch]
  );

  // 検索クエリ更新
  const updateQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, query }));
    
    // 空の場合は即座にクリア
    if (!query.trim()) {
      setState(prev => ({ 
        ...prev, 
        results: [], 
        hasSearched: false,
        error: null 
      }));
      return;
    }

    // デバウンス検索実行
    debouncedSearch(query);
  }, [debouncedSearch]);

  // フィルタ更新
  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setState(prev => {
      const updatedFilters = { ...prev.filters, ...newFilters };
      return { ...prev, filters: updatedFilters };
    });

    // フィルタ更新時に再検索
    if (state.query.trim()) {
      executeSearch(state.query, newFilters);
    }
  }, [state.query, executeSearch]);

  // 検索履歴クリア
  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, history: [] }));
    localStorage.removeItem('notespace-search-history');
  }, []);

  // インデックス手動再構築
  const rebuildIndex = useCallback(async () => {
    setState(prev => ({ ...prev, stats: { ...prev.stats, isIndexing: true } }));

    try {
      await enhancedSearchIndex.clearIndex();

      for (const [subFolderId, notes] of Object.entries(notesData)) {
        for (const note of notes) {
          await enhancedSearchIndex.addDocument(
            note,
            subFolderId,
            selectedNotebook || 'default',
            selectedWorkspace || 'default'
          );
        }
      }

      await updateStats();
      console.log('✅ 手動インデックス再構築完了');
    } catch (error) {
      console.error('❌ 手動インデックス再構築エラー:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'インデックスの再構築に失敗しました'
      }));
    } finally {
      setState(prev => ({ ...prev, stats: { ...prev.stats, isIndexing: false } }));
    }
  }, [notesData, selectedNotebook, selectedWorkspace, updateStats]);

  // 検索候補生成
  const generateSuggestions = useCallback((partialQuery: string): string[] => {
    if (!partialQuery.trim()) return [];

    const suggestions: string[] = [];
    const maxSuggestions = 5;

    // 検索履歴から候補生成
    const historySuggestions = state.history
      .filter(entry => entry.query.toLowerCase().includes(partialQuery.toLowerCase()))
      .slice(0, maxSuggestions)
      .map(entry => entry.query);

    suggestions.push(...historySuggestions);

    // タグから候補生成
    const allTags = new Set<string>();
    Object.values(notesData).flat().forEach(note => {
      note.tags.forEach(tag => allTags.add(tag));
    });

    const tagSuggestions = Array.from(allTags)
      .filter(tag => tag.toLowerCase().includes(partialQuery.toLowerCase()))
      .slice(0, maxSuggestions - suggestions.length);

    suggestions.push(...tagSuggestions);

    return [...new Set(suggestions)].slice(0, maxSuggestions);
  }, [state.history, notesData]);

  // 候補更新
  const updateSuggestions = useCallback((partialQuery: string) => {
    const suggestions = generateSuggestions(partialQuery);
    setState(prev => ({ ...prev, suggestions }));
  }, [generateSuggestions]);

  // レガシー検索システムとの互換性
  const getFilteredNotes = useCallback((): Note[] => {
    if (!state.hasSearched || state.results.length === 0) {
      return [];
    }

    // 検索結果からノートIDを抽出し、元のノートデータを返す
    const noteIds = new Set(state.results.map(result => result.noteId)); // ✅ ID統一修正: string IDとして処理
    const allNotes = Object.values(notesData).flat();
    
    return allNotes.filter(note => noteIds.has(note.id)); // ✅ string同士の比較
  }, [state.hasSearched, state.results, notesData]);

  return {
    // 状態
    query: state.query,
    results: state.results,
    isSearching: state.isSearching,
    hasSearched: state.hasSearched,
    searchTime: state.searchTime,
    error: state.error,
    filters: state.filters,
    history: state.history,
    stats: state.stats,
    suggestions: state.suggestions,

    // アクション
    updateQuery,
    updateFilters,
    executeSearch,
    clearHistory,
    rebuildIndex,
    updateSuggestions,

    // ユーティリティ
    getFilteredNotes,
    updateStats
  };
};