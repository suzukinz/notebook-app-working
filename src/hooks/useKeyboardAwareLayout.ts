import { useState, useEffect, useCallback } from 'react';

interface KeyboardAwareLayoutOptions {
  adjustForKeyboard?: boolean;
  minVisibleHeight?: number;
  smoothTransition?: boolean;
}

interface KeyboardState {
  isVisible: boolean;
  height: number;
  visibleHeight: number;
  adjustedPadding: number;
}

export const useKeyboardAwareLayout = (options: KeyboardAwareLayoutOptions = {}) => {
  const {
    adjustForKeyboard = true,
    minVisibleHeight = 200,
    smoothTransition = true
  } = options;

  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
    visibleHeight: window.innerHeight,
    adjustedPadding: 0
  });

  const [originalViewportHeight, setOriginalViewportHeight] = useState(window.innerHeight);

  // iOS Safariのアドレスバーの高さ変動を考慮した実際の表示高さを計算
  const calculateVisibleHeight = useCallback(() => {
    // Visual Viewport APIをサポートしている場合
    if (window.visualViewport) {
      return window.visualViewport.height;
    }

    // フォールバック: window.innerHeightを使用
    return window.innerHeight;
  }, []);

  // ソフトキーボードの状態を検知
  const detectKeyboardState = useCallback(() => {
    const currentVisibleHeight = calculateVisibleHeight();
    const heightDifference = originalViewportHeight - currentVisibleHeight;
    
    // キーボード表示の閾値（100px以上の高さ変動）
    const keyboardThreshold = 100;
    const isKeyboardVisible = heightDifference > keyboardThreshold;

    if (isKeyboardVisible) {
      const keyboardHeight = heightDifference;
      let adjustedPadding = 0;

      if (adjustForKeyboard) {
        // 最小表示領域を確保するための調整
        const remainingHeight = currentVisibleHeight;
        if (remainingHeight < minVisibleHeight) {
          adjustedPadding = minVisibleHeight - remainingHeight;
        }
      }

      setKeyboardState({
        isVisible: true,
        height: keyboardHeight,
        visibleHeight: currentVisibleHeight,
        adjustedPadding
      });
    } else {
      setKeyboardState({
        isVisible: false,
        height: 0,
        visibleHeight: currentVisibleHeight,
        adjustedPadding: 0
      });
    }
  }, [originalViewportHeight, adjustForKeyboard, minVisibleHeight, calculateVisibleHeight]);

  // フォーカスされた要素をビューポートに調整
  const scrollToFocusedElement = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement;
    if (!activeElement || !keyboardState.isVisible) return;

    // 入力要素の場合のみスクロール調整
    if (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true'
    ) {
      const rect = activeElement.getBoundingClientRect();
      const visibleHeight = keyboardState.visibleHeight;
      const elementBottom = rect.bottom;

      // 要素がキーボードに隠れている場合
      if (elementBottom > visibleHeight) {
        const scrollAmount = elementBottom - visibleHeight + 20; // 20pxのマージン
        window.scrollBy({
          top: scrollAmount,
          behavior: smoothTransition ? 'smooth' : 'auto'
        });
      }
    }
  }, [keyboardState, smoothTransition]);

  // Visual Viewport APIのイベントリスナー
  useEffect(() => {
    if (!window.visualViewport) return;

    const handleViewportChange = () => {
      detectKeyboardState();
      // 少し遅延してフォーカス調整（キーボードアニメーション後）
      setTimeout(scrollToFocusedElement, 300);
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, [detectKeyboardState, scrollToFocusedElement]);

  // フォールバック: resize イベント
  useEffect(() => {
    if (window.visualViewport) return; // Visual Viewport APIがある場合はスキップ

    const handleResize = () => {
      detectKeyboardState();
      setTimeout(scrollToFocusedElement, 300);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [detectKeyboardState, scrollToFocusedElement]);

  // 初期ビューポート高さの設定
  useEffect(() => {
    const setInitialHeight = () => {
      setOriginalViewportHeight(window.innerHeight);
    };

    // 初期設定
    setInitialHeight();

    // オリエンテーション変更時の再設定
    window.addEventListener('orientationchange', () => {
      setTimeout(setInitialHeight, 500); // アニメーション完了を待つ
    });

    return () => {
      window.removeEventListener('orientationchange', setInitialHeight);
    };
  }, []);

  // CSS変数の設定（動的な高さ調整用）
  useEffect(() => {
    const root = document.documentElement;
    
    root.style.setProperty('--keyboard-height', `${keyboardState.height}px`);
    root.style.setProperty('--visible-height', `${keyboardState.visibleHeight}px`);
    root.style.setProperty('--keyboard-padding', `${keyboardState.adjustedPadding}px`);
    
    // キーボード状態のクラス
    if (keyboardState.isVisible) {
      root.classList.add('keyboard-visible');
    } else {
      root.classList.remove('keyboard-visible');
    }
  }, [keyboardState]);

  // 手動でフォーカス要素を調整する関数
  const adjustForFocusedElement = useCallback((element?: HTMLElement) => {
    if (!keyboardState.isVisible) return;

    const targetElement = element || (document.activeElement as HTMLElement);
    if (!targetElement) return;

    const rect = targetElement.getBoundingClientRect();
    const visibleHeight = keyboardState.visibleHeight;
    const elementBottom = rect.bottom;

    if (elementBottom > visibleHeight) {
      const scrollAmount = elementBottom - visibleHeight + 20;
      window.scrollBy({
        top: scrollAmount,
        behavior: smoothTransition ? 'smooth' : 'auto'
      });
    }
  }, [keyboardState, smoothTransition]);

  return {
    keyboardState,
    adjustForFocusedElement,
    // レイアウト調整用のスタイルプロパティ
    keyboardAwareStyle: {
      paddingBottom: keyboardState.adjustedPadding,
      transition: smoothTransition ? 'padding-bottom 0.3s ease-out' : 'none'
    }
  };
};

export default useKeyboardAwareLayout;