import React from 'react';
import { Loader2, AlertCircle, ChevronUp } from 'lucide-react';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useHaptics } from '../../hooks/useHaptics';

interface InfiniteScrollListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  pageSize?: number;
  threshold?: number;
  loadingDelay?: number;
  onLoadMore?: (page: number, pageSize: number) => Promise<T[]> | T[];
  hasMore?: boolean;
  enabled?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
  loadingMessage?: string;
  className?: string;
  itemClassName?: string;
  showScrollToTop?: boolean;
  scrollToTopThreshold?: number;
}

const InfiniteScrollList = <T,>({
  items,
  renderItem,
  keyExtractor,
  pageSize = 20,
  threshold = 100,
  loadingDelay = 500,
  onLoadMore,
  hasMore = true,
  enabled = true,
  emptyMessage = 'アイテムがありません',
  loadingMessage = '読み込み中...',
  className = '',
  itemClassName = '',
  showScrollToTop = true,
  scrollToTopThreshold = 500
}: InfiniteScrollListProps<T>) => {
  const [showScrollToTopButton, setShowScrollToTopButton] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const { tapFeedback } = useHaptics();

  const {
    displayedItems,
    isLoading,
    hasMoreItems,
    loadMore,
    reset,
    scrollElementRef,
    currentPage,
    totalPages
  } = useInfiniteScroll({
    items,
    pageSize,
    threshold,
    loadingDelay,
    onLoadMore: async (page, size) => {
      try {
        setError(null);
        if (onLoadMore) {
          return await onLoadMore(page, size);
        }
        return [];
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
        throw err;
      }
    },
    hasMore,
    enabled
  });

  // スクロール位置の監視（トップボタン表示用）
  React.useEffect(() => {
    const element = scrollElementRef.current;
    if (!element || !showScrollToTop) return;

    const handleScroll = () => {
      const shouldShow = element.scrollTop > scrollToTopThreshold;
      setShowScrollToTopButton(shouldShow);
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [showScrollToTop, scrollToTopThreshold]);

  // トップにスクロール
  const scrollToTop = () => {
    if (scrollElementRef.current) {
      scrollElementRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
    tapFeedback();
  };

  // エラー時の再試行
  const handleRetry = () => {
    setError(null);
    reset();
    tapFeedback();
  };

  // 手動で追加読み込み
  const handleLoadMore = () => {
    if (!isLoading && hasMoreItems) {
      loadMore();
      tapFeedback();
    }
  };

  return (
    <div className="relative h-full">
      {/* メインスクロールコンテナ */}
      <div
        ref={scrollElementRef}
        className={`h-full overflow-y-auto overscroll-contain ${className}`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* アイテムリスト */}
        {displayedItems.length === 0 && !isLoading ? (
          // 空の状態
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <AlertCircle size={32} className="text-gray-400" />
            </div>
            <p className="text-center">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedItems.map((item, index) => (
              <div key={keyExtractor(item, index)} className={itemClassName}>
                {renderItem(item, index)}
              </div>
            ))}
          </div>
        )}

        {/* スクロール検知用の透明要素 */}
        <div 
          style={{
            height: '1px',
            backgroundColor: 'transparent'
          }}
          aria-hidden="true"
        />

        {/* 読み込み中インジケーター */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-blue-500 mr-3" />
            <span className="text-gray-600 dark:text-gray-400">{loadingMessage}</span>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="flex flex-col items-center justify-center py-8 text-red-500">
            <AlertCircle size={24} className="mb-2" />
            <p className="text-center mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              再試行
            </button>
          </div>
        )}

        {/* 手動読み込みボタン */}
        {!isLoading && hasMoreItems && !error && (
          <div className="flex justify-center py-6">
            <button
              onClick={handleLoadMore}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors shadow-lg"
            >
              さらに読み込む
            </button>
          </div>
        )}

        {/* 全て読み込み完了メッセージ */}
        {!hasMoreItems && displayedItems.length > 0 && (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <div className="inline-flex items-center space-x-2">
              <div className="w-12 h-px bg-gray-300 dark:bg-gray-600"></div>
              <span className="text-sm">すべて読み込みました</span>
              <div className="w-12 h-px bg-gray-300 dark:bg-gray-600"></div>
            </div>
          </div>
        )}

        {/* ページ情報（デバッグ用） */}
        {process.env.NODE_ENV === 'development' && displayedItems.length > 0 && (
          <div className="sticky bottom-0 left-0 right-0 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs p-2 text-center">
            ページ {currentPage} / {totalPages} | 表示中: {displayedItems.length} / {items.length}
          </div>
        )}
      </div>

      {/* トップに戻るボタン */}
      {showScrollToTopButton && showScrollToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-30 transition-all duration-200 active:scale-95"
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
        >
          <ChevronUp size={20} />
        </button>
      )}

      {/* スクロール進捗インジケーター */}
      {displayedItems.length > pageSize && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 z-10">
          <div
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{
              width: `${Math.min((displayedItems.length / items.length) * 100, 100)}%`
            }}
          />
        </div>
      )}
    </div>
  );
};

export default InfiniteScrollList;