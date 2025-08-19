import { useState, useRef, useCallback } from 'react';
import { useHaptics } from './useHaptics';

interface SwipeAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  backgroundColor: string;
  textColor: string;
  onAction: () => void;
}

interface SwipeGestureOptions {
  threshold?: number;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
}

export const useSwipeGesture = ({
  threshold = 75,
  leftActions = [],
  rightActions = [],
  onSwipeStart,
  onSwipeEnd
}: SwipeGestureOptions) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  const startX = useRef<number>(0);
  const currentX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  
  const { tapFeedback, selectionFeedback } = useHaptics();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    
    startX.current = touch.clientX;
    isDragging.current = true;
    setIsActive(true);
    onSwipeStart?.();
  }, [onSwipeStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;

    const touch = e.touches[0];
    if (!touch) return;
    
    currentX.current = touch.clientX;
    const diff = currentX.current - startX.current;
    
    // 左右どちらにスワイプしているかを判定
    const direction = diff > 0 ? 'right' : 'left';
    setSwipeDirection(direction);
    
    // スワイプの制限（アクションが無い方向へのスワイプを制限）
    const maxLeftSwipe = rightActions.length > 0 ? -150 : 0;
    const maxRightSwipe = leftActions.length > 0 ? 150 : 0;
    
    const constrainedOffset = Math.max(maxLeftSwipe, Math.min(maxRightSwipe, diff));
    setSwipeOffset(constrainedOffset);

    // 閾値を超えた時のハプティックフィードバック
    if (Math.abs(constrainedOffset) >= threshold && Math.abs(swipeOffset) < threshold) {
      selectionFeedback();
    }
  }, [threshold, leftActions.length, rightActions.length, swipeOffset, selectionFeedback]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    
    isDragging.current = false;
    setIsActive(false);
    onSwipeEnd?.();

    // スワイプ距離が閾値を超えている場合、アクションを実行
    if (Math.abs(swipeOffset) >= threshold) {
      const actions = swipeDirection === 'left' ? rightActions : leftActions;
      
      if (actions.length > 0) {
        // 最初のアクションを実行（複数アクションの場合は拡張可能）
        tapFeedback();
        actions[0]?.onAction();
      }
    }

    // リセット
    setSwipeOffset(0);
    setSwipeDirection(null);
  }, [swipeOffset, threshold, swipeDirection, leftActions, rightActions, tapFeedback]);

  const resetSwipe = useCallback(() => {
    setSwipeOffset(0);
    setSwipeDirection(null);
    setIsActive(false);
    isDragging.current = false;
  }, []);

  // スワイプ可能な要素に適用するprops
  const swipeProps = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    style: {
      transform: `translateX(${swipeOffset}px)`,
      transition: isActive ? 'none' : 'transform 0.3s ease-out'
    }
  };

  // アクションボタンを表示するかどうか
  const showLeftActions = swipeOffset > threshold && leftActions.length > 0;
  const showRightActions = swipeOffset < -threshold && rightActions.length > 0;

  return {
    swipeProps,
    swipeOffset,
    isActive,
    swipeDirection,
    showLeftActions,
    showRightActions,
    leftActions,
    rightActions,
    resetSwipe
  };
};