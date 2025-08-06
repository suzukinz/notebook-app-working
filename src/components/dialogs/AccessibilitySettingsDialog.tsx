import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { 
  Eye, 
  MousePointer, 
  Zap, 
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { getContrastRatio, colorBlindFriendlyPalette } from '../../utils/colorUtils';

interface AccessibilitySettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccessibilitySettingsDialog: React.FC<AccessibilitySettingsDialogProps> = ({
  isOpen,
  onClose
}) => {
  const { settings, updateSettings, resetToDefaults, applySystemPreferences } = useAccessibility();
  const [activeTab, setActiveTab] = useState<'visual' | 'motor' | 'cognitive'>('visual');

  // コントラスト比のデモ
  const renderContrastDemo = () => {
    const textColor = settings.highContrast ? '#000000' : '#374151';
    const bgColor = settings.highContrast ? '#FFFFFF' : '#F3F4F6';
    const contrast = getContrastRatio(textColor, bgColor);

    return (
      <div className="mt-4 p-4 border rounded-lg" style={{ 
        color: textColor, 
        backgroundColor: bgColor,
        borderColor: settings.highContrast ? '#000000' : '#E5E7EB'
      }}>
        <div className="flex items-center justify-between">
          <span>サンプルテキスト</span>
          <div className="text-xs">
            <div className="flex items-center space-x-1">
              {contrast.isAccessible ? (
                <CheckCircle size={14} className="text-green-600" />
              ) : (
                <AlertCircle size={14} className="text-red-600" />
              )}
              <span>コントラスト比: {contrast.ratio.toFixed(2)}</span>
              <span className={`px-2 py-1 rounded text-xs ${
                contrast.level === 'AAA' ? 'bg-green-100 text-green-800' :
                contrast.level === 'AA' ? 'bg-blue-100 text-blue-800' :
                'bg-red-100 text-red-800'
              }`}>
                {contrast.level}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // カラーパレットのデモ
  const renderColorPalette = () => {
    const colors = settings.colorBlindFriendly 
      ? colorBlindFriendlyPalette.primary 
      : {
          blue: '#3B82F6',
          red: '#EF4444', 
          green: '#10B981',
          yellow: '#F59E0B',
          purple: '#8B5CF6',
          orange: '#F97316'
        };

    return (
      <div className="grid grid-cols-6 gap-2 mt-4">
        {Object.entries(colors).map(([name, color]) => (
          <div key={name} className="text-center">
            <div 
              className="w-8 h-8 rounded mb-1 border"
              style={{ backgroundColor: color }}
              title={`${name}: ${color}`}
            />
            <span className="text-xs">{name}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="♿ アクセシビリティ設定"
      size="lg"
    >
      <div className="flex h-96">
        {/* タブナビゲーション */}
        <div className="w-1/3 border-r border-gray-200 pr-4">
          <nav className="space-y-2" role="tablist">
            <button
              onClick={() => setActiveTab('visual')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'visual'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              role="tab"
              aria-selected={activeTab === 'visual'}
              aria-controls="visual-panel"
            >
              <Eye size={16} className="inline mr-2" />
              視覚的支援
            </button>
            <button
              onClick={() => setActiveTab('motor')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'motor'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              role="tab"
              aria-selected={activeTab === 'motor'}
              aria-controls="motor-panel"
            >
              <MousePointer size={16} className="inline mr-2" />
              操作支援
            </button>
            <button
              onClick={() => setActiveTab('cognitive')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'cognitive'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              role="tab"
              aria-selected={activeTab === 'cognitive'}
              aria-controls="cognitive-panel"
            >
              <Zap size={16} className="inline mr-2" />
              認知支援
            </button>
          </nav>
        </div>

        {/* タブコンテンツ */}
        <div className="flex-1 pl-4 overflow-y-auto">
          {/* 視覚的支援タブ */}
          {activeTab === 'visual' && (
            <div id="visual-panel" role="tabpanel" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Eye size={18} className="mr-2 text-blue-600" />
                  視覚的支援
                </h3>
              </div>

              {/* 高コントラスト */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-900">高コントラストモード</label>
                    <p className="text-sm text-gray-600">文字と背景のコントラストを強化します</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.highContrast}
                      onChange={(e) => updateSettings({ highContrast: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {renderContrastDemo()}
              </div>

              {/* フォントサイズ */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-900">大きなテキスト</label>
                    <p className="text-sm text-gray-600">フォントサイズを拡大します</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.increasedFontSize}
                      onChange={(e) => updateSettings({ increasedFontSize: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <span className={settings.increasedFontSize ? 'text-lg' : 'text-base'}>
                    サンプルテキスト（現在のサイズ）
                  </span>
                </div>
              </div>

              {/* カラーブラインド対応 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-900">色覚異常対応</label>
                    <p className="text-sm text-gray-600">色覚異常の方にも識別しやすい色を使用します</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.colorBlindFriendly}
                      onChange={(e) => updateSettings({ colorBlindFriendly: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {renderColorPalette()}
              </div>
            </div>
          )}

          {/* 操作支援タブ */}
          {activeTab === 'motor' && (
            <div id="motor-panel" role="tabpanel" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <MousePointer size={18} className="mr-2 text-green-600" />
                  操作支援
                </h3>
              </div>

              {/* フォーカスインジケーター */}
              <div className="space-y-3">
                <div>
                  <label className="font-medium text-gray-900">フォーカスインジケーター</label>
                  <p className="text-sm text-gray-600 mb-3">キーボードフォーカスの表示方法を選択</p>
                </div>
                <div className="space-y-2">
                  {[
                    { value: 'default', label: '標準', description: '通常のフォーカスリング' },
                    { value: 'enhanced', label: '強化', description: 'より目立つフォーカスリング' },
                    { value: 'high-contrast', label: '高コントラスト', description: '最も目立つフォーカスリング' }
                  ].map(option => (
                    <label key={option.value} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                      <input
                        type="radio"
                        name="focusIndicator"
                        value={option.value}
                        checked={settings.focusIndicator === option.value}
                        onChange={(e) => updateSettings({ focusIndicator: e.target.value as any })}
                        className="text-blue-600"
                      />
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-gray-600">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* モーション設定 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-900">アニメーション軽減</label>
                    <p className="text-sm text-gray-600">画面の動きを最小限に抑えます</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.reduceMotion}
                      onChange={(e) => updateSettings({ reduceMotion: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 認知支援タブ */}
          {activeTab === 'cognitive' && (
            <div id="cognitive-panel" role="tabpanel" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Zap size={18} className="mr-2 text-purple-600" />
                  認知支援
                </h3>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                  <Info size={16} className="mr-2" />
                  利用可能な機能
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• キーボードショートカット（Ctrl+/でヘルプ表示）</li>
                  <li>• 自動保存機能</li>
                  <li>• データ検証とエラー表示</li>
                  <li>• 直感的なアイコンとラベル</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* フッター */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t">
        <div className="flex space-x-2">
          <button
            onClick={applySystemPreferences}
            className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            title="システム設定を適用"
          >
            <Zap size={14} className="mr-1" />
            システム設定
          </button>
          <button
            onClick={resetToDefaults}
            className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            title="デフォルト設定に戻す"
          >
            <RotateCcw size={14} className="mr-1" />
            リセット
          </button>
        </div>
        
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          aria-label="アクセシビリティ設定ダイアログを閉じる"
        >
          閉じる
        </button>
      </div>
    </Modal>
  );
};

export default AccessibilitySettingsDialog;