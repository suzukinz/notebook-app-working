import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { 
  Download, 
  Upload, 
  Settings, 
  Database,
  CheckCircle,
  AlertTriangle,
  Info,
  Folder
} from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { exportData, downloadData, uploadFile, importData, ExportOptions, ImportOptions, ImportResult } from '../../utils/dataManager';
import { logger } from '../../utils/logger';
import { safeReload } from '../../utils/safeReload';

interface DataExportImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const DataExportImportDialog: React.FC<DataExportImportDialogProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    workspaces, 
    selectedWorkspace, 
    exportAllData, 
    importAllData,
    ...storeData 
  } = useNotebookStore();
  
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    type: 'full',
    includeSettings: true,
    includeTheme: true,
    includeAccessibility: true,
    includePWASettings: false
  });
  
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    replaceExisting: true,
    importSettings: true,
    importTheme: true,
    importAccessibility: true,
    importPWASettings: false
  });
  
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // エクスポート実行
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const dataString = exportData({ ...storeData, workspaces }, exportOptions);
      
      let filename: string;
      if (exportOptions.type === 'workspace' && exportOptions.workspaceId) {
        const workspace = workspaces.find(ws => ws.id === exportOptions.workspaceId);
        const workspaceName = workspace ? workspace.name : exportOptions.workspaceId;
        filename = `notespace-${workspaceName}-${new Date().toISOString().split('T')[0]}.json`;
      } else if (exportOptions.type === 'settings-only') {
        filename = `notespace-settings-${new Date().toISOString().split('T')[0]}.json`;
      } else {
        filename = `notespace-full-backup-${new Date().toISOString().split('T')[0]}.json`;
      }
      
      downloadData(dataString, filename);
      
      // 成功メッセージ
      setTimeout(() => {
        alert(`データのエクスポートが完了しました。\nファイル名: ${filename}`);
      }, 100);
      
    } catch (error) {
      logger.error('Export failed:', error);
      alert('エクスポートに失敗しました。');
    } finally {
      setIsExporting(false);
    }
  };

  // インポート実行
  const handleImport = async () => {
    setIsImporting(true);
    setImportResult(null);
    
    try {
      const jsonString = await uploadFile();
      const result = importData(jsonString, importOptions);
      
      setImportResult(result);
      
      if (result.success && result.data) {
        if (importOptions.replaceExisting) {
          // 現在のデータを置き換え
          if (window.confirm(`データを完全に置き換えますか？\n\n統計:\n- ワークスペース: ${result.stats?.workspacesImported || 0}個\n- ノートブック: ${result.stats?.notebooksImported || 0}個\n- ノート: ${result.stats?.notesImported || 0}個\n- インポート設定: ${result.stats?.settingsImported?.join(', ') || 'なし'}\n\nこの操作は取り消せません。`)) {
            
            // ストアを更新
            useNotebookStore.setState({
              workspaces: result.data.workspaces,
              notebooks: result.data.notebooks,
              notesData: result.data.notesData,
              subFoldersData: result.data.subFoldersData,
              selectedWorkspace: result.data.workspaces[0]?.id || 'work',
              selectedNotebook: '',
              selectedSubFolder: '',
              selectedNote: null,
            });
            
            // 設定をリロードするためにページをリロード
            if (result.stats?.settingsImported && result.stats.settingsImported.length > 0) {
              setTimeout(() => {
                if (window.confirm('設定の変更を反映するためにページをリロードします。')) {
                  safeReload();
                }
              }, 1000);
            }
          }
        }
      }
      
    } catch (error) {
      logger.error('Import failed:', error);
      setImportResult({
        success: false,
        error: 'ファイルの読み込みに失敗しました。',
        warnings: []
      });
    } finally {
      setIsImporting(false);
    }
  };

  // エクスポートタイプの変更
  const handleExportTypeChange = (type: 'full' | 'workspace' | 'settings-only') => {
    setExportOptions(prev => ({
      ...prev,
      type,
      workspaceId: type === 'workspace' ? selectedWorkspace : undefined
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📦 データエクスポート・インポート"
      size="xl"
    >
      <div className="flex h-[500px] max-h-[80vh] overflow-hidden">
        {/* タブナビゲーション */}
        <div className="w-1/4 border-r border-gray-200 pr-4">
          <nav className="space-y-2" role="tablist">
            <button
              onClick={() => setActiveTab('export')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'export'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              role="tab"
              aria-selected={activeTab === 'export'}
            >
              <Download size={16} className="inline mr-2" />
              エクスポート
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'import'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              role="tab"
              aria-selected={activeTab === 'import'}
            >
              <Upload size={16} className="inline mr-2" />
              インポート
            </button>
          </nav>
        </div>

        {/* タブコンテンツ */}
        <div className="flex-1 pl-4 overflow-y-auto">
          {/* エクスポートタブ */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Download size={18} className="mr-2 text-blue-600" />
                  データエクスポート
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  ノートブックのデータをJSONファイルとしてエクスポートできます。
                </p>
              </div>

              {/* エクスポートタイプ */}
              <div className="space-y-3">
                <label className="font-medium text-gray-900">エクスポートタイプ</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                    <input
                      type="radio"
                      name="exportType"
                      value="full"
                      checked={exportOptions.type === 'full'}
                      onChange={(e) => handleExportTypeChange(e.target.value as any)}
                      className="text-blue-600"
                    />
                    <div className="flex items-center">
                      <Database size={16} className="mr-2 text-blue-600" />
                      <div>
                        <div className="font-medium">完全バックアップ</div>
                        <div className="text-sm text-gray-600">すべてのワークスペースとデータ</div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                    <input
                      type="radio"
                      name="exportType"
                      value="workspace"
                      checked={exportOptions.type === 'workspace'}
                      onChange={(e) => handleExportTypeChange(e.target.value as any)}
                      className="text-blue-600"
                    />
                    <div className="flex items-center">
                      <Folder size={16} className="mr-2 text-green-600" />
                      <div>
                        <div className="font-medium">ワークスペース単体</div>
                        <div className="text-sm text-gray-600">
                          現在のワークスペース「{workspaces.find(ws => ws.id === selectedWorkspace)?.name}」のみ
                        </div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                    <input
                      type="radio"
                      name="exportType"
                      value="settings-only"
                      checked={exportOptions.type === 'settings-only'}
                      onChange={(e) => handleExportTypeChange(e.target.value as any)}
                      className="text-blue-600"
                    />
                    <div className="flex items-center">
                      <Settings size={16} className="mr-2 text-purple-600" />
                      <div>
                        <div className="font-medium">設定のみ</div>
                        <div className="text-sm text-gray-600">テーマとアクセシビリティ設定</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 設定オプション */}
              {exportOptions.type !== 'settings-only' && (
                <div className="space-y-3">
                  <label className="font-medium text-gray-900">設定を含める</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeSettings || false}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          includeSettings: e.target.checked
                        }))}
                        className="rounded"
                      />
                      <span className="text-sm">設定を含める</span>
                    </label>
                    
                    {exportOptions.includeSettings && (
                      <div className="ml-6 space-y-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={exportOptions.includeTheme || false}
                            onChange={(e) => setExportOptions(prev => ({
                              ...prev,
                              includeTheme: e.target.checked
                            }))}
                            className="rounded"
                          />
                          <span className="text-sm">テーマ設定</span>
                        </label>
                        
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={exportOptions.includeAccessibility || false}
                            onChange={(e) => setExportOptions(prev => ({
                              ...prev,
                              includeAccessibility: e.target.checked
                            }))}
                            className="rounded"
                          />
                          <span className="text-sm">アクセシビリティ設定</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isExporting ? (
                  <span>エクスポート中...</span>
                ) : (
                  <>
                    <Download size={16} className="mr-2" />
                    エクスポート開始
                  </>
                )}
              </button>
            </div>
          )}

          {/* インポートタブ */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Upload size={18} className="mr-2 text-green-600" />
                  データインポート
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  エクスポートしたJSONファイルからデータを復元できます。
                </p>
              </div>

              {/* インポートオプション */}
              <div className="space-y-3">
                <label className="font-medium text-gray-900">インポートオプション</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={importOptions.replaceExisting || false}
                      onChange={(e) => setImportOptions(prev => ({
                        ...prev,
                        replaceExisting: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <span className="text-sm">既存データを置き換え</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={importOptions.importSettings || false}
                      onChange={(e) => setImportOptions(prev => ({
                        ...prev,
                        importSettings: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <span className="text-sm">設定をインポート</span>
                  </label>
                  
                  {importOptions.importSettings && (
                    <div className="ml-6 space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={importOptions.importTheme || false}
                          onChange={(e) => setImportOptions(prev => ({
                            ...prev,
                            importTheme: e.target.checked
                          }))}
                          className="rounded"
                        />
                        <span className="text-sm">テーマ設定</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={importOptions.importAccessibility || false}
                          onChange={(e) => setImportOptions(prev => ({
                            ...prev,
                            importAccessibility: e.target.checked
                          }))}
                          className="rounded"
                        />
                        <span className="text-sm">アクセシビリティ設定</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleImport}
                disabled={isImporting}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isImporting ? (
                  <span>インポート中...</span>
                ) : (
                  <>
                    <Upload size={16} className="mr-2" />
                    ファイルを選択してインポート
                  </>
                )}
              </button>

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
                      <div>• ノートブック: {importResult.stats.notebooksImported}個</div>
                      <div>• ノート: {importResult.stats.notesImported}個</div>
                      {importResult.stats.settingsImported.length > 0 && (
                        <div>• 設定: {importResult.stats.settingsImported.join(', ')}</div>
                      )}
                    </div>
                  )}
                  
                  {importResult.error && (
                    <div className="text-sm text-red-700 mt-2">
                      {importResult.error}
                    </div>
                  )}
                  
                  {importResult.warnings && importResult.warnings.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {importResult.warnings.map((warning, index) => (
                        <div key={index} className="text-sm text-amber-700 flex items-center">
                          <AlertTriangle size={12} className="mr-1" />
                          {warning}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* フッター */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t">
        <div className="text-sm text-gray-500 flex items-center">
          <Info size={14} className="mr-1" />
          データはJSON形式でエクスポートされます
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

export default DataExportImportDialog;