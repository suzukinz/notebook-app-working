import { useState, useCallback, useEffect } from 'react';

export type MindMapPosition = 'left' | 'right' | 'top' | 'bottom';
export type MindMapOrientation = 'horizontal' | 'vertical';

const MINDMAP_LAYOUT_KEY = 'mindmap-layout';
const MINDMAP_SIZE_KEY = 'mindmap-size';
const MINDMAP_HANDLE_VISIBLE_KEY = 'mindmap-handle-visible';

interface MindMapLayoutSettings {
  position: MindMapPosition;
  size: number; // パーセンテージまたはピクセル値
  orientation: MindMapOrientation;
  showResizeHandle: boolean; // リサイズハンドルの表示状態
}

const DEFAULT_SETTINGS: MindMapLayoutSettings = {
  position: 'left',
  size: 50, // 50%
  orientation: 'horizontal',
  showResizeHandle: true
};

const MIN_SIZE = 20; // 20%
const MAX_SIZE = 80; // 80%

export const useMindMapLayout = () => {
  const [settings, setSettings] = useState<MindMapLayoutSettings>(() => {
    const savedLayout = localStorage.getItem(MINDMAP_LAYOUT_KEY);
    const savedSize = localStorage.getItem(MINDMAP_SIZE_KEY);
    const savedHandleVisible = localStorage.getItem(MINDMAP_HANDLE_VISIBLE_KEY);
    
    return {
      ...DEFAULT_SETTINGS,
      ...(savedLayout ? JSON.parse(savedLayout) : {}),
      size: savedSize ? parseInt(savedSize, 10) : DEFAULT_SETTINGS.size,
      showResizeHandle: savedHandleVisible ? JSON.parse(savedHandleVisible) : DEFAULT_SETTINGS.showResizeHandle
    };
  });

  const updatePosition = useCallback((position: MindMapPosition) => {
    const orientation: MindMapOrientation = 
      position === 'left' || position === 'right' ? 'horizontal' : 'vertical';
    
    setSettings(prev => ({
      ...prev,
      position,
      orientation
    }));
  }, []);

  const updateSize = useCallback((size: number) => {
    const clampedSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, size));
    setSettings(prev => ({
      ...prev,
      size: clampedSize
    }));
  }, []);

  const toggleResizeHandle = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      showResizeHandle: !prev.showResizeHandle
    }));
  }, []);

  const resetToDefault = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // LocalStorageに保存
  useEffect(() => {
    localStorage.setItem(MINDMAP_LAYOUT_KEY, JSON.stringify({
      position: settings.position,
      orientation: settings.orientation
    }));
    localStorage.setItem(MINDMAP_SIZE_KEY, settings.size.toString());
    localStorage.setItem(MINDMAP_HANDLE_VISIBLE_KEY, JSON.stringify(settings.showResizeHandle));
  }, [settings]);

  // CSS用のスタイルを生成
  const getContainerStyles = useCallback(() => {
    const { position, size, orientation } = settings;
    
    if (orientation === 'horizontal') {
      return {
        flexDirection: 'row' as const,
        mindMapStyle: {
          width: `${size}%`,
          height: '100%',
          order: position === 'left' ? 1 : 2
        },
        editorStyle: {
          width: `${100 - size}%`,
          height: '100%',
          order: position === 'left' ? 2 : 1
        }
      };
    } else {
      return {
        flexDirection: 'column' as const,
        mindMapStyle: {
          width: '100%',
          height: `${size}%`,
          order: position === 'top' ? 1 : 2
        },
        editorStyle: {
          width: '100%',
          height: `${100 - size}%`,
          order: position === 'top' ? 2 : 1
        }
      };
    }
  }, [settings]);

  // リサイズハンドルの位置を決定
  const getResizeHandlePosition = useCallback(() => {
    const { position } = settings;
    switch (position) {
      case 'left': return 'right';
      case 'right': return 'left';
      case 'top': return 'bottom';
      case 'bottom': return 'top';
    }
  }, [settings]);

  return {
    settings,
    updatePosition,
    updateSize,
    toggleResizeHandle,
    resetToDefault,
    getContainerStyles,
    getResizeHandlePosition,
    minSize: MIN_SIZE,
    maxSize: MAX_SIZE
  };
};