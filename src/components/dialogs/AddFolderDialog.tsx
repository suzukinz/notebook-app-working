import React, { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import { COLORS } from '../../types';
import { useNotebookStore } from '../../store/useNotebookStore';
import { Folder, Upload, X } from 'lucide-react';
import { validateFolderName, validateImageFile } from '../../utils/validation';
import { resizeImage } from '../../utils/imageUtils';

const AddFolderDialog: React.FC = () => {
  const {
    showAddFolderDialog,
    newFolderName,
    newFolderColor,
    selectedNotebook,
    setShowAddFolderDialog,
    setNewFolderName,
    setNewFolderColor,
    addSubFolder
  } = useNotebookStore();
  
  const [validationError, setValidationError] = useState<string>('');
  const [folderImage, setFolderImage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // フォルダ名を検証
    const nameValidation = validateFolderName(newFolderName);
    if (!nameValidation.isValid) {
      setValidationError(nameValidation.error || 'フォルダ名が無効です');
      return;
    }

    const sanitizedName = nameValidation.sanitized || newFolderName.trim();

    if (sanitizedName) {
      const folderData = {
        name: sanitizedName,
        color: newFolderColor,
        count: 0,
        ...(folderImage && { image: folderImage })
      };
      
      addSubFolder(selectedNotebook, folderData);
      setNewFolderName('');
      setNewFolderColor('gray');
      setFolderImage('');
      setValidationError('');
      setShowAddFolderDialog(false);
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
    return colorClasses[color as keyof typeof colorClasses] || colorClasses.gray;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!validateImageFile(file)) {
        setValidationError('画像ファイルが無効です。JPEG、PNG、GIF、WebP形式で5MB以下のファイルを選択してください。');
        return;
      }

      const resizedBase64 = await resizeImage(file, 32, 32); // フォルダ用アイコンサイズを大きく
      setFolderImage(resizedBase64);
      setValidationError('');
    } catch (error) {
      console.error('Image upload failed:', error);
      setValidationError('画像のアップロードに失敗しました。');
    }
  };

  const handleRemoveImage = () => {
    setFolderImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Modal
      isOpen={showAddFolderDialog}
      onClose={() => {
        setShowAddFolderDialog(false);
        setValidationError('');
        setFolderImage('');
      }}
      title="新しいサブフォルダを追加"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-1">
            フォルダ名
          </label>
          <input
            type="text"
            id="folderName"
            value={newFolderName}
            onChange={(e) => {
              setNewFolderName(e.target.value);
              setValidationError(''); // エラーをクリア
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSubmit(e);
              } else if (e.key === 'Escape') {
                setShowAddFolderDialog(false);
                setValidationError('');
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            アイコン画像（オプション）
          </label>
          <div className="flex items-center gap-4">
            {folderImage ? (
              <div className="flex items-center gap-2">
                <img 
                  src={folderImage} 
                  alt="フォルダアイコン" 
                  className="w-8 h-8 rounded object-cover border border-gray-300"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  title="画像を削除"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Upload size={14} />
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
            <span className="text-xs text-gray-500">32×32ピクセルに自動リサイズされます</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            フォルダの色
          </label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setNewFolderColor(color)}
                className={`p-2 rounded-lg border-2 transition-all ${
                  newFolderColor === color
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
        {newFolderName && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">プレビュー:</p>
            <div className="flex items-center">
              <div className={`p-2 rounded-lg mr-2 ${getColorClasses(newFolderColor).bg}`}>
                {folderImage ? (
                  <img 
                    src={folderImage} 
                    alt={newFolderName}
                    className="w-5 h-5 rounded object-cover"
                  />
                ) : (
                  <Folder className={`w-4 h-4 ${getColorClasses(newFolderColor).text}`} />
                )}
              </div>
              <span className="font-medium text-gray-900">{newFolderName}</span>
              <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                0 ノート
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => {
              setShowAddFolderDialog(false);
              setValidationError('');
              setFolderImage('');
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={!newFolderName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            フォルダを作成
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddFolderDialog;