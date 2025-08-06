import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useHaptics } from '../../hooks/useHaptics';

interface BottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: number[]; // 0-1の値で高さの割合を指定
  initialSnapPoint?: number;
  allowSwipeDown?: boolean;
  showCloseButton?: boolean;
  showDragHandle?: boolean;
  maxHeight?: string;
  className?: string;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  isVisible,
  onClose,
  title,
  children,
  snapPoints = [0.3, 0.7, 0.95],
  initialSnapPoint = 0,
  allowSwipeDown = true,
  showCloseButton = true,
  showDragHandle = true,
  maxHeight = '95vh',
  className = ''
}) => {
  const [currentSnapPoint, setCurrentSnapPoint] = useState(initialSnapPoint);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartHeight, setDragStartHeight] = useState(0);
  
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { tapFeedback, successFeedback } = useHaptics();

  // 現在のスナップポイントに基づく高さを計算
  const getCurrentHeight = useCallback(() => {
    const point = snapPoints[currentSnapPoint];
    return `${point * 100}%`;
  }, [snapPoints, currentSnapPoint]);

  // 最も近いスナップポイントを見つける
  const findNearestSnapPoint = useCallback((height: number) => {
    const windowHeight = window.innerHeight;
    const heightRatio = height / windowHeight;
    
    let nearestIndex = 0;
    let minDistance = Math.abs(snapPoints[0] - heightRatio);
    
    for (let i = 1; i < snapPoints.length; i++) {
      const distance = Math.abs(snapPoints[i] - heightRatio);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }
    
    return nearestIndex;
  }, [snapPoints]);

  // ドラッグ開始
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!allowSwipeDown) return;
    
    const touch = e.touches[0];
    const rect = sheetRef.current?.getBoundingClientRect();
    
    if (rect) {
      setIsDragging(true);
      setDragStartY(touch.clientY);
      setDragStartHeight(window.innerHeight - rect.top);
      tapFeedback();
    }
  }, [allowSwipeDown, tapFeedback]);

  // ドラッグ中
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const deltaY = touch.clientY - dragStartY;
    const newHeight = Math.max(0, dragStartHeight - deltaY);
    const maxHeight = window.innerHeight * Math.max(...snapPoints);
    
    if (newHeight <= maxHeight && sheetRef.current) {
      const heightPercentage = (newHeight / window.innerHeight) * 100;
      sheetRef.current.style.height = `${heightPercentage}%`;
    }
  }, [isDragging, dragStartY, dragStartHeight, snapPoints]);

  // ドラッグ終了
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    const currentHeight = sheetRef.current?.getBoundingClientRect().height || 0;
    const newSnapPoint = findNearestSnapPoint(currentHeight);
    
    // 最小スナップポイントより小さい場合は閉じる
    if (currentHeight < window.innerHeight * snapPoints[0] * 0.7) {
      successFeedback();
      onClose();
      return;
    }
    
    setCurrentSnapPoint(newSnapPoint);
    successFeedback();
  }, [isDragging, findNearestSnapPoint, snapPoints, onClose, successFeedback]);

  // マウスイベント（デスクトップ対応）
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!allowSwipeDown) return;
    
    const rect = sheetRef.current?.getBoundingClientRect();
    if (rect) {
      setIsDragging(true);
      setDragStartY(e.clientY);
      setDragStartHeight(window.innerHeight - rect.top);
    }
  }, [allowSwipeDown]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaY = e.clientY - dragStartY;
    const newHeight = Math.max(0, dragStartHeight - deltaY);
    const maxHeightValue = window.innerHeight * Math.max(...snapPoints);
    
    if (newHeight <= maxHeightValue && sheetRef.current) {
      const heightPercentage = (newHeight / window.innerHeight) * 100;
      sheetRef.current.style.height = `${heightPercentage}%`;
    }
  }, [isDragging, dragStartY, dragStartHeight, snapPoints]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    const currentHeight = sheetRef.current?.getBoundingClientRect().height || 0;
    const newSnapPoint = findNearestSnapPoint(currentHeight);
    
    if (currentHeight < window.innerHeight * snapPoints[0] * 0.7) {
      onClose();
      return;
    }
    
    setCurrentSnapPoint(newSnapPoint);
  }, [isDragging, findNearestSnapPoint, snapPoints, onClose]);

  // イベントリスナーの設定
  useEffect(() => {
    if (!sheetRef.current) return;

    const sheet = sheetRef.current;
    
    // タッチイベント
    sheet.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    
    // マウスイベント
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      sheet.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseMove, handleMouseUp]);

  // 高さをスナップポイントに合わせる
  useEffect(() => {
    if (sheetRef.current && !isDragging) {
      sheetRef.current.style.height = getCurrentHeight();
    }
  }, [currentSnapPoint, getCurrentHeight, isDragging]);

  // キーボードイベント（ESCで閉じる）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, onClose]);

  // 可視性の制御
  useEffect(() => {
    if (isVisible) {
      // 表示時はbodyのスクロールを無効にする
      document.body.style.overflow = 'hidden';
    } else {
      // 非表示時はbodyのスクロールを復元
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isVisible]);

  // プログラムからスナップポイントを変更する関数（将来の機能拡張用）
  // const snapTo = useCallback((snapPointIndex: number) => {
  //   if (snapPointIndex >= 0 && snapPointIndex < snapPoints.length) {
  //     setCurrentSnapPoint(snapPointIndex);
  //     successFeedback();
  //   }
  // }, [snapPoints, successFeedback]);

  if (!isVisible) return null;

  return (
    <>
      {/* バックドロップ */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={onClose}
        style={{
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}
      />

      {/* ボトムシート */}
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl z-50 flex flex-col transition-all duration-300 ease-out ${className}`}
        style={{
          height: getCurrentHeight(),
          maxHeight,
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)'
        }}
      >
        {/* ドラッグハンドル */}
        {showDragHandle && (
          <div
            className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
          >
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        )}

        {/* ヘッダー */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            )}
          </div>
        )}

        {/* コンテンツ */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>

        {/* スナップポイントインジケーター（デバッグ用、必要に応じて削除） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute top-2 right-2 text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            {currentSnapPoint + 1}/{snapPoints.length} ({Math.round(snapPoints[currentSnapPoint] * 100)}%)
          </div>
        )}
      </div>
    </>
  );
};

// BottomSheetのコンテキストとフック
export interface BottomSheetContextType {
  showBottomSheet: (props: Omit<BottomSheetProps, 'isVisible' | 'onClose'>) => void;
  hideBottomSheet: () => void;
  isVisible: boolean;
}

const BottomSheetContext = React.createContext<BottomSheetContextType | null>(null);

export const BottomSheetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sheetProps, setSheetProps] = useState<Omit<BottomSheetProps, 'isVisible' | 'onClose'> | null>(null);

  const showBottomSheet = useCallback((props: Omit<BottomSheetProps, 'isVisible' | 'onClose'>) => {
    setSheetProps(props);
  }, []);

  const hideBottomSheet = useCallback(() => {
    setSheetProps(null);
  }, []);

  return (
    <BottomSheetContext.Provider value={{
      showBottomSheet,
      hideBottomSheet,
      isVisible: !!sheetProps
    }}>
      {children}
      {sheetProps && (
        <BottomSheet
          {...sheetProps}
          isVisible={true}
          onClose={hideBottomSheet}
        />
      )}
    </BottomSheetContext.Provider>
  );
};

export const useBottomSheet = (): BottomSheetContextType => {
  const context = React.useContext(BottomSheetContext);
  if (!context) {
    throw new Error('useBottomSheet must be used within a BottomSheetProvider');
  }
  return context;
};

export default BottomSheet;