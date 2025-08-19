import React, { useState, useRef, useEffect } from 'react';
import { Search, Replace, ChevronDown, ChevronUp, X, Zap, Settings } from 'lucide-react';
import { MarkdownSearchReplace, SearchMatch, SearchOptions } from '../../utils/markdownSearchReplace';
import { useHaptics } from '../../hooks/useHaptics';

interface MarkdownSearchReplaceProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
  onTextChange: (newText: string) => void;
  onJumpToPosition: (position: number) => void;
  currentPosition: number;
}

const MarkdownSearchReplaceComponent: React.FC<MarkdownSearchReplaceProps> = ({
  isOpen,
  onClose,
  text,
  onTextChange,
  onJumpToPosition,
  currentPosition
}) => {
  const { tapFeedback, successFeedback, selectionFeedback } = useHaptics();
  
  // 検索・置換の状態
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  // 検索オプション
  const [options, setOptions] = useState<SearchOptions>({
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    searchInSelection: false
  });
  
  // 検索結果
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [searchStats, setSearchStats] = useState({ totalMatches: 0, linesWithMatches: 0 });
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // 検索実行
  const performSearch = (term: string = searchTerm) => {
    if (!term.trim()) {
      setMatches([]);
      setCurrentMatchIndex(-1);
      setSearchStats({ totalMatches: 0, linesWithMatches: 0 });
      return;
    }

    try {
      const searchMatches = MarkdownSearchReplace.search(text, term, options);
      setMatches(searchMatches);
      
      if (searchMatches.length > 0) {
        // 現在位置に最も近いマッチを選択
        const nearestIndex = searchMatches.findIndex(match => match.start >= currentPosition);
        setCurrentMatchIndex(nearestIndex >= 0 ? nearestIndex : 0);
      } else {
        setCurrentMatchIndex(-1);
      }
      
      const stats = MarkdownSearchReplace.getSearchStats(searchMatches);
      setSearchStats({ totalMatches: stats.totalMatches, linesWithMatches: stats.linesWithMatches });
      
    } catch (error) {
      console.warn('Search error:', error);
      setMatches([]);
      setCurrentMatchIndex(-1);
    }
  };

  // 次のマッチに移動
  const findNext = () => {
    if (matches.length === 0) return;
    
    const nextIndex = currentMatchIndex < matches.length - 1 ? currentMatchIndex + 1 : 0;
    setCurrentMatchIndex(nextIndex);
    onJumpToPosition(matches[nextIndex]!.start);
    selectionFeedback();
  };

  // 前のマッチに移動
  const findPrevious = () => {
    if (matches.length === 0) return;
    
    const prevIndex = currentMatchIndex > 0 ? currentMatchIndex - 1 : matches.length - 1;
    setCurrentMatchIndex(prevIndex);
    onJumpToPosition(matches[prevIndex]!.start);
    selectionFeedback();
  };

  // 単一置換
  const replaceOne = () => {
    if (matches.length === 0 || currentMatchIndex < 0) return;
    
    const result = MarkdownSearchReplace.replace(text, searchTerm, replaceTerm, options);
    if (result.replacedCount > 0) {
      onTextChange(result.newText);
      successFeedback();
      
      // 検索を再実行
      setTimeout(() => performSearch(), 100);
    }
  };

  // 全置換
  const replaceAll = () => {
    if (matches.length === 0) return;
    
    const result = MarkdownSearchReplace.replaceAll(text, searchTerm, replaceTerm, options);
    if (result.replacedCount > 0) {
      onTextChange(result.newText);
      successFeedback();
      
      // 検索をクリア
      setMatches([]);
      setCurrentMatchIndex(-1);
      setSearchStats({ totalMatches: 0, linesWithMatches: 0 });
    }
  };

  // キーボードショートカット
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        findPrevious();
      } else {
        findNext();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // 検索実行（デバウンス）
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch();
    }, 300);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, options, text]);

  // 初期フォーカス
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const markdownPatterns = MarkdownSearchReplace.getMarkdownPatterns();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-8">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md mx-4 shadow-xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Search size={20} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              検索・置換
            </h3>
          </div>
          <button
            onClick={() => {
              tapFeedback();
              onClose();
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* 検索フィールド */}
        <div className="p-4 space-y-3">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  tapFeedback();
                }}
                onKeyDown={handleKeyDown}
                placeholder="検索キーワード..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    tapFeedback();
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            {/* 検索ナビゲーション */}
            <div className="flex items-center space-x-1">
              <button
                onClick={findPrevious}
                disabled={matches.length === 0}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
                title="前を検索 (Shift+Enter)"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={findNext}
                disabled={matches.length === 0}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
                title="次を検索 (Enter)"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* 検索結果統計 */}
          {searchTerm && (
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>
                {matches.length > 0 
                  ? `${currentMatchIndex + 1} / ${matches.length} 件`
                  : searchTerm ? '該当なし' : ''
                }
              </span>
              {searchStats.totalMatches > 0 && (
                <span>{searchStats.linesWithMatches} 行にマッチ</span>
              )}
            </div>
          )}

          {/* 置換トグル */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setShowReplace(!showReplace);
                tapFeedback();
              }}
              className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              <Replace size={16} className="mr-1" />
              置換{showReplace ? '非表示' : '表示'}
            </button>
            
            <button
              onClick={() => {
                setShowOptions(!showOptions);
                tapFeedback();
              }}
              className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <Settings size={16} className="mr-1" />
              オプション
            </button>
          </div>

          {/* 置換フィールド */}
          {showReplace && (
            <div className="space-y-3">
              <input
                ref={replaceInputRef}
                type="text"
                value={replaceTerm}
                onChange={(e) => {
                  setReplaceTerm(e.target.value);
                  tapFeedback();
                }}
                placeholder="置換後のテキスト..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={replaceOne}
                  disabled={matches.length === 0 || currentMatchIndex < 0}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm"
                >
                  1つ置換
                </button>
                <button
                  onClick={replaceAll}
                  disabled={matches.length === 0}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg text-sm"
                >
                  全て置換 ({matches.length})
                </button>
              </div>
            </div>
          )}

          {/* 検索オプション */}
          {showOptions && (
            <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.caseSensitive}
                  onChange={(e) => {
                    setOptions(prev => ({ ...prev, caseSensitive: e.target.checked }));
                    tapFeedback();
                  }}
                  className="mr-2"
                />
                <span className="text-sm">大文字・小文字を区別</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.wholeWord}
                  onChange={(e) => {
                    setOptions(prev => ({ ...prev, wholeWord: e.target.checked }));
                    tapFeedback();
                  }}
                  className="mr-2"
                />
                <span className="text-sm">単語全体にマッチ</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.useRegex}
                  onChange={(e) => {
                    setOptions(prev => ({ ...prev, useRegex: e.target.checked }));
                    tapFeedback();
                  }}
                  className="mr-2"
                />
                <span className="text-sm">正規表現を使用</span>
              </label>
            </div>
          )}

          {/* よく使うパターン */}
          <div className="space-y-2">
            <button
              onClick={() => {
                setShowOptions(!showOptions);
                tapFeedback();
              }}
              className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <Zap size={16} className="mr-1" />
              クイックパターン
            </button>
            
            {showOptions && (
              <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                {markdownPatterns.slice(0, 4).map((pattern) => (
                  <button
                    key={pattern.name}
                    onClick={() => {
                      setSearchTerm(pattern.pattern);
                      setOptions(prev => ({ ...prev, useRegex: true }));
                      tapFeedback();
                    }}
                    className="text-left px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded"
                  >
                    <div className="font-medium text-blue-700 dark:text-blue-300">{pattern.description}</div>
                    <div className="text-blue-600 dark:text-blue-400 font-mono">{pattern.pattern}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-2xl">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Enter: 次へ • Shift+Enter: 前へ</span>
            <span>Esc: 閉じる</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkdownSearchReplaceComponent;