import React, { useState, useRef, useCallback, memo } from 'react';
import { Image, X, AlertCircle } from 'lucide-react';
import { isImageFile, resizeImage } from '../../utils/imageUtils';

interface ImageUploadProps {
  onImageInsert: (base64: string, fileName: string) => void;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = memo(({ onImageInsert, className = '' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);
    setIsUploading(true);

    try {
      const file = files[0];
      
      // 画像ファイルかチェック
      if (!isImageFile(file)) {
        setError('画像ファイルを選択してください');
        return;
      }

      // ファイルサイズチェック (5MB制限)
      if (file.size > 5 * 1024 * 1024) {
        setError('ファイルサイズは5MB以下にしてください');
        return;
      }

      // 画像をリサイズしてBase64に変換
      const base64 = await resizeImage(file, 800, 600, 0.8);
      
      // 親コンポーネントに通知
      onImageInsert(base64, file.name);
      
    } catch (err) {
      setError('画像の処理に失敗しました');
    } finally {
      setIsUploading(false);
    }
  }, [onImageInsert]);

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
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e.target.files);
    // ファイル選択をリセット
    if (e.target) {
      e.target.value = '';
    }
  }, [handleFileUpload]);

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={className}>
      {/* ドラッグ&ドロップエリア */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onClick={handleButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        <div className="flex flex-col items-center space-y-2">
          {isUploading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          ) : (
            <Image size={32} className="text-gray-400" />
          )}
          
          <div className="text-sm text-gray-600">
            {isUploading ? (
              <span>画像を処理中...</span>
            ) : (
              <span>
                <strong>クリック</strong>してファイルを選択するか、
                <br />
                <strong>ドラッグ&ドロップ</strong>で画像を追加
              </span>
            )}
          </div>
          
          <div className="text-xs text-gray-500">
            対応形式: JPG, PNG, GIF, WebP (最大5MB)
          </div>
        </div>
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle size={16} className="text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
});

ImageUpload.displayName = 'ImageUpload';

export default ImageUpload;