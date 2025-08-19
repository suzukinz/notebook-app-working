// パフォーマンス警告表示コンポーネント
import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Activity, BarChart3 } from 'lucide-react';

interface PerformanceWarningProps {
  show?: boolean;
  onClose?: () => void;
}

interface WarningEvent {
  message: string;
  data: any;
  timestamp: number;
}

const PerformanceWarning: React.FC<PerformanceWarningProps> = ({ 
  show: externalShow, 
  onClose 
}) => {
  const [warnings, setWarnings] = useState<WarningEvent[]>([]);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    // パフォーマンス警告イベントのリスナー
    const handlePerformanceWarning = (event: CustomEvent) => {
      const warning: WarningEvent = event.detail;
      setWarnings(prev => [...prev.slice(-4), warning]); // 最新5件まで
      setShow(true);
    };

    window.addEventListener('performance-warning', handlePerformanceWarning as EventListener);

    return () => {
      window.removeEventListener('performance-warning', handlePerformanceWarning as EventListener);
    };
  }, []);

  useEffect(() => {
    if (externalShow !== undefined) {
      setShow(externalShow);
    }
  }, [externalShow]);

  const handleClose = () => {
    setShow(false);
    onClose?.();
  };

  const handleDismissWarning = (timestamp: number) => {
    setDismissed(prev => new Set([...prev, timestamp]));
  };

  const activeWarnings = warnings.filter(w => !dismissed.has(w.timestamp));

  if (!show || activeWarnings.length === 0) {
    return null;
  }

  const getWarningIcon = (message: string) => {
    if (message.includes('memory')) return <Activity className="w-5 h-5" />;
    if (message.includes('performance')) return <BarChart3 className="w-5 h-5" />;
    return <AlertTriangle className="w-5 h-5" />;
  };

  const getWarningColor = (message: string) => {
    if (message.includes('critical')) return 'border-red-500 bg-red-50 text-red-800';
    if (message.includes('memory')) return 'border-orange-500 bg-orange-50 text-orange-800';
    return 'border-yellow-500 bg-yellow-50 text-yellow-800';
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDataValue = (data: any) => {
    if (typeof data.usage === 'number' && typeof data.limit === 'number') {
      const usageMB = Math.round(data.usage / 1024 / 1024);
      const limitMB = Math.round(data.limit / 1024 / 1024);
      const percentage = Math.round((data.usage / data.limit) * 100);
      return `${usageMB}MB / ${limitMB}MB (${percentage}%)`;
    }
    if (typeof data === 'number') {
      return data.toFixed(2) + 'ms';
    }
    return JSON.stringify(data);
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md space-y-2">
      {activeWarnings.map((warning) => (
        <div
          key={warning.timestamp}
          className={`p-4 rounded-lg border-l-4 shadow-lg ${getWarningColor(warning.message)} animate-slide-in-right`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {getWarningIcon(warning.message)}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">
                  パフォーマンス警告
                </h4>
                <p className="text-sm mb-2">
                  {warning.message}
                </p>
                <div className="text-xs opacity-75 space-y-1">
                  <div>時刻: {formatTimestamp(warning.timestamp)}</div>
                  {warning.data && (
                    <div>詳細: {formatDataValue(warning.data)}</div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDismissWarning(warning.timestamp)}
              className="flex-shrink-0 ml-2 p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
              title="この警告を閉じる"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      
      {/* 全体を閉じるボタン */}
      {activeWarnings.length > 1 && (
        <div className="text-right">
          <button
            onClick={handleClose}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            すべて閉じる
          </button>
        </div>
      )}
    </div>
  );
};

export default PerformanceWarning;