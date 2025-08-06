import React, { useRef, useCallback, useEffect, useState } from 'react';

interface ResizeHandleProps {
  onResize: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({
  onResize,
  minWidth = 200,
  maxWidth = 600,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const onResizeRef = useRef(onResize);

  // onResizeの最新の参照を保持
  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    startX.current = e.clientX;
    
    // 現在の親要素の幅を取得
    const parentElement = (e.target as HTMLElement).parentElement;
    if (parentElement) {
      startWidth.current = parentElement.getBoundingClientRect().width;
    }
    
    // カーソルスタイルを変更
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    
    const deltaX = e.clientX - startX.current;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth.current + deltaX));
    
    // requestAnimationFrameでスムーズな更新
    requestAnimationFrame(() => {
      onResizeRef.current(newWidth);
    });
  }, [isDragging, minWidth, maxWidth]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    
    return undefined;
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={`w-2 hover:bg-blue-200 cursor-col-resize transition-all flex-shrink-0 ${className} ${
        isDragging ? 'bg-blue-400' : 'bg-transparent hover:bg-blue-100'
      }`}
      onMouseDown={handleMouseDown}
      title="ドラッグしてサイドバーの幅を調整"
    >
      {/* より見やすいリサイズハンドル */}
      <div className="h-full w-full flex items-center justify-center">
        <div className={`w-0.5 h-8 rounded-full transition-all ${
          isDragging ? 'bg-blue-600' : 'bg-gray-300 group-hover:bg-gray-400'
        }`} />
      </div>
    </div>
  );
};

export default ResizeHandle;