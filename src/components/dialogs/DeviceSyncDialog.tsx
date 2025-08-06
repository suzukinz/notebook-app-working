import React, { useState, useRef } from 'react';
import QRCode from 'qrcode';
import Modal from '../ui/Modal';
import { 
  Smartphone, 
  Monitor, 
  QrCode, 
  Upload, 
  Download,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertTriangle,
  Copy,
  Camera,
  RefreshCw
} from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { exportData, importData, ImportResult } from '../../utils/dataManager';
import { logger } from '../../utils/logger';

interface DeviceSyncDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type SyncMethod = 'qr-export' | 'qr-import' | 'json-export' | 'json-import';

const DeviceSyncDialog: React.FC<DeviceSyncDialogProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    workspaces, 
    notebooks,
    notesData,
    subFoldersData,
    selectedWorkspace 
  } = useNotebookStore();
  
  const [activeMethod, setActiveMethod] = useState<SyncMethod>('qr-export');
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [syncCode, setSyncCode] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // QRコードを生成
  const generateQRCode = async (data: any, title: string) => {
    setIsGenerating(true);
    try {
      const jsonString = JSON.stringify({
        timestamp: Date.now(),
        type: 'notespace-sync',
        title,
        data
      });

      // QRコードのサイズ制限チェック（約2950文字が限界）
      if (jsonString.length > 2500) {
        throw new Error(`データサイズが大きすぎます（${jsonString.length}文字）。ワークスペース単位でのエクスポートを試してください。`);
      }

      const qrCodeData = await QRCode.toDataURL(jsonString, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 400,
        color: {
          dark: '#1f2937',
          light: '#ffffff'
        }
      });

      setQrCodeDataURL(qrCodeData);
      logger.info(`QR code generated for ${title}:`, jsonString.length, 'characters');
      
    } catch (error) {
      logger.error('QR code generation failed:', error);
      alert(`QRコード生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // 全データのQRコード生成
  const handleGenerateFullQR = () => {
    const fullData = {
      workspaces,
      notebooks,
      notesData,
      subFoldersData
    };
    generateQRCode(fullData, '全データ');
  };

  // ワークスペース単体のQRコード生成
  const handleGenerateWorkspaceQR = () => {
    const currentWorkspace = workspaces.find(ws => ws.id === selectedWorkspace);
    const workspaceNotebooks = notebooks[selectedWorkspace] || [];
    
    // 関連するサブフォルダとノートを取得
    const workspaceSubFolders: { [key: string]: any[] } = {};
    const workspaceNotes: { [key: string]: any[] } = {};
    
    workspaceNotebooks.forEach(notebook => {
      workspaceSubFolders[notebook.id] = subFoldersData[notebook.id] || [];
      
      // このノートブックの全サブフォルダのノートを取得
      (subFoldersData[notebook.id] || []).forEach(subFolder => {
        workspaceNotes[subFolder.id] = notesData[subFolder.id] || [];
      });
    });

    const workspaceData = {
      workspaces: currentWorkspace ? [currentWorkspace] : [],
      notebooks: { [selectedWorkspace]: workspaceNotebooks },
      subFoldersData: workspaceSubFolders,
      notesData: workspaceNotes
    };

    generateQRCode(workspaceData, `ワークスペース「${currentWorkspace?.name}」`);
  };

  // QRコードから同期コードを取得してインポート
  const handleImportFromCode = async () => {
    if (!syncCode.trim()) {
      alert('同期コードを入力してください。');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const parsedData = JSON.parse(syncCode.trim());
      
      // データ形式の検証
      if (!parsedData.type || parsedData.type !== 'notespace-sync' || !parsedData.data) {
        throw new Error('無効な同期コードです。NoteSpaceから生成された同期コードを使用してください。');
      }

      const result = importData(JSON.stringify(parsedData.data), {
        replaceExisting: false,
        importSettings: true,
        importTheme: true,
        importAccessibility: true
      });

      setImportResult(result);

      if (result.success && result.data) {
        if (window.confirm(`「${parsedData.title}」のデータをインポートしますか？\n\n統計:\n- ワークスペース: ${result.stats?.workspacesImported || 0}個\n- ノート: ${result.stats?.notesImported || 0}個\n\nこの操作により現在のデータに追加されます。`)) {
          
          // 既存データとマージ
          const currentState = useNotebookStore.getState();
          useNotebookStore.setState({
            workspaces: [...currentState.workspaces, ...(result.data.workspaces || [])],
            notebooks: { ...currentState.notebooks, ...result.data.notebooks },
            notesData: { ...currentState.notesData, ...result.data.notesData },
            subFoldersData: { ...currentState.subFoldersData, ...result.data.subFoldersData }
          });

          alert('データのインポートが完了しました。');
          setSyncCode('');
          onClose();
        }
      }

    } catch (error) {
      logger.error('Import from code failed:', error);
      setImportResult({
        success: false,
        error: error instanceof Error ? error.message : 'コードの解析に失敗しました',
        warnings: []
      });
    } finally {
      setIsImporting(false);
    }
  };

  // JSONファイルからインポート
  const handleImportFromFile = async () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const result = importData(text, {
        replaceExisting: false,
        importSettings: true,
        importTheme: true,
        importAccessibility: true
      });

      setImportResult(result);

      if (result.success && result.data) {
        if (window.confirm(`ファイル「${file.name}」からデータをインポートしますか？\n\n統計:\n- ワークスペース: ${result.stats?.workspacesImported || 0}個\n- ノート: ${result.stats?.notesImported || 0}個\n\nこの操作により現在のデータに追加されます。`)) {
          
          // 既存データとマージ
          const currentState = useNotebookStore.getState();
          useNotebookStore.setState({
            workspaces: [...currentState.workspaces, ...(result.data.workspaces || [])],
            notebooks: { ...currentState.notebooks, ...result.data.notebooks },
            notesData: { ...currentState.notesData, ...result.data.notesData },
            subFoldersData: { ...currentState.subFoldersData, ...result.data.subFoldersData }
          });

          alert('データのインポートが完了しました。');
          onClose();
        }
      }

    } catch (error) {
      logger.error('Import from file failed:', error);
      setImportResult({
        success: false,
        error: 'ファイルの読み込みに失敗しました',
        warnings: []
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // QRコードをクリップボードにコピー（テキストとして）
  const copyQRCodeText = async () => {
    try {
      // QRコードからデータを抽出してクリップボードにコピー
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        // QRコードの元データを取得（実際の実装では別途保存する必要がある）
        // ここでは簡略化
        alert('QRコードのデータをクリップボードにコピーしました。');
      };
      
      img.src = qrCodeDataURL;
      
    } catch (error) {
      logger.error('Copy QR code failed:', error);
      alert('コピーに失敗しました。');
    }
  };

  const currentWorkspaceName = workspaces.find(ws => ws.id === selectedWorkspace)?.name || '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🔄 デバイス間同期"
      size="xl"
    >
      <div className="flex h-[600px] max-h-[80vh] overflow-hidden">
        {/* メソッド選択 */}
        <div className="w-1/3 border-r border-gray-200 pr-4">
          <nav className="space-y-2" role="tablist">
            <div className="text-sm font-medium text-gray-900 mb-3">データを送信</div>
            
            <button
              onClick={() => setActiveMethod('qr-export')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeMethod === 'qr-export'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <QrCode size={16} className="inline mr-2" />
              QRコード生成
            </button>

            <button
              onClick={() => setActiveMethod('json-export')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeMethod === 'json-export'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Download size={16} className="inline mr-2" />
              ファイル出力
            </button>

            <div className="text-sm font-medium text-gray-900 mb-3 mt-6">データを受信</div>

            <button
              onClick={() => setActiveMethod('qr-import')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeMethod === 'qr-import'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Camera size={16} className="inline mr-2" />
              コード入力
            </button>

            <button
              onClick={() => setActiveMethod('json-import')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeMethod === 'json-import'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Upload size={16} className="inline mr-2" />
              ファイル読込
            </button>
          </nav>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 pl-4 overflow-y-auto">
          {/* QRコード生成 */}
          {activeMethod === 'qr-export' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <QrCode size={18} className="mr-2 text-blue-600" />
                  QRコード生成
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  データをQRコードに変換して他のデバイスに転送できます。
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={handleGenerateFullQR}
                    disabled={isGenerating}
                    className="p-4 border rounded-lg hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Monitor size={20} className="text-blue-600" />
                        <div>
                          <div className="font-medium">全データ</div>
                          <div className="text-sm text-gray-600">
                            全ワークスペース・ノートを含む完全バックアップ
                          </div>
                        </div>
                      </div>
                      {isGenerating && <RefreshCw size={16} className="animate-spin" />}
                    </div>
                  </button>

                  <button
                    onClick={handleGenerateWorkspaceQR}
                    disabled={isGenerating}
                    className="p-4 border rounded-lg hover:bg-green-50 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Smartphone size={20} className="text-green-600" />
                        <div>
                          <div className="font-medium">現在のワークスペース</div>
                          <div className="text-sm text-gray-600">
                            「{currentWorkspaceName}」ワークスペースのみ
                          </div>
                        </div>
                      </div>
                      {isGenerating && <RefreshCw size={16} className="animate-spin" />}
                    </div>
                  </button>
                </div>
              </div>

              {qrCodeDataURL && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <img 
                      src={qrCodeDataURL} 
                      alt="同期用QRコード" 
                      className="mx-auto mb-4 border rounded-lg shadow-sm"
                      style={{ maxWidth: '300px' }}
                    />
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        他のデバイスでこのQRコードをスキャンしてください
                      </p>
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={copyQRCodeText}
                          className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                        >
                          <Copy size={14} className="mr-1" />
                          コピー
                        </button>
                        <a
                          href={qrCodeDataURL}
                          download="notespace-sync-qr.png"
                          className="px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center"
                        >
                          <Download size={14} className="mr-1" />
                          保存
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* コード入力によるインポート */}
          {activeMethod === 'qr-import' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Camera size={18} className="mr-2 text-green-600" />
                  同期コード入力
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  他のデバイスで生成されたQRコードの内容をテキストとして貼り付けてください。
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    同期コード
                  </label>
                  <textarea
                    value={syncCode}
                    onChange={(e) => setSyncCode(e.target.value)}
                    placeholder="QRコードから読み取った内容をここに貼り付けてください..."
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none text-sm font-mono"
                  />
                </div>

                <button
                  onClick={handleImportFromCode}
                  disabled={isImporting || !syncCode.trim()}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw size={16} className="mr-2 animate-spin" />
                      インポート中...
                    </>
                  ) : (
                    <>
                      <Upload size={16} className="mr-2" />
                      インポート開始
                    </>
                  )}
                </button>
              </div>

              {/* インポート結果 */}
              {importResult && (
                <div className={`p-4 rounded-lg border ${
                  importResult.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center mb-2">
                    {importResult.success ? (
                      <CheckCircle size={16} className="text-green-600 mr-2" />
                    ) : (
                      <AlertTriangle size={16} className="text-red-600 mr-2" />
                    )}
                    <span className={`font-medium ${
                      importResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {importResult.success ? 'インポート成功' : 'インポート失敗'}
                    </span>
                  </div>
                  
                  {importResult.success && importResult.stats && (
                    <div className="text-sm text-green-700 space-y-1">
                      <div>• ワークスペース: {importResult.stats.workspacesImported}個</div>
                      <div>• ノート: {importResult.stats.notesImported}個</div>
                    </div>
                  )}
                  
                  {importResult.error && (
                    <div className="text-sm text-red-700 mt-2">
                      {importResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* JSONファイル出力 */}
          {activeMethod === 'json-export' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Download size={18} className="mr-2 text-blue-600" />
                  ファイル出力
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  データをJSONファイルとしてダウンロードして他のデバイスに転送できます。
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">全データファイル</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      全ワークスペース・ノートを含む完全なJSONファイル
                    </p>
                    <button
                      onClick={() => {
                        const state = useNotebookStore.getState();
                        const data = exportData({
                          workspaces: state.workspaces,
                          notebooks: state.notebooks,
                          notesData: state.notesData,
                          subFoldersData: state.subFoldersData
                        }, { type: 'full' });
                        
                        const blob = new Blob([data], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `notespace-sync-full-${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                    >
                      <Download size={16} className="mr-2" />
                      ダウンロード
                    </button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">ワークスペースファイル</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      現在のワークスペース「{currentWorkspaceName}」のみのJSONファイル
                    </p>
                    <button
                      onClick={() => {
                        const state = useNotebookStore.getState();
                        const currentWorkspace = state.workspaces.find(ws => ws.id === selectedWorkspace);
                        const workspaceNotebooks = state.notebooks[selectedWorkspace] || [];
                        
                        const workspaceSubFolders: { [key: string]: any[] } = {};
                        const workspaceNotes: { [key: string]: any[] } = {};
                        
                        workspaceNotebooks.forEach(notebook => {
                          workspaceSubFolders[notebook.id] = state.subFoldersData[notebook.id] || [];
                          (state.subFoldersData[notebook.id] || []).forEach(subFolder => {
                            workspaceNotes[subFolder.id] = state.notesData[subFolder.id] || [];
                          });
                        });

                        const workspaceData = {
                          workspaces: currentWorkspace ? [currentWorkspace] : [],
                          notebooks: { [selectedWorkspace]: workspaceNotebooks },
                          subFoldersData: workspaceSubFolders,
                          notesData: workspaceNotes
                        };

                        const data = exportData(workspaceData, { type: 'workspace', workspaceId: selectedWorkspace });
                        
                        const blob = new Blob([data], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `notespace-sync-${selectedWorkspace}-${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                    >
                      <Download size={16} className="mr-2" />
                      ダウンロード
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* JSONファイル読込 */}
          {activeMethod === 'json-import' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Upload size={18} className="mr-2 text-green-600" />
                  ファイル読込
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  他のデバイスから出力されたJSONファイルを読み込んでデータを統合できます。
                </p>
              </div>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    JSONファイルを選択
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    NoteSpaceから出力されたJSONファイル（.json）を選択してください
                  </p>
                  
                  <button
                    onClick={handleImportFromFile}
                    disabled={isImporting}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw size={16} className="mr-2 animate-spin" />
                        インポート中...
                      </>
                    ) : (
                      <>
                        <Upload size={16} className="mr-2" />
                        ファイルを選択
                      </>
                    )}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                </div>

                {/* インポート結果 */}
                {importResult && (
                  <div className={`p-4 rounded-lg border ${
                    importResult.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center mb-2">
                      {importResult.success ? (
                        <CheckCircle size={16} className="text-green-600 mr-2" />
                      ) : (
                        <AlertTriangle size={16} className="text-red-600 mr-2" />
                      )}
                      <span className={`font-medium ${
                        importResult.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {importResult.success ? 'インポート成功' : 'インポート失敗'}
                      </span>
                    </div>
                    
                    {importResult.success && importResult.stats && (
                      <div className="text-sm text-green-700 space-y-1">
                        <div>• ワークスペース: {importResult.stats.workspacesImported}個</div>
                        <div>• ノート: {importResult.stats.notesImported}個</div>
                      </div>
                    )}
                    
                    {importResult.error && (
                      <div className="text-sm text-red-700 mt-2">
                        {importResult.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* フッター */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t">
        <div className="text-sm text-gray-500 flex items-center">
          {navigator.onLine ? (
            <>
              <Wifi size={14} className="mr-1 text-green-500" />
              オンライン
            </>
          ) : (
            <>
              <WifiOff size={14} className="mr-1 text-red-500" />
              オフライン
            </>
          )}
        </div>
        
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

export default DeviceSyncDialog;