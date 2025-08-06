import React, { useRef, useCallback, useEffect } from 'react';

interface MindMapResizeHandleProps {
  position: 'top' | 'bottom' | 'left' | 'right';
  onResize: (percentage: number) => void;
  minSize?: number;
  maxSize?: number;
  className?: string;
}

const MindMapResizeHandle: React.FC<MindMapResizeHandleProps> = ({
  position,
  onResize,
  minSize = 20,
  maxSize = 80,
  className = ''
}) => {
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const isHorizontal = position === 'left' || position === 'right';

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };

    // 現在のコンテナサイズを取得
    const container = document.querySelector('[data-mindmap-container]') as HTMLElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      const parentRect = container.parentElement?.getBoundingClientRect();
      
      if (parentRect) {
        if (isHorizontal) {
          startSize.current = (rect.width / parentRect.width) * 100;
        } else {
          startSize.current = (rect.height / parentRect.height) * 100;
        }
      }
    }

    document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    
    e.preventDefault();
  }, [isHorizontal]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;

    const container = document.querySelector('[data-mindmap-container]') as HTMLElement;
    if (!container?.parentElement) return;

    const parentRect = container.parentElement.getBoundingClientRect();
    let delta = 0;
    let newSize = 0;

    if (isHorizontal) {
      delta = e.clientX - startPos.current.x;
      const deltaPercentage = (delta / parentRect.width) * 100;
      
      if (position === 'right') {
        newSize = startSize.current - deltaPercentage;
      } else {
        newSize = startSize.current + deltaPercentage;
      }
    } else {
      delta = e.clientY - startPos.current.y;
      const deltaPercentage = (delta / parentRect.height) * 100;
      
      if (position === 'bottom') {
        newSize = startSize.current - deltaPercentage;
      } else {
        newSize = startSize.current + deltaPercentage;
      }
    }

    const clampedSize = Math.max(minSize, Math.min(maxSize, newSize));
    onResize(clampedSize);
  }, [onResize, minSize, maxSize, isHorizontal, position]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const getHandleStyles = () => {
    const baseStyles = 'group relative flex-shrink-0 transition-all duration-300';
    
    switch (position) {
      case 'right':
        return `${baseStyles} w-2 h-full cursor-col-resize hover:w-3`;
      case 'left':
        return `${baseStyles} w-2 h-full cursor-col-resize hover:w-3`;
      case 'bottom':
        return `${baseStyles} w-full h-2 cursor-row-resize hover:h-3`;
      case 'top':
        return `${baseStyles} w-full h-2 cursor-row-resize hover:h-3`;
      default:
        return baseStyles;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`${getHandleStyles()} ${className}`}
      onMouseDown={handleMouseDown}
      title={`ドラッグして${isHorizontal ? '幅' : '高さ'}を調整`}
    >
      {/* グラデーション背景 */}
      <div className={`
        absolute inset-0 transition-all duration-300
        ${isHorizontal 
          ? 'bg-gradient-to-r from-transparent via-blue-500/20 to-transparent hover:via-blue-500/40' 
          : 'bg-gradient-to-b from-transparent via-blue-500/20 to-transparent hover:via-blue-500/40'
        }
        group-hover:shadow-lg group-hover:shadow-blue-500/20
      `} />
      
      {/* ドットパターンインジケーター */}
      <div className={`
        absolute flex items-center justify-center inset-0
        ${isHorizontal ? 'flex-col space-y-1' : 'flex-row space-x-1'}
      `}>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={`
              bg-gray-400 rounded-full transition-all duration-300 transform
              group-hover:bg-blue-400 group-hover:scale-125
              ${isHorizontal ? 'w-1 h-1' : 'w-1 h-1'}
            `}
            style={{
              animationDelay: `${i * 100}ms`
            }}
          />
        ))}
      </div>

      {/* ホバー時のエフェクト */}
      <div className={`
        absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300
        ${isHorizontal 
          ? 'bg-gradient-to-r from-blue-500/10 via-blue-500/30 to-blue-500/10' 
          : 'bg-gradient-to-b from-blue-500/10 via-blue-500/30 to-blue-500/10'
        }
        backdrop-blur-sm
      `} />
      
      {/* ドラッグ中のインジケーター */}
      {isDragging.current && (
        <div className={`
          absolute inset-0 animate-pulse
          ${isHorizontal 
            ? 'bg-gradient-to-r from-blue-600/30 via-blue-500/50 to-blue-600/30' 
            : 'bg-gradient-to-b from-blue-600/30 via-blue-500/50 to-blue-600/30'
          }
        `} />
      )}
    </div>
  );
};

export default MindMapResizeHandle;