import React, { useState } from 'react';
import { BarChart3, ArrowLeft, Calendar, Activity, Camera, Target } from 'lucide-react';

interface DashboardTabsProps {
  onTabChange?: (tab: string) => void;
  onBackClick: () => void;
  currentDate: Date;
}

const DashboardTabs: React.FC<DashboardTabsProps> = ({ onTabChange, onBackClick, currentDate }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const tabs = [
    { id: 'dashboard', icon: BarChart3, color: 'blue', label: 'ダッシュボード' },
    { id: 'goals', icon: Target, color: 'green', label: '目標' },
    { id: 'gallery', icon: Camera, color: 'purple', label: 'ギャラリー' },
    { id: 'activity', icon: Activity, color: 'orange', label: 'アクティビティ' },
  ];

  return (
    <nav className="dashboard-tabs bg-white dark:bg-gray-800 rounded-2xl shadow-sm mb-4 pt-2 pb-2 px-2">
      {/* メインタブ */}
      <div className="main-tabs-container px-1">
        <div className="main-tabs-wrapper relative">
          <ul className="main-tabs flex items-center justify-between">
            {/* 戻るボタン */}
            <li className="pr-1">
              <button
                onClick={onBackClick}
                className="round-button flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
                title="ノートに戻る"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </li>

            {/* タブボタン */}
            {tabs.map((tab) => (
              <li key={tab.id} className="flex-1 flex justify-center">
                <button
                  onClick={() => handleTabClick(tab.id)}
                  className={`round-button flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? `text-${tab.color}-600 dark:text-${tab.color}-400 bg-${tab.color}-50 dark:bg-${tab.color}-900/20`
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                  title={tab.label}
                >
                  <tab.icon className="w-5 h-5 mb-0.5" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              </li>
            ))}

            {/* 日付表示 */}
            <li className="pl-1">
              <div className="flex items-center space-x-1.5 text-xs text-gray-500 dark:text-gray-400 px-2">
                <Calendar className="w-3.5 h-3.5" />
                <div className="flex flex-col">
                  <span className="text-xs">{currentDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}</span>
                  <span className="text-xs opacity-75">{currentDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <style>{`
        .dashboard-tabs {
          position: sticky;
          top: 0;
          z-index: 40;
          backdrop-filter: blur(10px);
          background-color: rgba(255, 255, 255, 0.9);
        }

        .dark .dashboard-tabs {
          background-color: rgba(31, 41, 55, 0.9);
        }

        @media (max-width: 640px) {
          .round-button span {
            display: none;
          }
          
          .round-button {
            padding: 0.4rem;
          }

          .round-button .lucide {
            width: 1rem;
            height: 1rem;
          }
        }

        /* カラークラスの定義 */
        .text-red-600 { color: rgb(220 38 38); }
        .text-blue-600 { color: rgb(37 99 235); }
        .text-green-600 { color: rgb(22 163 74); }
        .text-purple-600 { color: rgb(147 51 234); }
        .text-orange-600 { color: rgb(234 88 12); }
        
        .bg-red-50 { background-color: rgb(254 242 242); }
        .bg-blue-50 { background-color: rgb(239 246 255); }
        .bg-green-50 { background-color: rgb(240 253 244); }
        .bg-purple-50 { background-color: rgb(250 245 255); }
        .bg-orange-50 { background-color: rgb(255 247 237); }

        .dark .text-red-400 { color: rgb(248 113 113); }
        .dark .text-blue-400 { color: rgb(96 165 250); }
        .dark .text-green-400 { color: rgb(74 222 128); }
        .dark .text-purple-400 { color: rgb(196 181 253); }
        .dark .text-orange-400 { color: rgb(251 146 60); }
      `}</style>
    </nav>
  );
};

export default DashboardTabs;