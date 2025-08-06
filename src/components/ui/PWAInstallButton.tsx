import React from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { logger } from '../../utils/logger';

const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, installPWA } = usePWAInstall();

  if (isInstalled || !isInstallable) {
    return null;
  }

  const handleInstall = async () => {
    const success = await installPWA();
    if (success) {
      logger.log('PWA installed successfully');
    }
  };

  return (
    <button
      onClick={handleInstall}
      className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
      title="アプリをインストール"
    >
      <Download size={16} className="mr-2" />
      アプリをインストール
    </button>
  );
};

export default PWAInstallButton;