import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Download, Upload, Trash2, Database, Info, Image, Smartphone, Shield, BarChart3, Palette } from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import IconManager from '../ui/IconManager';
import DeviceSyncDialog from './DeviceSyncDialog';
import SyncPermissionDialog from './SyncPermissionDialog';
import CompactDashboard from '../dashboard/CompactDashboard';
import ThemeToggle from '../ui/ThemeToggle';
import DataIntegrityDialog from './DataIntegrityDialog';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose
}) => {
  const { exportAllData, importAllData } = useNotebookStore();
  const [activeTab, setActiveTab] = useState<'appearance' | 'data' | 'sync' | 'permissions' | 'icons' | 'stats' | 'about'>('appearance');
  const [showIconManager, setShowIconManager] = useState(false);
  const [showDeviceSyncDialog, setShowDeviceSyncDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [showDataIntegrityDialog, setShowDataIntegrityDialog] = useState(false);

  const handleExport = () => {
    exportAllData();
  };

  const handleImport = async () => {
    await importAllData();
  };

  const handleClearData = () => {
    if (window.confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
      localStorage.removeItem('notebook-store');
      window.location.reload();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="設定"
      size="xl"
    >
      <div className="flex h-[500px] max-h-[80vh] overflow-hidden">
        {/* タブナビゲーション */}
        <div className="w-1/3 border-r border-gray-200 pr-4">
          <nav className="space-y-2" role="tablist" aria-label="設定カテゴリ">
            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'appearance'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="外観・テーマタブを開く"
              aria-selected={activeTab === 'appearance'}
              tabIndex={activeTab === 'appearance' ? 0 : -1}
              role="tab"
            >
              <Palette size={16} className="inline mr-2" />
              外観・テーマ
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'data'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="データ管理タブを開く"
              aria-selected={activeTab === 'data'}
              tabIndex={activeTab === 'data' ? 0 : -1}
              role="tab"
            >
              <Database size={16} className="inline mr-2" />
              データ管理
            </button>
            <button
              onClick={() => setActiveTab('sync')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'sync'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="デバイス間同期タブを開く"
              aria-selected={activeTab === 'sync'}
              tabIndex={activeTab === 'sync' ? 0 : -1}
              role="tab"
            >
              <Smartphone size={16} className="inline mr-2" />
              デバイス同期
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'permissions'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="同期権限管理タブを開く"
              aria-selected={activeTab === 'permissions'}
              tabIndex={activeTab === 'permissions' ? 0 : -1}
              role="tab"
            >
              <Shield size={16} className="inline mr-2" />
              同期権限管理
            </button>
            <button
              onClick={() => setActiveTab('icons')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'icons'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="アプリアイコンタブを開く"
              aria-selected={activeTab === 'icons'}
              tabIndex={activeTab === 'icons' ? 0 : -1}
              role="tab"
            >
              <Image size={16} className="inline mr-2" />
              アプリアイコン
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'stats'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="使用統計タブを開く"
              aria-selected={activeTab === 'stats'}
              tabIndex={activeTab === 'stats' ? 0 : -1}
              role="tab"
            >
              <BarChart3 size={16} className="inline mr-2" />
              使用統計
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'about'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="このアプリについてタブを開く"
              aria-selected={activeTab === 'about'}
              tabIndex={activeTab === 'about' ? 0 : -1}
              role="tab"
            >
              <Info size={16} className="inline mr-2" />
              このアプリについて
            </button>
          </nav>
        </div>

        {/* タブコンテンツ */}
        <div className="flex-1 pl-4 overflow-y-auto">
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">外観・テーマ設定</h3>
                <p className="text-sm text-gray-600 mb-4">
                  アプリの見た目やテーマをカスタマイズできます。
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-3">カラーテーマ</h4>
                  <p className="text-sm text-blue-700 mb-4">
                    ライト、ダーク、システム設定に合わせてテーマを選択できます。
                  </p>
                  <ThemeToggle />
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">テーマの詳細</h4>
                  <div className="text-sm text-green-700 space-y-2">
                    <p><strong>ライトテーマ:</strong> 明るい背景で日中の作業に最適</p>
                    <p><strong>ダークテーマ:</strong> 暗い背景で目の疲労を軽減</p>
                    <p><strong>システム:</strong> OSの設定に自動的に追従</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">UI設定</h4>
                  <div className="text-sm text-gray-600">
                    <p>フォントサイズや要素の配置などの詳細設定は今後のアップデートで追加予定です。</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">データ管理</h3>
                <p className="text-sm text-gray-600 mb-4">
                  ノートブックのデータをバックアップしたり、復元したりできます。
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">データのエクスポート</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    すべてのワークスペース、ノートブック、ノートをJSONファイルとして保存します。
                  </p>
                  <button
                    onClick={handleExport}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    aria-label="すべてのデータをJSONファイルとしてエクスポート"
                  >
                    <Download size={16} className="mr-2" />
                    データをエクスポート
                  </button>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">データのインポート</h4>
                  <p className="text-sm text-green-700 mb-3">
                    以前にエクスポートしたJSONファイルからデータを復元します。
                  </p>
                  <button
                    onClick={handleImport}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    aria-label="以前にエクスポートしたJSONファイルからデータをインポート"
                  >
                    <Upload size={16} className="mr-2" />
                    データをインポート
                  </button>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">データ整合性チェック</h4>
                  <p className="text-sm text-purple-700 mb-3">
                    データの整合性を確認し、問題がある場合は修復を試みます。
                  </p>
                  <button
                    onClick={() => setShowDataIntegrityDialog(true)}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    aria-label="データ整合性チェックを実行"
                  >
                    <Shield size={16} className="mr-2" />
                    整合性チェック
                  </button>
                </div>

                <div className="p-4 bg-red-50 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">データの削除</h4>
                  <p className="text-sm text-red-700 mb-3">
                    すべてのデータを削除して初期状態に戻します。この操作は取り消せません。
                  </p>
                  <button
                    onClick={handleClearData}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    aria-label="すべてのデータを削除して初期状態に戻す"
                  >
                    <Trash2 size={16} className="mr-2" />
                    すべてのデータを削除
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">デバイス間同期</h3>
                <p className="text-sm text-gray-600 mb-4">
                  スマートフォンとPCの間でノートデータを同期できます。
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                    <Smartphone size={16} className="mr-2" />
                    🔄 デバイス間同期
                  </h4>
                  <p className="text-sm text-blue-700 mb-3">
                    QRコードやJSONファイルを使って他のデバイスとデータを同期できます。
                  </p>
                  <ul className="text-xs text-blue-600 space-y-1 mb-4">
                    <li>• QRコード生成によるクイック同期</li>
                    <li>• JSONファイル経由での完全バックアップ</li>
                    <li>• ワークスペース単位での部分同期</li>
                    <li>• 既存データとの安全なマージ機能</li>
                  </ul>
                  <button
                    onClick={() => setShowDeviceSyncDialog(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    aria-label="デバイス間同期ダイアログを開く"
                  >
                    <Smartphone size={16} className="mr-2" />
                    同期を開始
                  </button>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">💡 使用方法</h4>
                  <div className="text-sm text-yellow-700 space-y-1">
                    <p><strong>送信側:</strong> QRコード生成またはJSONファイル出力</p>
                    <p><strong>受信側:</strong> QRコードスキャン/コード入力またはファイル読込</p>
                    <p><strong>注意:</strong> データは既存の内容に追加されます（上書きではありません）</p>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">✅ 対応デバイス</h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>• <strong>PC ↔ スマートフォン:</strong> QRコードで簡単同期</p>
                    <p>• <strong>PC ↔ PC:</strong> JSONファイル転送が便利</p>
                    <p>• <strong>オフライン:</strong> インターネット接続不要</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">同期権限管理</h3>
                <p className="text-sm text-gray-600 mb-4">
                  他のユーザーとの同期権限を管理できます。セキュリティのため、信頼できる人のみ承認してください。
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2 flex items-center">
                    <Shield size={16} className="mr-2" />
                    🔒 同期セキュリティ
                  </h4>
                  <p className="text-sm text-green-700 mb-3">
                    他のユーザーから同期リクエストを受信した場合、手動で承認する必要があります。
                  </p>
                  <ul className="text-xs text-green-600 space-y-1 mb-4">
                    <li>• 同じ同期キーを持つデバイス（あなたの他のデバイス）は自動承認</li>
                    <li>• 他のユーザーからのリクエストは手動承認が必要</li>
                    <li>• 承認したユーザーと全ノートが共有されます</li>
                    <li>• いつでも承認を取り消すことができます</li>
                  </ul>
                  <button
                    onClick={() => setShowPermissionDialog(true)}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    aria-label="同期権限管理ダイアログを開く"
                  >
                    <Shield size={16} className="mr-2" />
                    権限管理を開く
                  </button>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-amber-800 mb-2">⚠️ セキュリティ注意事項</h4>
                  <div className="text-sm text-amber-700 space-y-1">
                    <p><strong>承認前の確認事項：</strong></p>
                    <p>• 同期リクエスト送信者が信頼できる人物か確認</p>
                    <p>• 承認するとあなたの全ノートが共有されます</p>
                    <p>• 同一WiFiネットワーク内でのみ同期されます</p>
                    <p>• 不要になったら承認を取り消してください</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">💡 同期キーについて</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>同期キーは以下の用途で使用されます：</p>
                    <p>• あなたの複数デバイス間の自動同期認証</p>
                    <p>• 他のユーザーとの同期時の識別</p>
                    <p>• セキュリティが心配な場合は定期的に再生成推奨</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'icons' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">アプリアイコン管理</h3>
                <p className="text-sm text-gray-600 mb-4">
                  NoteSpace のカスタムアイコンを生成・ダウンロードできます。PWA、favicon、各種デバイス対応のアイコンを作成します。
                </p>
              </div>

              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">🎨 カスタムアイコン生成</h4>
                    <p className="text-sm text-blue-700 mb-4">
                      ノートブック、フォルダ、マインドマップを表現した独自デザインのアイコンを生成します。
                    </p>
                    <ul className="text-xs text-blue-600 space-y-1 mb-4">
                      <li>• PWA用アイコン (192x192, 512x512)</li>
                      <li>• Favicon (16x16, 32x32, 48x48)</li>
                      <li>• Apple Touch Icon (180x180)</li>
                      <li>• Android用各種サイズ</li>
                    </ul>
                  </div>
                  <div className="ml-4">
                    <div 
                      className="w-16 h-16 bg-white rounded-lg shadow-sm flex items-center justify-center"
                      style={{ 
                        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`
                          <svg width="64" height="64" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="256" cy="256" r="240" fill="#3b82f6"/>
                            <rect x="166" y="186" width="180" height="140" rx="8" fill="#ffffff"/>
                            <circle cx="196" cy="206" r="4" fill="#6366f1"/>
                            <circle cx="196" cy="231" r="4" fill="#6366f1"/>
                            <circle cx="196" cy="256" r="4" fill="#6366f1"/>
                            <rect x="216" y="211" width="100" height="3" rx="1.5" fill="#94a3b8"/>
                            <rect x="216" y="236" width="80" height="3" rx="1.5" fill="#cbd5e1"/>
                            <rect x="216" y="261" width="90" height="3" rx="1.5" fill="#cbd5e1"/>
                          </svg>
                        `)}")`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center'
                      }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => setShowIconManager(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  aria-label="カスタムアプリアイコンを生成・ダウンロードするためのアイコンマネージャーを開く"
                >
                  <Image size={16} className="mr-2" />
                  アイコンマネージャーを開く
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">💡 使用方法</h4>
                <div className="text-sm text-yellow-700 space-y-1">
                  <p>1. アイコンマネージャーで必要なサイズのアイコンをダウンロード</p>
                  <p>2. public/ フォルダに配置して manifest.json を更新</p>
                  <p>3. ブラウザのキャッシュをクリアして確認</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <CompactDashboard />
          )}

          {activeTab === 'about' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">NoteSpace</h3>
                <p className="text-sm text-gray-600 mb-4">
                  階層構造でノートを管理できるWebアプリケーションです。
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">機能</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• ワークスペース、ノートブック、フォルダでの階層管理</li>
                    <li>• Markdownエディタとリアルタイムプレビュー</li>
                    <li>• マインドマップによる視覚的なナビゲーション</li>
                    <li>• タグ機能とお気に入り機能</li>
                    <li>• ローカルストレージでの自動保存</li>
                    <li>• データのエクスポート・インポート</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">技術情報</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• React 18 + TypeScript</li>
                    <li>• Zustand (状態管理)</li>
                    <li>• Tailwind CSS (スタイリング)</li>
                    <li>• Lucide React (アイコン)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">データ保存</h4>
                  <p className="text-sm text-gray-600">
                    すべてのデータはブラウザのローカルストレージに保存されます。
                    定期的にデータをエクスポートしてバックアップすることをお勧めします。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          aria-label="設定ダイアログを閉じる"
        >
          閉じる
        </button>
      </div>

      {/* アイコンマネージャー */}
      <IconManager 
        isOpen={showIconManager} 
        onClose={() => setShowIconManager(false)} 
      />

      {/* デバイス間同期ダイアログ */}
      <DeviceSyncDialog
        isOpen={showDeviceSyncDialog}
        onClose={() => setShowDeviceSyncDialog(false)}
      />

      {/* 同期権限管理ダイアログ */}
      <SyncPermissionDialog
        isOpen={showPermissionDialog}
        onClose={() => setShowPermissionDialog(false)}
      />

      {/* データ整合性チェックダイアログ */}
      <DataIntegrityDialog
        isOpen={showDataIntegrityDialog}
        onClose={() => setShowDataIntegrityDialog(false)}
      />
    </Modal>
  );
};

export default SettingsDialog;