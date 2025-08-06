import React, { useState, useEffect } from 'react';
import { RotateCcw, ChevronDown, EyeOff, Eye } from 'lucide-react';
import { MindMapPosition } from '../../hooks/useMindMapLayout';

interface MindMapLayoutToggleProps {
  currentPosition: MindMapPosition;
  onPositionChange: (position: MindMapPosition) => void;
  onReset: () => void;
  showResizeHandle: boolean;
  onToggleResizeHandle: () => void;
  className?: string;
}

const MindMapLayoutToggle: React.FC<MindMapLayoutToggleProps> = ({
  currentPosition,
  onPositionChange,
  onReset,
  showResizeHandle,
  onToggleResizeHandle,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState<MindMapPosition | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 画面サイズを監視してコンパクトモードを切り替え
  useEffect(() => {
    const checkScreenSize = () => {
      setIsCompact(window.innerWidth < 640); // sm breakpoint
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // ドロップダウンの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isDropdownOpen && !target.closest('[data-dropdown-container]')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // カスタムアイコンコンポーネント
  const LayoutIcon: React.FC<{ position: MindMapPosition; isActive: boolean; isHovered: boolean }> = ({ 
    position, 
    isActive, 
    isHovered 
  }) => {
    const baseClasses = "w-5 h-5 transition-all duration-300 transform";
    const activeClasses = isActive ? "scale-110" : "";
    const hoverClasses = isHovered && !isActive ? "scale-105" : "";

    return (
      <div className={`${baseClasses} ${activeClasses} ${hoverClasses}`}>
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          {/* 外枠 */}
          <rect 
            x="2" y="2" width="20" height="20" 
            rx="3" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            fill="none"
            className="opacity-40"
          />
          
          {/* マインドマップエリア */}
          <rect
            x={position === 'left' ? '3' : position === 'right' ? '13' : '3'}
            y={position === 'top' ? '3' : position === 'bottom' ? '13' : '3'}
            width={position === 'left' || position === 'right' ? '8' : '18'}
            height={position === 'top' || position === 'bottom' ? '8' : '18'}
            rx="2"
            fill="currentColor"
            className={`transition-all duration-300 ${
              isActive 
                ? 'opacity-100' 
                : isHovered 
                  ? 'opacity-70' 
                  : 'opacity-50'
            }`}
          />
          
          {/* エディタエリア */}
          <rect
            x={position === 'left' ? '13' : position === 'right' ? '3' : '3'}
            y={position === 'top' ? '13' : position === 'bottom' ? '3' : '3'}
            width={position === 'left' || position === 'right' ? '8' : '18'}
            height={position === 'top' || position === 'bottom' ? '8' : '18'}
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            className="opacity-30"
          />
          
          {/* 分割線 */}
          <line
            x1={position === 'left' || position === 'right' ? '12' : '3'}
            y1={position === 'left' || position === 'right' ? '3' : '12'}
            x2={position === 'left' || position === 'right' ? '12' : '21'}
            y2={position === 'left' || position === 'right' ? '21' : '12'}
            stroke="currentColor"
            strokeWidth="1.5"
            className="opacity-60"
          />
        </svg>
      </div>
    );
  };

  // コンパクト版のアイコン（サイズを小さく）
  const CompactLayoutIcon: React.FC<{ position: MindMapPosition; isActive: boolean }> = ({ 
    position, 
    isActive 
  }) => {
    return (
      <div className="w-4 h-4">
        <svg viewBox="0 0 16 16" fill="none" className="w-full h-full">
          {/* 外枠 */}
          <rect 
            x="1" y="1" width="14" height="14" 
            rx="2" 
            stroke="currentColor" 
            strokeWidth="1" 
            fill="none"
            className="opacity-40"
          />
          
          {/* マインドマップエリア */}
          <rect
            x={position === 'left' ? '2' : position === 'right' ? '9' : '2'}
            y={position === 'top' ? '2' : position === 'bottom' ? '9' : '2'}
            width={position === 'left' || position === 'right' ? '5' : '12'}
            height={position === 'top' || position === 'bottom' ? '5' : '12'}
            rx="1"
            fill="currentColor"
            className={isActive ? 'opacity-100' : 'opacity-60'}
          />
          
          {/* 分割線 */}
          <line
            x1={position === 'left' || position === 'right' ? '8' : '2'}
            y1={position === 'left' || position === 'right' ? '2' : '8'}
            x2={position === 'left' || position === 'right' ? '8' : '14'}
            y2={position === 'left' || position === 'right' ? '14' : '8'}
            stroke="currentColor"
            strokeWidth="1"
            className="opacity-50"
          />
        </svg>
      </div>
    );
  };

  const positions: Array<{
    key: MindMapPosition;
    label: string;
    description: string;
    gradient: string;
  }> = [
    {
      key: 'left',
      label: 'Left',
      description: 'マインドマップを左に配置',
      gradient: 'from-purple-500 to-blue-600'
    },
    {
      key: 'top',
      label: 'Top',
      description: 'マインドマップを上に配置',
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      key: 'right',
      label: 'Right',
      description: 'マインドマップを右に配置',
      gradient: 'from-green-500 to-teal-600'
    },
    {
      key: 'bottom',
      label: 'Bottom',
      description: 'マインドマップを下に配置',
      gradient: 'from-orange-500 to-red-600'
    }
  ];

  if (isCompact) {
    // コンパクトモード（小さい画面）
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {/* ドロップダウンボタン */}
        <div className="relative" data-dropdown-container>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`
              group relative flex items-center gap-2 px-3 py-2 rounded-lg 
              bg-gray-800/50 backdrop-blur-sm border border-gray-700/50
              text-gray-300 hover:text-white transition-all duration-300
              ${isDropdownOpen ? 'ring-2 ring-blue-500/50' : ''}
            `}
            title="レイアウトを選択"
          >
            <CompactLayoutIcon position={currentPosition} isActive={true} />
            <ChevronDown 
              size={14} 
              className={`transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`} 
            />
          </button>

          {/* ドロップダウンメニュー */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-xl overflow-hidden">
              {positions.map(({ key, label, description }) => {
                const isActive = currentPosition === key;
                
                return (
                  <button
                    key={key}
                    onClick={() => {
                      onPositionChange(key);
                      setIsDropdownOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 
                      transition-all duration-300 transform
                      hover:scale-105 active:scale-95
                      ${isActive 
                        ? `brand-gradient-primary text-white shadow-glow animate-pulse-glow` 
                        : 'text-gray-300 hover:text-white hover:bg-gray-700/50 glass-morphism'
                      }
                    `}
                    title={description}
                  >
                    <CompactLayoutIcon position={key} isActive={isActive} />
                    <span className="text-sm font-medium whitespace-nowrap">{label}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        
        {/* リサイズハンドル切り替えボタン（コンパクト） */}
        <button
          onClick={onToggleResizeHandle}
          className={`
            group relative p-2 rounded-lg bg-gray-800/50 backdrop-blur-sm border border-gray-700/50
            transition-all duration-300 hover:bg-gray-700/50
            ${showResizeHandle 
              ? 'text-blue-400 hover:text-blue-300' 
              : 'text-gray-400 hover:text-white'
            }
          `}
          title={showResizeHandle ? 'リサイズハンドルを非表示' : 'リサイズハンドルを表示'}
        >
          {showResizeHandle ? (
            <Eye size={14} />
          ) : (
            <EyeOff size={14} />
          )}
        </button>

        {/* リセットボタン（コンパクト） */}
        <button
          onClick={onReset}
          className="
            group relative p-2 rounded-lg bg-gray-800/50 backdrop-blur-sm border border-gray-700/50
            text-gray-400 hover:text-white transition-all duration-300
            hover:bg-gray-700/50
          "
          title="デフォルトレイアウトに戻す"
        >
          <RotateCcw 
            size={14} 
            className="transition-transform duration-300 group-hover:rotate-180" 
          />
        </button>
      </div>
    );
  }

  // デスクトップモード（通常サイズ）
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* レイアウト選択ボタングリッド */}
      <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-xl p-3 border border-gray-700/50">
        <div className="grid grid-cols-2 gap-2">
          {positions.map(({ key, label, description, gradient }) => {
            const isActive = currentPosition === key;
            const isHovering = isHovered === key;
            
            return (
              <button
                key={key}
                onClick={() => onPositionChange(key)}
                onMouseEnter={() => setIsHovered(key)}
                onMouseLeave={() => setIsHovered(null)}
                className={`
                  group relative p-4 rounded-xl transition-all duration-500 transform
                  ${isActive 
                    ? `brand-gradient-primary text-white shadow-2xl scale-110 shadow-glow animate-float` 
                    : 'glass-morphism text-gray-300 hover:text-white hover:scale-105 hover:shadow-lg'
                  }
                  border-2 ${isActive ? 'border-white/30' : 'border-gray-600/20 hover:border-white/40'}
                  backdrop-blur-md hover:backdrop-blur-lg
                  before:absolute before:inset-0 before:rounded-xl before:opacity-0 
                  before:bg-gradient-to-br before:from-white/10 before:to-transparent
                  hover:before:opacity-100 before:transition-opacity before:duration-300
                `}
                title={description}
              >
                {/* グラデーション背景効果 */}
                {isActive && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-20 rounded-lg blur-sm`} />
                )}
                
                {/* アイコン */}
                <div className="relative flex items-center justify-center">
                  <LayoutIcon 
                    position={key} 
                    isActive={isActive} 
                    isHovered={isHovering}
                  />
                </div>
                
                {/* ラベル */}
                <div className={`
                  mt-1 text-xs font-medium text-center transition-all duration-200
                  ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}
                `}>
                  {label}
                </div>

                {/* アクティブインジケーター */}
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-gray-800 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* グリッド背景パターン */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="currentColor" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>
      
      {/* リサイズハンドル切り替えボタン */}
      <button
        onClick={onToggleResizeHandle}
        className={`
          group relative p-4 rounded-xl transition-all duration-500 transform hover:scale-110
          ${showResizeHandle 
            ? 'brand-gradient-cool text-white shadow-xl shadow-glow animate-pulse-glow' 
            : 'glass-morphism text-gray-400 hover:text-white hover:shadow-xl'
          }
          border-2 ${showResizeHandle ? 'border-white/40' : 'border-gray-600/20 hover:border-white/40'}
          backdrop-blur-lg hover:backdrop-blur-xl
          before:absolute before:inset-0 before:rounded-xl before:opacity-0 
          before:bg-gradient-to-br before:from-white/20 before:to-transparent
          hover:before:opacity-100 before:transition-all before:duration-300
        `}
        title={showResizeHandle ? 'リサイズハンドルを非表示' : 'リサイズハンドルを表示'}
      >
        {showResizeHandle ? (
          <Eye size={18} />
        ) : (
          <EyeOff size={18} />
        )}
        
        {/* ホバー時のグロー効果 */}
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/10 to-transparent" />
      </button>
      
      {/* リセットボタン */}
      <button
        onClick={onReset}
        className="
          group relative p-3 rounded-xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50
          text-gray-400 hover:text-white transition-all duration-300 transform hover:scale-105
          hover:bg-gradient-to-br hover:from-gray-700 hover:to-gray-600
          hover:shadow-lg hover:shadow-gray-500/20
        "
        title="デフォルトレイアウトに戻す"
      >
        <RotateCcw 
          size={18} 
          className="transition-transform duration-300 group-hover:rotate-180" 
        />
        
        {/* ホバー時のグロー効果 */}
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/10 to-transparent" />
      </button>
    </div>
  );
};

export default MindMapLayoutToggle;