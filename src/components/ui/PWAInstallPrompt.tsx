import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

declare global {
  interface Window {
    showInstallPrompt?: boolean;
    installPWA?: () => void;
  }
}

const PWAInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // iOS かどうかを判定
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // スタンドアローンモード（PWAとしてインストール済み）かどうかを判定
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // PWA インストールプロンプトの表示状態を監視
    const checkInstallPrompt = () => {
      if (window.showInstallPrompt && !standalone) {
        setShowPrompt(true);
      }
    };

    // 定期的にチェック
    const interval = setInterval(checkInstallPrompt, 1000);
    checkInstallPrompt();

    return () => clearInterval(interval);
  }, []);

  const handleInstall = () => {
    if (window.installPWA) {
      window.installPWA();
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // 一定期間は表示しない
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // インストール済み、または最近却下された場合は表示しない
  if (isStandalone) return null;
  
  const dismissed = localStorage.getItem('pwa-install-dismissed');
  if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) { // 7日間
    return null;
  }

  if (!showPrompt && !isIOS) return null;

  // iOS用の手動インストール指示
  if (isIOS && !isStandalone) {
    return (
      <div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white rounded-lg shadow-lg p-4 z-50 animate-slide-in-up">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold mb-1">NoteSpaceをホーム画面に追加</h3>
            <p className="text-sm opacity-90 mb-2">
              より快適にご利用いただけます
            </p>
            <div className="text-xs opacity-80">
              <p>1. Safariの共有ボタン（□↑）をタップ</p>
              <p>2. "ホーム画面に追加"を選択</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-2 p-1 hover:bg-blue-700 rounded"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Android/Desktop用のインストールプロンプト
  if (showPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50 animate-slide-in-up">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">N</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">NoteSpaceをインストール</h3>
                <p className="text-xs text-gray-600 dark:text-gray-300">オフラインでも使えます</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleInstall}
                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <Download size={16} className="mr-1" />
                インストール
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                後で
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default PWAInstallPrompt;