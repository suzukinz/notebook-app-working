import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ColorPickerProps {
  onColorSelect: (color: string) => void;
  className?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ onColorSelect, className = '' }) => {
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hueRef = useRef<HTMLCanvasElement>(null);


  // RGBを16進数に変換
  const rgbToHex = (r: number, g: number, b: number): string => {
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  // メインカラーエリアを描画
  const drawColorArea = useCallback((hue: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;

    // 白から彩度の高い色へのグラデーション（水平）
    const saturationGradient = ctx.createLinearGradient(0, 0, width, 0);
    saturationGradient.addColorStop(0, '#ffffff');
    saturationGradient.addColorStop(1, `hsl(${hue}, 100%, 50%)`);

    ctx.fillStyle = saturationGradient;
    ctx.fillRect(0, 0, width, height);

    // 上から下への明度グラデーション（縦）
    const brightnessGradient = ctx.createLinearGradient(0, 0, 0, height);
    brightnessGradient.addColorStop(0, 'transparent');
    brightnessGradient.addColorStop(1, '#000000');

    ctx.fillStyle = brightnessGradient;
    ctx.fillRect(0, 0, width, height);
  }, []);

  // 色相バーを描画
  const drawHueBar = useCallback(() => {
    const canvas = hueRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const gradient = ctx.createLinearGradient(0, 0, width, 0);

    // 色相の虹色グラデーション
    for (let i = 0; i <= 360; i += 30) {
      gradient.addColorStop(i / 360, `hsl(${i}, 100%, 50%)`);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }, []);

  // カラーエリアのクリック/ドラッグ処理
  const handleColorAreaInteraction = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ピクセルデータを取得
    const imageData = ctx.getImageData(x, y, 1, 1);
    const [r = 0, g = 0, b = 0] = imageData.data;
    
    const color = rgbToHex(r || 0, g || 0, b || 0);
    setSelectedColor(color);
    onColorSelect(color);
  }, [onColorSelect]);

  // 色相バーのクリック処理
  const handleHueBarClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = hueRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const hue = (x / rect.width) * 360;

    drawColorArea(hue);
  }, [drawColorArea]);

  // 初期化
  useEffect(() => {
    drawHueBar();
    drawColorArea(0);
  }, [drawHueBar, drawColorArea]);

  return (
    <div className={`p-4 bg-white border-2 border-blue-500 rounded-lg shadow-2xl ${className}`} 
         style={{ zIndex: 999999 }}>
      {/* メインカラーエリア */}
      <div className="mb-3">
        <canvas
          ref={canvasRef}
          width={250}
          height={150}
          className="border border-gray-300 rounded cursor-crosshair"
          onMouseDown={(e) => {
            setIsDragging(true);
            handleColorAreaInteraction(e);
          }}
          onMouseMove={(e) => {
            if (isDragging) {
              handleColorAreaInteraction(e);
            }
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
        />
      </div>

      {/* 色相バー */}
      <div className="mb-3">
        <canvas
          ref={hueRef}
          width={250}
          height={20}
          className="border border-gray-300 rounded cursor-pointer"
          onClick={handleHueBarClick}
        />
      </div>

      {/* 選択した色とHEX値 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className="w-8 h-8 border-2 border-gray-300 rounded"
            style={{ backgroundColor: selectedColor }}
          />
          <div className="text-sm font-mono text-gray-600">
            {selectedColor.toUpperCase()}
          </div>
        </div>
        
        {/* プリセットカラー */}
        <div className="flex space-x-1">
          {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#000000'].map((color) => (
            <button
              key={color}
              className="w-6 h-6 border border-gray-300 rounded hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              onClick={() => {
                setSelectedColor(color);
                onColorSelect(color);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;