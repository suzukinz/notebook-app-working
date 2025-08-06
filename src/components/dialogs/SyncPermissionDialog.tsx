import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { 
  Shield, 
  User, 
  Check, 
  X, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { userIdentityManager, SyncPermission, UserIdentity } from '../../utils/userIdentity';
import { logger } from '../../utils/logger';

interface SyncPermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SyncPermissionDialog: React.FC<SyncPermissionDialogProps> = ({
  isOpen,
  onClose
}) => {
  const [currentUser, setCurrentUser] = useState<UserIdentity | null>(null);
  const [pendingRequests, setPendingRequests] = useState<SyncPermission[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<SyncPermission[]>([]);
  const [activeTab, setActiveTab] = useState<'user' | 'pending' | 'approved'>('user');
  const [editingUser, setEditingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [showSyncKey, setShowSyncKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      refreshData();

      // 権限変更の監視
      const unsubscribe = userIdentityManager.onPermissionChange(() => {
        refreshData();
      });

      return unsubscribe;
    }
    return () => {}; // isOpen が false の場合の戻り値
  }, [isOpen]);

  const refreshData = () => {
    const user = userIdentityManager.getCurrentUser();
    if (!user) {
      // ユーザー初期化
      const newUser = userIdentityManager.initializeUser();
      setCurrentUser(newUser);
    } else {
      setCurrentUser(user);
    }
    setNewUserName(user?.userName || '');
    
    setPendingRequests(userIdentityManager.getPendingRequests());
    setApprovedUsers(userIdentityManager.getApprovedUsers());
  };

  const handleApproveUser = (userId: string) => {
    const success = userIdentityManager.approveUser(userId);
    if (success) {
      refreshData();
      logger.info(`User approved: ${userId}`);
    }
  };

  const handleRejectUser = (userId: string) => {
    const success = userIdentityManager.rejectUser(userId);
    if (success) {
      refreshData();
      logger.info(`User rejected: ${userId}`);
    }
  };

  const handleRevokeUser = (userId: string) => {
    if (window.confirm('このユーザーの同期権限を取り消しますか？')) {
      const success = userIdentityManager.revokeUser(userId);
      if (success) {
        refreshData();
        logger.info(`User revoked: ${userId}`);
      }
    }
  };

  const handleUpdateUserName = () => {
    if (!newUserName.trim()) return;
    
    userIdentityManager.updateUser({ userName: newUserName.trim() });
    setEditingUser(false);
    refreshData();
  };

  const handleRegenerateSyncKey = () => {
    if (window.confirm('同期キーを再生成しますか？\n\n既存の承認済みデバイスとの同期が解除されます。')) {
      userIdentityManager.regenerateSyncKey();
      refreshData();
      alert('同期キーが再生成されました。他のデバイスでの再承認が必要です。');
    }
  };

  const handleCopySyncKey = async () => {
    if (currentUser?.syncKey) {
      try {
        await navigator.clipboard.writeText(currentUser.syncKey);
        alert('同期キーをクリップボードにコピーしました');
      } catch (error) {
        logger.error('Failed to copy sync key:', error);
        alert('コピーに失敗しました');
      }
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ja-JP');
  };

  if (!currentUser) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🔒 同期権限管理"
      size="xl"
    >
      <div className="flex h-[600px] max-h-[80vh] overflow-hidden">
        {/* タブナビゲーション */}
        <div className="w-1/3 border-r border-gray-200 pr-4">
          <nav className="space-y-2" role="tablist">
            <button
              onClick={() => setActiveTab('user')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'user'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <User size={16} className="inline mr-2" />
              ユーザー情報
            </button>
            
            <button
              onClick={() => setActiveTab('pending')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'pending'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Clock size={16} className="inline mr-2" />
              承認待ち
              {pendingRequests.length > 0 && (
                <span className="ml-2 px-2 py-1 bg-yellow-500 text-white text-xs rounded-full">
                  {pendingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('approved')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'approved'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Shield size={16} className="inline mr-2" />
              承認済み
              {approvedUsers.length > 0 && (
                <span className="ml-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                  {approvedUsers.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 pl-4 overflow-y-auto">
          {/* ユーザー情報タブ */}
          {activeTab === 'user' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <User size={18} className="mr-2 text-blue-600" />
                  あなたのユーザー情報
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  他のデバイスとの同期時にこの情報が表示されます。
                </p>
              </div>

              <div className="space-y-4">
                {/* ユーザー名 */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-medium text-gray-900">表示名</label>
                    <button
                      onClick={() => setEditingUser(!editingUser)}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      {editingUser ? 'キャンセル' : '編集'}
                    </button>
                  </div>
                  
                  {editingUser ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-md"
                        placeholder="ユーザー名を入力"
                      />
                      <button
                        onClick={handleUpdateUserName}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        保存
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{currentUser.userAvatar}</span>
                      <span className="font-medium">{currentUser.userName}</span>
                    </div>
                  )}
                </div>

                {/* 同期キー */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-medium text-gray-900">同期キー</label>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowSyncKey(!showSyncKey)}
                        className="text-gray-600 hover:text-gray-700"
                        title={showSyncKey ? '同期キーを隠す' : '同期キーを表示'}
                      >
                        {showSyncKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        onClick={handleCopySyncKey}
                        className="text-blue-600 hover:text-blue-700"
                        title="同期キーをコピー"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={handleRegenerateSyncKey}
                        className="text-red-600 hover:text-red-700"
                        title="同期キーを再生成"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="font-mono text-sm bg-gray-50 p-3 rounded border">
                    {showSyncKey ? currentUser.syncKey : '••••••••••••••••'}
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    同じ同期キーを持つデバイス間でのみ自動同期されます。
                  </p>
                </div>

                {/* ユーザーID */}
                <div className="p-4 border rounded-lg">
                  <label className="font-medium text-gray-900 block mb-2">ユーザーID</label>
                  <div className="font-mono text-sm bg-gray-50 p-3 rounded border">
                    {currentUser.userId}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    作成日時: {formatTimestamp(currentUser.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 承認待ちタブ */}
          {activeTab === 'pending' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Clock size={18} className="mr-2 text-yellow-600" />
                  同期リクエスト ({pendingRequests.length}件)
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  他のデバイスからの同期リクエストです。承認すると相互にデータが同期されます。
                </p>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Clock size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">承認待ちのリクエストはありません</p>
                  <p className="text-sm">
                    他のデバイスから同期リクエストが送信されると、ここに表示されます。
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div key={request.userId} className="p-4 border border-yellow-300 bg-yellow-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">👤</div>
                          <div>
                            <div className="font-medium text-gray-900">{request.userName}</div>
                            <div className="text-sm text-gray-600">
                              リクエスト日時: {formatTimestamp(request.requestedAt)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ユーザーID: {request.userId}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleApproveUser(request.userId)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                          >
                            <Check size={16} className="mr-1" />
                            承認
                          </button>
                          <button
                            onClick={() => handleRejectUser(request.userId)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                          >
                            <X size={16} className="mr-1" />
                            拒否
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 承認済みタブ */}
          {activeTab === 'approved' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Shield size={18} className="mr-2 text-green-600" />
                  承認済みユーザー ({approvedUsers.length}名)
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  これらのユーザーとデータが自動同期されています。
                </p>
              </div>

              {approvedUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Shield size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">承認済みユーザーはいません</p>
                  <p className="text-sm">
                    他のデバイスからのリクエストを承認すると、ここに表示されます。
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {approvedUsers.map((user) => (
                    <div key={user.userId} className="p-4 border border-green-300 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">✅</div>
                          <div>
                            <div className="font-medium text-gray-900">{user.userName}</div>
                            <div className="text-sm text-gray-600">
                              承認日時: {user.approvedAt ? formatTimestamp(user.approvedAt) : '-'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ユーザーID: {user.userId}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevokeUser(user.userId)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                        >
                          <X size={16} className="mr-1" />
                          取り消し
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 警告メッセージ */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertTriangle size={20} className="text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">🔒 セキュリティについて</p>
            <ul className="space-y-1 text-xs">
              <li>• 同期データは同一WiFi内でのみ送信されます</li>
              <li>• 承認したユーザーとあなたの全ノートが共有されます</li>
              <li>• 信頼できる人・デバイスのみ承認してください</li>
              <li>• 同期キーを再生成すると既存の承認がリセットされます</li>
            </ul>
          </div>
        </div>
      </div>

      {/* フッター */}
      <div className="flex justify-end mt-6 pt-4 border-t">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          閉じる
        </button>
      </div>
    </Modal>
  );
};

export default SyncPermissionDialog;