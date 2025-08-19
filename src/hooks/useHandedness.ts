import { useState, useEffect, useCallback } from 'react';

export type Handedness = 'left' | 'right' | 'auto';

interface HandednessDetectionOptions {
  onDetection?: (handedness: Handedness) => void;
  enableAutoDetection?: boolean;
}

export const useHandedness = (options: HandednessDetectionOptions = {}) => {
  const [handedness, setHandedness] = useState<Handedness>(() => {
    // localStorage から設定を読み込み
    const stored = localStorage.getItem('notespace-handedness');
    return (stored as Handedness) || 'auto';
  });

  const [detectedHandedness, setDetectedHandedness] = useState<'left' | 'right'>('right');

  const { onDetection, enableAutoDetection = true } = options;

  // 自動検出のためのタッチ分析
  const analyzeTouch = useCallback((touches: TouchList) => {
    if (!enableAutoDetection || handedness !== 'auto') return;

    const touch = touches[0];
    if (!touch) return;
    
    const screenWidth = window.innerWidth;
    const touchX = touch.clientX;
    
    // 画面の左側3分の1をタッチした場合は左利き、右側3分の1は右利きの可能性
    if (touchX < screenWidth * 0.33) {
      return 'left';
    } else if (touchX > screenWidth * 0.67) {
      return 'right';
    }
    
    return null;
  }, [enableAutoDetection, handedness]);

  // タッチイベントの分析履歴
  const [touchHistory, setTouchHistory] = useState<('left' | 'right')[]>([]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const detected = analyzeTouch(e.touches);
    if (detected) {
      setTouchHistory(prev => {
        const newHistory = [...prev, detected].slice(-10) as ('left' | 'right')[]; // 最新10回のタッチを保持
        
        // 10回のタッチデータが蓄積されたら分析
        if (newHistory.length >= 10) {
          const leftCount = newHistory.filter(h => h === 'left').length;
          const rightCount = newHistory.filter(h => h === 'right').length;
          
          // 70%以上のタッチが片側に偏っている場合、その側を利き手と判定
          if (leftCount >= 7) {
            setDetectedHandedness('left');
            onDetection?.('left');
          } else if (rightCount >= 7) {
            setDetectedHandedness('right');
            onDetection?.('right');
          }
        }
        
        return newHistory;
      });
    }
  }, [analyzeTouch, onDetection]);

  // 手動設定
  const setManualHandedness = useCallback((newHandedness: Handedness) => {
    setHandedness(newHandedness);
    localStorage.setItem('notespace-handedness', newHandedness);
    
    if (newHandedness === 'left' || newHandedness === 'right') {
      setDetectedHandedness(newHandedness);
    }
  }, []);

  // 自動検出をリセット
  const resetDetection = useCallback(() => {
    setTouchHistory([]);
    setDetectedHandedness('right');
  }, []);

  // 現在の有効な利き手を取得
  const effectiveHandedness = handedness === 'auto' ? detectedHandedness : handedness;

  useEffect(() => {
    if (!enableAutoDetection) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, [handleTouchStart, enableAutoDetection]);

  return {
    handedness,
    detectedHandedness,
    effectiveHandedness,
    setHandedness: setManualHandedness,
    resetDetection,
    touchHistory: touchHistory.length,
    isAutoDetecting: handedness === 'auto' && enableAutoDetection
  };
};

export default useHandedness;