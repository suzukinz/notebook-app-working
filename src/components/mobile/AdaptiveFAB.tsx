import React, { useState, useEffect } from 'react';
import { Plus, Edit3, FileText, Settings, Mic } from 'lucide-react';
import { useHandedness } from '../../hooks/useHandedness';
import { useHaptics } from '../../hooks/useHaptics';

interface FABAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}

interface AdaptiveFABProps {
  actions?: FABAction[];
  onCreateNote?: (editorType: 'rich' | 'markdown') => void;
  onVoiceInput?: () => void;
  onSettings?: () => void;
}

const AdaptiveFAB: React.FC<AdaptiveFABProps> = ({
  actions,
  onCreateNote,
  onVoiceInput,
  onSettings
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [fabPosition, setFabPosition] = useState({ bottom: 24, right: 24 });
  const { effectiveHandedness, isAutoDetecting } = useHandedness({
    enableAutoDetection: true
  });
  const { tapFeedback, successFeedback } = useHaptics();

  // デフォルトアクション
  const defaultActions: FABAction[] = [
    {
      id: 'rich-note',
      icon: <Edit3 size={20} />,
      label: 'リッチテキスト',
      color: 'bg-blue-500',
      onClick: () => {
        successFeedback();
        onCreateNote?.('rich');
        setIsExpanded(false);
      }
    },
    {
      id: 'markdown-note',
      icon: <FileText size={20} />,
      label: 'Markdown',
      color: 'bg-green-500',
      onClick: () => {
        successFeedback();
        onCreateNote?.('markdown');
        setIsExpanded(false);
      }
    },
    ...(onVoiceInput ? [{
      id: 'voice',
      icon: <Mic size={20} />,
      label: '音声入力',
      color: 'bg-purple-500',
      onClick: () => {
        successFeedback();
        onVoiceInput();
        setIsExpanded(false);
      }
    }] : []),
    ...(onSettings ? [{
      id: 'settings',
      icon: <Settings size={20} />,
      label: '設定',
      color: 'bg-gray-500',
      onClick: () => {
        tapFeedback();
        onSettings();
        setIsExpanded(false);
      }
    }] : [])
  ];

  const finalActions = actions || defaultActions;

  // 利き手に基づいてFABの位置を調整
  useEffect(() => {
    const isLeftHanded = effectiveHandedness === 'left';
    const screenWidth = window.innerWidth;
    const fabSize = 56; // FABのサイズ
    const margin = 24; // マージン

    if (isLeftHanded) {
      // 左利き: 左下に配置
      setFabPosition({
        bottom: margin,
        right: screenWidth - fabSize - margin
      });
    } else {
      // 右利き: 右下に配置（デフォルト）
      setFabPosition({
        bottom: margin,
        right: margin
      });
    }
  }, [effectiveHandedness]);

  const handleMainFABClick = () => {
    tapFeedback();
    setIsExpanded(!isExpanded);
  };

  const handleBackdropClick = () => {
    setIsExpanded(false);
  };

  return (
    <>
      {/* バックドロップ */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40"
          onClick={handleBackdropClick}
          style={{ 
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)'
          }}
        />
      )}

      {/* FABコンテナ */}
      <div
        className="fixed z-50 transition-all duration-300 ease-out"
        style={{
          bottom: fabPosition.bottom,
          right: fabPosition.right,
          left: effectiveHandedness === 'left' ? fabPosition.right : 'auto'
        }}
      >
        {/* 自動検出インジケーター */}
        {isAutoDetecting && (
          <div
            className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-3 py-1 rounded-full whitespace-nowrap shadow-lg"
            style={{
              animation: 'pulse 2s infinite'
            }}
          >
            利き手を検出中...
          </div>
        )}

        {/* 拡張アクション */}
        {isExpanded && (
          <div 
            className={`absolute ${effectiveHandedness === 'left' ? 'right-0' : 'left-0'} bottom-16 space-y-3`}
            style={{
              transform: effectiveHandedness === 'left' ? 'translateX(0)' : 'translateX(0)'
            }}
          >
            {finalActions.map((action, index) => (
              <div
                key={action.id}
                className={`flex items-center ${effectiveHandedness === 'left' ? 'flex-row-reverse' : 'flex-row'} space-x-3 transform transition-all duration-300 ease-out`}
                style={{
                  animation: `slideInFAB 0.3s ease-out ${index * 0.05}s both`,
                  animationFillMode: 'both'
                }}
              >
                {/* ラベル */}
                <div 
                  className={`bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap ${
                    effectiveHandedness === 'left' ? 'ml-3' : 'mr-3'
                  }`}
                >
                  {action.label}
                </div>
                
                {/* アクションボタン */}
                <button
                  onClick={action.onClick}
                  className={`${action.color} hover:opacity-90 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg active:scale-95 transition-all duration-150`}
                >
                  {action.icon}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* メインFAB */}
        <button
          onClick={handleMainFABClick}
          className={`bg-blue-500 hover:bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl active:scale-95 transition-all duration-200 ${
            isExpanded ? 'rotate-45' : 'rotate-0'
          }`}
          style={{
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)'
          }}
        >
          <Plus size={24} />
        </button>

        {/* 利き手インジケーター */}
        <div
          className={`absolute -top-2 ${effectiveHandedness === 'left' ? '-right-2' : '-left-2'} w-4 h-4 rounded-full transition-all duration-300`}
          style={{
            backgroundColor: effectiveHandedness === 'left' ? '#f59e0b' : '#10b981',
            animation: isAutoDetecting ? 'pulse 2s infinite' : 'none'
          }}
        />
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideInFAB {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.8);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.7;
            }
          }
        `
      }} />
    </>
  );
};

export default AdaptiveFAB;