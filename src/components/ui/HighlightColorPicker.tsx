import React, { useState, useCallback } from 'react';

interface HighlightColorPickerProps {
  onColorSelect: (color: string) => void;
  className?: string;
}

const HighlightColorPicker: React.FC<HighlightColorPickerProps> = ({ 
  onColorSelect, 
  className = '' 
}) => {
  const [selectedColor, setSelectedColor] = useState('#FFFF00');

  // ハイライト専用カラーパレット
  const highlightColors = [
    // 黄色系
    '#FFFF00', '#FFF200', '#FFEB3B', '#FDD835',
    // 緑系
    '#00FF00', '#4CAF50', '#8BC34A', '#CDDC39',
    // 青系
    '#00FFFF', '#03A9F4', '#2196F3', '#3F51B5',
    // ピンク・紫系
    '#FF00FF', '#E91E63', '#9C27B0', '#673AB7',
    // オレンジ系
    '#FFA500', '#FF5722', '#FF9800', '#FFC107',
    // その他
    '#FFB6C1', '#98FB98', '#87CEEB', '#DDA0DD',
    '#F0E68C', '#ADD8E6', '#FFE4E1', '#D3D3D3'
  ];

  const handleColorSelect = useCallback((color: string) => {
    setSelectedColor(color);
    onColorSelect(color);
  }, [onColorSelect]);

  return (
    <div className={`p-3 bg-white border-2 border-green-500 rounded-lg shadow-2xl ${className}`}
         style={{ zIndex: 999999 }}>
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">ハイライト色</h4>
        
        {/* カラーグリッド */}
        <div className="grid grid-cols-8 gap-2">
          {highlightColors.map((color, index) => (
            <button
              key={index}
              className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                selectedColor === color 
                  ? 'border-gray-800 shadow-lg' 
                  : 'border-gray-300 hover:border-gray-500'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => handleColorSelect(color)}
              title={`ハイライト: ${color}`}
            />
          ))}
        </div>
      </div>

      {/* 選択した色の表示 */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <div
            className="w-6 h-6 border-2 border-gray-300 rounded"
            style={{ backgroundColor: selectedColor }}
          />
          <span className="text-sm font-mono text-gray-600">
            {selectedColor.toUpperCase()}
          </span>
        </div>
        
        {/* 透明度オプション */}
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-500">透明度:</span>
          {[0.3, 0.5, 0.7, 1.0].map((opacity) => (
            <button
              key={opacity}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
              style={{ 
                backgroundColor: selectedColor,
                opacity: opacity
              }}
              onClick={() => {
                onColorSelect(selectedColor); // 基本色を送信（透明度は別途実装可能）
              }}
            >
              {Math.round(opacity * 100)}%
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HighlightColorPicker;