import { useCallback, useRef, useState, useEffect } from 'react';
import { useHaptics } from './useHaptics';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  enabled = true
}: PullToRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { successFeedback, tapFeedback } = useHaptics();

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;

    const touch = e.touches[0];
    if (!touch) return;
    
    startY.current = touch.clientY;
    setIsDragging(true);
  }, [enabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !enabled || isRefreshing) return;

    const touch = e.touches[0];
    if (!touch) return;
    
    currentY.current = touch.clientY;
    const diff = currentY.current - startY.current;

    if (diff > 0) {
      e.preventDefault();
      const distance = Math.min(diff / resistance, threshold * 1.5);
      setPullDistance(distance);

      // ハプティックフィードバック（閾値を超えた時）
      if (distance >= threshold && pullDistance < threshold) {
        tapFeedback();
      }
    }
  }, [isDragging, enabled, isRefreshing, threshold, resistance, pullDistance, tapFeedback]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging || !enabled) return;

    setIsDragging(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      successFeedback();
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
  }, [isDragging, enabled, pullDistance, threshold, isRefreshing, onRefresh, successFeedback]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const pullToRefreshProps = {
    ref: containerRef,
    style: {
      transform: isDragging ? `translateY(${Math.min(pullDistance, threshold)}px)` : 'translateY(0)',
      transition: isDragging ? 'none' : 'transform 0.3s ease-out'
    }
  };

  const refreshIndicatorProps = {
    style: {
      opacity: pullDistance > 0 ? Math.min(pullDistance / threshold, 1) : 0,
      transform: `scale(${Math.min(pullDistance / threshold, 1)})`,
      transition: isDragging ? 'none' : 'all 0.3s ease-out'
    }
  };

  return {
    pullToRefreshProps,
    refreshIndicatorProps,
    isRefreshing,
    pullDistance,
    isDragging,
    isTriggered: pullDistance >= threshold
  };
};

export default usePullToRefresh;