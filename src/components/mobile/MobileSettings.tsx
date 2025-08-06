import React, { useState } from 'react';
import { 
  Settings, 
  Bell, 
  Shield, 
  Database, 
  Info,
  Palette,
  Volume2,
  Vibrate,
  Smartphone,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { useHaptics } from '../../hooks/useHaptics';
import ThemeToggle from '../ui/ThemeToggle';

interface MobileSettingsProps {
  onClose: () => void;
}

type SettingsSection = 'main' | 'appearance' | 'notifications' | 'privacy' | 'data' | 'about';

const MobileSettings: React.FC<MobileSettingsProps> = ({ onClose }) => {
  const [currentSection, setCurrentSection] = useState<SettingsSection>('main');
  const { tapFeedback } = useHaptics();

  const handleSectionClick = (section: SettingsSection) => {
    tapFeedback();
    setCurrentSection(section);
  };

  const handleBack = () => {
    tapFeedback();
    if (currentSection === 'main') {
      onClose();
    } else {
      setCurrentSection('main');
    }
  };

  const mainSettings = [
    {
      id: 'appearance',
      title: '外観とテーマ',
      subtitle: '配色テーマやダークモードの設定',
      icon: <Palette size={20} />,
      section: 'appearance' as SettingsSection
    },
    {
      id: 'notifications',
      title: '通知',
      subtitle: 'プッシュ通知やアラートの設定',
      icon: <Bell size={20} />,
      section: 'notifications' as SettingsSection
    },
    {
      id: 'privacy',
      title: 'プライバシーとセキュリティ',
      subtitle: 'データ保護やセキュリティ設定',
      icon: <Shield size={20} />,
      section: 'privacy' as SettingsSection
    },
    {
      id: 'data',
      title: 'データ管理',
      subtitle: 'バックアップ、同期、エクスポート',
      icon: <Database size={20} />,
      section: 'data' as SettingsSection
    },
    {
      id: 'about',
      title: 'アプリ情報',
      subtitle: 'バージョン情報、ライセンス',
      icon: <Info size={20} />,
      section: 'about' as SettingsSection
    }
  ];

  const getSectionTitle = (): string => {
    switch (currentSection) {
      case 'appearance': return '外観とテーマ';
      case 'notifications': return '通知設定';
      case 'privacy': return 'プライバシー';
      case 'data': return 'データ管理';
      case 'about': return 'アプリ情報';
      default: return '設定';
    }
  };

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      {/* テーマ選択 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">カラーテーマ</h3>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            アプリの外観テーマを選択してください
          </p>
          <ThemeToggle />
        </div>
      </div>

      {/* フォントサイズ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">フォントサイズ</h3>
        <div className="space-y-3">
          {['小', '標準', '大', '特大'].map((size, index) => (
            <button
              key={size}
              className={`w-full p-3 text-left rounded-lg border transition-colors ${
                index === 1 // 標準を選択状態として表示
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={tapFeedback}
            >
              <span className={`font-medium ${
                index === 0 ? 'text-sm' : 
                index === 1 ? 'text-base' : 
                index === 2 ? 'text-lg' : 'text-xl'
              }`}>
                {size}サイズ
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* アクセシビリティ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">アクセシビリティ</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">高コントラスト</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">テキストの視認性を向上</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">アニメーション削減</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">動きのエフェクトを制限</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">プッシュ通知</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">通知を許可</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">重要な更新をお知らせ</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">サウンドとバイブレーション</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Volume2 size={18} className="text-gray-600 dark:text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">通知音</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">アラート音を再生</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Vibrate size={18} className="text-gray-600 dark:text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">バイブレーション</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">触覚フィードバック</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAboutSettings = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone size={32} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">NoteSpace</h3>
          <p className="text-gray-600 dark:text-gray-400">バージョン 1.0.0</p>
        </div>
        
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>階層ノート管理アプリケーション</p>
          <p>ワークスペース、ノートブック、フォルダーで効率的にノートを整理</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">ライセンス</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          このアプリケーションはMITライセンスのもとで配布されています。
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">開発者情報</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          © 2024 NoteSpace Development Team
        </p>
      </div>
    </div>
  );

  const renderMainSettings = () => (
    <div className="space-y-3">
      {mainSettings.map((setting) => (
        <button
          key={setting.id}
          onClick={() => handleSectionClick(setting.section)}
          className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                {setting.icon}
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900 dark:text-white">{setting.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{setting.subtitle}</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </div>
        </button>
      ))}
    </div>
  );

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'appearance': return renderAppearanceSettings();
      case 'notifications': return renderNotificationSettings();
      case 'about': return renderAboutSettings();
      case 'privacy':
      case 'data':
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              準備中
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              この機能は今後のアップデートで追加予定です
            </p>
          </div>
        );
      default: return renderMainSettings();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-50 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 flex items-center">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg mr-3"
        >
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {getSectionTitle()}
        </h1>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderCurrentSection()}
      </div>
    </div>
  );
};

export default MobileSettings;