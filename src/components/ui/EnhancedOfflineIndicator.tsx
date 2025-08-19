// Enhanced Offline Indicator - Phase 3 Wave 2
// Real-time visual feedback for network and sync status

import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  Clock,
  Signal,
  Zap,
  AlertCircle
} from 'lucide-react';
import { useEnhancedOffline } from '../../contexts/EnhancedOfflineContext';

interface EnhancedOfflineIndicatorProps {
  variant?: 'compact' | 'detailed' | 'inline';
  showTooltip?: boolean;
  className?: string;
}

const EnhancedOfflineIndicator: React.FC<EnhancedOfflineIndicatorProps> = ({
  variant = 'compact',
  showTooltip = true,
  className = ''
}) => {
  const {
    networkStatus,
    syncStatus,
    conflicts,
    capabilities,
    forceSyncNow
  } = useEnhancedOffline();

  // ==================== STATUS HELPERS ====================

  const getNetworkIcon = () => {
    if (!networkStatus.isOnline) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }
    
    if (syncStatus.isActive) {
      return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    }
    
    if (conflicts.length > 0) {
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
    
    if (syncStatus.errors.length > 0) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    
    return <Wifi className="w-4 h-4 text-green-500" />;
  };

  const getConnectionQuality = () => {
    if (!networkStatus.isOnline) return 'offline';
    
    const { downlink, effectiveType } = networkStatus;
    
    if (downlink >= 10 || effectiveType === '4g') return 'excellent';
    if (downlink >= 1.5 || effectiveType === '3g') return 'good';
    if (downlink >= 0.15 || effectiveType === '2g') return 'poor';
    return 'slow';
  };

  const getQualityColor = () => {
    const quality = getConnectionQuality();
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'poor': return 'text-amber-500';
      case 'slow': return 'text-red-500';
      case 'offline': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    if (!networkStatus.isOnline) {
      return 'オフライン';
    }
    
    if (syncStatus.isActive) {
      return '同期中...';
    }
    
    if (conflicts.length > 0) {
      return `競合 ${conflicts.length}件`;
    }
    
    if (syncStatus.errors.length > 0) {
      return `エラー ${syncStatus.errors.length}件`;
    }
    
    const queueTotal = syncStatus.queue.pending + syncStatus.queue.processing;
    if (queueTotal > 0) {
      return `同期待ち ${queueTotal}件`;
    }
    
    return 'オンライン';
  };

  const getTooltipContent = () => {
    const lines = [
      `状態: ${getStatusText()}`,
      `接続: ${networkStatus.effectiveType?.toUpperCase()} (${networkStatus.downlink}Mbps)`,
    ];
    
    if (syncStatus.lastSync) {
      const lastSyncTime = new Date(syncStatus.lastSync).toLocaleTimeString();
      lines.push(`最終同期: ${lastSyncTime}`);
    }
    
    if (syncStatus.queue.pending > 0) {
      lines.push(`待機中: ${syncStatus.queue.pending}項目`);
    }
    
    if (syncStatus.queue.processing > 0) {
      lines.push(`処理中: ${syncStatus.queue.processing}項目`);
    }
    
    if (conflicts.length > 0) {
      lines.push(`競合: ${conflicts.length}項目要解決`);
    }
    
    return lines.join('\n');
  };

  // ==================== VARIANT RENDERERS ====================

  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center space-x-1 ${className}`}>
        {getNetworkIcon()}
        <span className="text-xs text-gray-600">{getStatusText()}</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div 
        className={`relative group ${className}`}
        title={showTooltip ? getTooltipContent() : undefined}
      >
        <div className="flex items-center space-x-2 px-2 py-1 rounded-md bg-gray-50 border">
          {getNetworkIcon()}
          <div className="flex items-center space-x-1">
            {/* Connection Quality Indicator */}
            <Signal className={`w-3 h-3 ${getQualityColor()}`} />
            <span className="text-xs font-medium text-gray-700">
              {networkStatus.isOnline ? networkStatus.effectiveType?.toUpperCase() : 'OFF'}
            </span>
          </div>
        </div>
        
        {/* Animated pulse for active sync */}
        {syncStatus.isActive && (
          <div className="absolute inset-0 rounded-md bg-blue-200 animate-pulse opacity-30"></div>
        )}
        
        {/* Error badge */}
        {syncStatus.errors.length > 0 && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">{syncStatus.errors.length}</span>
          </div>
        )}
        
        {/* Conflict badge */}
        {conflicts.length > 0 && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">!</span>
          </div>
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getNetworkIcon()}
          <h3 className="font-medium text-gray-900">接続状態</h3>
        </div>
        
        <button
          onClick={forceSyncNow}
          disabled={syncStatus.isActive}
          className="p-1 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="手動同期"
        >
          <RefreshCw className={`w-4 h-4 text-gray-600 ${syncStatus.isActive ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Network Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">ネットワーク</span>
          <div className="flex items-center space-x-2">
            <Signal className={`w-4 h-4 ${getQualityColor()}`} />
            <span className="text-sm font-medium">
              {networkStatus.isOnline 
                ? `${networkStatus.effectiveType?.toUpperCase()} (${networkStatus.downlink}Mbps)`
                : 'オフライン'
              }
            </span>
          </div>
        </div>

        {/* Sync Queue Status */}
        {(syncStatus.queue.pending > 0 || syncStatus.queue.processing > 0) && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">同期キュー</span>
            <div className="flex items-center space-x-1">
              {syncStatus.queue.processing > 0 && (
                <div className="flex items-center space-x-1">
                  <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
                  <span className="text-xs text-blue-600">{syncStatus.queue.processing}</span>
                </div>
              )}
              {syncStatus.queue.pending > 0 && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span className="text-xs text-amber-600">{syncStatus.queue.pending}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">競合</span>
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              <span className="text-xs text-amber-600">{conflicts.length}件要解決</span>
            </div>
          </div>
        )}

        {/* Errors */}
        {syncStatus.errors.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">エラー</span>
            <div className="flex items-center space-x-1">
              <AlertCircle className="w-3 h-3 text-red-500" />
              <span className="text-xs text-red-600">{syncStatus.errors.length}件</span>
            </div>
          </div>
        )}

        {/* Last Sync */}
        {syncStatus.lastSync && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">最終同期</span>
            <span className="text-xs text-gray-500">
              {new Date(syncStatus.lastSync).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            networkStatus.isOnline 
              ? syncStatus.isActive 
                ? 'bg-blue-500 animate-pulse' 
                : conflicts.length > 0 || syncStatus.errors.length > 0
                  ? 'bg-amber-500'
                  : 'bg-green-500'
              : 'bg-gray-400'
          }`}></div>
          <span className="text-xs text-gray-600">{getStatusText()}</span>
          
          {/* Performance indicator */}
          {capabilities.performance.successRate < 0.9 && (
            <div className="flex items-center space-x-1 ml-auto">
              <Zap className="w-3 h-3 text-amber-500" />
              <span className="text-xs text-amber-600">
                成功率 {Math.round(capabilities.performance.successRate * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedOfflineIndicator;