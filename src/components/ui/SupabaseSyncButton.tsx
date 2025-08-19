import React, { useState } from 'react';
import { RefreshCw, Cloud, CloudOff, CheckCircle } from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';

interface SupabaseSyncButtonProps {
  className?: string;
}

const SupabaseSyncButton: React.FC<SupabaseSyncButtonProps> = ({ className = '' }) => {
  const { syncWithSupabase, isSyncing } = useNotebookStore();
  const { user } = useSupabaseAuth();
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const handleSync = async () => {
    if (!user || isSyncing || !syncWithSupabase) return;

    try {
      await syncWithSupabase(user.id);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('同期エラー:', error);
      // エラー表示ロジックを追加
    }
  };

  const formatLastSync = (time: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return '今';
    if (diffInMinutes < 60) return `${diffInMinutes}分前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}時間前`;
    return `${Math.floor(diffInMinutes / 1440)}日前`;
  };

  if (!user) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 ${className}`}>
        <CloudOff size={16} className="text-gray-400" />
        <span className="text-sm text-gray-500">未ログイン</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <button
        onClick={handleSync}
        disabled={isSyncing || !syncWithSupabase}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
        title="Supabaseと同期"
      >
        {isSyncing ? (
          <RefreshCw size={16} className="text-blue-500 animate-spin" />
        ) : (
          <Cloud size={16} className="text-blue-600" />
        )}
        <span className="text-sm font-medium text-gray-700">
          {isSyncing ? '同期中...' : '今すぐ同期'}
        </span>
      </button>
      
      {lastSyncTime && !isSyncing && (
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <CheckCircle size={12} className="text-green-500" />
          <span>{formatLastSync(lastSyncTime)}</span>
        </div>
      )}
    </div>
  );
};

export default SupabaseSyncButton;