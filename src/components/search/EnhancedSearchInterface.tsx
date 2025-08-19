// 強化された検索インターフェース
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Filter, History, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { useEnhancedSearch } from '../../hooks/useEnhancedSearch';
import TagFilterComponent from './TagFilterComponent';
import DateRangeFilter from './DateRangeFilter';
import { SearchFilters, SearchResult } from '../../utils/enhancedSearchIndex';

interface EnhancedSearchInterfaceProps {
  onResultsChange?: (results: SearchResult[]) => void;
  onNoteSelect?: (noteId: string, pageId?: string) => void;
  className?: string;
  placeholder?: string;
  showAdvancedByDefault?: boolean;
  compact?: boolean;
}

const EnhancedSearchInterface: React.FC<EnhancedSearchInterfaceProps> = ({
  onResultsChange,
  onNoteSelect,
  className = '',
  placeholder = "ノートを検索...",
  showAdvancedByDefault = false,
  compact = false
}) => {
  // 状態管理
  const [showAdvanced, setShowAdvanced] = useState(showAdvancedByDefault);
  const [showHistory, setShowHistory] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 強化された検索フック
  const {
    query,
    results,
    isSearching,
    hasSearched,
    searchTime,
    error,
    filters,
    history,
    stats,
    suggestions,
    updateQuery,
    updateFilters,
    executeSearch,
    clearHistory,
    updateSuggestions
  } = useEnhancedSearch();

  // 結果変更時のコールバック
  useEffect(() => {
    if (onResultsChange) {
      onResultsChange(results);
    }
    return undefined;
  }, [results, onResultsChange]);

  // 検索クエリ変更ハンドラ
  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    updateQuery(newQuery);
    
    // 候補更新
    if (newQuery.trim()) {
      updateSuggestions(newQuery);
    }
    
    setSelectedSuggestion(-1);
  }, [updateQuery, updateSuggestions]);

  // 検索実行
  const handleSearch = useCallback((searchQuery?: string) => {
    const queryToSearch = searchQuery || query;
    if (queryToSearch.trim()) {
      executeSearch(queryToSearch);
      setInputFocused(false);
    }
  }, [query, executeSearch]);

  // タグフィルタ変更
  const handleTagsChange = useCallback((tags: string[]) => {
    updateFilters({ tags });
  }, [updateFilters]);

  // 日付範囲フィルタ変更
  const handleDateRangeChange = useCallback((dateRange?: { start?: string | undefined; end?: string | undefined; field: 'createdAt' | 'updatedAt' | 'lastAccessedAt' } | undefined) => {
    updateFilters({ dateRange });
  }, [updateFilters]);

  // ソート変更
  const handleSortChange = useCallback((sortBy: SearchFilters['sortBy'], sortOrder: SearchFilters['sortOrder']) => {
    updateFilters({ sortBy, sortOrder });
  }, [updateFilters]);

  // 履歴から検索
  const handleHistorySelect = useCallback((historyQuery: string) => {
    updateQuery(historyQuery);
    handleSearch(historyQuery);
    setShowHistory(false);
  }, [updateQuery, handleSearch]);

  // 候補から検索
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    updateQuery(suggestion);
    handleSearch(suggestion);
    setInputFocused(false);
  }, [updateQuery, handleSearch]);

  // ノート選択ハンドラ
  const handleNoteSelect = useCallback((result: SearchResult) => {
    if (onNoteSelect) {
      onNoteSelect(result.noteId, result.pageId);
    }
  }, [onNoteSelect]);

  // キーボードナビゲーション
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!inputFocused || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : -1
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev > -1 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestion >= 0) {
          const suggestion = suggestions[selectedSuggestion];
          if (suggestion) {
            handleSuggestionSelect(suggestion);
          }
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setInputFocused(false);
        setSelectedSuggestion(-1);
        inputRef.current?.blur();
        break;
    }
  }, [inputFocused, suggestions, selectedSuggestion, handleSuggestionSelect, handleSearch]);

  // ハイライト付きテキスト生成
  const highlightText = useCallback((text: string, highlights: { positions: number[] }) => {
    if (!highlights.positions.length) return text;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    highlights.positions.forEach((pos, index) => {
      // 通常のテキスト
      if (pos > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {text.substring(lastIndex, pos)}
          </span>
        );
      }

      // ハイライト部分の長さを推定（簡易版）
      const queryLength = query.length;
      const highlightEnd = Math.min(pos + queryLength, text.length);
      
      parts.push(
        <mark key={`highlight-${index}`} className="bg-yellow-200 px-0.5 rounded">
          {text.substring(pos, highlightEnd)}
        </mark>
      );

      lastIndex = highlightEnd;
    });

    // 残りのテキスト
    if (lastIndex < text.length) {
      parts.push(
        <span key="text-end">
          {text.substring(lastIndex)}
        </span>
      );
    }

    return <>{parts}</>;
  }, [query]);

  return (
    <div className={`enhanced-search-interface ${className}`}>
      {/* メイン検索バー */}
      <div className="relative">
        <div className="flex gap-2">
          {/* 検索入力 */}
          <div className="flex-1 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={handleQueryChange}
                onFocus={() => setInputFocused(true)}
                onKeyDown={handleKeyDown}
                className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  error ? 'border-red-500' : 'border-gray-300'
                } ${compact ? 'py-2 text-sm' : ''}`}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>

            {/* 検索候補 */}
            {inputFocused && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion}
                    ref={(el) => (suggestionRefs.current[index] = el)}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className={`px-4 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                      selectedSuggestion === index ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{suggestion}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`px-4 py-3 border rounded-lg transition-colors flex items-center gap-2 ${
                showAdvanced ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              } ${compact ? 'py-2 px-3' : ''}`}
              title="高度な検索オプション"
            >
              <Filter className="w-4 h-4" />
              {!compact && <span className="text-sm font-medium">フィルタ</span>}
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`px-4 py-3 border rounded-lg transition-colors flex items-center gap-2 ${
                showHistory ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              } ${compact ? 'py-2 px-3' : ''}`}
              title="検索履歴"
            >
              <History className="w-4 h-4" />
              {!compact && history.length > 0 && (
                <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                  {history.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowStats(!showStats)}
              className={`px-4 py-3 border rounded-lg transition-colors flex items-center gap-2 ${
                showStats ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              } ${compact ? 'py-2 px-3' : ''}`}
              title="検索統計"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* 高度な検索オプション */}
      {showAdvanced && (
        <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* タグフィルタ */}
            <TagFilterComponent
              selectedTags={filters.tags || []}
              onTagsChange={handleTagsChange}
              showCount={true}
              maxVisible={8}
              allowCreate={false}
            />

            {/* 日付範囲フィルタ */}
            <DateRangeFilter
              dateRange={filters.dateRange}
              onDateRangeChange={handleDateRangeChange}
            />
          </div>

          {/* ソートオプション */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">並び順:</span>
              <select
                value={filters.sortBy || 'relevance'}
                onChange={(e) => handleSortChange(e.target.value as any, filters.sortOrder)}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="relevance">関連性</option>
                <option value="date">更新日時</option>
                <option value="title">タイトル</option>
                <option value="popularity">人気度</option>
              </select>
              
              <select
                value={filters.sortOrder || 'desc'}
                onChange={(e) => handleSortChange(filters.sortBy, e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="desc">降順</option>
                <option value="asc">昇順</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 検索履歴 */}
      {showHistory && history.length > 0 && (
        <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">検索履歴</h3>
            <button
              onClick={clearHistory}
              className="text-xs text-red-600 hover:text-red-800 transition-colors"
            >
              履歴をクリア
            </button>
          </div>
          <div className="space-y-2">
            {history.slice(0, 10).map(entry => (
              <div
                key={entry.id}
                onClick={() => handleHistorySelect(entry.query)}
                className="flex items-center justify-between p-2 bg-white rounded border hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{entry.query}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{entry.resultCount}件</span>
                  <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 検索統計 */}
      {showStats && (
        <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-3">検索統計</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded border">
              <div className="text-xs text-gray-500">インデックス済み</div>
              <div className="text-lg font-semibold text-blue-600">{stats.documentCount}</div>
              <div className="text-xs text-gray-500">ドキュメント</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-xs text-gray-500">検索エントリ</div>
              <div className="text-lg font-semibold text-green-600">{stats.indexEntryCount}</div>
              <div className="text-xs text-gray-500">トークン</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-xs text-gray-500">検索履歴</div>
              <div className="text-lg font-semibold text-purple-600">{history.length}</div>
              <div className="text-xs text-gray-500">クエリ</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-xs text-gray-500">最新検索時間</div>
              <div className="text-lg font-semibold text-orange-600">{searchTime.toFixed(1)}</div>
              <div className="text-xs text-gray-500">ミリ秒</div>
            </div>
          </div>
        </div>
      )}

      {/* 検索結果 */}
      {hasSearched && (
        <div className="mt-4">
          {/* 結果サマリー */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              {results.length > 0 ? (
                <>
                  <span className="font-medium">{results.length}件</span>のノートが見つかりました
                  {query && (
                    <span className="ml-2 text-blue-600">
                      検索: "<span className="font-medium">{query}</span>"
                    </span>
                  )}
                </>
              ) : (
                <span>検索結果が見つかりませんでした</span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              検索時間: {searchTime.toFixed(1)}ms
            </div>
          </div>

          {/* 結果リスト */}
          {results.length > 0 && (
            <div className="space-y-3">
              {results.map(result => (
                <div
                  key={`${result.noteId}-${result.pageId || 'note'}`}
                  onClick={() => handleNoteSelect(result)}
                  className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900 mb-1">
                        {result.highlights.find(h => h.field === 'title') ? (
                          highlightText(result.title, result.highlights.find(h => h.field === 'title')!)
                        ) : (
                          result.title
                        )}
                      </h4>
                      
                      {result.snippet && (
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                          {result.highlights.find(h => h.field === 'content') ? (
                            highlightText(result.snippet, result.highlights.find(h => h.field === 'content')!)
                          ) : (
                            result.snippet
                          )}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>スコア: {result.score.toFixed(1)}</span>
                        <span>
                          {result.document.type === 'page' ? 'ページ' : 'ノート'}
                        </span>
                        <span>
                          更新: {new Date(result.document.updatedAt).toLocaleDateString()}
                        </span>
                        {result.document.tags.length > 0 && (
                          <div className="flex gap-1">
                            {result.document.tags.slice(0, 3).map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                            {result.document.tags.length > 3 && (
                              <span className="text-gray-400">+{result.document.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4 text-right">
                      <div className="text-sm font-medium text-blue-600">
                        {result.document.isPinned && '📌'}
                        {result.document.isFavorite && '⭐'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 検索結果なしの場合 */}
          {results.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <Search className="w-12 h-12 mx-auto" />
              </div>
              <p className="text-gray-600 mb-2">検索結果が見つかりませんでした</p>
              <p className="text-sm text-gray-500">
                別のキーワードを試すか、フィルタを調整してください
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedSearchInterface;