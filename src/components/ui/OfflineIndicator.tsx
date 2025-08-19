import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, Clock, Shield } from 'lucide-react';
import { offlineManager, OfflineStatus } from '../../utils/offlineManager';

interface ServiceWorkerStatus {
  isRegistered: boolean;
  isControlling: boolean;
  isWaiting: boolean;
  version?: string;
  error?: string;
}

const OfflineIndicator: React.FC = () => {
  const [status, setStatus] = useState<OfflineStatus>(offlineManager.getStatus());
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [swStatus, setSwStatus] = useState<ServiceWorkerStatus>({
    isRegistered: false,
    isControlling: false,
    isWaiting: false
  });

  useEffect(() => {
    // ステータス変更の監視
    const unsubscribe = offlineManager.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setIsVisible(true);
      
      // オンラインになった場合は3秒後に非表示
      if (newStatus.isOnline && !newStatus.hasQueuedActions) {
        setTimeout(() => setIsVisible(false), 3000);
      }
    });

    // Service Worker ステータスの監視
    import('../../utils/serviceWorkerManager').then(({ serviceWorkerManager }) => {
      const swUnsubscribe = serviceWorkerManager.onStatusChange((newSwStatus) => {
        setSwStatus(newSwStatus);
      });

      // 初期状態の取得
      setSwStatus(serviceWorkerManager.getStatus());

      return () => {
        unsubscribe();
        swUnsubscribe();
      };
    }).catch(() => {
      // Service Worker Manager が利用できない場合
      console.warn('Service Worker Manager not available');
    });

    // 初期表示判定
    if (!status.isOnline || status.hasQueuedActions) {
      setIsVisible(true);
    }

    return unsubscribe;
  }, [status.isOnline, status.hasQueuedActions]);

  // 手動同期の実行
  const handleManualSync = async () => {
    if (!status.isOnline) return;
    
    setSyncInProgress(true);
    try {
      await offlineManager.forcSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setSyncInProgress(false);
    }
  };

  // 詳細情報の表示切り替え
  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  // 最終同期時刻のフォーマット
  const formatLastSync = (timestamp?: number) => {
    if (!timestamp) return '未同期';
    
    const now = new Date();
    const syncTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - syncTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return '今同期済み';
    if (diffInMinutes < 60) return `${diffInMinutes}分前に同期`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}時間前に同期`;
    return `${Math.floor(diffInMinutes / 1440)}日前に同期`;
  };

  if (!isVisible) return null;

  return (
    <>
      {/* インジケーター */}
      <div 
        className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        }`}
      >
        <div 
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg cursor-pointer transition-colors ${
            status.isOnline 
              ? status.hasQueuedActions 
                ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                : 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
          onClick={toggleDetails}
        >
          {/* ステータスアイコン */}
          {status.isOnline ? (
            status.hasQueuedActions ? (
              <Clock size={16} className="animate-pulse" />
            ) : (
              <CheckCircle size={16} />
            )
          ) : (
            <WifiOff size={16} />
          )}
          
          {/* ステータステキスト */}
          <span className="text-sm font-medium">
            {!status.isOnline 
              ? 'オフライン'
              : status.hasQueuedActions
                ? `未同期 ${status.queuedActionsCount}件`
                : 'オンライン'
            }
          </span>
          
          {/* 同期ボタン */}
          {status.isOnline && status.hasQueuedActions && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleManualSync();
              }}
              disabled={syncInProgress}
              className="ml-1 p-1 hover:bg-amber-200 rounded transition-colors disabled:opacity-50"
              title="手動同期"
            >
              <RefreshCw 
                size={14} 
                className={`${syncInProgress ? 'animate-spin' : ''}`}
              />
            </button>
          )}
          
          {/* 閉じるボタン */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsVisible(false);
            }}
            className="ml-1 p-1 hover:bg-gray-200 rounded transition-colors"
            title="閉じる"
          >
            ×
          </button>
        </div>
      </div>

      {/* 詳細モーダル */}
      {showDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  {status.isOnline ? (
                    <Wifi size={20} className="mr-2 text-green-600" />
                  ) : (
                    <WifiOff size={20} className="mr-2 text-red-600" />
                  )}
                  接続状態
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              {/* 接続状態 */}
              <div className="flex items-center justify-between">
                <span className="text-gray-700">ネットワーク接続</span>
                <span className={`flex items-center ${
                  status.isOnline ? 'text-green-600' : 'text-red-600'
                }`}>
                  {status.isOnline ? (
                    <>
                      <CheckCircle size={16} className="mr-1" />
                      オンライン
                    </>
                  ) : (
                    <>
                      <AlertCircle size={16} className="mr-1" />
                      オフライン
                    </>
                  )}
                </span>
              </div>

              {/* 未同期アクション */}
              <div className="flex items-center justify-between">
                <span className="text-gray-700">未同期操作</span>
                <span className={`${
                  status.hasQueuedActions ? 'text-amber-600' : 'text-green-600'
                }`}>
                  {status.queuedActionsCount}件
                </span>
              </div>

              {/* 最終同期時刻 */}
              <div className="flex items-center justify-between">
                <span className="text-gray-700">最終同期</span>
                <span className="text-gray-600">
                  {formatLastSync(status.lastSyncTime)}
                </span>
              </div>

              {/* Service Worker状態 */}
              <div className="flex items-center justify-between">
                <span className="text-gray-700">オフライン機能</span>
                <span className={`flex items-center ${
                  swStatus.isControlling ? 'text-green-600' : 'text-gray-500'
                }`}>
                  <Shield size={16} className="mr-1" />
                  {swStatus.isControlling ? '有効' : '無効'}
                </span>
              </div>

              {/* オフライン時のメッセージ */}
              {!status.isOnline && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">
                    現在オフラインです。操作は保存され、オンライン復帰時に自動的に同期されます。
                  </p>
                </div>
              )}

              {/* 未同期操作がある場合のメッセージ */}
              {status.isOnline && status.hasQueuedActions && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-700 mb-2">
                    {status.queuedActionsCount}件の操作が未同期です。
                  </p>
                  <button
                    onClick={handleManualSync}
                    disabled={syncInProgress}
                    className="flex items-center text-sm bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700 disabled:opacity-50 transition-colors"
                  >
                    {syncInProgress ? (
                      <>
                        <RefreshCw size={14} className="mr-1 animate-spin" />
                        同期中...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} className="mr-1" />
                        今すぐ同期
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* すべて同期済みの場合 */}
              {status.isOnline && !status.hasQueuedActions && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-700">
                    すべての操作が同期されています。
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setShowDetails(false)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OfflineIndicator;