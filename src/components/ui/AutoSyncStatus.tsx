import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Smartphone, 
  Monitor, 
  CheckCircle,
  Users,
  Shield,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { autoSyncManager, SyncDevice } from '../../utils/autoSyncManager';
import { ConflictInfo } from '../../utils/conflictResolver';
import { logger } from '../../utils/logger';
import ConflictResolutionDialog from '../dialogs/ConflictResolutionDialog';

interface AutoSyncStatusProps {
  className?: string;
}

const AutoSyncStatus: React.FC<AutoSyncStatusProps> = ({ className = '' }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [devices, setDevices] = useState<SyncDevice[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [showDeviceList, setShowDeviceList] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  useEffect(() => {
    // 現在の状態を取得
    setIsEnabled(autoSyncManager.isRunning());
    setDevices(autoSyncManager.getDevices());

    // デバイス状態の変更を監視
    const unsubscribeStatus = autoSyncManager.onStatusChange((newDevices) => {
      setDevices(newDevices);
      logger.info('Device list updated:', newDevices);
    });

    // 競合情報の変更を監視
    const unsubscribeConflicts = autoSyncManager.onConflictInfo((newConflicts) => {
      setConflicts(newConflicts);
      logger.info('Conflicts updated:', newConflicts);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeConflicts();
    };
  }, []);

  const handleToggleSync = async () => {
    if (isEnabled) {
      autoSyncManager.stop();
      setIsEnabled(false);
      setDevices([]);
    } else {
      setIsStarting(true);
      try {
        await autoSyncManager.start();
        setIsEnabled(true);
      } catch (error) {
        logger.error('Failed to start auto sync:', error);
        alert('自動同期の開始に失敗しました。ネットワーク設定を確認してください。');
      } finally {
        setIsStarting(false);
      }
    }
  };

  const getDeviceIcon = (device: SyncDevice) => {
    if (device.deviceName.toLowerCase().includes('mobile') || 
        device.deviceName.toLowerCase().includes('phone')) {
      return <Smartphone size={16} className="text-blue-600" />;
    }
    return <Monitor size={16} className="text-green-600" />;
  };

  const getStatusIcon = () => {
    if (!isEnabled) {
      return <WifiOff size={16} className="text-gray-400" />;
    }
    if (isStarting) {
      return <RefreshCw size={16} className="text-blue-500 animate-spin" />;
    }
    if (conflicts.length > 0) {
      return <AlertTriangle size={16} className="text-red-500" />;
    }
    if (devices.length > 0) {
      return <Wifi size={16} className="text-green-500" />;
    }
    return <Wifi size={16} className="text-yellow-500" />;
  };

  const getStatusText = () => {
    if (!isEnabled) return '同期停止';
    if (isStarting) return '開始中...';
    if (conflicts.length > 0) return `競合 ${conflicts.length}件`;
    if (totalAuthorizedDevices > 0) {
      const pendingText = pendingDevices.length > 0 ? ` (${pendingDevices.length}台待機中)` : '';
      return `${totalAuthorizedDevices}台接続中${pendingText}`;
    }
    if (pendingDevices.length > 0) return `${pendingDevices.length}台待機中`;
    return '検索中...';
  };

  const onlineDevices = devices.filter(d => d.status === 'online');
  const pendingDevices = devices.filter(d => d.status === 'unauthorized' || d.status === 'pending');
  const totalAuthorizedDevices = onlineDevices.length;

  return (
    <div className={`relative ${className}`}>
      {/* メインステータス表示 */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handleToggleSync}
          disabled={isStarting}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          title={isEnabled ? '自動同期を停止' : '自動同期を開始'}
        >
          {getStatusIcon()}
          <span className="text-sm font-medium text-gray-700">
            {getStatusText()}
          </span>
        </button>

        {/* デバイス一覧ボタン */}
        {isEnabled && (
          <button
            onClick={() => setShowDeviceList(!showDeviceList)}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            title="接続デバイス一覧を表示"
          >
            <Users size={16} className="text-gray-600" />
          </button>
        )}

        {/* 競合解決ボタン */}
        {isEnabled && conflicts.length > 0 && (
          <button
            onClick={() => setShowConflictDialog(true)}
            className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
            title="競合を解決"
          >
            <AlertTriangle size={16} className="text-red-600" />
          </button>
        )}
      </div>

      {/* デバイス一覧ドロップダウン */}
      {showDeviceList && isEnabled && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 flex items-center">
                <Wifi size={16} className="mr-2 text-green-500" />
                接続デバイス
              </h3>
              <button
                onClick={() => setShowDeviceList(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {devices.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Wifi size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">同期可能なデバイスが見つかりません</p>
                <p className="text-xs text-gray-400 mt-1">
                  他のデバイスでNoteSpaceを起動してください
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 承認済みデバイス */}
                {onlineDevices.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center">
                      <Shield size={14} className="mr-1" />
                      承認済み ({onlineDevices.length}台)
                    </h4>
                    <div className="space-y-2">
                      {onlineDevices.map((device) => (
                        <div
                          key={device.deviceId}
                          className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            {getDeviceIcon(device)}
                            <div>
                              <div className="font-medium text-gray-900 text-sm">
                                {device.userName || device.deviceName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {device.ip} • {Math.floor((Date.now() - device.lastSeen) / 1000)}秒前
                              </div>
                            </div>
                          </div>
                          <CheckCircle size={16} className="text-green-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 承認待ちデバイス */}
                {pendingDevices.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-yellow-700 mb-2 flex items-center">
                      <Clock size={14} className="mr-1" />
                      承認待ち ({pendingDevices.length}台)
                    </h4>
                    <div className="space-y-2">
                      {pendingDevices.map((device) => (
                        <div
                          key={device.deviceId}
                          className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            {getDeviceIcon(device)}
                            <div>
                              <div className="font-medium text-gray-900 text-sm">
                                {device.userName || device.deviceName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {device.ip} • 承認が必要
                              </div>
                            </div>
                          </div>
                          <Clock size={16} className="text-yellow-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500 space-y-1">
                <p>• 同一WiFiネットワーク内のデバイスが表示されます</p>
                <p>• データは自動的に同期されます（変更時）</p>
                <p>• 同期データは暗号化されずローカル送信されます</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 外部クリックでドロップダウンを閉じる */}
      {showDeviceList && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDeviceList(false)}
        />
      )}

      {/* 競合解決ダイアログ */}
      <ConflictResolutionDialog
        isOpen={showConflictDialog}
        onClose={() => setShowConflictDialog(false)}
      />
    </div>
  );
};

export default AutoSyncStatus;