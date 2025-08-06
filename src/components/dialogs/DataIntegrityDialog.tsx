import React, { useState, useCallback } from 'react';
import Modal from '../ui/Modal';
import { 
  Shield, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Database,
  Loader
} from 'lucide-react';
import { checkDataIntegrity, repairData, createBackup, getAvailableBackups } from '../../utils/dataIntegrity';

interface DataIntegrityDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const DataIntegrityDialog: React.FC<DataIntegrityDialogProps> = ({
  isOpen,
  onClose
}) => {
  // const { workspaces, notebooks, subFoldersData, notesData } = useNotebookStore();
  const [isChecking, setIsChecking] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);
  const [repairResult, setRepairResult] = useState<any>(null);
  const [backups, setBackups] = useState<string[]>([]);

  // データ整合性チェック実行
  const handleCheck = useCallback(async () => {
    setIsChecking(true);
    setCheckResult(null);
    setRepairResult(null);
    
    try {
      const result = checkDataIntegrity();
      setCheckResult(result);
      
      // バックアップリストも更新
      const backupList = getAvailableBackups();
      setBackups(backupList);
    } catch (error) {
      console.error('整合性チェックエラー:', error);
      setCheckResult({
        isValid: false,
        errors: ['整合性チェック中にエラーが発生しました'],
        warnings: [],
        corruptedData: {
          workspaces: [],
          notebooks: [],
          subFolders: [],
          notes: []
        }
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  // データ修復実行
  const handleRepair = useCallback(async () => {
    if (!checkResult || checkResult.isValid) return;
    
    setIsRepairing(true);
    
    try {
      // 修復前にバックアップを作成
      const backupCreated = createBackup();
      if (!backupCreated) {
        if (!window.confirm('バックアップの作成に失敗しました。修復を続行しますか？')) {
          setIsRepairing(false);
          return;
        }
      }
      
      const result = repairData();
      setRepairResult(result);
      
      if (result.success) {
        // 再チェック
        handleCheck();
      }
    } catch (error) {
      console.error('データ修復エラー:', error);
      setRepairResult({
        success: false,
        errors: ['データ修復中にエラーが発生しました'],
        warnings: [],
        repairedItems: 0
      });
    } finally {
      setIsRepairing(false);
    }
  }, [checkResult, handleCheck]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="データ整合性チェック">
      <div className="w-full max-w-2xl">
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <Shield className="text-blue-600 mr-2" size={24} />
            <h3 className="text-lg font-semibold">データ整合性チェック</h3>
          </div>
          <p className="text-sm text-gray-600">
            アプリケーションのデータの整合性をチェックし、問題がある場合は修復を試みます。
          </p>
        </div>

        {/* チェック実行ボタン */}
        {!checkResult && (
          <div className="text-center py-8">
            <button
              onClick={handleCheck}
              disabled={isChecking}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChecking ? (
                <>
                  <Loader className="animate-spin mr-2" size={20} />
                  チェック中...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2" size={20} />
                  整合性チェックを実行
                </>
              )}
            </button>
          </div>
        )}

        {/* チェック結果 */}
        {checkResult && (
          <div className="space-y-4">
            {/* 結果サマリー */}
            <div className={`p-4 rounded-lg ${
              checkResult.isValid 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center">
                {checkResult.isValid ? (
                  <>
                    <CheckCircle className="text-green-600 mr-2" size={20} />
                    <span className="font-medium text-green-800">
                      データは正常です
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="text-red-600 mr-2" size={20} />
                    <span className="font-medium text-red-800">
                      データに問題が見つかりました
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* エラー詳細 */}
            {checkResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-800">エラー ({checkResult.errors.length})</h4>
                <div className="max-h-40 overflow-y-auto bg-red-50 p-3 rounded border border-red-200">
                  {checkResult.errors.map((error: string, index: number) => (
                    <div key={index} className="text-sm text-red-700 mb-1">
                      • {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 警告詳細 */}
            {checkResult.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-800">警告 ({checkResult.warnings.length})</h4>
                <div className="max-h-40 overflow-y-auto bg-yellow-50 p-3 rounded border border-yellow-200">
                  {checkResult.warnings.map((warning: string, index: number) => (
                    <div key={index} className="text-sm text-yellow-700 mb-1">
                      • {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 修復ボタン */}
            {!checkResult.isValid && (
              <div className="flex justify-between items-center pt-4">
                <button
                  onClick={handleRepair}
                  disabled={isRepairing}
                  className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRepairing ? (
                    <>
                      <Loader className="animate-spin mr-2" size={16} />
                      修復中...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2" size={16} />
                      データを修復
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleCheck}
                  disabled={isChecking}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  再チェック
                </button>
              </div>
            )}
          </div>
        )}

        {/* 修復結果 */}
        {repairResult && (
          <div className={`mt-4 p-4 rounded-lg ${
            repairResult.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              {repairResult.success ? (
                <>
                  <CheckCircle className="text-green-600 mr-2" size={20} />
                  <span className="font-medium text-green-800">
                    修復が完了しました（{repairResult.repairedItems}項目）
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="text-red-600 mr-2" size={20} />
                  <span className="font-medium text-red-800">
                    修復に失敗しました
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* バックアップ情報 */}
        {backups.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center mb-2">
              <Database className="text-gray-600 mr-2" size={16} />
              <span className="text-sm font-medium text-gray-700">
                利用可能なバックアップ ({backups.length})
              </span>
            </div>
            <div className="text-xs text-gray-500">
              最新: {new Date(backups[0]).toLocaleString('ja-JP')}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DataIntegrityDialog;