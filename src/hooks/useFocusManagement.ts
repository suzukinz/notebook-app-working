import { useEffect, useRef, useCallback } from 'react';

export const useFocusManagement = (isOpen: boolean) => {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // モーダルが開いたときの前のフォーカス要素を記録
      previousActiveElement.current = document.activeElement as HTMLElement;
    } else {
      // モーダルが閉じたときに前のフォーカス要素に戻る
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
        previousActiveElement.current = null;
      }
    }
  }, [isOpen]);

  return { previousActiveElement };
};

export const useTrapFocus = (containerRef: React.RefObject<HTMLElement>, isActive: boolean) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isActive || !containerRef.current || event.key !== 'Tab') {
      return;
    }

    const focusableElements = containerRef.current.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, [containerRef, isActive]);

  useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', handleKeyDown);
      
      // 初期フォーカスを設定
      if (containerRef.current) {
        const firstFocusableElement = containerRef.current.querySelector(
          'a[href], button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement;
        
        if (firstFocusableElement) {
          firstFocusableElement.focus();
        }
      }

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
    
    return undefined;
  }, [isActive, handleKeyDown, containerRef]);
};

export const useArrowKeyNavigation = (
  items: HTMLElement[],
  orientation: 'horizontal' | 'vertical' = 'vertical'
) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const currentIndex = items.findIndex(item => item === document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    if (orientation === 'vertical') {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      }
    } else {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      }
    }

    if (nextIndex !== currentIndex) {
      items[nextIndex]?.focus();
    }
  }, [items, orientation]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

// スキップリンクのためのhook
export const useSkipLinks = () => {
  const skipToContent = useCallback(() => {
    const mainContent = document.querySelector('[role="main"], main, #main-content') as HTMLElement;
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const skipToNavigation = useCallback(() => {
    const navigation = document.querySelector('[role="navigation"], nav, #navigation') as HTMLElement;
    if (navigation) {
      navigation.focus();
      navigation.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return { skipToContent, skipToNavigation };
};