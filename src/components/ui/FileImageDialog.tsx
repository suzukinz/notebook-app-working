import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { isImageFile, resizeImage } from '../../utils/imageUtils';

interface FileImageDialogProps {
  isOpen: boolean;
  onImageSelect: (base64: string, fileName: string) => void;
  onCancel: () => void;
}

const FileImageDialog: React.FC<FileImageDialogProps> = ({
  isOpen,
  onImageSelect,
  onCancel
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImageFile = useCallback(async (file: File) => {
    if (!isImageFile(file)) {
      alert('画像ファイルを選択してください');
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);

    try {
      // 画像をリサイズしてBase64に変換
      const base64 = await resizeImage(file, 800, 600, 0.8);
      setPreview(base64);
    } catch (error) {
      console.error('画像の処理に失敗しました:', error);
      alert('画像の処理に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processImageFile(files[0]);
    }
  }, [processImageFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processImageFile(files[0]);
    }
  }, [processImageFile]);

  const handleInsert = useCallback(() => {
    if (preview) {
      onImageSelect(preview, fileName);
      // リセット
      setPreview(null);
      setFileName('');
    }
  }, [preview, fileName, onImageSelect]);

  const handleCancel = useCallback(() => {
    setPreview(null);
    setFileName('');
    onCancel();
  }, [onCancel]);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl p-4 md:p-6 w-full max-w-md md:max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">画像を挿入</h3>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {!preview ? (
          <div className="space-y-4">
            {/* ドラッグ&ドロップエリア */}
            {/* デスクトップ用ドラッグ&ドロップエリア */}
            <div className="hidden md:block">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <ImageIcon size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">
                  画像ファイルをここにドラッグ&ドロップ
                </p>
                <p className="text-sm text-gray-400 mb-4">
                  または
                </p>
                <button
                  onClick={handleBrowseClick}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  disabled={isProcessing}
                >
                  <Upload size={16} className="inline mr-2" />
                  ファイルを選択
                </button>
              </div>
            </div>

            {/* スマホ用シンプルなボタン */}
            <div className="md:hidden space-y-3">
              <div className="text-center">
                <ImageIcon size={64} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">
                  画像を追加
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={handleBrowseClick}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  disabled={isProcessing}
                >
                  📷 カメラで撮影
                </button>
                
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('capture');
                      fileInputRef.current.click();
                    }
                  }}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                  disabled={isProcessing}
                >
                  📁 ファイルから選択
                </button>
              </div>
            </div>

            {isProcessing && (
              <div className="text-center text-gray-600">
                画像を処理中...
              </div>
            )}

            {/* 隠しファイル入力（スマホではカメラも含む） */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* プレビュー */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <img
                src={preview}
                alt="プレビュー"
                className="max-w-full h-auto max-h-64 mx-auto rounded"
              />
              <p className="text-sm text-gray-600 mt-2 text-center">
                {fileName}
              </p>
            </div>

            {/* ボタン */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setPreview(null);
                  setFileName('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                別の画像を選択
              </button>
              <button
                onClick={handleInsert}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                挿入
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileImageDialog;