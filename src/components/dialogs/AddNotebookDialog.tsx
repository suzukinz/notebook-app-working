import React, { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import { COLORS } from '../../types';
import { BookOpen, Upload, X } from 'lucide-react';
import { validateNotebookName, validateStringLength, validateImageFile } from '../../utils/validation';
import { resizeImage } from '../../utils/imageUtils';

interface AddNotebookDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (notebook: { name: string; color: string; description?: string; image?: string }) => void;
}

const AddNotebookDialog: React.FC<AddNotebookDialogProps> = ({
  isOpen,
  onClose,
  onAdd
}) => {
  const [notebookName, setNotebookName] = useState('');
  const [notebookColor, setNotebookColor] = useState('blue');
  const [notebookDescription, setNotebookDescription] = useState('');
  const [notebookImage, setNotebookImage] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // ノートブック名を検証
    const nameValidation = validateNotebookName(notebookName);
    if (!nameValidation.isValid) {
      setValidationError(nameValidation.error || 'ノートブック名が無効です');
      return;
    }

    // 説明文を検証（任意項目）
    if (notebookDescription.trim()) {
      const descValidation = validateStringLength(notebookDescription.trim(), 500, '説明文');
      if (!descValidation.isValid) {
        setValidationError(descValidation.error || '説明文が無効です');
        return;
      }
    }

    const sanitizedName = nameValidation.sanitized || notebookName.trim();
    const trimmedDescription = notebookDescription.trim();
    
    if (sanitizedName) {
      const notebookData: { name: string; color: string; description?: string; image?: string } = {
        name: sanitizedName,
        color: notebookColor,
      };
      
      if (trimmedDescription) {
        notebookData.description = trimmedDescription;
      }
      
      if (notebookImage) {
        notebookData.image = notebookImage;
      }
      
      onAdd(notebookData);
      setNotebookName('');
      setNotebookColor('blue');
      setNotebookDescription('');
      setNotebookImage('');
      setValidationError('');
      onClose();
    }
  };

  const handleClose = () => {
    setNotebookName('');
    setNotebookColor('blue');
    setNotebookDescription('');
    setNotebookImage('');
    setValidationError('');
    onClose();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!validateImageFile(file)) {
        setValidationError('画像ファイルが無効です。JPEG、PNG、GIF、WebP形式で5MB以下のファイルを選択してください。');
        return;
      }

      const resizedBase64 = await resizeImage(file, 40, 40); // アイコンサイズを大きく
      setNotebookImage(resizedBase64);
      setValidationError('');
    } catch (error) {
      console.error('Image upload failed:', error);
      setValidationError('画像のアップロードに失敗しました。');
    }
  };

  const handleRemoveImage = () => {
    setNotebookImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getColorClasses = (color: string) => {
    const colorClasses = {
      red: { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-500' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600', dot: 'bg-orange-500' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', dot: 'bg-yellow-500' },
      green: { bg: 'bg-green-100', text: 'text-green-600', dot: 'bg-green-500' },
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', dot: 'bg-blue-500' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', dot: 'bg-purple-500' },
      pink: { bg: 'bg-pink-100', text: 'text-pink-600', dot: 'bg-pink-500' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', dot: 'bg-indigo-500' },
      gray: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-500' }
    };
    return colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="新しいノートブックを追加"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="notebookName" className="block text-sm font-medium text-gray-700 mb-1">
            ノートブック名
          </label>
          <input
            type="text"
            id="notebookName"
            value={notebookName}
            onChange={(e) => {
              setNotebookName(e.target.value);
              setValidationError(''); // エラーをクリア
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSubmit(e);
              } else if (e.key === 'Escape') {
                handleClose();
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例: プロジェクト資料"
            autoFocus
            required
          />
          {validationError && (
            <p className="mt-1 text-sm text-red-600">{validationError}</p>
          )}
        </div>

        <div>
          <label htmlFor="notebookDescription" className="block text-sm font-medium text-gray-700 mb-1">
            説明（オプション）
          </label>
          <textarea
            id="notebookDescription"
            value={notebookDescription}
            onChange={(e) => setNotebookDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="このノートブックの目的や内容について"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            アイコン画像（オプション）
          </label>
          <div className="flex items-center gap-4">
            {notebookImage ? (
              <div className="flex items-center gap-2">
                <img 
                  src={notebookImage} 
                  alt="ノートブックアイコン" 
                  className="w-10 h-10 rounded object-cover border border-gray-300"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  title="画像を削除"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Upload size={16} />
                画像を選択
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <span className="text-xs text-gray-500">40×40ピクセルに自動リサイズされます</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            カラー
          </label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setNotebookColor(color)}
                className={`p-2 rounded-lg border-2 transition-all ${
                  notebookColor === color
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                title={color}
              >
                <div className={`w-6 h-6 rounded ${getColorClasses(color).dot}`}></div>
              </button>
            ))}
          </div>
        </div>

        {/* プレビュー */}
        {notebookName && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">プレビュー:</p>
            <div className="flex items-center">
              <div className={`p-2 rounded-lg mr-3 ${getColorClasses(notebookColor).bg}`}>
                {notebookImage ? (
                  <img 
                    src={notebookImage} 
                    alt={notebookName}
                    className="w-6 h-6 rounded object-cover"
                  />
                ) : (
                  <BookOpen className={`w-5 h-5 ${getColorClasses(notebookColor).text}`} />
                )}
              </div>
              <div>
                <span className="font-medium text-gray-900">{notebookName}</span>
                {notebookDescription && (
                  <p className="text-sm text-gray-600 mt-1">{notebookDescription}</p>
                )}
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full mt-1 inline-block">
                  0 ノート
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={!notebookName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            ノートブックを作成
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddNotebookDialog;