import React, { useState, useEffect, useRef } from 'react';
import { Move, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';

interface ImageResizerProps {
  src: string;
  alt?: string;
  className?: string;
  onResize?: (newSrc: string) => void;
  isEditing?: boolean;
}

const ImageResizer: React.FC<ImageResizerProps> = ({
  src,
  alt = '画像',
  className = '',
  onResize,
  isEditing = true
}) => {
  const [dimensions, setDimensions] = useState({ width: 300, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [showControls, setShowControls] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 画像の自然なサイズを取得
  useEffect(() => {
    if (imageRef.current) {
      const img = imageRef.current;
      const handleLoad = () => {
        setDimensions({
          width: Math.min(img.naturalWidth, 600),
          height: Math.min(img.naturalHeight, 400)
        });
      };

      if (img.complete) {
        handleLoad();
      } else {
        img.addEventListener('load', handleLoad);
        return () => img.removeEventListener('load', handleLoad);
      }
    }
    
    return undefined;
  }, [src]);

  // リサイズ開始
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditing) return;
    
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      width: dimensions.width,
      height: dimensions.height
    });
  };

  // リサイズ中
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !isEditing) return;

    const deltaX = e.clientX - dragStart.x;
    
    // アスペクト比を維持してリサイズ
    const newWidth = Math.max(100, dragStart.width + deltaX);
    const aspectRatio = dragStart.height / dragStart.width;
    const newHeight = newWidth * aspectRatio;

    setDimensions({
      width: Math.min(newWidth, 800),
      height: Math.min(newHeight, 600)
    });
  };

  // リサイズ終了
  const handleMouseUp = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // 新しいサイズで画像をキャンバスでリサイズしてBase64に変換
    if (onResize && imageRef.current) {
      resizeImageToBase64(src, dimensions.width, dimensions.height)
        .then(newSrc => {
          onResize(newSrc);
        })
        .catch(error => {
          console.error('画像のリサイズに失敗しました:', error);
        });
    }
  };

  // グローバルマウスイベントの設定
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
  }, [isDragging, dragStart, dimensions]);

  // 画像をキャンバスでリサイズしてBase64に変換
  const resizeImageToBase64 = (imageSrc: string, newWidth: number, newHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        
        const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve(resizedBase64);
      };
      
      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
      img.src = imageSrc;
    });
  };

  // プリセットサイズに変更
  const handlePresetSize = (width: number, height: number) => {
    setDimensions({ width, height });
    if (onResize && imageRef.current) {
      resizeImageToBase64(src, width, height)
        .then(newSrc => {
          onResize(newSrc);
        })
        .catch(error => {
          console.error('画像のリサイズに失敗しました:', error);
        });
    }
  };

  // 元のサイズに戻す
  const handleResetSize = () => {
    if (imageRef.current) {
      const img = imageRef.current;
      setDimensions({
        width: Math.min(img.naturalWidth, 600),
        height: Math.min(img.naturalHeight, 400)
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block group ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className={`rounded-lg shadow-sm transition-all ${
          isDragging ? 'cursor-nw-resize' : 'cursor-pointer'
        }`}
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          maxWidth: '100%',
          objectFit: 'contain'
        }}
        draggable={false}
      />

      {/* リサイズハンドル */}
      {isEditing && (
        <div
          className={`absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-tl-lg cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity ${
            isDragging ? 'opacity-100' : ''
          }`}
          onMouseDown={handleMouseDown}
        >
          <Move size={12} className="text-white p-0.5" />
        </div>
      )}

      {/* コントロールパネル */}
      {isEditing && showControls && !isDragging && (
        <div className="absolute top-2 right-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex flex-col space-y-2">
            {/* サイズ表示 */}
            <div className="text-xs text-gray-600 text-center">
              {dimensions.width} × {dimensions.height}px
            </div>
            
            {/* プリセットサイズボタン */}
            <div className="flex space-x-1">
              <button
                onClick={() => handlePresetSize(200, 150)}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                title="小 (200×150)"
              >
                <Minimize2 size={12} />
              </button>
              <button
                onClick={() => handlePresetSize(400, 300)}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                title="中 (400×300)"
              >
                <Maximize2 size={12} />
              </button>
              <button
                onClick={handleResetSize}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                title="元のサイズに戻す"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* リサイズ中のオーバーレイ */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 rounded-lg pointer-events-none" />
      )}
    </div>
  );
};

export default ImageResizer;