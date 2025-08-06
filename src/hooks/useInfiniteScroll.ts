import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions<T> {
  items: T[];
  pageSize?: number;
  threshold?: number;
  loadingDelay?: number;
  onLoadMore?: (page: number, pageSize: number) => Promise<T[]> | T[];
  hasMore?: boolean;
  enabled?: boolean;
}

interface UseInfiniteScrollReturn<T> {
  displayedItems: T[];
  isLoading: boolean;
  hasMoreItems: boolean;
  loadMore: () => void;
  reset: () => void;
  scrollElementRef: React.RefObject<HTMLDivElement>;
  currentPage: number;
  totalPages: number;
}

export const useInfiniteScroll = <T,>({
  items,
  pageSize = 20,
  threshold = 100,
  loadingDelay = 500,
  onLoadMore,
  hasMore = true,
  enabled = true
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> => {
  const [displayedItems, setDisplayedItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreItems, setHasMoreItems] = useState(hasMore);
  
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);

  // 総ページ数を計算
  const totalPages = Math.ceil(items.length / pageSize);

  // 初期アイテムの設定
  useEffect(() => {
    if (items.length > 0) {
      const initialItems = items.slice(0, pageSize);
      setDisplayedItems(initialItems);
      setCurrentPage(initialItems.length > 0 ? 1 : 0);
      setHasMoreItems(items.length > pageSize || hasMore);
    } else {
      setDisplayedItems([]);
      setCurrentPage(0);
      setHasMoreItems(hasMore);
    }
  }, [items, pageSize, hasMore]);

  // アイテムを追加で読み込む
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !enabled || !hasMoreItems) return;

    // 連続読み込み防止（最後の読み込みから一定時間経過後のみ実行）
    const now = Date.now();
    if (now - lastLoadTimeRef.current < loadingDelay) return;

    loadingRef.current = true;
    setIsLoading(true);
    lastLoadTimeRef.current = now;

    try {
      let newItems: T[] = [];

      if (onLoadMore) {
        // 外部からデータを取得
        newItems = await Promise.resolve(onLoadMore(currentPage, pageSize));
      } else {
        // ローカルアイテムから次のページを取得
        const startIndex = currentPage * pageSize;
        const endIndex = startIndex + pageSize;
        newItems = items.slice(startIndex, endIndex);
      }

      if (newItems.length > 0) {
        setDisplayedItems(prev => {
          // 重複を避けるために、新しいアイテムのみを追加
          const existingIds = new Set(prev.map((item: any) => item.id || JSON.stringify(item)));
          const uniqueNewItems = newItems.filter((item: any) => 
            !existingIds.has(item.id || JSON.stringify(item))
          );
          return [...prev, ...uniqueNewItems];
        });
        setCurrentPage(prev => prev + 1);
      }

      // これ以上読み込むアイテムがあるかチェック
      if (!onLoadMore) {
        const nextStartIndex = (currentPage + 1) * pageSize;
        setHasMoreItems(nextStartIndex < items.length);
      } else {
        setHasMoreItems(newItems.length === pageSize);
      }

    } catch (error) {
      console.error('Error loading more items:', error);
    } finally {
      // 読み込み状態を少し遅延させてユーザビリティを向上
      setTimeout(() => {
        setIsLoading(false);
        loadingRef.current = false;
      }, Math.max(300, loadingDelay));
    }
  }, [currentPage, pageSize, items, onLoadMore, enabled, hasMoreItems, loadingDelay]);

  // スクロール位置を監視
  const handleScroll = useCallback(() => {
    const element = scrollElementRef.current;
    if (!element || !enabled || loadingRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;

    // 閾値に達したら読み込み開始
    if (distanceToBottom <= threshold && hasMoreItems) {
      loadMore();
    }
  }, [loadMore, threshold, enabled, hasMoreItems]);

  // Intersection Observer を使用したより効率的な実装
  const observerRef = useRef<IntersectionObserver>();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !hasMoreItems) return;

    // Intersection Observer のセットアップ
    if ('IntersectionObserver' in window) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const target = entries[0];
          if (target.isIntersecting && !loadingRef.current) {
            loadMore();
          }
        },
        {
          root: scrollElementRef.current,
          rootMargin: `${threshold}px`,
          threshold: 0
        }
      );

      if (sentinelRef.current) {
        observerRef.current.observe(sentinelRef.current);
      }
    } else {
      // フォールバック: スクロールイベント
      const element = scrollElementRef.current;
      if (element) {
        element.addEventListener('scroll', handleScroll, { passive: true });
      }
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      const element = scrollElementRef.current;
      if (element) {
        element.removeEventListener('scroll', handleScroll);
      }
    };
  }, [enabled, hasMoreItems, loadMore, threshold, handleScroll]);

  // リセット機能
  const reset = useCallback(() => {
    setDisplayedItems(items.slice(0, pageSize));
    setCurrentPage(items.length > 0 ? 1 : 0);
    setHasMoreItems(items.length > pageSize || hasMore);
    setIsLoading(false);
    loadingRef.current = false;
    lastLoadTimeRef.current = 0;

    // スクロール位置をトップに戻す
    if (scrollElementRef.current) {
      scrollElementRef.current.scrollTop = 0;
    }
  }, [items, pageSize, hasMore]);

  return {
    displayedItems,
    isLoading,
    hasMoreItems,
    loadMore,
    reset,
    scrollElementRef,
    currentPage,
    totalPages
  };
};

export default useInfiniteScroll;